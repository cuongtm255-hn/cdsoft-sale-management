import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { In } from 'typeorm';
import { TenantDataSourceManager } from '../../tenant/tenant-datasource.manager';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { RedisCacheService } from '../../common/cache/redis-cache.service';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { CreateRoleDto, UpdateRolePermissionsDto } from './dto/roles.dto';
import { ROLE_DEFAULTS, ensureTenantRbacSeeded } from './rbac-seed';

const RBAC_TTL = 1800; // 30 minutes

@Injectable()
export class RolesService {
  constructor(
    private readonly dsManager: TenantDataSourceManager,
    private readonly tenantCtx: TenantContextService,
    private readonly cache: RedisCacheService,
  ) {}

  private async getDs() {
    return this.dsManager.getDataSource(this.tenantCtx.getTenantCode()!);
  }

  private rbacKey(tenantCode: string, roleName: string) {
    return `${tenantCode}:rbac:${roleName}`;
  }

  async ensureSeeded(): Promise<void> {
    const ds = await this.getDs();
    await ensureTenantRbacSeeded(ds);
  }

  async checkPermission(roleName: string, code: string): Promise<boolean> {
    const perms = await this.getPermissionsForRole(roleName);
    return perms.includes(code);
  }

  async getPermissionsForRole(roleName: string): Promise<string[]> {
    const tenantCode = this.tenantCtx.getTenantCode() ?? 'default';
    const key = this.rbacKey(tenantCode, roleName);

    return this.cache.getOrSet<string[]>(key, RBAC_TTL, async () => {
      const ds = await this.getDs();
      const rows = await ds.query(
        `SELECT p.code FROM role_permissions rp
         JOIN roles r ON rp.role_id = r.id
         JOIN permissions p ON rp.permission_id = p.id
         WHERE r.name = ? AND r.deleted_at IS NULL`,
        [roleName],
      );
      return rows.map((row: any) => row.code);
    });
  }

  async invalidateCache(roleName: string): Promise<void> {
    const tenantCode = this.tenantCtx.getTenantCode() ?? 'default';
    await this.cache.del(this.rbacKey(tenantCode, roleName));
  }

  async listRoles() {
    await this.ensureSeeded();
    const ds = await this.getDs();
    const roleRepo = ds.getRepository(Role);
    const roles = await roleRepo.find({ relations: ['rolePermissions', 'rolePermissions.permission'] });

    const userCounts: Record<string, number> = {};
    const rows = await ds.query(`SELECT role, COUNT(*) as cnt FROM users WHERE deleted_at IS NULL GROUP BY role`);
    rows.forEach((row: any) => {
      userCounts[row.role] = Number(row.cnt);
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      label: role.label,
      isSystem: role.isSystem,
      userCount: userCounts[role.name] ?? 0,
      permissions: role.rolePermissions.map((rp) => rp.permission.code),
    }));
  }

  async createRole(dto: CreateRoleDto) {
    await this.ensureSeeded();
    const ds = await this.getDs();
    const roleRepo = ds.getRepository(Role);
    const permRepo = ds.getRepository(Permission);
    const rpRepo = ds.getRepository(RolePermission);

    const systemNames = Object.keys(ROLE_DEFAULTS);
    if (systemNames.includes(dto.name.toUpperCase())) {
      throw new BadRequestException('Role name conflicts with a system role');
    }

    const existing = await roleRepo.findOne({ where: { name: dto.name.toUpperCase() } });
    if (existing) {
      throw new BadRequestException('Role name already exists');
    }

    const role = await roleRepo.save(
      roleRepo.create({
        name: dto.name.toUpperCase(),
        label: dto.label,
        isSystem: false,
      }),
    );

    const permissions = await permRepo.findBy({ code: In(dto.permissions) });
    await rpRepo.save(
      permissions.map((permission) =>
        rpRepo.create({
          roleId: role.id,
          permissionId: permission.id,
        }),
      ),
    );

    return role;
  }

  async updatePermissions(roleId: string, dto: UpdateRolePermissionsDto) {
    const ds = await this.getDs();
    const roleRepo = ds.getRepository(Role);
    const permRepo = ds.getRepository(Permission);
    const rpRepo = ds.getRepository(RolePermission);

    const role = await roleRepo.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.isSystem) {
      throw new BadRequestException('Cannot modify system role permissions');
    }

    await rpRepo.delete({ roleId });
    const permissions = await permRepo.findBy({ code: In(dto.permissions) });
    await rpRepo.save(
      permissions.map((permission) =>
        rpRepo.create({
          roleId,
          permissionId: permission.id,
        }),
      ),
    );

    await this.invalidateCache(role.name);
    return { success: true };
  }

  async listPermissions() {
    await this.ensureSeeded();
    const ds = await this.getDs();
    return ds.getRepository(Permission).find({ order: { resource: 'ASC', action: 'ASC' } });
  }
}

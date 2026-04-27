import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { In } from 'typeorm';
import { TenantDataSourceManager } from '@tenant/tenant-datasource.manager';
import { TenantContextService } from '@tenant/tenant-context.service';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { CreateRoleDto, UpdateRolePermissionsDto } from './dto/roles.dto';

// ─── Default permission seed data ─────────────────────────────────────────────

const ALL_PERMISSIONS: { code: string; resource: string; action: string; label: string }[] = [
  { code: 'products:read',       resource: 'products',   action: 'read',    label: 'Xem sản phẩm' },
  { code: 'products:write',      resource: 'products',   action: 'write',   label: 'Tạo/Sửa sản phẩm' },
  { code: 'products:delete',     resource: 'products',   action: 'delete',  label: 'Xóa sản phẩm' },
  { code: 'cost_price:read',     resource: 'products',   action: 'read',    label: 'Xem giá vốn' },
  { code: 'customers:read',      resource: 'customers',  action: 'read',    label: 'Xem khách hàng' },
  { code: 'customers:write',     resource: 'customers',  action: 'write',   label: 'Tạo/Sửa KH' },
  { code: 'orders:read',         resource: 'orders',     action: 'read',    label: 'Xem đơn hàng' },
  { code: 'orders:write',        resource: 'orders',     action: 'write',   label: 'Tạo/Sửa đơn' },
  { code: 'orders:confirm',      resource: 'orders',     action: 'confirm', label: 'Xác nhận đơn' },
  { code: 'orders:cancel',       resource: 'orders',     action: 'cancel',  label: 'Hủy đơn hàng' },
  { code: 'inventory:read',      resource: 'inventory',  action: 'read',    label: 'Xem tồn kho' },
  { code: 'inventory:write',     resource: 'inventory',  action: 'write',   label: 'Nhập/Xuất kho' },
  { code: 'inventory:adjust',    resource: 'inventory',  action: 'adjust',  label: 'Điều chỉnh kho' },
  { code: 'payments:read',       resource: 'payments',   action: 'read',    label: 'Xem thanh toán' },
  { code: 'payments:write',      resource: 'payments',   action: 'write',   label: 'Ghi thanh toán' },
  { code: 'reports:read',        resource: 'reports',    action: 'read',    label: 'Xem báo cáo' },
  { code: 'reports.finance:read',resource: 'reports',    action: 'read',    label: 'Xem BC tài chính' },
  { code: 'users:read',          resource: 'users',      action: 'read',    label: 'Xem nhân viên' },
  { code: 'users:write',         resource: 'users',      action: 'write',   label: 'Tạo/Sửa NV' },
  { code: 'roles:read',          resource: 'roles',      action: 'read',    label: 'Xem phân quyền' },
  { code: 'roles:write',         resource: 'roles',      action: 'write',   label: 'Sửa phân quyền' },
  { code: 'settings:write',      resource: 'settings',   action: 'write',   label: 'Sửa cài đặt' },
  { code: 'audit_logs:read',     resource: 'audit_logs', action: 'read',    label: 'Xem nhật ký' },
];

const ROLE_DEFAULTS: Record<string, string[]> = {
  STAFF: [
    'products:read', 'products:write',
    'customers:read', 'customers:write',
    'orders:read', 'orders:write', 'orders:confirm',
    'inventory:read',
    'payments:read', 'payments:write',
  ],
  WAREHOUSE: [
    'products:read',
    'orders:read',
    'inventory:read', 'inventory:write', 'inventory:adjust',
  ],
  ACCOUNTANT: [
    'products:read', 'cost_price:read',
    'customers:read', 'customers:write',
    'orders:read',
    'payments:read', 'payments:write',
    'reports:read', 'reports.finance:read',
  ],
  MANAGER: [
    'products:read', 'products:write', 'cost_price:read',
    'customers:read', 'customers:write',
    'orders:read', 'orders:write', 'orders:confirm', 'orders:cancel',
    'inventory:read', 'inventory:write', 'inventory:adjust',
    'payments:read', 'payments:write',
    'reports:read', 'reports.finance:read',
    'users:read',
    'roles:read',
    'audit_logs:read',
  ],
  TENANT_ADMIN: ALL_PERMISSIONS.map((p) => p.code),
};

@Injectable()
export class RolesService {
  // Process-level cache: key = `${tenantCode}:${roleName}`, value = Set<string>
  private readonly cache = new Map<string, Set<string>>();

  constructor(
    private readonly dsManager: TenantDataSourceManager,
    private readonly tenantCtx: TenantContextService,
  ) {}

  private async getDs() {
    return this.dsManager.getDataSource(this.tenantCtx.getTenantCode()!);
  }

  // ─── Seed permissions + default roles if missing ──────────────────────────

  async ensureSeeded(): Promise<void> {
    const ds = await this.getDs();
    const permRepo = ds.getRepository(Permission);
    const roleRepo = ds.getRepository(Role);
    const rpRepo   = ds.getRepository(RolePermission);

    // Upsert permissions
    for (const p of ALL_PERMISSIONS) {
      const existing = await permRepo.findOne({ where: { code: p.code } });
      if (!existing) await permRepo.save(permRepo.create(p));
    }

    // Seed system roles
    for (const [name, permCodes] of Object.entries(ROLE_DEFAULTS)) {
      let role = await roleRepo.findOne({ where: { name } });
      if (!role) {
        const labels: Record<string, string> = {
          STAFF: 'Nhân viên bán hàng',
          WAREHOUSE: 'Thủ kho',
          ACCOUNTANT: 'Kế toán',
          MANAGER: 'Quản lý',
          TENANT_ADMIN: 'Quản trị viên',
        };
        role = await roleRepo.save(roleRepo.create({ name, label: labels[name] ?? name, isSystem: true }));

        const perms = await permRepo.findBy({ code: In(permCodes) });
        await rpRepo.save(perms.map((p) => rpRepo.create({ roleId: role!.id, permissionId: p.id })));
      }
    }
  }

  // ─── Permission check (cached) ─────────────────────────────────────────────

  async checkPermission(roleName: string, code: string): Promise<boolean> {
    const tenantCode = this.tenantCtx.getTenantCode() ?? 'default';
    const cacheKey   = `${tenantCode}:${roleName}`;

    if (!this.cache.has(cacheKey)) {
      await this.loadCache(roleName, cacheKey);
    }
    return this.cache.get(cacheKey)?.has(code) ?? false;
  }

  async getPermissionsForRole(roleName: string): Promise<string[]> {
    const tenantCode = this.tenantCtx.getTenantCode() ?? 'default';
    const cacheKey   = `${tenantCode}:${roleName}`;
    if (!this.cache.has(cacheKey)) await this.loadCache(roleName, cacheKey);
    return [...(this.cache.get(cacheKey) ?? [])];
  }

  invalidateCache(roleName: string): void {
    const tenantCode = this.tenantCtx.getTenantCode() ?? 'default';
    this.cache.delete(`${tenantCode}:${roleName}`);
  }

  private async loadCache(roleName: string, cacheKey: string): Promise<void> {
    const ds   = await this.getDs();
    const rows = await ds.query(
      `SELECT p.code FROM role_permissions rp
       JOIN roles r ON rp.role_id = r.id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE r.name = ? AND r.deleted_at IS NULL`,
      [roleName],
    );
    this.cache.set(cacheKey, new Set(rows.map((r: any) => r.code)));
    // TTL 5 min
    setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async listRoles() {
    await this.ensureSeeded();
    const ds       = await this.getDs();
    const roleRepo = ds.getRepository(Role);
    const roles    = await roleRepo.find({ relations: ['rolePermissions', 'rolePermissions.permission'] });

    const userCounts: Record<string, number> = {};
    const rows = await ds.query(`SELECT role, COUNT(*) as cnt FROM users WHERE deleted_at IS NULL GROUP BY role`);
    rows.forEach((r: any) => { userCounts[r.role] = Number(r.cnt); });

    return roles.map((r) => ({
      id:          r.id,
      name:        r.name,
      label:       r.label,
      isSystem:    r.isSystem,
      userCount:   userCounts[r.name] ?? 0,
      permissions: r.rolePermissions.map((rp) => rp.permission.code),
    }));
  }

  async createRole(dto: CreateRoleDto) {
    await this.ensureSeeded();
    const ds       = await this.getDs();
    const roleRepo = ds.getRepository(Role);
    const permRepo = ds.getRepository(Permission);
    const rpRepo   = ds.getRepository(RolePermission);

    const systemNames = Object.keys(ROLE_DEFAULTS);
    if (systemNames.includes(dto.name.toUpperCase())) {
      throw new BadRequestException('Role name conflicts with a system role');
    }
    const existing = await roleRepo.findOne({ where: { name: dto.name.toUpperCase() } });
    if (existing) throw new BadRequestException('Role name already exists');

    const role  = await roleRepo.save(roleRepo.create({ name: dto.name.toUpperCase(), label: dto.label, isSystem: false }));
    const perms = await permRepo.findBy({ code: In(dto.permissions) });
    await rpRepo.save(perms.map((p) => rpRepo.create({ roleId: role.id, permissionId: p.id })));

    return role;
  }

  async updatePermissions(roleId: string, dto: UpdateRolePermissionsDto) {
    const ds       = await this.getDs();
    const roleRepo = ds.getRepository(Role);
    const permRepo = ds.getRepository(Permission);
    const rpRepo   = ds.getRepository(RolePermission);

    const role = await roleRepo.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('Cannot modify system role permissions');

    await rpRepo.delete({ roleId });
    const perms = await permRepo.findBy({ code: In(dto.permissions) });
    await rpRepo.save(perms.map((p) => rpRepo.create({ roleId, permissionId: p.id })));

    this.invalidateCache(role.name);
    return { success: true };
  }

  async listPermissions() {
    await this.ensureSeeded();
    const ds = await this.getDs();
    return ds.getRepository(Permission).find({ order: { resource: 'ASC', action: 'ASC' } });
  }
}

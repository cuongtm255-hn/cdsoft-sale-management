import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/permission.decorator';
import { RolesService } from '../../tenant-module/roles/roles.service';
import { TenantContextService } from '../../tenant/tenant-context.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolesService: RolesService,
    private readonly tenantCtx: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const req = context.switchToHttp().getRequest();
    const tenantCode =
      (req.headers['x-tenant-code'] as string | undefined)
      ?? req.user?.tenantCode
      ?? req.body?.tenantCode;

    if (tenantCode && !this.tenantCtx.getTenantCode()) {
      this.tenantCtx.setTenantCode(tenantCode);
    }

    const { user } = req;
    if (!user?.role) throw new ForbiddenException('Not authenticated');

    const ok = await this.rolesService.checkPermission(user.role, required);
    if (!ok) throw new ForbiddenException(`Permission denied: ${required}`);
    return true;
  }
}

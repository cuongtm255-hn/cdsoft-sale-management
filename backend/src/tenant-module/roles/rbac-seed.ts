import { DataSource, In } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';

export const ALL_PERMISSIONS: { code: string; resource: string; action: string; label: string }[] = [
  { code: 'products:read', resource: 'products', action: 'read', label: 'Xem sản phẩm' },
  { code: 'products:write', resource: 'products', action: 'write', label: 'Tạo/Sửa sản phẩm' },
  { code: 'products:delete', resource: 'products', action: 'delete', label: 'Xóa sản phẩm' },
  { code: 'cost_price:read', resource: 'products', action: 'read', label: 'Xem giá vốn' },
  { code: 'customers:read', resource: 'customers', action: 'read', label: 'Xem khách hàng' },
  { code: 'customers:write', resource: 'customers', action: 'write', label: 'Tạo/Sửa khách hàng' },
  { code: 'orders:read', resource: 'orders', action: 'read', label: 'Xem đơn hàng' },
  { code: 'orders:write', resource: 'orders', action: 'write', label: 'Tạo/Sửa đơn hàng' },
  { code: 'orders:confirm', resource: 'orders', action: 'confirm', label: 'Xác nhận đơn hàng' },
  { code: 'orders:cancel', resource: 'orders', action: 'cancel', label: 'Hủy đơn hàng' },
  { code: 'inventory:read', resource: 'inventory', action: 'read', label: 'Xem tồn kho' },
  { code: 'inventory:write', resource: 'inventory', action: 'write', label: 'Nhập/Xuất kho' },
  { code: 'inventory:adjust', resource: 'inventory', action: 'adjust', label: 'Điều chỉnh kho' },
  { code: 'payments:read', resource: 'payments', action: 'read', label: 'Xem thanh toán' },
  { code: 'payments:write', resource: 'payments', action: 'write', label: 'Ghi nhận thanh toán' },
  { code: 'reports:read', resource: 'reports', action: 'read', label: 'Xem báo cáo' },
  { code: 'reports.finance:read', resource: 'reports', action: 'read', label: 'Xem báo cáo tài chính' },
  { code: 'users:read', resource: 'users', action: 'read', label: 'Xem nhân viên' },
  { code: 'users:write', resource: 'users', action: 'write', label: 'Tạo/Sửa nhân viên' },
  { code: 'roles:read', resource: 'roles', action: 'read', label: 'Xem phân quyền' },
  { code: 'roles:write', resource: 'roles', action: 'write', label: 'Sửa phân quyền' },
  { code: 'settings:write', resource: 'settings', action: 'write', label: 'Sửa cài đặt' },
  { code: 'audit_logs:read', resource: 'audit_logs', action: 'read', label: 'Xem nhật ký' },
];

export const ROLE_DEFAULTS: Record<string, string[]> = {
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
  TENANT_ADMIN: ALL_PERMISSIONS.map((permission) => permission.code),
};

export const ROLE_LABELS: Record<string, string> = {
  STAFF: 'Nhân viên bán hàng',
  WAREHOUSE: 'Thủ kho',
  ACCOUNTANT: 'Kế toán',
  MANAGER: 'Quản lý',
  TENANT_ADMIN: 'Quản trị viên',
};

export async function ensureTenantRbacSeeded(ds: DataSource): Promise<void> {
  const permRepo = ds.getRepository(Permission);
  const roleRepo = ds.getRepository(Role);
  const rpRepo = ds.getRepository(RolePermission);

  for (const permission of ALL_PERMISSIONS) {
    const existing = await permRepo.findOne({ where: { code: permission.code } });
    if (!existing) {
      await permRepo.save(permRepo.create(permission));
    }
  }

  for (const [roleName, permissionCodes] of Object.entries(ROLE_DEFAULTS)) {
    let role = await roleRepo.findOne({ where: { name: roleName } });
    if (!role) {
      role = await roleRepo.save(
        roleRepo.create({
          name: roleName,
          label: ROLE_LABELS[roleName] ?? roleName,
          isSystem: true,
        }),
      );
    }

    const permissions = await permRepo.findBy({ code: In(permissionCodes) });
    const existingRolePermissions = await rpRepo.findBy({ roleId: role.id });
    const existingPermissionIds = new Set(existingRolePermissions.map((rp) => rp.permissionId));
    const missingRolePermissions = permissions
      .filter((permission) => !existingPermissionIds.has(permission.id))
      .map((permission) => rpRepo.create({ roleId: role.id, permissionId: permission.id }));

    if (missingRolePermissions.length > 0) {
      await rpRepo.save(missingRolePermissions);
    }
  }
}

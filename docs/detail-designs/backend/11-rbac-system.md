# MODULE 11 — RBAC, Audit Log & System: Backend Detail Design

> Ref: `usecase.md` UC-29, UC-30 | `srs-tenant-detail.md` Ch.8 | Feature list tasks #125–#136
> Stack: **NestJS 10 + TypeORM + MySQL** | Source: `backend/src/`

---

## Cấu trúc file đề xuất

```
backend/src/
└── tenant-module/
    ├── roles/
    │   ├── entities/
    │   │   ├── role.entity.ts
    │   │   ├── permission.entity.ts
    │   │   └── role-permission.entity.ts
    │   ├── dto/
    │   │   ├── create-role.dto.ts
    │   │   └── update-role-permissions.dto.ts
    │   ├── roles.controller.ts
    │   ├── roles.service.ts
    │   └── roles.module.ts
    ├── audit-log/
    │   ├── entities/audit-log.entity.ts
    │   ├── audit-log.interceptor.ts
    │   ├── audit-log.controller.ts
    │   ├── audit-log.service.ts
    │   └── audit-log.module.ts
    ├── warehouses/
    │   ├── entities/warehouse.entity.ts
    │   ├── warehouses.controller.ts
    │   ├── warehouses.service.ts
    │   └── warehouses.module.ts
    └── finance/
        ├── entities/
        │   ├── cash-fund.entity.ts
        │   └── bank-account.entity.ts
        ├── dto/
        ├── finance.controller.ts
        ├── finance.service.ts
        └── finance.module.ts
```

---

## 11.1 Role-Based Access Control

### Task #125 — RBAC Schema & Entities

**Mô hình:** `User.role (string)` → `Role` → `RolePermission[]` → `Permission`

> Lưu ý: Hiện tại `RolesGuard` đang dùng `user.role` (string) so với `@Roles()` decorator. RBAC granular mở rộng thêm permission-level check.

**`role.entity.ts`**
```typescript
import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { RolePermission } from './role-permission.entity';

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ length: 50, unique: true })
  name: string; // 'STAFF', 'WAREHOUSE', 'ACCOUNTANT', 'MANAGER', 'TENANT_ADMIN'

  @Column({ length: 100 })
  label: string; // 'Nhân viên bán hàng'

  @Column({ default: false })
  isSystem: boolean; // system roles không cho sửa permissions

  @OneToMany(() => RolePermission, (rp) => rp.role)
  rolePermissions: RolePermission[];
}
```

**`permission.entity.ts`**
```typescript
@Entity('permissions')
export class Permission extends BaseEntity {
  @Column({ length: 100, unique: true })
  code: string; // 'products:read', 'orders:confirm', 'cost_price:read'

  @Column({ length: 50 })
  resource: string; // 'products', 'orders', 'inventory'

  @Column({ length: 30 })
  action: string; // 'read', 'write', 'delete', 'confirm'

  @Column({ length: 255, nullable: true })
  label: string; // 'Xem danh sách sản phẩm'
}
```

**`role-permission.entity.ts`**
```typescript
@Entity('role_permissions')
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Role, (r) => r.rolePermissions, { onDelete: 'CASCADE' })
  role: Role;

  @Column() roleId: string;

  @ManyToOne(() => Permission, { eager: true })
  permission: Permission;

  @Column() permissionId: string;
}
```

---

### Task #125 — Permission Map (Seed Data)

Seed file: `backend/src/tenant-module/roles/seeds/default-permissions.seed.ts`

| Permission code | STAFF | WAREHOUSE | ACCOUNTANT | MANAGER | ADMIN |
|----------------|-------|-----------|------------|---------|-------|
| `products:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `products:write` | ✅ | ❌ | ❌ | ✅ | ✅ |
| `products:delete` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `cost_price:read` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `customers:read` | ✅ | ❌ | ✅ | ✅ | ✅ |
| `customers:write` | ✅ | ❌ | ✅ | ✅ | ✅ |
| `orders:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `orders:write` | ✅ | ❌ | ❌ | ✅ | ✅ |
| `orders:confirm` | ✅ | ❌ | ❌ | ✅ | ✅ |
| `orders:cancel` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `inventory:read` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `inventory:write` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `inventory:adjust` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `payments:read` | ✅ | ❌ | ✅ | ✅ | ✅ |
| `payments:write` | ✅ | ❌ | ✅ | ✅ | ✅ |
| `reports:read` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `reports.finance:read` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `users:read` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `users:write` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `roles:write` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `settings:write` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `audit_logs:read` | ❌ | ❌ | ❌ | ✅ | ✅ |

---

### Task #126 — `PermissionGuard` (mở rộng `RolesGuard`)

File: `backend/src/common/guards/permission.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/permission.decorator';
import { RolesService } from '../../tenant-module/roles/roles.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermission) return true;

    const { user } = context.switchToHttp().getRequest();
    const hasPermission = await this.rolesService.checkPermission(user.role, requiredPermission);
    if (!hasPermission) {
      throw new ForbiddenException(`Permission denied: ${requiredPermission}`);
    }
    return true;
  }
}
```

**Decorator:** `backend/src/common/decorators/permission.decorator.ts`
```typescript
import { SetMetadata } from '@nestjs/common';
export const PERMISSION_KEY = 'permission';
export const RequirePermission = (permission: string) => SetMetadata(PERMISSION_KEY, permission);
```

**Usage on controller:**
```typescript
@Get()
@RequirePermission('products:read')
findAll() { ... }

@Delete(':id')
@RequirePermission('products:delete')
remove(@Param('id') id: string) { ... }
```

**Caching:** `rolesService.checkPermission()` nên cache kết quả trong Map (process-level) với TTL 5 phút. Invalidate khi `PUT /roles/:id/permissions` được gọi.

---

### Task #127 — `GET /tenant/roles`

**Auth:** `JwtAuthGuard` + `@RequirePermission('roles:read')`

**Controller:** `backend/src/tenant-module/roles/roles.controller.ts`

**Response 200:**
```json
[
  {
    "id": "uuid",
    "name": "STAFF",
    "label": "Nhân viên bán hàng",
    "isSystem": true,
    "userCount": 5,
    "permissions": ["products:read", "orders:read", "orders:write", "orders:confirm"]
  }
]
```

---

### Task #127 — `POST /tenant/roles`

**Auth:** `@RequirePermission('roles:write')`

**`create-role.dto.ts`**
```typescript
export class CreateRoleDto {
  @IsString() @Length(2, 50) name: string;
  @IsString() @Length(2, 100) label: string;
  @IsArray() @IsString({ each: true }) permissions: string[]; // ['products:read', ...]
}
```

**Business Rules:**
1. `name` unique trong tenant, không trùng system role names
2. Validate từng permission code tồn tại trong `permissions` table
3. `isSystem = false` cho custom roles

---

### Task #127 — `PUT /tenant/roles/:id/permissions`

**Auth:** `@RequirePermission('roles:write')`

**`update-role-permissions.dto.ts`**
```typescript
export class UpdateRolePermissionsDto {
  @IsArray() @IsString({ each: true }) permissions: string[];
}
```

**Service logic:**
```typescript
async updatePermissions(roleId: string, dto: UpdateRolePermissionsDto) {
  const role = await this.roleRepo.findOneOrFail({ where: { id: roleId } });
  if (role.isSystem) throw new BadRequestException('Cannot modify system role permissions');

  // Delete existing, insert new
  await this.rolePermRepo.delete({ roleId });
  const perms = await this.permissionRepo.findBy({ code: In(dto.permissions) });
  await this.rolePermRepo.save(perms.map(p => ({ roleId, permissionId: p.id })));

  // Invalidate cache
  this.rolesService.invalidateCache(role.name);
}
```

---

## 11.2 Audit Log

### Task #129 — `AuditLogInterceptor`

File: `backend/src/tenant-module/audit-log/audit-log.interceptor.ts`

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { tap } from 'rxjs/operators';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const { method, url, user, body, params } = req;

    // Only log mutations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next.handle();

    return next.handle().pipe(
      tap(async (responseData) => {
        await this.auditLogService.log({
          userId: user?.id,
          userName: user?.name,
          userRole: user?.role,
          action: `${method} ${url}`,
          resource: this.extractResource(url),
          resourceId: params?.id,
          afterData: this.sanitize(responseData),
          ipAddress: req.ip,
        });
      }),
    );
  }

  private extractResource(url: string): string {
    const parts = url.replace(/\/tenant\//, '').split('/');
    return parts[0] ?? 'unknown';
  }

  private sanitize(data: any): any {
    if (!data) return null;
    const sensitive = ['password', 'passwordHash', 'token', 'refreshToken'];
    const clone = JSON.parse(JSON.stringify(data ?? {}));
    sensitive.forEach(k => delete clone[k]);
    return clone;
  }
}
```

**Đăng ký global trong `tenant-app.module.ts`:**
```typescript
{ provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor }
```

**`audit-log.entity.ts`**
```typescript
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ nullable: true }) userId: string;
  @Column({ length: 255, nullable: true }) userName: string;
  @Column({ length: 50, nullable: true }) userRole: string;
  @Column({ length: 200 }) action: string;        // 'POST /tenant/orders'
  @Column({ length: 50 }) resource: string;       // 'orders'
  @Column({ nullable: true }) resourceId: string;
  @Column({ type: 'json', nullable: true }) beforeData: object;
  @Column({ type: 'json', nullable: true }) afterData: object;
  @Column({ length: 45, nullable: true }) ipAddress: string;
  @CreateDateColumn() createdAt: Date;
}
```

---

### Task #130 — `GET /tenant/audit-logs`

**Auth:** `@RequirePermission('audit_logs:read')`

**Query Params (DTO):**
```typescript
export class AuditLogQueryDto extends PaginationDto {
  @IsOptional() @IsUUID() userId?: string;
  @IsOptional() @IsString() resource?: string;
  @IsOptional() @IsString() action?: string;    // 'POST', 'PUT', 'DELETE', 'PATCH'
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
```

**Service query pattern:**
```typescript
const qb = this.auditLogRepo.createQueryBuilder('log')
  .orderBy('log.createdAt', 'DESC');

if (dto.userId)   qb.andWhere('log.userId = :userId', { userId: dto.userId });
if (dto.resource) qb.andWhere('log.resource = :resource', { resource: dto.resource });
if (dto.from)     qb.andWhere('log.createdAt >= :from', { from: dto.from });
if (dto.to)       qb.andWhere('log.createdAt <= :to', { to: dto.to });

const [data, total] = await qb.skip(dto.skip).take(dto.limit).getManyAndCount();
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "Nguyen Van A",
      "userRole": "STAFF",
      "action": "PATCH /tenant/orders/:id/confirm",
      "resource": "orders",
      "resourceId": "uuid",
      "beforeData": { "status": "DRAFT" },
      "afterData": { "status": "CONFIRMED" },
      "ipAddress": "192.168.1.10",
      "createdAt": "2026-04-22T14:30:05Z"
    }
  ],
  "meta": { "total": 1250, "page": 1, "limit": 50 }
}
```

---

## 11.3 Warehouse Management

### Task #132 — Warehouse CRUD

**Entity:** `backend/src/tenant-module/warehouses/entities/warehouse.entity.ts`
```typescript
@Entity('warehouses')
export class Warehouse extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ default: true })
  isActive: boolean;
}
```

**Endpoints:**
- `GET /tenant/warehouses` — list active warehouses
- `POST /tenant/warehouses` — `@RequirePermission('settings:write')`
- `PUT /tenant/warehouses/:id` — `@RequirePermission('settings:write')`
- `DELETE /tenant/warehouses/:id` — chặn nếu có `inventory_balances.quantity > 0`

---

## 11.4 Cash & Bank Management

### Task #132 — Entities

**`cash-fund.entity.ts`**
```typescript
@Entity('cash_funds')
export class CashFund extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  balance: number;

  @Column({ length: 10, default: 'VND' })
  currency: string;

  @Column({ default: true })
  isActive: boolean;
}
```

**`bank-account.entity.ts`**
```typescript
@Entity('bank_accounts')
export class BankAccount extends BaseEntity {
  @Column({ length: 100 }) bankName: string;
  @Column({ length: 50 })  accountNumber: string;
  @Column({ length: 255 }) accountName: string;
  @Column({ length: 100, nullable: true }) branch: string;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) balance: number;
  @Column({ length: 10, default: 'VND' }) currency: string;
  @Column({ default: true }) isActive: boolean;
}
```

### Task #133 — Manual Receipt/Disbursement

**`POST /tenant/finance/receipts`** (phiếu thu thủ công)
**`POST /tenant/finance/disbursements`** (phiếu chi)

**`create-disbursement.dto.ts`**
```typescript
export class CreateDisbursementDto {
  @IsEnum(['SUPPLIER_PAYMENT', 'SALARY', 'OVERHEAD', 'OTHER'])
  disbursementType: string;

  @IsOptional() @IsUUID() supplierId?: string;
  @IsOptional() @IsUUID() apRecordId?: string;
  @IsOptional() @IsUUID() cashFundId?: string;
  @IsOptional() @IsUUID() bankAccountId?: string;

  @IsNumber() @Min(0.01) amount: number;

  @IsOptional() @IsString() description: string;

  @IsBoolean() @IsOptional() requiresApproval: boolean = false;
}
```

**Approval flow:**
- Disbursement > configurable threshold → `status = 'PENDING_APPROVAL'`
- `PATCH /tenant/finance/disbursements/:id/approve` — `@Roles('MANAGER', 'TENANT_ADMIN')`
- `PATCH /tenant/finance/disbursements/:id/reject` — body: `{ reason: string }`

### Task #134 — Bank Reconciliation

**`POST /tenant/finance/bank-reconciliation/import`**
- Accepts: `multipart/form-data` với file CSV/XLSX
- Parse sao kê → match với `payments` / `disbursements` theo `transactionRef` hoặc `amount + date ± 1 ngày`
- Trả về `matched[]` và `unmatched[]`

**`GET /tenant/finance/bank-reconciliation/unmatched`**
- Danh sách giao dịch trong sao kê chưa khớp với bất kỳ chứng từ nào

---

## Database Schema (Migration)

```typescript
// Migration: CreateRbacTables
export class CreateRbacTables implements MigrationInterface {
  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`
      CREATE TABLE roles (
        id         VARCHAR(36) PRIMARY KEY,
        name       VARCHAR(50) NOT NULL UNIQUE,
        label      VARCHAR(100) NOT NULL,
        is_system  TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE permissions (
        id       VARCHAR(36) PRIMARY KEY,
        code     VARCHAR(100) NOT NULL UNIQUE,
        resource VARCHAR(50) NOT NULL,
        action   VARCHAR(30) NOT NULL,
        label    VARCHAR(255) NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE role_permissions (
        id            VARCHAR(36) PRIMARY KEY,
        role_id       VARCHAR(36) NOT NULL,
        permission_id VARCHAR(36) NOT NULL,
        UNIQUE KEY uq_role_perm (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id          VARCHAR(36) PRIMARY KEY,
        user_id     VARCHAR(36) NULL,
        user_name   VARCHAR(255) NULL,
        user_role   VARCHAR(50) NULL,
        action      VARCHAR(200) NOT NULL,
        resource    VARCHAR(50) NOT NULL,
        resource_id VARCHAR(36) NULL,
        before_data JSON NULL,
        after_data  JSON NULL,
        ip_address  VARCHAR(45) NULL,
        created_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_audit_resource (resource),
        INDEX idx_audit_user (user_id),
        INDEX idx_audit_created (created_at)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE warehouses (
        id         VARCHAR(36) PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        address    TEXT NULL,
        is_active  TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL
      )
    `);
  }
}
```

---

## Notes (đối chiếu source hiện tại)

- `RolesGuard` hiện tại (`roles.guard.ts`) chỉ check `user.role` string → `PermissionGuard` là **bổ sung**, không thay thế — dùng song song
- `BaseEntity` đã có `deletedAt` (soft delete via `@DeleteDateColumn`) → dùng `withDeleted()` khi cần query cả deleted
- Tenant DB isolation: toàn bộ entities module 11 thuộc **tenant schema** → đặt trong `tenant-module/`
- `AuditLogInterceptor` dùng `APP_INTERCEPTOR` (global) thay vì gắn vào từng controller
- Audit log partition theo tháng nếu dữ liệu lớn: tạo partition trong migration riêng

# MODULE 1 — Platform Management: Backend Detail Design

> Ref: `usecase.md` UC-01 → UC-05 | Feature list tasks #1–#13

---

## Architecture Notes

- Platform module: `src/platform/` — manages SUPER_ADMIN + PLATFORM_OPERATOR users and tenants
- Uses shared (platform) database with standard `@InjectRepository()` pattern
- Route prefix: `platform/` for all endpoints in this module
- Guard pattern: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)` on controllers
- JWT payload for platform users: `{ sub, email, role, userType: 'PLATFORM' }`, 8h expiry, **no refresh token**

---

## 1.0 Platform Auth

### `POST /platform/auth/login`

**Auth:** None — decorated with `@Public()`

**Request Body:**
```json
{ "email": "admin@platform.com", "password": "SuperSecret123" }
```

**DTO:**
```typescript
export class PlatformLoginDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() password: string;
}
```

**Business Rules:**
1. Query `platform_users` table (shared DB via `@InjectRepository(PlatformUser)`)
2. `bcrypt.compare(password, user.passwordHash)`
3. Check `user.status !== LOCKED`
4. Sign JWT: `{ sub, email, role, userType: 'PLATFORM' }`, expiresIn: `8 * 60 * 60`

**Response 200:**
```json
{ "accessToken": "eyJ...", "expiresIn": 28800 }
```

**Errors:**
| Code | HTTP | Condition |
|------|------|-----------|
| `UnauthorizedException` | 401 | Credentials sai hoặc tài khoản bị lock |

---

## 1.1 Tenant List

### `GET /platform/tenants`

**Auth:** JWT · `@Roles('SUPER_ADMIN', 'PLATFORM_OPERATOR')`

**Query Params:** `PaginationDto` — `page`, `limit`, `search`

**Controller:**
```typescript
@Get()
@Roles('SUPER_ADMIN', 'PLATFORM_OPERATOR')
findAll(@Query() pagination: PaginationDto) {
  return this.service.findAll(pagination);
}
```

**Service:**
```typescript
// Platform module uses standard @InjectRepository (not multi-tenant DataSource)
constructor(@InjectRepository(Tenant) private readonly repo: Repository<Tenant>) {}

async findAll(pagination: PaginationDto) {
  const [data, total] = await this.repo.findAndCount({
    skip: pagination.skip,
    take: pagination.limit,
    order: { createdAt: 'DESC' },
  });
  return { data, total, page: pagination.page, limit: pagination.limit };
}
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tenantCode": "ACME_CORP",
      "tenantName": "Acme",
      "companyName": "Acme Corporation",
      "contactEmail": "admin@acme.com",
      "contactName": "John Doe",
      "status": "ACTIVE",
      "provisioningStatus": "ACTIVE",
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 50, "page": 1, "limit": 20
}
```

---

## 1.2 Create Tenant + Provision

### `POST /platform/tenants`

**Auth:** `@Roles('SUPER_ADMIN')`

**DTO:**
```typescript
export class CreateTenantDto {
  @ApiProperty() @IsString() @Length(2, 50) tenantCode: string;
  @ApiProperty() @IsString() @Length(2, 100) tenantName: string;
  @ApiProperty() @IsString() @Length(2, 150) companyName: string;
  @ApiProperty() @IsString() contactName: string;
  @ApiProperty() @IsEmail() contactEmail: string;
  @ApiPropertyOptional() @IsString() @IsOptional() contactPhone?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() address?: string;
  @ApiPropertyOptional({ default: 'localhost' }) @IsString() @IsOptional() dbHost?: string;
  @ApiPropertyOptional({ default: 3306 }) @IsInt() @Min(1) @Max(65535) @IsOptional() dbPort?: number;
}
```

**Controller:**
```typescript
@Post()
@Roles('SUPER_ADMIN')
create(@Body() dto: CreateTenantDto, @CurrentUser() user: { id: string }) {
  return this.service.create(dto, user.id);
}
```

**Service:**
```typescript
async create(dto: CreateTenantDto, createdBy: string): Promise<Tenant> {
  const exists = await this.repo.findOne({ where: { tenantCode: dto.tenantCode } });
  if (exists) throw new ConflictException(`Tenant code '${dto.tenantCode}' already exists`);
  const tenant = this.repo.create({ ...dto, createdBy });
  return this.repo.save(tenant);
  // TODO: Dispatch ProvisionTenantJob after save
}
```

**Business Rules:**
1. `tenantCode` unique globally (stored in platform DB `tenants` table)
2. `contactEmail` unique globally
3. Tenant saved with `status = INACTIVE`, `provisioningStatus = PENDING`
4. After save, dispatch async `ProvisionTenantJob` (BullMQ — to be implemented)

**Response 201:** Full `Tenant` object

**Errors:**
| Code | HTTP | Condition |
|------|------|-----------|
| `ConflictException` | 409 | `tenantCode` hoặc `contactEmail` đã tồn tại |
| `ValidationError` | 422 | Thiếu/sai trường bắt buộc |

---

## 1.3 Provisioning Job (Task #3, #4)

**Status enums:**

```typescript
export enum TenantStatus { ACTIVE = 'ACTIVE', INACTIVE = 'INACTIVE', SUSPENDED = 'SUSPENDED' }
export enum ProvisioningStatus { PENDING = 'PENDING', PROVISIONING = 'PROVISIONING', ACTIVE = 'ACTIVE', FAILED = 'FAILED', SUSPENDED = 'SUSPENDED' }
```

**ProvisionTenantJob steps:**
1. Cập nhật `provisioningStatus = PROVISIONING`
2. Tạo schema/database riêng: `tenant_<tenantCode>` (lowercase sanitized)
3. Run TypeORM migrations cho tenant schema
4. Seed data: default roles, config
5. Tạo `TENANT_ADMIN` user trong tenant schema (hash password, gửi email onboarding)
6. Cập nhật `status = ACTIVE`, `provisioningStatus = ACTIVE`

**On failure:**
- Cập nhật `provisioningStatus = FAILED`
- Ghi log lỗi, gửi alert email cho SUPER_ADMIN

> Note: BullMQ (Redis) — to be implemented. Schema name: `tenant_${tenantCode.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`

---

## 1.4 Update Tenant

### `PUT /platform/tenants/:id`

**Auth:** `@Roles('SUPER_ADMIN')`

**DTO:**
```typescript
export class UpdateTenantDto {
  @ApiPropertyOptional() @IsString() @IsOptional() tenantName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() companyName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() contactName?: string;
  @ApiPropertyOptional() @IsEmail() @IsOptional() contactEmail?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() contactPhone?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() address?: string;
}
```

**Business Rules:**
1. `tenantCode` immutable — không có trong UpdateTenantDto
2. `contactEmail` unique if changed

**Response 200:** Updated `Tenant` object

---

## 1.5 Update Tenant Status

### `PATCH /platform/tenants/:id/status`

**Auth:** `@Roles('SUPER_ADMIN')`

**DTO:**
```typescript
export class UpdateTenantStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] }) @IsString() status: string;
}
```

**Service:**
```typescript
async updateStatus(id: string, dto: UpdateTenantStatusDto): Promise<Tenant> {
  const tenant = await this.findOne(id);
  tenant.status = dto.status as TenantStatus;
  return this.repo.save(tenant);
}
```

**Response 200:** Updated `Tenant` object

---

## 1.6 Platform Users

### `GET /platform/users` · `POST /platform/users` · `PUT /platform/users/:id` · `PATCH /platform/users/:id/lock`

**Auth:** `@UseGuards(JwtAuthGuard, RolesGuard)` · `@Roles('SUPER_ADMIN')` (class-level)

**Entity:**
```typescript
export enum PlatformRole { SUPER_ADMIN = 'SUPER_ADMIN', PLATFORM_OPERATOR = 'PLATFORM_OPERATOR' }
export enum UserStatus { ACTIVE = 'ACTIVE', INACTIVE = 'INACTIVE', LOCKED = 'LOCKED' }

@Entity('platform_users')
export class PlatformUser extends BaseEntity {
  @Column({ unique: true }) username: string;
  @Column({ unique: true }) email: string;
  @Column({ select: false }) @Exclude() passwordHash: string;
  @Column({ type: 'enum', enum: PlatformRole }) role: PlatformRole;
  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE }) status: UserStatus;
  @Column({ nullable: true }) lastLoginAt?: Date;
}
```

**CreatePlatformUserDto:**
```typescript
export class CreatePlatformUserDto {
  @ApiProperty() @IsString() username: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ minLength: 10 }) @IsString() @MinLength(10) password: string;
  @ApiProperty({ enum: PlatformRole }) @IsEnum(PlatformRole) role: PlatformRole;
}
```

**toggleLock:** Toggles `status` between `ACTIVE` and `LOCKED` — no body needed.

---

## Database Schema

```sql
-- Platform (shared) DB
CREATE TABLE tenants (
  id                   UUID PRIMARY KEY,
  tenant_code          VARCHAR(50) NOT NULL UNIQUE,
  tenant_name          VARCHAR(100) NOT NULL,
  company_name         VARCHAR(150) NOT NULL,
  contact_name         VARCHAR(100) NOT NULL,
  contact_email        VARCHAR(150) NOT NULL UNIQUE,
  contact_phone        VARCHAR(20),
  address              TEXT,
  status               ENUM('ACTIVE','INACTIVE','SUSPENDED') DEFAULT 'INACTIVE',
  provisioning_status  ENUM('PENDING','PROVISIONING','ACTIVE','FAILED','SUSPENDED') DEFAULT 'PENDING',
  db_host              VARCHAR(100),
  db_port              INT,
  db_name              VARCHAR(100),
  db_username          VARCHAR(100),
  db_password_encrypted VARCHAR(500),
  created_by           UUID,
  created_at           DATETIME,
  updated_at           DATETIME,
  deleted_at           DATETIME
);

CREATE TABLE platform_users (
  id            UUID PRIMARY KEY,
  username      VARCHAR(50) NOT NULL UNIQUE,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('SUPER_ADMIN','PLATFORM_OPERATOR') NOT NULL,
  status        ENUM('ACTIVE','INACTIVE','LOCKED') DEFAULT 'ACTIVE',
  last_login_at DATETIME,
  created_at    DATETIME,
  updated_at    DATETIME,
  deleted_at    DATETIME
);
```

---

## Module Registration

```typescript
// src/platform/platform.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, PlatformUser]),
    JwtModule.registerAsync(...),
  ],
  controllers: [PlatformAuthController, TenantsController, UsersController],
  providers: [PlatformAuthService, TenantsService, UsersService],
})
export class PlatformModule {}
```

## Notes

- `synchronize: false` — all schema changes require TypeORM migrations
- Platform module uses standard `@InjectRepository()` (single shared DB, not multi-tenant)
- `tenantCode` used as the tenant identifier in JWT and provisioning; DB schema named `tenant_${tenantCode.toLowerCase()}`
- No refresh tokens in current implementation

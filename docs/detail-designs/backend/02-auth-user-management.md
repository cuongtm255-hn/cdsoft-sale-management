# MODULE 2 — Auth & User Management: Backend Detail Design

> Ref: `usecase.md` UC-06, UC-07 | `srs-tenant-detail.md` Ch.8.1 | Feature list tasks #14–#24

---

## Architecture Notes

- Tenant auth lives in `src/tenant-module/auth/`
- User management lives in `src/tenant-module/users/` (to be created)
- Service pattern: `getRepo()` via `TenantDataSourceManager` + `TenantContextService`
- Guard: `@UseGuards(JwtAuthGuard)` only — **no `RolesGuard`** on tenant module
- New controllers/services must be added to `TenantAppModule` (`controllers[]` + `providers[]`)
- JWT: 8h expiry, payload `{ sub, email, role, tenantCode, userType: 'TENANT' }` — **no refresh token**

---

## 2.1 Tenant Login

### `POST /tenant/auth/login`

**Auth:** None — decorated with `@Public()`

**Controller:**
```typescript
@ApiTags('Tenant Auth')
@Controller('tenant/auth')
export class TenantAuthController {
  @Public()
  @Post('login')
  login(@Body() dto: TenantLoginDto) {
    return this.service.login(dto);
  }
}
```

**DTO:**
```typescript
export class TenantLoginDto {
  @ApiProperty() @IsString() tenantCode: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() password: string;
}
```

**Service:**
```typescript
@Injectable()
export class TenantAuthService {
  constructor(
    private readonly dsManager: TenantDataSourceManager,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: TenantLoginDto) {
    const ds = await this.dsManager.getDataSource(dto.tenantCode);
    const userRepo = ds.getRepository(User);
    const user = await userRepo.findOne({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { sub: user.id, email: user.email, role: user.role,
                      tenantCode: dto.tenantCode, userType: 'TENANT' };
    return { accessToken: this.jwtService.sign(payload), expiresIn: 8 * 60 * 60 };
  }
}
```

**Business Rules:**
1. Lookup tenant DataSource bằng `tenantCode` — throws `NotFoundException` nếu không tìm thấy
2. Query `users` table trong tenant DB
3. `bcrypt.compare` password
4. Check user `status === ACTIVE`
5. Sign JWT với `expiresIn: 8 * 60 * 60`

**Response 200:**
```json
{ "accessToken": "eyJ...", "expiresIn": 28800 }
```

**Errors:**
| Code | HTTP | Condition |
|------|------|-----------|
| `UnauthorizedException` | 401 | Credentials sai |
| `NotFoundException` | 404 | `tenantCode` không tồn tại |

> Note: Refresh token mechanism not implemented. Future: add `POST /tenant/auth/refresh` + `POST /tenant/auth/logout`.

---

## 2.2 User Management

### Base Service Pattern

```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly dsManager: TenantDataSourceManager,
    private readonly tenantCtx: TenantContextService,
  ) {}

  private async getRepo() {
    const code = this.tenantCtx.getTenantCode()!;
    const ds = await this.dsManager.getDataSource(code);
    return ds.getRepository(User);
  }
}
```

### `GET /tenant/users`

**Auth:** `@UseGuards(JwtAuthGuard)` — no RolesGuard

**Query:** `PaginationDto` (`page`, `limit`, `search`)

**Service:**
```typescript
async findAll(pagination: PaginationDto) {
  const repo = await this.getRepo();
  const [data, total] = await repo.findAndCount({
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
    { "id": "uuid", "fullName": "Jane Staff", "email": "jane@acme.com",
      "role": "STAFF", "status": "ACTIVE", "createdAt": "2026-01-01T00:00:00Z" }
  ],
  "total": 15, "page": 1, "limit": 20
}
```

---

### `POST /tenant/users`

**DTO:**
```typescript
export class CreateUserDto {
  @ApiProperty() @IsString() fullName: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(8) password: string;
  @ApiProperty({ enum: ['STAFF','WAREHOUSE','ACCOUNTANT','MANAGER','TENANT_ADMIN'] })
  @IsString() role: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
}
```

**Service:**
```typescript
async create(dto: CreateUserDto) {
  const repo = await this.getRepo();
  const exists = await repo.findOne({ where: { email: dto.email } });
  if (exists) throw new ConflictException('Email already exists');
  const passwordHash = await bcrypt.hash(dto.password, 12);
  const user = repo.create({ ...dto, passwordHash });
  return repo.save(user);
}
```

---

### `PUT /tenant/users/:id`

**DTO:**
```typescript
export class UpdateUserDto {
  @ApiPropertyOptional() @IsString() @IsOptional() fullName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() role?: string;
}
```

**Business Rules:**
1. Email không thể sửa
2. User không thể đổi role của chính mình

---

### `PATCH /tenant/users/:id/status`

**DTO:** `{ "status": "ACTIVE" | "INACTIVE" }`

**Business Rules:**
1. User không thể deactivate chính mình
2. Deactivate → user không thể login nữa

---

## 2.3 Change Password

### `PATCH /tenant/auth/change-password`

**Auth:** `@UseGuards(JwtAuthGuard)`

**DTO:**
```typescript
export class ChangePasswordDto {
  @ApiProperty() @IsString() currentPassword: string;
  @ApiProperty() @IsString() @MinLength(8) newPassword: string;
}
```

**Service:**
1. Lấy `userId` từ JWT (`@CurrentUser() user`)
2. `getRepo()` → tìm user
3. `bcrypt.compare(currentPassword, user.passwordHash)` — nếu sai: `UnauthorizedException`
4. `bcrypt.hash(newPassword, 12)` → update `passwordHash`

---

## Database Schema (Tenant DB)

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY,
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  role          ENUM('STAFF','WAREHOUSE','ACCOUNTANT','MANAGER','TENANT_ADMIN') NOT NULL,
  status        ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  created_at    DATETIME,
  updated_at    DATETIME,
  deleted_at    DATETIME
);
```

---

## Roles Summary

| Role | Access Level |
|------|-------------|
| `TENANT_ADMIN` | Full access, user management |
| `MANAGER` | View all reports, approve discounts |
| `ACCOUNTANT` | Payments, AR/AP, financial reports; no product edit |
| `WAREHOUSE` | Stock in/out/adjust; no financial data |
| `STAFF` | Create orders, view products/customers; no cost price |

> Role-based UI filtering is done on the frontend by reading `role` from JWT payload via `useAuth()`.

---

## Module Registration

Add to `TenantAppModule`:
```typescript
// src/tenant-module/tenant-app.module.ts
controllers: [TenantAuthController, ProductsController, UsersController],
providers:   [TenantAuthService,    ProductsService,    UsersService],
```

## Notes

- `synchronize: false` — user table requires a migration in each tenant schema
- `@UseGuards(JwtAuthGuard)` on controller class covers all routes in tenant module
- `TenantContextService.getTenantCode()` reads from `AsyncLocalStorage` populated by tenant middleware
- 2FA, login attempt tracking, account lockout: future features not in current implementation

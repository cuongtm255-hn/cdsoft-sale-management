# Backend — Tài Liệu Cấu Trúc Source Code

> **Project:** `sales-platform-backend`  
> **Framework:** NestJS 10 · TypeORM 0.3 · MySQL 8  
> **Mục đích tài liệu:** Tham khảo thiết kế chi tiết (Detailed Design)

---

## 1. Tổng Quan Kiến Trúc

### 1.1 Mô hình Multi-Tenant

Hệ thống áp dụng chiến lược **Database-per-Tenant**:

| Layer | Database | Mô tả |
|-------|----------|-------|
| Platform (System) | `salesplatform_system` | Dữ liệu vận hành nền tảng: tenants, platform users, audit log |
| Tenant | `tenant_<code>` | Dữ liệu nghiệp vụ riêng của từng tenant: products, orders, customers, ... |

### 1.2 Phân Lớp Module

```
AppModule
├── TenantContextModule (Global)   ← Infrastructure: quản lý context & connection pool
├── PlatformModule                 ← API quản trị nền tảng (system DB)
└── TenantAppModule                ← API nghiệp vụ tenant (per-tenant DB)
```

### 1.3 Luồng Request

```
HTTP Request
    │
    ▼
[JwtAuthGuard]         ← xác thực JWT, bỏ qua nếu @Public()
    │
    ▼
[RolesGuard]           ← kiểm tra role nếu controller có @Roles()
    │
    ▼
[LoggingInterceptor]   ← log method, url, thời gian xử lý
    │
    ▼
Controller / Service
    │
    ▼
[TransformInterceptor] ← wrap response: { success, data, timestamp }
    │
    ▼
[HttpExceptionFilter]  ← bắt lỗi, chuẩn hóa error response
```

---

## 2. Cấu Trúc Thư Mục

```
backend/
├── src/
│   ├── main.ts                         # Bootstrap, Swagger, global middleware
│   ├── app.module.ts                   # Root module
│   │
│   ├── config/                         # Cấu hình ứng dụng
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   └── jwt.config.ts
│   │
│   ├── common/                         # Shared utilities
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── public.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── dto/
│   │   │   ├── api-response.dto.ts
│   │   │   └── pagination.dto.ts
│   │   ├── entities/
│   │   │   └── base.entity.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   └── interceptors/
│   │       ├── logging.interceptor.ts
│   │       └── transform.interceptor.ts
│   │
│   ├── platform/                       # Platform admin layer
│   │   ├── platform.module.ts
│   │   ├── auth/
│   │   │   ├── dto/login.dto.ts
│   │   │   ├── platform-auth.controller.ts
│   │   │   ├── platform-auth.module.ts
│   │   │   └── platform-auth.service.ts
│   │   ├── tenants/
│   │   │   ├── dto/create-tenant.dto.ts
│   │   │   ├── entities/tenant.entity.ts
│   │   │   ├── tenants.controller.ts
│   │   │   ├── tenants.module.ts
│   │   │   └── tenants.service.ts
│   │   └── users/
│   │       ├── dto/user.dto.ts
│   │       ├── entities/platform-user.entity.ts
│   │       ├── users.controller.ts
│   │       ├── users.module.ts
│   │       └── users.service.ts
│   │
│   ├── tenant/                         # Multi-tenant infrastructure
│   │   ├── tenant.module.ts
│   │   ├── tenant-context.service.ts
│   │   └── tenant-datasource.manager.ts
│   │
│   └── tenant-module/                  # Tenant business features
│       ├── tenant-app.module.ts
│       ├── auth/
│       │   ├── dto/tenant-login.dto.ts
│       │   ├── tenant-auth.controller.ts
│       │   └── tenant-auth.service.ts
│       └── products/
│           ├── dto/product.dto.ts
│           ├── entities/product.entity.ts
│           ├── products.controller.ts
│           └── products.service.ts
│
├── .env                                # Biến môi trường (không commit)
├── .env.example                        # Template môi trường
├── package.json
└── Dockerfile
```

---

## 3. Chi Tiết Từng Thành Phần

### 3.1 `main.ts` — Bootstrap

**File:** `src/main.ts`

Khởi tạo ứng dụng NestJS với các cấu hình toàn cục:

| Cấu hình | Giá trị | Mô tả |
|----------|---------|-------|
| Global prefix | `/api` | Tất cả route bắt đầu bằng `/api` |
| API Versioning | URI (`/v1/...`) | Hỗ trợ versioning qua URL |
| CORS | `FRONTEND_URL` env | Cho phép frontend truy cập |
| ValidationPipe | `whitelist: true` | Strip trường lạ, reject non-whitelisted |
| Swagger | `/api/docs` | UI tài liệu API tự động |
| Port | `8080` (default) | Cấu hình qua env `PORT` |

---

### 3.2 `app.module.ts` — Root Module

**File:** `src/app.module.ts`

Import và kết nối các module cốt lõi:

```
AppModule
├── ConfigModule.forRoot()         → load .env, .env.local
├── TypeOrmModule.forRootAsync()   → kết nối MySQL system DB
├── TenantContextModule            → Global, inject vào mọi nơi
├── PlatformModule                 → Platform API
└── TenantAppModule                → Tenant API
```

**TypeORM System DB:**
- `entities`: scan `platform/**/*.entity.ts`
- `synchronize`: chỉ bật khi `NODE_ENV=development`
- Migrations: `database/migrations/`

---

### 3.3 `config/` — Cấu Hình

#### `app.config.ts`

| Key | Env Var | Default |
|-----|---------|---------|
| `app.env` | `NODE_ENV` | `development` |
| `app.port` | `PORT` | `8080` |
| `app.frontendUrl` | `FRONTEND_URL` | `http://localhost:5173` |
| `app.bcryptRounds` | `BCRYPT_ROUNDS` | `12` |

#### `database.config.ts`

| Key | Env Var |
|-----|---------|
| `database.host` | `DB_HOST` |
| `database.port` | `DB_PORT` |
| `database.username` | `DB_USERNAME` |
| `database.password` | `DB_PASSWORD` |
| `database.name` | `DB_NAME` |

#### `jwt.config.ts`

| Key | Env Var | Default |
|-----|---------|---------|
| `jwt.secret` | `JWT_SECRET` | — |
| `jwt.accessExpiresIn` | `JWT_EXPIRES_IN` | `8h` |

---

### 3.4 `common/` — Shared Utilities

#### 3.4.1 `entities/base.entity.ts`

Tất cả entity kế thừa `BaseEntity`:

| Column | Type | Mô tả |
|--------|------|-------|
| `id` | `uuid` (PK) | Auto-generated UUID |
| `createdAt` | `datetime` | Tự động khi tạo |
| `updatedAt` | `datetime` | Tự động khi update |
| `deletedAt` | `datetime` (nullable) | Soft delete |

#### 3.4.2 `dto/pagination.dto.ts`

Query params chuẩn cho list API:

| Field | Type | Default | Validation |
|-------|------|---------|------------|
| `page` | number | 1 | Min: 1 |
| `limit` | number | 20 | Min: 1, Max: 100 |
| `search` | string | — | Optional |
| `skip` (getter) | number | — | `(page-1) * limit` |

#### 3.4.3 `dto/api-response.dto.ts`

Chuẩn response format:

```typescript
// Success
{ success: true, message: "Success", data: T, timestamp: string }

// Paginated
{ data: T[], total: number, page: number, limit: number, totalPages: number }

// Error (từ HttpExceptionFilter)
{ success: false, message: string, data: null, timestamp: string }
```

#### 3.4.4 Decorators

| Decorator | File | Mục đích |
|-----------|------|---------|
| `@Public()` | `public.decorator.ts` | Bypass JwtAuthGuard |
| `@Roles(...roles)` | `roles.decorator.ts` | Khai báo role yêu cầu |
| `@CurrentUser()` | `current-user.decorator.ts` | Lấy user từ JWT payload |

#### 3.4.5 Guards

**`JwtAuthGuard`** (`jwt-auth.guard.ts`):
- Kế thừa `AuthGuard('jwt')` từ Passport
- Kiểm tra metadata `IS_PUBLIC_KEY` → bỏ qua nếu route có `@Public()`
- Gắn user vào `request.user` sau khi xác thực

**`RolesGuard`** (`roles.guard.ts`):
- Đọc `@Roles()` metadata từ handler/controller
- So sánh `request.user.role` với danh sách role cho phép

#### 3.4.6 Interceptors

**`TransformInterceptor`**: Tự động wrap tất cả response:
```json
{ "success": true, "data": <original_response>, "timestamp": "2026-04-22T..." }
```

**`LoggingInterceptor`**: Log mỗi request với: method, URL, thời gian xử lý (ms).

#### 3.4.7 `HttpExceptionFilter`

Bắt tất cả `HttpException`, chuẩn hóa lỗi thành format đồng nhất và ghi log.

---

### 3.5 `platform/` — Platform Admin Layer

Module quản trị nền tảng, kết nối **system database**.

#### 3.5.1 `platform.module.ts`

```
PlatformModule
├── PlatformAuthModule
├── TenantsModule
└── UsersModule
```

#### 3.5.2 `platform/auth/` — Platform Authentication

**`PlatformAuthController`**

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/api/platform/auth/login` | @Public | Đăng nhập platform user |

**`PlatformAuthService`**

- `login(dto)`: Validate credentials → generate JWT
- JWT payload: `{ sub, email, role, userType: 'PLATFORM' }`
- **TODO**: Query `platform_users` table (hiện chưa implement)

**`PlatformAuthModule`**: Đăng ký `JwtModule`, export cho các module khác.

**DTOs:**

| DTO | Fields |
|-----|--------|
| `PlatformLoginDto` | `email: string`, `password: string` |
| `AuthTokenDto` | `accessToken: string`, `expiresIn: number` |

#### 3.5.3 `platform/tenants/` — Tenant Management

**`Tenant` Entity** (bảng `tenants`):

| Column | Type | Constraint | Mô tả |
|--------|------|------------|-------|
| `id` | uuid | PK | Từ BaseEntity |
| `tenantCode` | varchar(50) | UNIQUE | Mã định danh tenant |
| `tenantName` | varchar(100) | | Tên hiển thị |
| `companyName` | varchar(150) | | Tên công ty |
| `contactName` | varchar(100) | | Người liên hệ |
| `contactEmail` | varchar(150) | UNIQUE | Email liên hệ |
| `contactPhone` | varchar(20) | nullable | SĐT |
| `address` | text | nullable | Địa chỉ |
| `status` | enum | default: INACTIVE | ACTIVE / INACTIVE / SUSPENDED |
| `provisioningStatus` | enum | default: PENDING | PENDING / PROVISIONING / ACTIVE / FAILED / SUSPENDED |
| `dbHost` | varchar(100) | nullable | Host DB tenant |
| `dbPort` | int | nullable | Port DB tenant |
| `dbName` | varchar(100) | nullable | Tên DB tenant |
| `dbUsername` | varchar(100) | nullable | DB user |
| `dbPasswordEncrypted` | varchar(500) | nullable, select:false | Mật khẩu DB (encrypted) |
| `createdBy` | uuid | nullable | ID platform user tạo |

**`TenantsController`** — Route prefix: `/api/platform/tenants`

| Method | Path | Role | Mô tả |
|--------|------|------|-------|
| GET | `/` | SUPER_ADMIN, PLATFORM_OPERATOR | Danh sách tenant (phân trang) |
| GET | `/:id` | SUPER_ADMIN, PLATFORM_OPERATOR | Chi tiết tenant |
| POST | `/` | SUPER_ADMIN | Tạo mới tenant |
| PUT | `/:id` | SUPER_ADMIN | Cập nhật thông tin tenant |
| PATCH | `/:id/status` | SUPER_ADMIN | Cập nhật trạng thái tenant |

**`TenantsService`**:

| Method | Logic |
|--------|-------|
| `findAll(pagination)` | `findAndCount` với skip/take, order by `createdAt DESC` |
| `findOne(id)` | Find by PK, throw `NotFoundException` nếu không tồn tại |
| `create(dto, createdBy)` | Check unique `tenantCode`, save entity |
| `update(id, dto)` | `Object.assign` + save |
| `updateStatus(id, dto)` | Update field `status` |

**DTOs:**

| DTO | Mục đích |
|-----|---------|
| `CreateTenantDto` | Tạo tenant: tenantCode, tenantName, companyName, contactName, contactEmail, dbHost?, dbPort? |
| `UpdateTenantDto` | Cập nhật: tenantName, companyName, contactName, contactEmail, contactPhone, address |
| `UpdateTenantStatusDto` | Enum: ACTIVE / INACTIVE / SUSPENDED |

#### 3.5.4 `platform/users/` — Platform User Management

**`PlatformUser` Entity** (bảng `platform_users`):

| Column | Type | Constraint | Mô tả |
|--------|------|------------|-------|
| `id` | uuid | PK | |
| `username` | varchar(50) | UNIQUE | |
| `email` | varchar(150) | UNIQUE | |
| `passwordHash` | varchar | select:false | Bcrypt hash |
| `role` | enum | | SUPER_ADMIN / PLATFORM_OPERATOR |
| `status` | enum | default: ACTIVE | ACTIVE / INACTIVE / LOCKED |
| `lastLoginAt` | datetime | nullable | |

**`UsersController`** — Route prefix: `/api/platform/users` — Yêu cầu SUPER_ADMIN

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/` | Danh sách platform users |
| POST | `/` | Tạo mới platform user |
| PUT | `/:id` | Cập nhật thông tin |
| PATCH | `/:id/lock` | Toggle lock/unlock tài khoản |

---

### 3.6 `tenant/` — Multi-Tenant Infrastructure

Module **Global**, cung cấp dịch vụ quản lý context và connection pool cho toàn bộ ứng dụng.

#### 3.6.1 `TenantContextService`

Sử dụng **`AsyncLocalStorage`** (Node.js) để lưu context tenant theo từng request/fiber:

```typescript
interface TenantContext {
  tenantCode: string;
  userId?: string;
  userRole?: string;
}
```

| Method | Mô tả |
|--------|-------|
| `run(context, fn)` | Khởi chạy fn trong scope context |
| `get()` | Lấy context hiện tại |
| `getTenantCode()` | Shortcut lấy tenantCode |

**Luồng sử dụng:** Middleware/Guard đọc `tenantCode` từ JWT → gọi `run()` → các Service gọi `getTenantCode()` để lấy đúng DataSource.

#### 3.6.2 `TenantDataSourceManager`

Quản lý connection pool cho tất cả tenant databases:

| Thuộc tính | Type | Mô tả |
|------------|------|-------|
| `registry` | `Map<string, DataSource>` | Cache connection theo tenantCode |

| Method | Mô tả |
|--------|-------|
| `getDataSource(tenantCode)` | Trả về DataSource từ cache, hoặc tạo mới nếu chưa có |
| `evict(tenantCode)` | Destroy và xóa connection khỏi cache |
| `resolveTenantDbConfig(tenantCode)` | **TODO**: Query system DB để lấy thông tin DB của tenant |

**Entities scan:** `tenant-module/**/*.entity.ts`  
**Lưu ý:** `synchronize: false` trong production, cần chạy migration riêng cho từng tenant.

---

### 3.7 `tenant-module/` — Tenant Business Features

Các tính năng nghiệp vụ chạy trên **per-tenant database**.

#### 3.7.1 `TenantAppModule`

```
TenantAppModule
├── JwtModule (async)
├── TenantAuthController
├── TenantAuthService
├── ProductsController
└── ProductsService
```

#### 3.7.2 `tenant-module/auth/` — Tenant Authentication

**`TenantAuthController`** — Route: `/api/tenant/auth`

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/login` | @Public | Đăng nhập tenant user |

**`TenantAuthService`**:
- Validate user trong tenant DB
- JWT payload: `{ sub, email, role, tenantCode, userType: 'TENANT' }`

**`TenantLoginDto`**: `tenantCode: string`, `email: string`, `password: string`

#### 3.7.3 `tenant-module/products/` — Product Management

**`Product` Entity** (bảng `products` trong tenant DB):

| Column | Type | Constraint | Mô tả |
|--------|------|------------|-------|
| `id` | uuid | PK | |
| `sku` | varchar(50) | UNIQUE | Mã sản phẩm |
| `name` | varchar(200) | | Tên sản phẩm |
| `description` | text | nullable | Mô tả |
| `costPrice` | decimal(15,2) | | Giá nhập |
| `sellingPrice` | decimal(15,2) | | Giá bán |
| `stockQuantity` | int | default: 0 | Số lượng tồn kho |
| `minStockLevel` | int | default: 0 | Mức tồn kho tối thiểu |
| `unit` | varchar(20) | nullable | Đơn vị (cái, kg, hộp...) |
| `categoryId` | uuid | nullable | FK → categories |
| `isActive` | boolean | default: true | Trạng thái |

**`ProductsController`** — Route: `/api/tenant/products`

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/` | Danh sách sản phẩm (phân trang) |
| GET | `/:id` | Chi tiết sản phẩm |
| POST | `/` | Tạo sản phẩm mới |
| PUT | `/:id` | Cập nhật sản phẩm |
| DELETE | `/:id` | Xóa sản phẩm (soft delete) |

**DTOs:**

| DTO | Required Fields | Optional Fields |
|-----|----------------|-----------------|
| `CreateProductDto` | sku, name, costPrice, sellingPrice | description, minStockLevel, unit, categoryId |
| `UpdateProductDto` | — | name, description, costPrice, sellingPrice, isActive |

---

## 4. Các API Endpoint Đã Định Nghĩa

### 4.1 Platform API (`/api/platform/...`)

| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| POST | `/platform/auth/login` | Public | — |
| GET | `/platform/tenants` | JWT | SUPER_ADMIN, PLATFORM_OPERATOR |
| GET | `/platform/tenants/:id` | JWT | SUPER_ADMIN, PLATFORM_OPERATOR |
| POST | `/platform/tenants` | JWT | SUPER_ADMIN |
| PUT | `/platform/tenants/:id` | JWT | SUPER_ADMIN |
| PATCH | `/platform/tenants/:id/status` | JWT | SUPER_ADMIN |
| GET | `/platform/users` | JWT | SUPER_ADMIN |
| POST | `/platform/users` | JWT | SUPER_ADMIN |
| PUT | `/platform/users/:id` | JWT | SUPER_ADMIN |
| PATCH | `/platform/users/:id/lock` | JWT | SUPER_ADMIN |

### 4.2 Tenant API (`/api/tenant/...`)

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/tenant/auth/login` | Public |
| GET/POST/PUT/DELETE | `/tenant/products` | JWT |

### 4.3 API Dự Kiến (Frontend đã gọi, Backend chưa implement)

| Endpoint | Mục đích |
|----------|---------|
| POST `/platform/tenants/:id/provision` | Khởi động lại provisioning |
| POST `/platform/tenants/:id/reset-admin` | Reset mật khẩu admin tenant |
| GET `/platform/tenants/:id/provisioning-log` | Log quá trình provisioning |
| GET `/platform/audit-logs` | Audit log toàn hệ thống |
| GET/POST `/tenant/categories` | Quản lý danh mục |
| GET/POST/PUT `/tenant/customers` | Quản lý khách hàng |
| GET/POST `/tenant/suppliers` | Quản lý nhà cung cấp |
| GET/POST `/tenant/inventory/transactions` | Giao dịch kho |
| POST `/tenant/inventory/stock-in` | Nhập kho |
| POST `/tenant/inventory/stock-out` | Xuất kho |
| POST `/tenant/inventory/adjust` | Điều chỉnh kho |
| GET/POST `/tenant/purchase-orders` | Đơn mua hàng |
| PATCH `/tenant/purchase-orders/:id/confirm` | Duyệt đơn mua |
| PATCH `/tenant/purchase-orders/:id/receive` | Nhận hàng |
| GET/POST `/tenant/sales-orders` | Đơn bán hàng |
| PATCH `/tenant/sales-orders/:id/confirm` | Duyệt đơn bán |
| PATCH `/tenant/sales-orders/:id/ship` | Giao hàng |
| PATCH `/tenant/sales-orders/:id/complete` | Hoàn thành đơn |
| GET `/tenant/invoices` | Danh sách hóa đơn/thanh toán |
| POST `/tenant/payments` | Ghi nhận thanh toán |
| GET `/tenant/dashboard/stats` | Thống kê dashboard |

---

## 5. Enums và Constants

### Platform

| Enum | Values |
|------|--------|
| `TenantStatus` | ACTIVE, INACTIVE, SUSPENDED |
| `ProvisioningStatus` | PENDING, PROVISIONING, ACTIVE, FAILED, SUSPENDED |
| `PlatformRole` | SUPER_ADMIN, PLATFORM_OPERATOR |
| `UserStatus` | ACTIVE, INACTIVE, LOCKED |

---

## 6. Phụ Thuộc Chính (Dependencies)

| Package | Version | Mục đích |
|---------|---------|---------|
| `@nestjs/core` | ^10 | NestJS framework |
| `@nestjs/typeorm` | ^10 | ORM integration |
| `@nestjs/jwt` | ^10 | JWT generation/validation |
| `@nestjs/passport` | ^10 | Authentication strategies |
| `@nestjs/swagger` | ^7 | Swagger/OpenAPI docs |
| `@nestjs/config` | ^3 | Configuration management |
| `typeorm` | ^0.3 | ORM |
| `mysql2` | ^3.6 | MySQL driver |
| `bcrypt` | ^5.1 | Password hashing |
| `passport-jwt` | ^4 | JWT Passport strategy |
| `class-validator` | ^0.14 | DTO validation |
| `class-transformer` | ^0.5 | DTO transformation |
| `rxjs` | ^7.8 | Reactive extensions |

---

## 7. Patterns & Conventions

### Naming Convention

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| File | kebab-case | `tenant-auth.service.ts` |
| Class | PascalCase | `TenantAuthService` |
| Method | camelCase | `findAll`, `createTenant` |
| Enum | SCREAMING_SNAKE_CASE | `SUPER_ADMIN` |

### Chuẩn Module Structure

Mỗi feature module (ví dụ `products`) bao gồm:
```
feature/
├── dto/           ← Input validation (class-validator)
├── entities/      ← TypeORM entity
├── feature.controller.ts   ← HTTP routing
├── feature.service.ts      ← Business logic
└── feature.module.ts       ← DI wiring
```

### Response Standard

- **Success list:** `{ data: T[], total, page, limit }`
- **Success single:** Wrap bởi `TransformInterceptor` → `{ success: true, data: T, timestamp }`
- **Error:** Wrap bởi `HttpExceptionFilter` → `{ success: false, message, timestamp }`

---

## 8. Điểm Chưa Implement (TODOs)

| Vị trí | Mô tả |
|--------|-------|
| `platform-auth.service.ts:16` | Query platform_users từ system DB |
| `tenant-datasource.manager.ts:54` | `resolveTenantDbConfig` — Query system DB lấy cấu hình DB của tenant |
| `tenant-auth.service.ts` | Validate user trong tenant DB |
| Tất cả tenant features (categories, customers, suppliers, inventory, orders, payments) | Chưa có Controller/Service |
| Audit Log module | Chưa implement |
| Tenant provisioning flow | Chưa có logic tạo DB và chạy migration |

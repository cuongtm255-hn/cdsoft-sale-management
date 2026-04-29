# CLAUDE.md

Multi-tenant SaaS sales platform. Database-per-tenant isolation. Backend: NestJS 10 + TypeORM + MySQL. Frontend: React 18 + Vite + Ant Design 5.

## Commands
- Backend: `cd backend && npm run start:dev` (port 8080). Migrations: `npm run migration:generate -- --name=X`, `npm run migration:run`
- Frontend: `cd frontend && npm run dev` (port 5173, proxy /api → 8080)

## Architecture — 3 Layers (KHÔNG import chéo)
- `backend/src/platform/` → System DB (`salesplatform_system`): tenant CRUD, platform users, auth
- `backend/src/tenant/` → Infrastructure: `TenantContextService` (AsyncLocalStorage), `TenantDataSourceManager` (dynamic connection pool)
- `backend/src/tenant-module/` → Per-tenant DB (`tenant_<code>`): products, orders, customers...

## Tenant-Module Service Pattern (BẮT BUỘC)
Không dùng `@InjectRepository`. Lấy repo qua DataSourceManager:
```typescript
private async getRepo() {
  const ds = await this.dsManager.getDataSource(this.tenantCtx.getTenantCode()!);
  return ds.getRepository(XxxEntity);
}
```

## Key Conventions
- All entities extend `BaseEntity` (uuid id, createdAt, updatedAt, deletedAt soft-delete)
- `synchronize: false` — luôn dùng migrations, không auto-sync
- Response: `TransformInterceptor` wrap `{ success, data, timestamp }`. Error: `HttpExceptionFilter` wrap `{ success:false, message, path }`
- Auth: `@Public()` bypass JWT. `@Roles('SUPER_ADMIN')` restrict access. `@CurrentUser()` get JWT payload
- JWT: Platform token (`userType:'PLATFORM'`), Tenant token (`userType:'TENANT'`, có `tenantCode`)
- Frontend aliases: `@api/`, `@auth/`, `@platform/`, `@tenant/`, `@shared/`. Backend aliases: `@common/`, `@config/`, `@platform/`, `@tenant/`
- Frontend auth: `useAuth()` hook, 2 token riêng biệt `platform_token` / `tenant_token` trong localStorage
- Frontend data fetching: `useApi(apiFn)` cho mutations, `usePagination(apiFn)` cho lists + `<DataTable>`

## Database Column Naming — QUAN TRỌNG
- **Toàn bộ DB dùng snake_case** (đã xác nhận từ schema thực tế): `created_at`, `product_id`, `warehouse_id`, `total_amount`, `order_id`, v.v.
- `SnakeNamingStrategy` đã được config trong cả 3 datasource → TypeORM tự map entity property (camelCase) ↔ DB column (snake_case)
- **TypeORM QueryBuilder** (`.where()`, `.andWhere()`, `.orderBy()`): dùng **camelCase entity property names** — TypeORM tự convert
  - ✅ `qb.where('t.warehouseId = :wid')` → SQL: `t.warehouse_id = :wid`
  - ❌ `qb.where('t.warehouse_id = :wid')` → lỗi "databaseName undefined"
- **Raw SQL** (`ds.query('...')`): dùng **snake_case column names** trực tiếp
  - ✅ `ds.query('SELECT * FROM orders WHERE order_id = ?')`
  - ❌ `ds.query('SELECT * FROM orders WHERE orderId = ?')`
- **Frontend** đọc dữ liệu từ raw SQL → dùng snake_case field names (`total_amount`, `created_at`)
- **Frontend** đọc dữ liệu từ TypeORM entity (detail page qua `findOne`) → dùng camelCase (`totalAmount`, `createdAt`)

## UI Display Rules
- **KHÔNG binding UUID/ID vào cột hiển thị.** Luôn JOIN/enrich để lấy mã (code) hoặc tên (name):
  - Khách hàng → `customer_code — customer_name` (Tooltip: code, title: name)
  - Nhà cung cấp → `supplier_code — supplier_name`
  - Sản phẩm → `<code>sku</code> product_name` (tooltip nếu tên dài)
  - Kho → `warehouse_name`
  - Đơn hàng → `order_code` (không dùng `orderId`)
- Backend list/detail endpoints phải enrich tên/mã qua raw SQL JOIN hoặc query phụ trước khi trả về
- Frontend `dataIndex` chỉ dùng field tên/mã, không dùng field `*Id`

## Docs
- `docs/feature-list.md` — 162 tasks (96 BE + 66 FE), 12 modules
- `docs/requirements/srs-tenant-detail.md` — SRS chi tiết nghiệp vụ
- `docs/structure-coding-convension/` — Thiết kế chi tiết backend + frontend

## Status
Đã implement: platform auth/CRUD, product CRUD, migration system, seed, frontend skeleton (17 pages).
Chưa implement: tenant provisioning flow, resolveTenantDbConfig(), tenant auth query, categories/customers/suppliers/inventory/orders/payments/dashboard/audit-log.

# backend/CLAUDE.md

NestJS 10 + TypeORM + MySQL. Rules cho backend — đọc cùng root `CLAUDE.md`.

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
- Aliases: `@common/`, `@config/`, `@platform/`, `@tenant/`

## Database Column Naming — QUAN TRỌNG
- **Toàn bộ DB dùng snake_case**: `created_at`, `product_id`, `warehouse_id`, `total_amount`, `order_id`, v.v.
- `SnakeNamingStrategy` config trong cả 3 datasource → TypeORM tự map entity property (camelCase) ↔ DB column (snake_case)
- **TypeORM QueryBuilder** (`.where()`, `.andWhere()`, `.orderBy()`): dùng **camelCase entity property names** — TypeORM tự convert
  - ✅ `qb.where('t.warehouseId = :wid')` → SQL: `t.warehouse_id = :wid`
  - ❌ `qb.where('t.warehouse_id = :wid')` → lỗi "databaseName undefined"
- **Raw SQL** (`ds.query('...')`): dùng **snake_case column names** trực tiếp
  - ✅ `ds.query('SELECT * FROM orders WHERE order_id = ?')`
  - ❌ `ds.query('SELECT * FROM orders WHERE orderId = ?')`

## UI Display Rules — Backend Responsibility
- List/detail endpoints phải enrich tên/mã qua raw SQL JOIN hoặc query phụ trước khi trả về
- KHÔNG trả về UUID/ID thuần trong response list — luôn JOIN để có:
  - `customer_code`, `customer_name`
  - `supplier_code`, `supplier_name`
  - `warehouse_name`
  - `order_code` (không trả `orderId`)
  - `sku`, `product_name`

# MODULE 3 — Product Master Data: Backend Detail Design

> Ref: `usecase.md` UC-08 → UC-11 | `srs-tenant-detail.md` Ch.2.1 | Feature list tasks #25–#37

---

## Architecture Notes

- Module path: `src/tenant-module/products/`
- Service pattern: `getRepo()` via `TenantDataSourceManager` + `TenantContextService` (same as `ProductsService`)
- Guard: `@UseGuards(JwtAuthGuard)` on controller class — **no `RolesGuard`** on tenant module
- Route prefix: `tenant/` for all endpoints
- Register new controllers/services in `TenantAppModule.controllers[]` and `providers[]`
- All schema changes require TypeORM migrations (`synchronize: false`)

### Service Base Pattern

```typescript
@Injectable()
export class ProductsService {
  constructor(
    private readonly dsManager: TenantDataSourceManager,
    private readonly tenantCtx: TenantContextService,
  ) {}

  private async getRepo() {
    const code = this.tenantCtx.getTenantCode()!;
    const ds = await this.dsManager.getDataSource(code);
    return ds.getRepository(Product);
  }
}
```

---

## 3.1 Product List

### Task #25 — `GET /tenant/products`

**Auth:** `@UseGuards(JwtAuthGuard)` (all authenticated tenant users)

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Full-text trên `sku`, `name`, `barcode` |
| `categoryId` | uuid | Filter theo category (bao gồm subcategories) |
| `isActive` | boolean | Filter active/inactive |
| `hasLowStock` | boolean | Chỉ hiện hàng dưới định mức tối thiểu |
| `page` / `limit` | number | Phân trang |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "sku": "PROD-001",
      "barcode": "8934563012345",
      "name": "Nước lọc Aquafina 500ml",
      "category": { "id": "uuid", "name": "Nước uống" },
      "baseUnit": "Chai",
      "retailPrice": 10000,
      "stockQuantity": 240,
      "minStockLevel": 50,
      "isLowStock": false,
      "isActive": true
    }
  ],
  "meta": { "total": 150, "page": 1, "limit": 20 }
}
```

**Note:** `stockQuantity` = tổng tồn kho realtime cross tất cả kho. Nếu role = STAFF thì không trả `costPrice`.

**DB:** `products`, `product_units`, `inventory_summary` (view)

---

## 3.2 Create Product

### Task #27 — `POST /tenant/products`

**Auth:** `@UseGuards(JwtAuthGuard)`

**Request Body:**
```json
{
  "sku": "PROD-001",
  "barcode": "8934563012345",
  "name": "Nước lọc Aquafina 500ml",
  "description": "Nước tinh khiết 500ml",
  "categoryId": "uuid",
  "brand": "Aquafina",
  "baseUnit": "Chai",
  "units": [
    { "name": "Thùng", "conversionRate": 24, "barcode": "8934563099999" },
    { "name": "Lốc", "conversionRate": 6 }
  ],
  "defaultWarehouseId": "uuid",
  "minStockLevel": 50,
  "maxStockLevel": 500,
  "prices": {
    "costPrice": 7000,
    "retailPrice": 10000,
    "wholesalePrice": 8500,
    "agentPrice": 8000
  }
}
```

**Business Rules:**
1. `sku` unique trong tenant
2. `barcode` unique trong tenant (nếu nhập)
3. Barcode của từng unit cũng phải unique
4. `baseUnit` là đơn vị nhỏ nhất; `conversionRate` tính theo baseUnit (1 Thùng = 24 Chai)
5. `costPrice` chỉ `TENANT_ADMIN`, `MANAGER`, `ACCOUNTANT` mới được nhìn thấy
6. Tất cả prices optional khi tạo, có thể cập nhật sau

**Response 201:** Product object đầy đủ

**Errors:**
| Code | HTTP | Condition |
|------|------|-----------|
| `SKU_EXISTS` | 409 | SKU đã tồn tại trong tenant |
| `BARCODE_EXISTS` | 409 | Barcode đã tồn tại |
| `CATEGORY_NOT_FOUND` | 404 | categoryId không tồn tại |
| `WAREHOUSE_NOT_FOUND` | 404 | defaultWarehouseId không tồn tại |

**DB:** `products`, `product_units`, `product_prices`

---

## 3.3 Update Product

### Task #28 — `PUT /tenant/products/:id`

**Auth:** `@UseGuards(JwtAuthGuard)`

**Request Body:** Tương tự POST, tất cả optional

**Business Rules:**
1. `sku` không được phép thay đổi nếu đã có giao dịch liên quan
2. Khi update `units`: so sánh diff, chỉ add/remove/update các units thay đổi
3. Không cho phép xóa `baseUnit` nếu có tồn kho
4. Ghi audit log khi `costPrice` thay đổi

**Response 200:** Product object đã cập nhật

---

## 3.4 Multi-Unit Support

### Task #29 — Logic đa đơn vị tính

Mỗi sản phẩm có một `baseUnit` (đơn vị nhỏ nhất) và nhiều `units` với `conversionRate`.

**Ví dụ:** Sản phẩm "Nước Aquafina 500ml"
- baseUnit: `Chai` (conversionRate = 1)
- `Lốc` (conversionRate = 6 → 1 Lốc = 6 Chai)
- `Thùng` (conversionRate = 24 → 1 Thùng = 24 Chai)

**Tính toán:**
- Tồn kho luôn lưu theo `baseUnit`
- Khi nhập/xuất kho với unit khác → convert về baseUnit trước khi lưu: `quantity_in_base = quantity * conversionRate`
- Giá theo unit: `unitPrice = basePrice * conversionRate` (default) hoặc override thủ công

**DB:** `product_units(id, product_id, name, conversion_rate, barcode, price_override)`

---

## 3.5 Stock Level Config

### Task #30 — Min/Max Stock Level

Lưu trong bảng `products`: `min_stock_level`, `max_stock_level`

**Cảnh báo logic (chạy khi có giao dịch kho):**
```
IF inventory.quantity <= product.min_stock_level THEN
  INSERT/UPDATE INTO stock_alerts (product_id, warehouse_id, alert_type='LOW_STOCK', triggered_at)
```

**Công thức số lượng cần nhập thêm (SRS 3.3):**
```
reorderQuantity = max_stock_level - current_stock - pending_orders_quantity
```

---

## 3.6 Price Table Management

### Task #31 — Multiple Price Lists

**DB:** `product_prices(id, product_id, price_type, unit_id, amount, currency, effective_from, effective_to)`

| `price_type` | Áp dụng cho |
|---|---|
| `COST` | Giá vốn — chỉ ADMIN/MANAGER/ACCOUNTANT |
| `RETAIL` | Giá lẻ mặc định |
| `WHOLESALE` | Nhóm KH Wholesale |
| `AGENT` | Nhóm KH Agent |
| `VIP` | Nhóm KH VIP |

**Logic chọn giá khi tạo đơn hàng:**
1. Lấy `customer.group` → map sang `price_type`
2. Query `product_prices` với `price_type` khớp và trong thời hạn hiệu lực
3. Fallback về `RETAIL` nếu không có giá phù hợp

---

## 3.7 Soft Delete Product

### Task #34 — `DELETE /tenant/products/:id`

**Auth:** `@UseGuards(JwtAuthGuard)` (role check done in service)

**Business Rules:**
1. Soft delete: cập nhật `is_active = false`, `deleted_at = NOW()`
2. Chặn xóa nếu `inventory.quantity > 0` — phải xuất hết kho trước
3. Chặn xóa nếu có pending orders chứa sản phẩm này
4. Sau khi xóa, sản phẩm không xuất hiện trong search nhưng vẫn hiển thị trong lịch sử đơn hàng cũ

**Response 200:** `{ "message": "Product deactivated successfully" }`

**Errors:**
| Code | HTTP | Condition |
|------|------|-----------|
| `PRODUCT_HAS_STOCK` | 400 | Còn tồn kho > 0 |
| `PRODUCT_IN_PENDING_ORDER` | 400 | Đang có đơn hàng pending |

---

## 3.8 Category Management

### Task #36 — Category CRUD (route prefix: `tenant/categories`)

**`GET /tenant/categories`:** Trả về cây categories

```json
[
  {
    "id": "uuid",
    "name": "Đồ uống",
    "slug": "do-uong",
    "parentId": null,
    "children": [
      { "id": "uuid", "name": "Nước uống", "parentId": "parent-uuid", "children": [] },
      { "id": "uuid", "name": "Nước ngọt", "parentId": "parent-uuid", "children": [] }
    ]
  }
]
```

**`POST /tenant/categories`:**
```json
{ "name": "Nước uống", "parentId": "uuid-or-null", "description": "..." }
```

**`PUT /tenant/categories/:id`:** Update name, description, parentId

**`DELETE /tenant/categories/:id`:**
- Chặn nếu có sản phẩm đang dùng category này
- Chặn nếu có subcategories (phải xóa con trước)

**Business Rules:**
- Max depth: 3 tầng (Root → Level 1 → Level 2)
- `slug` auto-generate từ `name`, unique trong tenant

---

## Database Schema

```sql
CREATE TABLE products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku                 VARCHAR(100) NOT NULL,
  barcode             VARCHAR(100),
  name                VARCHAR(255) NOT NULL,
  description         TEXT,
  category_id         UUID REFERENCES categories(id),
  brand               VARCHAR(100),
  base_unit           VARCHAR(50) NOT NULL DEFAULT 'Cái',
  default_warehouse_id UUID,
  min_stock_level     DECIMAL(15,2) NOT NULL DEFAULT 0,
  max_stock_level     DECIMAL(15,2),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sku) -- unique per tenant schema
);

CREATE TABLE product_units (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name             VARCHAR(50) NOT NULL,
  conversion_rate  DECIMAL(15,4) NOT NULL DEFAULT 1,
  barcode          VARCHAR(100),
  is_base          BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE product_prices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_id        UUID REFERENCES product_units(id),
  price_type     VARCHAR(30) NOT NULL, -- COST, RETAIL, WHOLESALE, AGENT, VIP
  amount         DECIMAL(18,2) NOT NULL,
  currency       VARCHAR(10) NOT NULL DEFAULT 'VND',
  effective_from DATE,
  effective_to   DATE
);

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) NOT NULL,
  parent_id   UUID REFERENCES categories(id),
  description TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  UNIQUE (slug)
);
```

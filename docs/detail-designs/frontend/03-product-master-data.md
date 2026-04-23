# MODULE 3 — Product Master Data: Frontend Detail Design

> Ref: `usecase.md` UC-08 → UC-11 | `srs-tenant-detail.md` Ch.2.1 | Feature list tasks #26, #32–#33, #35, #37

---

## Architecture Notes

- Tenant pages: `src/tenant/pages/`
- Imports: `@shared/components/PageHeader`, `@shared/components/DataTable`, `@shared/hooks/useApi`, `@api/tenant.api`
- API functions: `productsApi`, `categoriesApi` from `@api/tenant.api`
- Hook pattern:
  ```jsx
  const { fetch, loading, data, pagination, onTableChange } = usePagination(productsApi.list);
  const { execute: createProduct } = useApi(productsApi.create, { successMessage: 'Product created', onSuccess: () => fetch() });
  ```
- Role check: `useAuth().tenantUser.role` for hiding cost price from STAFF

---

## 3.1 Product List Screen

### Task: #26

**Route:** `/tenant/products`
**Access:** All authenticated tenant users

### Layout
```
[Header: "Products"]                              [+ Add Product]
[Search: SKU/Name/Barcode] [Category filter] [Status filter] [Low stock only ☐]
────────────────────────────────────────────────────────────────────────
| SKU      | Name            | Category  | Unit  | Retail Price | Stock  | Actions |
|----------|-----------------|-----------|-------|--------------|--------|---------|
| PROD-001 | Aquafina 500ml  | Nước uống | Chai  | 10,000 ₫     | 240 ⚠  | Edit ⋮  |
| PROD-002 | Coca-Cola 330ml | Nước ngọt | Lon   | 12,000 ₫     | 5 🔴   | Edit ⋮  |
────────────────────────────────────────────────────────────────────────
[Pagination]
```

### Components
- **ProductTable:** Cột SKU, Name, Category, Base Unit, Retail Price, Stock qty (+ cảnh báo), Actions
- **StockCell:** Hiển thị số lượng + icon cảnh báo 🔴 nếu `isLowStock = true`
- **CategoryTreeFilter:** Dropdown dạng tree chọn category (bao gồm subcategories)
- **LowStockToggle:** Checkbox filter "Chỉ hiện hàng sắp hết"
- **ActionsMenu:** Dropdown: Edit, View Detail, Deactivate/Activate

### States
- Ô Stock: `quantity = 0` → text đỏ "Hết hàng"; `isLowStock` → warning icon
- Loading: skeleton rows
- Empty: "Chưa có sản phẩm. Thêm sản phẩm đầu tiên."

### Permissions
- STAFF: không thấy cột Cost Price (ẩn hoàn toàn)
- STAFF: không có nút deactivate

---

## 3.2 Create / Edit Product Form

### Task: #32, #33

**Route:** `/tenant/products/new` · `/tenant/products/:id/edit`

### Layout (tabs)
```
[← Quay lại] "Tạo sản phẩm mới"
──────────────────────────────────
Tabs: [Thông tin cơ bản] [Đơn vị tính] [Bảng giá] [Kho & Định mức]
──────────────────────────────────
[Save]  [Cancel]
```

### Tab 1: Thông tin cơ bản

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| SKU | Text | ✅ | Max 100, auto-check unique |
| Barcode | Text | ❌ | Unique check |
| Tên sản phẩm | Text | ✅ | Min 2, max 255 |
| Danh mục | Tree select | ❌ | Chọn từ category tree |
| Thương hiệu | Text | ❌ | Max 100 |
| Mô tả | Textarea | ❌ | — |
| Trạng thái | Toggle | ✅ | Active/Inactive, default Active |

**SKU field:** Có nút "Auto-generate" → backend hoặc FE generate dựa trên pattern (VD: `PRD-YYYYMM-XXX`)

### Tab 2: Đơn vị tính

### Task: #33 — Multi-unit Component

```
Đơn vị cơ bản: [Chai ▼]
──────────────────────────────────────
Đơn vị khác:
  [+] Thêm đơn vị
  ┌─────────────────────────────────┐
  │ Tên: [Lốc    ]  Quy đổi: [6] Chai  Barcode: [___________] [🗑] │
  │ Tên: [Thùng  ]  Quy đổi: [24] Chai Barcode: [___________] [🗑] │
  └─────────────────────────────────┘
```

**Validation:**
- Tên đơn vị: không trùng trong cùng sản phẩm
- conversionRate: số dương, tối đa 4 chữ số thập phân
- Barcode đơn vị: unique check realtime (debounce)

### Tab 3: Bảng giá

| Loại giá | Hiển thị cho role | Field |
|----------|-------------------|-------|
| Giá vốn | ADMIN, MANAGER, ACCOUNTANT | Number input (₫) |
| Giá bán lẻ | All | Number input (₫) |
| Giá bán buôn | ADMIN, MANAGER | Number input (₫) |
| Giá đại lý | ADMIN, MANAGER | Number input (₫) |

Mỗi loại giá có thể set cho từng đơn vị tính (thêm row nếu giá theo Thùng/Lốc khác giá lẻ).

### Tab 4: Kho & Định mức

| Field | Type | Description |
|-------|------|-------------|
| Kho mặc định | Select | Dropdown chọn warehouse |
| Tồn kho tối thiểu | Number | Dưới mức này → cảnh báo |
| Tồn kho tối đa | Number | Dùng tính số lượng cần nhập |

Hiển thị widget: "Tồn kho hiện tại: 240 Chai" (read-only, lấy từ API)

### Save Flow
1. Validate toàn bộ 4 tabs
2. Nếu có lỗi validation → scroll đến tab đầu tiên có lỗi, highlight field
3. Submit → loading state trên Save button
4. Success: redirect về `/tenant/products/:id` (detail view) hoặc về list
5. Lỗi 409 SKU/Barcode: scroll về Tab 1, inline error dưới field tương ứng

---

## 3.3 Delete / Deactivate Product

### Task: #35

**Location:** ActionsMenu trong Product List + button trong Product Detail

**Deactivate flow:**
1. Click "Deactivate" → Confirm Dialog
2. `DELETE /products/:id`
3. Nếu lỗi `PRODUCT_HAS_STOCK`: "Sản phẩm còn [240 Chai] tồn kho. Vui lòng xuất hết trước khi xoá."
4. Nếu lỗi `PRODUCT_IN_PENDING_ORDER`: "Sản phẩm đang có đơn hàng chưa hoàn thành."
5. Success: row ẩn khỏi list (nếu filter default = active only)

---

## 3.4 Category Management Screen

### Task: #37

**Route:** `/tenant/settings/categories`
**Access:** Authenticated tenant users (role check in UI)

### Layout
```
[Header: "Danh mục sản phẩm"]          [+ Thêm danh mục gốc]
──────────────────────────────────────────
▼ Đồ uống                              [+Sub] [Edit] [Delete]
  ▼ Nước uống                          [+Sub] [Edit] [Delete]
    • Nước khoáng                              [Edit] [Delete]
  ▼ Nước ngọt                          [+Sub] [Edit] [Delete]
▶ Thực phẩm                            [+Sub] [Edit] [Delete]
──────────────────────────────────────────
```

### Interactions
- Click ▶/▼ → expand/collapse node
- Click "Edit" → inline edit tên category trong cùng dòng (input replace text)
- Click "+ Sub" → thêm con trực tiếp bên dưới node hiện tại
- Click "Delete" → Confirm Dialog
  - Nếu có sản phẩm: "Không thể xoá — còn [5] sản phẩm trong danh mục này."
  - Nếu có subcategories: "Không thể xoá — còn [2] danh mục con."

### Add Category Form (inline hoặc modal)
| Field | Required |
|-------|----------|
| Tên danh mục | ✅ |
| Mô tả | ❌ |

---

## Navigation Flow

```
/tenant/products (List)
  └─ "+ Add Product" → /tenant/products/new
  └─ Click row / "Edit" → /tenant/products/:id/edit
  └─ "Deactivate" → Confirm Dialog → inline update

/tenant/settings/categories
  └─ Inline tree editing
```

---

## Shared Components

| Component | Mô tả |
|-----------|-------|
| `<CategoryTreeSelect value onChange />` | Tree dropdown chọn category |
| `<MultiUnitEditor units onChange />` | Thêm/xóa đơn vị tính với quy đổi |
| `<PriceTableEditor prices role onChange />` | Bảng giá ẩn/hiện theo role |
| `<StockWarningBadge quantity minLevel />` | Badge cảnh báo tồn kho |
| `<SKUField value onGenerate />` | Input SKU + nút auto-generate |

# MODULE 6 — Inventory Management: Frontend Detail Design

> Ref: `usecase.md` UC-15 → UC-18 | `srs-tenant-detail.md` Ch.3 | Feature list tasks #53–#54, #57, #59, #62–#63, #66, #69

---

## Architecture Notes

- Tenant pages: `src/tenant/pages/`
- Imports: `@shared/components/PageHeader`, `@shared/components/DataTable`, `@shared/hooks/useApi`, `@api/tenant.api`
- API: `inventoryApi` from `@api/tenant.api`:
  ```javascript
  transactions: (params) => tenantApi.get('/tenant/inventory/transactions', { params }),
  stockIn:  (data) => tenantApi.post('/tenant/inventory/stock-in', data),
  stockOut: (data) => tenantApi.post('/tenant/inventory/stock-out', data),
  adjust:   (data) => tenantApi.post('/tenant/inventory/adjust', data),
  ```
- Also: `purchaseOrdersApi` for purchase order-linked receipts

---

## 6.1 Tạo Phiếu Nhập Kho

### Task: #53

**Route:** `/tenant/inventory/receipts/new`
**Access:** Authenticated tenant users

### Layout
```
[Header: "Phiếu nhập kho mới"]
────────────────────────────────────────────
Nhà cung cấp: [Search NCC............] (required)
Kho nhập:     [Kho chính ▼]            (required)
Ngày dự kiến: [26/04/2026]             (optional)
Mã tham chiếu:[PO-2026-0001]           (optional)
Ghi chú:      [........................]
────────────────────────────────────────────
Danh sách hàng nhập:
[+ Thêm sản phẩm]
┌──────────────────────────────────────────────────────────────┐
│ Sản phẩm       │ Đơn vị │ SL   │ Đơn giá    │ Thành tiền  │[🗑]│
│ Aquafina 500ml │ Thùng▼ │ [10] │ [168,000₫] │ 1,680,000₫  │   │
└──────────────────────────────────────────────────────────────┘
                              Tổng cộng: 1,680,000₫
────────────────────────────────────────────────────────────────
[Lưu nháp]  [Xác nhận nhập kho]
```

### Form Fields
| Field | Required | Notes |
|-------|----------|-------|
| Nhà cung cấp | ✅ | Search autocomplete |
| Kho nhập | ✅ | Dropdown kho active |
| Ngày dự kiến | ❌ | Date picker |
| Mã tham chiếu | ❌ | PO number hoặc tham chiếu nội bộ |
| Items | ≥1 | Dynamic rows |

**Item rows:**
- Sản phẩm: search autocomplete (SKU/tên/barcode)
- Đơn vị: dropdown từ `product.units`
- Số lượng: number > 0
- Đơn giá: number ≥ 0 (giá nhập thực tế đợt này)
- Thành tiền: auto-calculate (readonly)
- Nếu sản phẩm có `trackBatch = true`: hiện thêm field "Số lô" và "HSD"

### Flow
1. "Lưu nháp" → `POST /stock-receipts` → redirect đến detail page (status DRAFT)
2. "Xác nhận nhập kho" → `POST /stock-receipts` + ngay lập tức `PATCH .../confirm`
3. Tổng cộng: auto-update khi thay đổi số lượng/giá

### States
- Nút "Xác nhận": disabled nếu không có item nào hoặc item invalid
- Loading: disable toàn bộ form khi đang submit

---

## 6.2 Xác Nhận Nhập Kho

### Task: #54

**Route:** `/tenant/inventory/receipts/:id`

**Layout:**
```
[Header: "Phiếu nhập NK-0001"]  [Status: DRAFT 🟡]  [Xác nhận nhập kho]
─────────────────────────────────────────────────────
[Thông tin phiếu]  [Bảng items — có thể edit khi DRAFT]
[Xác nhận nhập kho]  [Hủy phiếu]
```

**Khi status = CONFIRMED:** Hiển thị read-only, thêm thông tin "Xác nhận bởi: [tên] lúc [giờ]"

---

## 6.3 Xuất Kho

### Task: #57

**Route:** `/tenant/inventory/issues/new`
**Access:** `WAREHOUSE`, `MANAGER`

### Layout tương tự Phiếu nhập nhưng:
- Không có field "Nhà cung cấp"
- Thêm field "Loại xuất": SALE (theo đơn) / Nội bộ / Hỏng/hủy
- Nếu SALE: thêm field "Đơn hàng" (link đến SO)
- Mỗi item hiển thị "Tồn kho hiện tại: [X] Chai" để kiểm tra trước khi xuất
- Nếu nhập SL > tồn kho: highlight đỏ + tooltip "Không đủ hàng"

---

## 6.4 Điều Chỉnh Kho

### Task: #59

**Route:** `/tenant/inventory/adjustments/new`
**Access:** `WAREHOUSE`, `MANAGER`

### Layout
```
[Header: "Điều chỉnh kho"]
Kho:    [Kho chính ▼]
Lý do:  [Kiểm kê tháng 4 — phát hiện thiếu hàng...]  (required)
──────────────────────────────────────────────────────────
| Sản phẩm      | SL sổ sách | SL thực tế | Chênh lệch |
|---------------|------------|------------|------------|
| Aquafina 500ml| 100        | [97     ]  | -3 🔴      |
──────────────────────────────────────────────────────────
[+ Thêm sản phẩm]
[Lưu điều chỉnh]
```

- "SL sổ sách": readonly, lấy từ API tồn kho hiện tại khi chọn sản phẩm
- "SL thực tế": input số, user nhập kết quả kiểm đếm thực
- "Chênh lệch": auto-calculate; xanh nếu > 0, đỏ nếu < 0, gray nếu = 0

---

## 6.5 Điều Chuyển Kho

### Task: #62, #63

**Route:** `/tenant/inventory/transfers/new`
**Access:** `WAREHOUSE`, `MANAGER`

### Tạo Lệnh Điều Chuyển (Task #62)
```
Kho đi:     [Kho chính ▼]          (required)
Kho đến:    [Kho chi nhánh 1 ▼]    (required)
Ngày dự kiến: [27/04/2026]
[Danh sách sản phẩm — tương tự phiếu nhập]
[Tạo lệnh điều chuyển]
```

Validation: Kho đi ≠ Kho đến

### Xác Nhận Nhận Hàng (Task #63)

**Route:** `/tenant/inventory/transfers/:id/receive`
**Access:** `WAREHOUSE` của kho đến

```
[Header: "Xác nhận nhận hàng — DC-0001"]
Từ: Kho chính → Kho chi nhánh 1
──────────────────────────────────────────────────────────
| Sản phẩm      | SL điều chuyển | SL thực nhận | Ghi chú |
|---------------|----------------|--------------|---------|
| Aquafina 500ml| 50 Thùng       | [48       ]  | [......] |
──────────────────────────────────────────────────────────
[Xác nhận đã nhận]
```

Nếu `SL thực nhận < SL điều chuyển`: tooltip "Chênh lệch [2] Thùng sẽ được điều chỉnh tự động tại kho đi"

---

## 6.6 Xem Tồn Kho

### Task: #66

**Route:** `/tenant/inventory`
**Access:** All roles

```
[Header: "Tồn kho"]
[Search sản phẩm]  [Kho filter]  [Danh mục filter]  [☐ Chỉ hàng sắp hết]
──────────────────────────────────────────────────────────────────────
| SKU      | Tên sản phẩm   | Kho        | Tồn kho      | Giá trị KH  | ⚠ |
|----------|----------------|------------|--------------|-------------|---|
| PROD-001 | Aquafina 500ml | Kho chính  | 240 Chai     | 1,728,000₫  |   |
| PROD-002 | Coca-Cola 330ml| Kho chính  | 5 Lon        | 60,000₫     | 🔴|
──────────────────────────────────────────────────────────────────────
```

- Cột "Giá trị KH" (giá trị kho = qty × avg_cost): chỉ hiện cho role có quyền xem giá vốn
- ⚠ icon: hiện khi `isLowStock = true` + tooltip "Dưới định mức tối thiểu [50 Chai]"
- Click row → xem lịch sử biến động kho của sản phẩm đó

---

## 6.7 Kiểm Kê Kho

### Task: #69

**Route:** `/tenant/inventory/stocktaking`
**Access:** `WAREHOUSE`, `MANAGER`

### Bắt đầu Kiểm kê
```
[+ Bắt đầu kiểm kê mới]
→ Modal: Chọn kho, ghi chú → [Bắt đầu]
```

### Màn hình Kiểm kê (status IN_PROGRESS)
```
[Header: "Kiểm kê KK-0001 — Kho chính"]  [Hoàn thành kiểm kê]
──────────────────────────────────────────────────────────
| Sản phẩm      | SL sổ sách | SL thực tế | Chênh lệch |
|---------------|------------|------------|------------|
| Aquafina 500ml| 240        | [237    ]  | -3 🔴      |
| Coca-Cola     | 48         | [50     ]  | +2 🟢      |
──────────────────────────────────────────────────────────
[Lưu tiến độ]  [Hoàn thành kiểm kê]
```

- "Lưu tiến độ": save partial progress (không generate adjustments)
- "Hoàn thành kiểm kê": `PATCH .../complete` → confirm dialog "Hệ thống sẽ tự động điều chỉnh [5] mặt hàng có chênh lệch. Tiếp tục?"

---

## Shared Components

| Component | Mô tả |
|-----------|-------|
| `<ProductSearchInput onSelect showStock />` | Autocomplete sản phẩm + hiện tồn kho |
| `<WarehouseSelect value onChange />` | Dropdown kho |
| `<StockItemTable items onChange />` | Bảng items dùng chung cho nhập/xuất/điều chỉnh |
| `<LowStockBadge qty minLevel />` | Badge cảnh báo tồn kho |
| `<StockMovementHistory productId warehouseId />` | Lịch sử biến động kho |

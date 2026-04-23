# MODULE 7 — Order Management: Frontend Detail Design

> Ref: `usecase.md` UC-19 → UC-22 | `srs-tenant-detail.md` Ch.4 | Feature list tasks #71, #75–#76, #79, #81, #85–#86, #89

---

## Architecture Notes

- Tenant pages: `src/tenant/pages/`
- Imports: `@shared/components/PageHeader`, `@shared/components/DataTable`, `@shared/hooks/useApi`, `@api/tenant.api`
- API: `purchaseOrdersApi`, `salesOrdersApi` from `@api/tenant.api`:
  ```javascript
  // Purchase Orders
  purchaseOrdersApi.list(params)    // GET /tenant/purchase-orders
  purchaseOrdersApi.create(data)    // POST /tenant/purchase-orders
  purchaseOrdersApi.confirm(id)     // PATCH /tenant/purchase-orders/:id/confirm
  purchaseOrdersApi.receive(id)     // PATCH /tenant/purchase-orders/:id/receive
  // Sales Orders
  salesOrdersApi.list(params)       // GET /tenant/sales-orders
  salesOrdersApi.create(data)       // POST /tenant/sales-orders
  salesOrdersApi.confirm(id)        // PATCH /tenant/sales-orders/:id/confirm
  salesOrdersApi.ship(id)           // PATCH /tenant/sales-orders/:id/ship
  salesOrdersApi.complete(id)       // PATCH /tenant/sales-orders/:id/complete
  ```

---

## 7.1 Order List Screen

### Task: #71

**Route:** `/tenant/purchase-orders` · `/tenant/sales-orders`
**Access:** All authenticated tenant users

### Layout
```
[Header: "Đơn hàng"]                         [+ Tạo đơn hàng]
[Search: Mã đơn]  [Khách hàng]  [Status]  [Từ ngày] [Đến ngày]  [NV: tất cả ▼]
──────────────────────────────────────────────────────────────────────────────
| Mã đơn      | Khách hàng  | Tổng tiền   | Đã TT    | Còn nợ   | Status     |
|-------------|-------------|-------------|----------|----------|------------|
| SO-2026-0001| ABC Corp    | 5,250,000₫  | 3,000,000₫| 2,250,000₫| ✅ Đã xác nhận |
| SO-2026-0002| Nguyễn B    | 500,000₫    | 500,000₫  | 0₫       | 📦 Đang giao|
──────────────────────────────────────────────────────────────────────────────
[Pagination]
```

### Status Badges
| Status | Color | Label |
|--------|-------|-------|
| DRAFT | gray | Nháp |
| CONFIRMED | blue | Đã xác nhận |
| DELIVERING | orange | Đang giao |
| DELIVERED | green | Đã giao |
| CANCELLED | red | Đã hủy |
| PARTIALLY_RETURNED | purple | Trả 1 phần |

---

## 7.2 Create Sales Order

### Task: #75

**Route:** `/tenant/sales-orders/new`
**Access:** `STAFF`, `MANAGER`, `TENANT_ADMIN`

### Layout
```
[Header: "Tạo đơn hàng mới"]
────────────────────────────────────────────────
Khách hàng: [Search KH...........] (required)
  → Auto-fill: Nhóm KH: [Bán buôn], Nợ hiện tại: 12,500,000₫ / Hạn mức: 50,000,000₫
Kho xuất: [Kho chính ▼]  NV phụ trách: [Nguyen Van A ▼]
HT thanh toán: [Chuyển khoản ▼]  Ghi chú: [.............]
Mã voucher: [_____________] [Áp dụng]
────────────────────────────────────────────────
Sản phẩm:  [+ Thêm sản phẩm]
┌──────────────────────────────────────────────────────────────────────┐
│ Sản phẩm       │ ĐVT  │ SL   │ Đơn giá    │ CK%│ Thành tiền   │[🗑]│
│ Aquafina 500ml │ Chai▼│ [10] │ [10,000₫]  │[5] │ 95,000₫      │   │
└──────────────────────────────────────────────────────────────────────┘
────────────────────────────────────────────────
Tạm tính:         100,000₫
Chiết khấu SP:      5,000₫
Voucher:            9,450₫
Tổng cộng:         85,550₫
────────────────────────────────────────────────
[Lưu nháp]   [Xác nhận đơn hàng]
```

### Feature: Auto Price Fill (Task #76)

Khi chọn khách hàng + sản phẩm:
- `GET /tenant/sales-orders/price-preview?customerId=&productId=&unitId=` → trả suggested price
- Auto-fill `unitPrice` theo bảng giá phù hợp với nhóm KH
- Nếu price được override thủ công: highlight màu vàng + tooltip "Giá tùy chỉnh (giá gốc: 10,000₫)"

### Feature: Credit Warning (Task #76)

Sau khi thêm items, tính tổng → kiểm tra credit:
- Nếu `currentDebt + orderTotal > creditLimit`: hiển thị warning banner màu vàng
  ```
  ⚠ Khách hàng đang nợ 45,000,000₫ / hạn mức 50,000,000₫.
  Đơn hàng này sẽ vượt hạn mức 5,000,000₫. Tiếp tục?
  ```
- Không block tạo đơn (chỉ cảnh báo)

### Feature: Voucher Validation

1. Nhập code → click "Áp dụng"
2. `POST /vouchers/validate { code, customerId, orderTotal }`
3. Success: hiển thị "Voucher SALE10: giảm 10% (tối đa 50,000₫) — Tiết kiệm: 9,450₫"
4. Error: inline error dưới ô voucher

### Flow
1. "Lưu nháp" → `salesOrdersApi.create(data)` → redirect đến `/tenant/sales-orders/:id`
2. "Xác nhận" → `salesOrdersApi.create(data)` + `salesOrdersApi.confirm(id)` → redirect đến order detail
3. Khi confirm: nếu `INSUFFICIENT_STOCK` → dialog liệt kê sản phẩm thiếu hàng

---

## 7.3 Order Detail Screen

**Route:** `/tenant/sales-orders/:id`

### Layout
```
[← Quay lại]  SO-2026-0001  [Status: Đã xác nhận 🔵]
─────────────────────────────────────────────────────────────────
Header info: KH, ngày, NV, kho, thanh toán
─────────────────────────────────────────────────────────────────
Bảng sản phẩm (readonly khi đã confirm)
─────────────────────────────────────────────────────────────────
Tóm tắt: Tạm tính | CK | Voucher | Tổng
─────────────────────────────────────────────────────────────────
Buttons theo status:
  DRAFT: [Sửa đơn] [Xác nhận] [Hủy đơn]
  CONFIRMED: [Xuất kho] [Thu tiền] [Hủy đơn] [Trả hàng]
  DELIVERED: [Thu tiền] [Trả hàng]
```

### Confirm Order (Task #79)

Click "Xác nhận đơn":
1. `PATCH /orders/:id/confirm`
2. Nếu OK → status badge cập nhật → hiển thị nút "Xuất kho", "Thu tiền"
3. Nếu lỗi `INSUFFICIENT_STOCK` → Modal:
   ```
   Không đủ tồn kho:
   • Aquafina 500ml: cần 10, còn 3
   • Coca-Cola: cần 5, còn 0
   Vui lòng nhập thêm hàng hoặc giảm số lượng.
   ```

---

## 7.4 Cancel Order

### Task: #81

**Trigger:** Nút "Hủy đơn" trên Order Detail

**Flow:**
1. Click "Hủy đơn" → Modal với textarea "Lý do hủy" (required)
2. Confirm → `PATCH /orders/:id/cancel { reason }`
3. Nếu lỗi (đã partial payment): "Đơn hàng đã có [3,000,000₫] thanh toán. Vui lòng xử lý hoàn tiền trước."
4. Success: Status → CANCELLED, ẩn nút hành động

---

## 7.5 Promotion Management

### Task: #85

**Route:** `/tenant/settings/promotions`
**Access:** `MANAGER`, `TENANT_ADMIN`

### Layout
```
[Header: "Quản lý khuyến mãi"]           [+ Tạo khuyến mãi]
[Tab: Tất cả | Đang chạy | Sắp diễn ra | Đã kết thúc]
───────────────────────────────────────────────────────
| Tên KM              | Loại     | Thời gian        | Lượt dùng | Status |
|---------------------|----------|------------------|-----------|--------|
| Giảm 5% từ 1 triệu  | CK Đơn   | 01-30/04/2026    | 45        | Đang chạy |
| Mua 5 tặng 1 Aquafina| Mua-Tặng| 20-25/04/2026    | 12        | Đang chạy |
───────────────────────────────────────────────────────
```

### Create Promotion Form

```
Loại khuyến mãi: [Chiết khấu đơn hàng ▼]
  (thay đổi loại → render fields tương ứng)
```

**Fields theo loại:**

| Loại | Fields bổ sung |
|------|---------------|
| CK Đơn hàng | Đơn tối thiểu, Loại CK (% / số tiền), Giá trị |
| Mua X Tặng Y | Sản phẩm mua, SL tối thiểu, Sản phẩm tặng, SL tặng |
| Combo/Bundle | Danh sách SP combo, Loại CK, Giá trị |
| Voucher | Code, Loại, Giá trị, Max CK, Đơn tối thiểu, Số lượt, Nhóm KH |

**Chung (tất cả loại):** Tên, Ngày bắt đầu, Ngày kết thúc, Ưu tiên (khi xếp chồng), Ghi chú

---

## 7.6 Voucher Input (trong Create Order)

### Task: #86

**Location:** Form tạo đơn hàng — phần tóm tắt

```
Mã voucher: [SALE10    ]  [Áp dụng]
→ Success: ✅ "SALE10: Giảm 10% — Tiết kiệm 9,450₫"  [Xóa]
→ Error: ❌ "Mã không hợp lệ hoặc đã hết hạn"
```

---

## 7.7 Return Order

### Task: #89

**Route:** `/tenant/sales-orders/:id/return` hoặc Modal từ Order Detail

### Layout
```
[Header: "Trả hàng — SO-2026-0001"]
KH: ABC Corp  |  Ngày mua: 01/04/2026
────────────────────────────────────────────────
Chọn sản phẩm trả:
| Sản phẩm      | SL đã mua | SL trả  | Đơn giá gốc | Thành tiền |
|---------------|-----------|---------|-------------|------------|
| ☑ Aquafina    | 10 Chai   | [2   ]  | 9,500₫      | 19,000₫    |
| ☐ Coca-Cola   | 5 Lon     | —       | 11,400₫     | —          |
────────────────────────────────────────────────
Lý do trả hàng: [Hàng bị lỗi..........]  (required)
Phương thức hoàn tiền: [Tiền mặt ▼]
Tổng hoàn trả: 19,000₫
[Xác nhận trả hàng]
```

**Phương thức hoàn tiền options:**
- Tiền mặt (CASH) — tạo phiếu chi
- Số dư tài khoản (CREDIT) — cộng vào số dư KH
- Cấn trừ công nợ (DEBT_OFFSET) — giảm nợ hiện tại

**Đơn giá gốc:** `unitPrice * (1 - discountPercent/100)` — giá thực đã trả

---

## Navigation Flow

```
/orders (List)
  └─ "+ Tạo đơn" → /orders/new
  └─ Click row → /orders/:id (Detail)
       ├─ "Sửa đơn" (DRAFT only) → /orders/:id/edit
       ├─ "Xác nhận" → inline confirm → status update
       ├─ "Hủy đơn" → ConfirmDialog với reason
       ├─ "Xuất kho" → /inventory/issues/new?orderId=xxx
       ├─ "Thu tiền" → PaymentModal (Module 8)
       └─ "Trả hàng" → /orders/:id/return

/settings/promotions
  └─ "+ Tạo KM" → PromotionFormModal
```

---

## Shared Components

| Component | Mô tả |
|-----------|-------|
| `<OrderStatusBadge status />` | Badge màu theo order status |
| `<OrderItemsTable items editable onChange />` | Bảng items với giá/CK, dùng cả create/edit/return |
| `<OrderSummaryPanel subtotal discounts total />` | Panel tóm tắt tổng tiền |
| `<VoucherInput onValidated />` | Input + validate voucher realtime |
| `<CreditWarningBanner creditLimit currentDebt orderTotal />` | Warning banner vượt hạn mức |
| `<PromotionFormModal type? onSave />` | Form tạo/sửa khuyến mãi đa loại |

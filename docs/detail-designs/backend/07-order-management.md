# MODULE 7 — Order Management: Backend Detail Design

> Ref: `usecase.md` UC-19 → UC-22 | `srs-tenant-detail.md` Ch.4 | Feature list tasks #70–#89

---

## 7.1 Order List

### Task #70 — `GET /orders`

**Auth:** JWT · Roles: All (STAFF chỉ thấy đơn của mình nếu config)

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | `DRAFT,CONFIRMED,DELIVERING,DELIVERED,CANCELLED` |
| `customerId` | uuid | Filter theo khách hàng |
| `salesRepId` | uuid | Filter theo nhân viên (MANAGER+ mới filter người khác) |
| `from` / `to` | date | Khoảng ngày đặt hàng |
| `search` | string | Tìm theo order code |
| `page` / `limit` | number | Phân trang |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "code": "SO-2026-0001",
      "customer": { "id": "uuid", "name": "ABC Corp", "code": "KH-0001" },
      "status": "CONFIRMED",
      "totalAmount": 5250000,
      "paidAmount": 3000000,
      "debtAmount": 2250000,
      "itemCount": 3,
      "salesRep": { "id": "uuid", "name": "Nguyen Van A" },
      "createdAt": "2026-04-20T08:30:00Z",
      "confirmedAt": "2026-04-20T09:00:00Z"
    }
  ],
  "meta": { "total": 120, "page": 1, "limit": 20 }
}
```

---

## 7.2 Create Sales Order

### Task #72 — `POST /orders`

**Auth:** JWT · Roles: `STAFF`, `MANAGER`, `TENANT_ADMIN`

**Request Body:**
```json
{
  "customerId": "uuid",
  "warehouseId": "uuid",
  "salesRepId": "uuid",
  "paymentMethod": "CASH",
  "shippingAddress": "123 Nguyen Hue, Q1, HCM",
  "notes": "Giao trước 5pm",
  "discountAmount": 50000,
  "voucherCode": "SALE10",
  "items": [
    {
      "productId": "uuid",
      "unitId": "uuid",
      "quantity": 10,
      "unitPrice": 10000,
      "discountPercent": 5,
      "discountAmount": 5000
    }
  ]
}
```

**Business Rules:**
1. `code` auto-generate: `SO-YYYY-XXXX` (sequential per tenant)
2. `unitPrice` — server validate đây phải là giá hợp lệ theo nhóm KH (Task #73)
3. Cho phép STAFF override giá lên nhưng không được xuống dưới `retailPrice` (configurable)
4. `discountPercent` + `discountAmount` per item (SRS 4.2)
5. `voucherCode` được validate và applied (Task #84)
6. Kiểm tra `creditLimit` — nếu `customer.currentDebt + orderTotal > creditLimit` → cảnh báo (không block theo SRS 4.1)
7. Tạo đơn với `status = DRAFT`

**Response 201:**
```json
{
  "id": "uuid",
  "code": "SO-2026-0001",
  "status": "DRAFT",
  "subtotal": 100000,
  "discountTotal": 5500,
  "voucherDiscount": 9450,
  "totalAmount": 85050,
  "creditWarning": false
}
```

**Errors:**
| Code | HTTP | Condition |
|------|------|-----------|
| `CUSTOMER_NOT_FOUND` | 404 | KH không tồn tại |
| `PRODUCT_NOT_FOUND` | 404 | productId không hợp lệ |
| `INVALID_VOUCHER` | 400 | Voucher không hợp lệ/hết hạn |
| `VOUCHER_ALREADY_USED` | 400 | Voucher đã sử dụng (1-time) |

---

### Task #73 — Price Table Logic

Khi tạo đơn, server tự động resolve giá cho từng item:

```
1. Lấy customer.group → map sang price_type
   RETAIL → 'RETAIL', WHOLESALE → 'WHOLESALE', AGENT → 'AGENT', VIP → 'VIP'

2. Query product_prices WHERE product_id = ? AND price_type = ? 
   AND (effective_from IS NULL OR effective_from <= TODAY)
   AND (effective_to IS NULL OR effective_to >= TODAY)
   AND unit_id = ?

3. Nếu không có giá theo nhóm → fallback về RETAIL
4. Server gửi suggested_price trong response preview (optional endpoint)
```

**`GET /orders/price-preview`:** (optional endpoint dùng cho FE calculate before submit)

---

### Task #74 — Credit Limit Check

```
IF customer.creditLimit > 0 THEN:
  potentialDebt = customer.currentDebt + orderTotal
  IF potentialDebt > customer.creditLimit THEN:
    response.creditWarning = true
    response.creditWarningDetail = {
      creditLimit: 50000000,
      currentDebt: 45000000,
      orderTotal: 10000000,
      overflow: 5000000
    }
```

---

## 7.3 Confirm Order

### Task #77 — `PATCH /orders/:id/confirm`

**Auth:** JWT · Roles: `STAFF`, `MANAGER`, `TENANT_ADMIN`

**Business Rules:**
1. Validate `status = DRAFT`
2. Kiểm tra lại tồn kho cho từng item (race condition guard)
3. Reserve tồn kho: `inventory_balances.reserved_qty += qty` (không trừ ngay)
4. Cập nhật `status = CONFIRMED`
5. Trigger `GenerateInvoiceJob` (Module 8)

**Response 200:** Order object với `status = CONFIRMED`

**Errors:**
| Code | HTTP | Condition |
|------|------|-----------|
| `ORDER_NOT_DRAFT` | 400 | Không phải DRAFT |
| `INSUFFICIENT_STOCK` | 400 | Tồn kho không đủ, kèm danh sách sản phẩm thiếu hàng |

---

### Task #78 — Stock Reserve vs Deduct

Hai bước tách biệt:
1. **Confirm order**: `reserved_qty += qty` (giữ chỗ, chưa xuất)
2. **Issue stock** (khi giao hàng): `quantity -= qty`, `reserved_qty -= qty` (xuất thực)

`inventory_balances`:
- `quantity`: tổng thực tế trong kho
- `reserved_qty`: đã cam kết cho orders
- `available_qty` = `quantity - reserved_qty` (computed)

---

## 7.4 Cancel Order

### Task #80 — `PATCH /orders/:id/cancel`

**Auth:** JWT · Roles: `STAFF` (chỉ đơn mình tạo), `MANAGER`, `TENANT_ADMIN`

**Request Body:**
```json
{ "reason": "Khách hủy đơn" }
```

**Business Rules:**
1. Chỉ cancel được khi `status IN ('DRAFT', 'CONFIRMED')`
2. Nếu đã `DELIVERING` hoặc `DELIVERED`: không cho cancel
3. Nếu `status = CONFIRMED`: hoàn lại `reserved_qty`
4. Nếu đã có payment partial: không cho cancel → phải xử lý return (hoặc refund)
5. Invalidate voucher (nếu có) để có thể dùng lại

---

## 7.5 Promotions Engine

### Task #82 — `GET /promotions` & `POST /promotions`

**Auth:** JWT · Roles: `MANAGER`, `TENANT_ADMIN`

**Promotion types** (SRS 4.2):

**1. Chiết khấu theo đơn hàng:**
```json
{
  "type": "ORDER_DISCOUNT",
  "name": "Giảm 5% cho đơn từ 1 triệu",
  "condition": { "minOrderAmount": 1000000 },
  "discount": { "type": "PERCENT", "value": 5 },
  "startDate": "2026-04-01",
  "endDate": "2026-04-30"
}
```

**2. Mua X tặng Y:**
```json
{
  "type": "BUY_X_GET_Y",
  "name": "Mua 5 tặng 1 Aquafina",
  "condition": { "productId": "uuid", "minQty": 5 },
  "reward": { "productId": "uuid", "giftQty": 1 }
}
```

**3. Combo/Bundle:**
```json
{
  "type": "BUNDLE",
  "name": "Combo 3 sản phẩm giảm 15%",
  "items": [
    { "productId": "uuid1", "qty": 1 },
    { "productId": "uuid2", "qty": 1 }
  ],
  "discount": { "type": "PERCENT", "value": 15 }
}
```

### Task #83 — Promotion Engine Logic

Chạy khi `POST /orders` hoặc `PUT /orders/:id/items`:

```
1. Lấy tất cả promotions active (startDate <= TODAY <= endDate)
2. Sort theo priority DESC
3. Với mỗi promotion, check điều kiện
4. Apply promotions không conflict (configurable: stack vs exclusive)
5. Trả promotionsApplied list trong order response
```

---

### Task #84 — Voucher Management

**`POST /vouchers/validate`:**
```json
Request: { "code": "SALE10", "customerId": "uuid", "orderTotal": 500000 }
Response: {
  "valid": true,
  "voucherType": "PERCENT",
  "discountValue": 10,
  "maxDiscount": 50000,
  "calculatedDiscount": 50000
}
```

**Business Rules:**
1. Voucher có `usageLimit` và `usedCount` → kiểm tra còn lượt dùng
2. `perCustomerLimit`: mỗi KH dùng tối đa N lần
3. `minOrderAmount`: tổng đơn phải đạt mức tối thiểu
4. Khi apply: không deduct ngay — deduct khi order confirm để tránh race condition

**DB:** `vouchers(id, code, type, value, max_discount, min_order, usage_limit, used_count, customer_group, start_date, end_date)`

---

## 7.6 Returns — Trả hàng

### Task #87 — `POST /returns`

**Auth:** JWT · Roles: `STAFF`, `MANAGER`, `TENANT_ADMIN`

**Request Body:**
```json
{
  "originalOrderId": "uuid",
  "reason": "Hàng lỗi",
  "refundMethod": "CASH",
  "items": [
    {
      "orderItemId": "uuid",
      "returnQty": 2,
      "returnUnitId": "uuid"
    }
  ]
}
```

**Business Rules:**
1. Tìm order gốc, validate status = DELIVERED
2. Validate `returnQty <= originalQty` cho từng item
3. Tính tiền hoàn: `unitPrice * (1 - discountPercent/100) * returnQty` (giá thực mua)
4. `refundMethod`: `CASH` (phiếu chi), `CREDIT` (cộng vào số dư KH), `DEBT_OFFSET` (trừ nợ)

### Task #88 — After Return Actions

1. Nhập lại kho: tạo `inventory_transaction` type `STOCK_IN_RETURN`
2. Cập nhật `inventory_balances.quantity += returnQty`
3. Nếu `refundMethod = CASH`: tạo payment record type `REFUND`
4. Nếu `refundMethod = DEBT_OFFSET`: giảm `customers.currentDebt`
5. Cập nhật order status → `PARTIALLY_RETURNED` hoặc `FULLY_RETURNED`

---

## Database Schema

```sql
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             VARCHAR(50) NOT NULL UNIQUE,
  customer_id      UUID NOT NULL REFERENCES customers(id),
  warehouse_id     UUID REFERENCES warehouses(id),
  sales_rep_id     UUID REFERENCES users(id),
  status           VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  payment_method   VARCHAR(30),
  subtotal         DECIMAL(18,2) NOT NULL DEFAULT 0,
  discount_total   DECIMAL(18,2) NOT NULL DEFAULT 0,
  voucher_discount DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_amount     DECIMAL(18,2) NOT NULL DEFAULT 0,
  paid_amount      DECIMAL(18,2) NOT NULL DEFAULT 0,
  voucher_id       UUID REFERENCES vouchers(id),
  shipping_address TEXT,
  notes            TEXT,
  confirmed_at     TIMESTAMPTZ,
  confirmed_by     UUID REFERENCES users(id),
  cancelled_at     TIMESTAMPTZ,
  cancel_reason    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products(id),
  unit_id          UUID REFERENCES product_units(id),
  quantity         DECIMAL(15,4) NOT NULL,
  qty_in_base      DECIMAL(15,4) NOT NULL,
  unit_price       DECIMAL(18,2) NOT NULL,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  discount_amount  DECIMAL(18,2) NOT NULL DEFAULT 0,
  line_total       DECIMAL(18,2) NOT NULL,
  cost_price       DECIMAL(18,4),
  issued_qty       DECIMAL(15,4) NOT NULL DEFAULT 0
);

CREATE TABLE return_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             VARCHAR(50) NOT NULL UNIQUE,
  original_order_id UUID NOT NULL REFERENCES orders(id),
  customer_id      UUID NOT NULL REFERENCES customers(id),
  reason           TEXT NOT NULL,
  refund_method    VARCHAR(30) NOT NULL,
  refund_amount    DECIMAL(18,2) NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

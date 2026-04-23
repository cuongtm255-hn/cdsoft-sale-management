# MODULE 6 — Inventory Management: Backend Detail Design

> Ref: `usecase.md` UC-15 → UC-18 | `srs-tenant-detail.md` Ch.3 | Feature list tasks #49–#69

---

## 6.1 Stock In — Nhập kho

### Task #49 — `POST /stock-receipts`

**Auth:** JWT · Roles: `WAREHOUSE`, `MANAGER`, `TENANT_ADMIN`

**Request Body:**
```json
{
  "supplierId": "uuid",
  "warehouseId": "uuid",
  "expectedDate": "2026-04-25",
  "refCode": "PO-2026-0001",
  "notes": "Nhập hàng tháng 4",
  "items": [
    {
      "productId": "uuid",
      "unitId": "uuid",
      "quantity": 10,
      "unitCost": 168000,
      "batchNumber": "LOT-2026-04",
      "expiryDate": "2027-04-01"
    }
  ]
}
```

**Business Rules:**
1. Tạo phiếu nhập với `status = DRAFT`
2. `unitCost` là giá nhập thực tế của đợt này (tách biệt với `costPrice` trong `product_prices`)
3. `batchNumber` + `expiryDate` chỉ bắt buộc nếu sản phẩm có `trackBatch = true`
4. Validate: tất cả `productId` và `unitId` phải valid và thuộc cùng product

**Response 201:** Stock receipt object với `status = DRAFT`

**DB:** `stock_receipts`, `stock_receipt_items`

---

### Task #50 — `PATCH /stock-receipts/:id/confirm`

**Auth:** JWT · Roles: `WAREHOUSE`, `MANAGER`, `TENANT_ADMIN`

**Request Body:** (optional — để chỉnh sửa trước khi confirm)
```json
{
  "items": [
    { "id": "item-uuid", "quantity": 9, "unitCost": 170000 }
  ]
}
```

**Actions:**
1. Validate `status = DRAFT`
2. Cập nhật từng item nếu có body
3. Convert quantity về `baseUnit`: `qty_in_base = quantity * unit.conversionRate`
4. Cộng tồn kho: `INSERT INTO inventory_transactions` + `UPDATE inventory_balances`
5. Tính lại `costPrice` theo phương pháp được config (Task #51)
6. Tạo AP record nếu `payOnDelivery = false` (Task #52)
7. Cập nhật `status = CONFIRMED`, ghi `confirmed_at`, `confirmed_by`

**Response 200:** Stock receipt đã confirm

**Errors:**
| Code | HTTP | Condition |
|------|------|-----------|
| `RECEIPT_NOT_DRAFT` | 400 | Phiếu đã confirm/cancel |
| `PRODUCT_NOT_FOUND` | 404 | productId không tồn tại |

---

### Task #51 — Cost Calculation (Bình quân / FIFO)

Config lưu trong `tenant_configs.key = 'cost_method'`, value: `'AVERAGE'` | `'FIFO'`

**Phương pháp Bình quân (Weighted Average):**
```
new_avg_cost = (current_stock * current_avg_cost + incoming_qty * incoming_cost)
               / (current_stock + incoming_qty)
```

**Phương pháp FIFO:**
- Mỗi lô hàng nhập tạo một `inventory_lot` với `cost_per_unit` và `remaining_qty`
- Khi xuất kho: FIFO → lấy lot cũ nhất trước, tính giá vốn xuất = `sum(lot.cost * qty_from_lot)`

**DB Additions:**
```sql
CREATE TABLE inventory_lots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id),
  warehouse_id    UUID NOT NULL REFERENCES warehouses(id),
  receipt_item_id UUID REFERENCES stock_receipt_items(id),
  batch_number    VARCHAR(100),
  expiry_date     DATE,
  cost_per_unit   DECIMAL(18,4) NOT NULL,
  initial_qty     DECIMAL(15,4) NOT NULL,
  remaining_qty   DECIMAL(15,4) NOT NULL,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### Task #52 — Auto AP Creation

Triggered khi confirm stock receipt với `supplier.paymentTermDays > 0`:

```sql
INSERT INTO accounts_payable (
  supplier_id, stock_receipt_id,
  amount, due_date, status
) VALUES (
  :supplierId, :receiptId,
  :totalAmount, NOW() + INTERVAL ':paymentTermDays days',
  'PENDING'
)
```

Cập nhật `suppliers.current_debt += totalAmount`.

---

## 6.2 Stock Out — Xuất kho

### Task #55 — `POST /stock-issues`

**Auth:** JWT · Roles: `WAREHOUSE`, `MANAGER`

**Request Body:**
```json
{
  "warehouseId": "uuid",
  "issueType": "SALE",
  "orderId": "uuid",
  "notes": "Xuất theo đơn SO-2026-0001",
  "items": [
    {
      "productId": "uuid",
      "unitId": "uuid",
      "quantity": 5
    }
  ]
}
```

`issueType`: `SALE` | `INTERNAL` | `DAMAGED` | `TRANSFER_OUT`

**Business Rules:**
1. Kiểm tra `inventory_balances.quantity >= requested_qty` cho từng sản phẩm
2. Nếu FIFO: chọn lots theo thứ tự `received_at ASC` (hoặc `expiry_date ASC` nếu FEFO)
3. Trừ tồn kho, ghi `inventory_transactions`
4. Tính giá vốn xuất → ghi vào order (nếu SALE type)

**Errors:**
| Code | HTTP | Condition |
|------|------|-----------|
| `INSUFFICIENT_STOCK` | 400 | Tồn kho không đủ, kèm `{ available: X, requested: Y }` |

---

### Task #56 — Partial delivery (nhiều lần xuất từ 1 đơn hàng)

Trong order detail: track `ordered_qty` vs `issued_qty` vs `remaining_qty` per item.

API: `GET /orders/:id/fulfillment` → trả `items[].orderedQty`, `items[].issuedQty`, `items[].remainingQty`

---

## 6.3 Stock Adjustment

### Task #58 — `POST /stock-adjustments`

**Auth:** JWT · Roles: `WAREHOUSE`, `MANAGER`, `TENANT_ADMIN`

**Request Body:**
```json
{
  "warehouseId": "uuid",
  "reason": "Kiểm kê tháng 4 — phát hiện thiếu hàng",
  "items": [
    {
      "productId": "uuid",
      "unitId": "uuid",
      "systemQty": 100,
      "actualQty": 97,
      "adjustQty": -3
    }
  ]
}
```

**Business Rules:**
1. `adjustQty = actualQty - systemQty` (server tính lại để validate)
2. Nếu `adjustQty < 0`: xuất điều chỉnh (giảm tồn)
3. Nếu `adjustQty > 0`: nhập điều chỉnh (tăng tồn)
4. `reason` bắt buộc
5. Ghi audit log với before/after quantity

**Response 201:** Adjustment record

---

## 6.4 Warehouse Transfer

### Task #60 — `POST /stock-transfers`

**Auth:** JWT · Roles: `WAREHOUSE`, `MANAGER`

**Request Body:**
```json
{
  "fromWarehouseId": "uuid",
  "toWarehouseId": "uuid",
  "expectedDate": "2026-04-26",
  "notes": "Điều chuyển từ kho chính sang kho chi nhánh",
  "items": [
    { "productId": "uuid", "unitId": "uuid", "quantity": 50 }
  ]
}
```

**Status flow:** `PENDING` → `IN_TRANSIT` → `RECEIVED` | `CANCELLED`

**Business Rules:**
1. `fromWarehouseId ≠ toWarehouseId`
2. Khi tạo: validate tồn kho `fromWarehouse` đủ
3. Khi tạo: **chưa** trừ tồn kho `fromWarehouse` (chờ xác nhận xuất)
4. Khi confirm xuất (`PATCH /stock-transfers/:id/dispatch`): trừ `fromWarehouse`
5. Khi confirm nhận (Task #61): cộng `toWarehouse`

---

### Task #61 — `PATCH /stock-transfers/:id/receive`

**Auth:** JWT · Roles: `WAREHOUSE` (của `toWarehouse`)

**Request Body:** (optional — chỉnh số lượng thực nhận)
```json
{
  "items": [
    { "productId": "uuid", "receivedQty": 48 }
  ]
}
```

**Business Rules:**
1. Nếu `receivedQty < transferQty`: ghi nhận chênh lệch, tự động tạo điều chỉnh tại `fromWarehouse`
2. Cập nhật `status = RECEIVED`

---

## 6.5 Inventory View

### Task #64 — `GET /inventory`

**Auth:** JWT · Roles: All

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `warehouseId` | uuid | Filter theo kho (default: all) |
| `productId` | uuid | Filter 1 sản phẩm |
| `categoryId` | uuid | Filter theo category |
| `lowStockOnly` | boolean | Chỉ hàng dưới định mức |
| `page` / `limit` | number | Phân trang |

**Response 200:**
```json
{
  "data": [
    {
      "productId": "uuid",
      "sku": "PROD-001",
      "name": "Aquafina 500ml",
      "warehouseId": "uuid",
      "warehouseName": "Kho chính",
      "quantity": 240,
      "unit": "Chai",
      "minStockLevel": 50,
      "isLowStock": false,
      "avgCost": 7200,
      "totalValue": 1728000
    }
  ],
  "meta": { ... }
}
```

**Note:** `totalValue` = `quantity * avgCost`; chỉ trả nếu role có quyền xem giá vốn

---

### Task #65 — Low Stock Alert Logic

**Trigger:** Sau mỗi stock out transaction

```sql
SELECT p.id, p.name, ib.quantity, p.min_stock_level
FROM inventory_balances ib
JOIN products p ON ib.product_id = p.id
WHERE ib.quantity <= p.min_stock_level
  AND p.min_stock_level > 0
```

Nếu có kết quả → upsert vào `stock_alerts` table, dùng cho:
- Dashboard notification badge
- API `GET /alerts/low-stock`

---

## 6.6 Stocktaking — Kiểm kê

### Task #67 — `POST /stocktaking`

**Auth:** JWT · Roles: `WAREHOUSE`, `MANAGER`

**Request Body:**
```json
{
  "warehouseId": "uuid",
  "notes": "Kiểm kê định kỳ tháng 4/2026"
}
```

**Actions:**
1. Snapshot tồn kho hiện tại: copy `inventory_balances` → `stocktaking_items` với `system_qty`
2. Set `status = IN_PROGRESS`
3. Khóa xuất kho cho warehouse đang kiểm kê (optional, configurable)

**Response 201:** Stocktaking session object

---

### Task #68 — `PATCH /stocktaking/:id/complete`

**Auth:** JWT · Roles: `WAREHOUSE`, `MANAGER`

**Request Body:**
```json
{
  "items": [
    { "productId": "uuid", "actualQty": 97 }
  ]
}
```

**Actions:**
1. So sánh `actualQty` với `systemQty` cho từng sản phẩm
2. Với mỗi chênh lệch: tự động tạo `stock_adjustments` record
3. Apply adjustments → cập nhật `inventory_balances`
4. Set `status = COMPLETED`

---

## Database Schema (Key Tables)

```sql
CREATE TABLE warehouses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  address    TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE inventory_balances (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID NOT NULL REFERENCES products(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  quantity     DECIMAL(15,4) NOT NULL DEFAULT 0,
  avg_cost     DECIMAL(18,4) NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, warehouse_id)
);

CREATE TABLE inventory_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id),
  warehouse_id    UUID NOT NULL REFERENCES warehouses(id),
  transaction_type VARCHAR(30) NOT NULL,
                  -- STOCK_IN, STOCK_OUT, ADJUSTMENT_IN, ADJUSTMENT_OUT,
                  -- TRANSFER_IN, TRANSFER_OUT
  quantity        DECIMAL(15,4) NOT NULL,
  unit_cost       DECIMAL(18,4),
  ref_id          UUID,
  ref_type        VARCHAR(30), -- stock_receipt, stock_issue, order, etc.
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stock_receipts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id   UUID REFERENCES suppliers(id),
  warehouse_id  UUID NOT NULL REFERENCES warehouses(id),
  ref_code      VARCHAR(100),
  status        VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  expected_date DATE,
  confirmed_at  TIMESTAMPTZ,
  confirmed_by  UUID REFERENCES users(id),
  notes         TEXT,
  total_amount  DECIMAL(18,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stock_receipt_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id      UUID NOT NULL REFERENCES stock_receipts(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  unit_id         UUID REFERENCES product_units(id),
  quantity        DECIMAL(15,4) NOT NULL,
  qty_in_base     DECIMAL(15,4) NOT NULL,
  unit_cost       DECIMAL(18,4) NOT NULL,
  batch_number    VARCHAR(100),
  expiry_date     DATE
);

CREATE TABLE stock_transfers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  to_warehouse_id   UUID NOT NULL REFERENCES warehouses(id),
  status            VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  expected_date     DATE,
  dispatched_at     TIMESTAMPTZ,
  received_at       TIMESTAMPTZ,
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

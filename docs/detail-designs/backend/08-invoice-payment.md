# MODULE 8 — Invoice & Payment: Backend Detail Design

> Ref: `usecase.md` UC-23 → UC-25 | `srs-tenant-detail.md` Ch.5 | Feature list tasks #90–#104

---

## 8.1 Generate Invoice

### Task #90 — Auto-generate Invoice Job

**Trigger:** Sau khi `PATCH /orders/:id/confirm` thành công

**Logic:**
1. Kiểm tra `invoices` — nếu đã có invoice cho order này thì bỏ qua (idempotent)
2. Tạo invoice record với snapshot tất cả thông tin đơn hàng tại thời điểm confirm
3. Generate `invoiceCode`: `INV-YYYY-XXXX`
4. `status = UNPAID` nếu `totalAmount > 0`; `PAID` nếu `paymentMethod = CASH` và paid ngay

**Invoice snapshot:** Sao chép đầy đủ thông tin KH, địa chỉ, items, giá, chiết khấu tại thời điểm lập — không bị ảnh hưởng khi thông tin KH/sản phẩm thay đổi sau đó.

**DB:** `invoices`, `invoice_items`

---

### Task #91 — `GET /invoices/:id`

**Auth:** JWT · Roles: All

**Response 200:**
```json
{
  "id": "uuid",
  "code": "INV-2026-0001",
  "orderId": "uuid",
  "orderCode": "SO-2026-0001",
  "status": "PARTIALLY_PAID",
  "customer": {
    "id": "uuid",
    "name": "ABC Corp",
    "taxCode": "0123456789",
    "address": "123 Nguyen Hue, Q1, HCM"
  },
  "items": [
    {
      "productName": "Aquafina 500ml",
      "unit": "Chai",
      "quantity": 10,
      "unitPrice": 9500,
      "discountPercent": 5,
      "lineTotal": 90250
    }
  ],
  "subtotal": 95000,
  "discountTotal": 4750,
  "totalAmount": 90250,
  "paidAmount": 50000,
  "remainingAmount": 40250,
  "payments": [
    {
      "id": "uuid",
      "amount": 50000,
      "method": "CASH",
      "paidAt": "2026-04-20T10:00:00Z"
    }
  ],
  "issuedAt": "2026-04-20T09:00:00Z",
  "dueDate": "2026-05-20"
}
```

**PDF Export:** `GET /invoices/:id/pdf`
- Generate PDF server-side (Puppeteer hoặc PDFKit)
- Return `Content-Type: application/pdf`
- Template bao gồm: logo tenant, thông tin bên bán, bên mua, bảng sản phẩm, tổng cộng, chữ ký

---

## 8.2 Record Payment

### Task #93 — `POST /payments`

**Auth:** JWT · Roles: `STAFF`, `ACCOUNTANT`, `MANAGER`, `TENANT_ADMIN`

**Request Body:**
```json
{
  "invoiceId": "uuid",
  "amount": 3000000,
  "method": "BANK_TRANSFER",
  "bankAccountId": "uuid",
  "transactionRef": "FT-123456",
  "paidAt": "2026-04-22T14:30:00Z",
  "notes": "Chuyển khoản VCB"
}
```

**Business Rules:**
1. `amount > 0`
2. `amount <= invoice.remainingAmount` (không cho over-pay — trừ khi config cho phép)
3. `method`: `CASH` | `BANK_TRANSFER` | `CARD` | `E_WALLET`
4. Nếu `method = CASH`: debit từ `cash_funds.balance`
5. Nếu `method = BANK_TRANSFER`: debit từ `bank_accounts.balance` (nếu đối soát tự động)

**Actions after payment:**
1. Tạo `payments` record
2. Cập nhật `invoices.paid_amount += amount`
3. Nếu `paid_amount >= total_amount` → `invoice.status = PAID`
4. Nếu partial → `invoice.status = PARTIALLY_PAID`
5. Tạo `cash_receipts` (phiếu thu) tự động (Task #94)
6. Cập nhật `customers.current_debt -= amount`

**Response 201:** Payment record

**Errors:**
| Code | HTTP | Condition |
|------|------|-----------|
| `INVOICE_NOT_FOUND` | 404 | |
| `INVOICE_ALREADY_PAID` | 400 | Hoá đơn đã thanh toán đủ |
| `AMOUNT_EXCEEDS_REMAINING` | 400 | Vượt số tiền còn lại |

---

### Task #94 — Auto Cash Receipt (Phiếu thu)

Triggered khi payment confirmed:

```sql
INSERT INTO cash_receipts (
  receipt_type, ref_id, ref_type, amount, method,
  cash_fund_id, bank_account_id, customer_id,
  description, created_by, created_at
) VALUES (
  'CUSTOMER_PAYMENT', :paymentId, 'payment',
  :amount, :method, :cashFundId, :bankAccountId,
  :customerId, 'Thu tiền đơn hàng ' || :orderCode,
  :userId, NOW()
)
```

Cập nhật `cash_funds.balance` hoặc `bank_accounts.balance` tương ứng.

---

## 8.3 Payment History

### Task #96 — `GET /customers/:id/payments`

**Auth:** JWT · Roles: `ACCOUNTANT`, `MANAGER`, `TENANT_ADMIN`

**Query Params:** `from`, `to`, `page`, `limit`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "invoiceCode": "INV-2026-0001",
      "amount": 3000000,
      "method": "BANK_TRANSFER",
      "paidAt": "2026-04-22",
      "notes": "Chuyển khoản VCB"
    }
  ],
  "summary": {
    "totalPaid": 45000000,
    "currentDebt": 12500000
  },
  "meta": { ... }
}
```

---

## 8.4 Accounts Receivable

### Task #98 — `GET /ar/aging`

**Auth:** JWT · Roles: `ACCOUNTANT`, `MANAGER`, `TENANT_ADMIN`

**Query Params:** `asOfDate` (default: today), `customerId` (optional)

**Response 200:**
```json
{
  "data": [
    {
      "customerId": "uuid",
      "customerName": "ABC Corp",
      "current": 5000000,
      "days1_30": 3000000,
      "days31_60": 2000000,
      "days61_90": 1000000,
      "over90": 0,
      "total": 11000000
    }
  ],
  "totals": {
    "current": 15000000,
    "days1_30": 8000000,
    ...
  }
}
```

**Logic:**
```sql
SELECT
  c.id, c.name,
  SUM(CASE WHEN age <= 0 THEN remaining ELSE 0 END) AS current,
  SUM(CASE WHEN age BETWEEN 1 AND 30 THEN remaining ELSE 0 END) AS days1_30,
  ...
FROM invoices i
JOIN customers c ON i.customer_id = c.id
WHERE i.status != 'PAID'
  AND i.remaining_amount > 0
  AND i.due_date <= :asOfDate
```

---

### Task #99 — `POST /ar/match`

Đối trừ: khớp 1 payment với nhiều invoices

**Request Body:**
```json
{
  "paymentId": "uuid",
  "matches": [
    { "invoiceId": "uuid1", "amount": 2000000 },
    { "invoiceId": "uuid2", "amount": 1000000 }
  ]
}
```

**Business Rules:**
1. `sum(matches.amount) = payment.amount`
2. Từng `match.amount <= invoice.remainingAmount`
3. Sau match: update từng invoice `paid_amount`, `status`

---

## 8.5 Accounts Payable

### Task #102 — `GET /ap/schedule`

**Auth:** JWT · Roles: `ACCOUNTANT`, `MANAGER`, `TENANT_ADMIN`

**Query Params:** `daysAhead` (default 30)

**Response 200:**
```json
{
  "data": [
    {
      "supplierId": "uuid",
      "supplierName": "XYZ Corp",
      "invoiceRef": "NK-0001",
      "amount": 12000000,
      "dueDate": "2026-05-01",
      "daysUntilDue": 9,
      "isOverdue": false
    }
  ]
}
```

---

### Task #103 — `POST /ap/offset`

Cấn trừ công nợ: dùng cho đối tác vừa là KH vừa là NCC

**Request Body:**
```json
{
  "customerId": "uuid",
  "supplierId": "uuid",
  "arInvoiceId": "uuid",
  "apInvoiceId": "uuid",
  "offsetAmount": 5000000
}
```

**Business Rules:**
1. Supplier `isCustomer = true` và `customerId` khớp
2. `offsetAmount <= min(ar.remaining, ap.remaining)`
3. Tạo cả 2 payment records (AR side + AP side) với note "Cấn trừ công nợ"
4. Update cả AR invoice và AP record

---

## 8.6 Cash & Bank Management

### Task #132 — `GET /cash-funds` & `GET /bank-accounts`

Trả danh sách quỹ/tài khoản với số dư hiện tại.

### Task #133 — `POST /cash-receipts` (manual)

Manual phiếu thu (ngoài quy trình thanh toán đơn hàng):
```json
{
  "receiptType": "OTHER",
  "amount": 1000000,
  "cashFundId": "uuid",
  "description": "Thu tiền cọc sự kiện",
  "requiresApproval": true
}
```

Nếu `requiresApproval = true`: tạo record với `status = PENDING`, chờ approve.

### Task #133 — `POST /cash-disbursements` (phiếu chi)

```json
{
  "disbursementType": "SUPPLIER_PAYMENT",
  "supplierId": "uuid",
  "apRecordId": "uuid",
  "amount": 12000000,
  "cashFundId": "uuid",
  "bankAccountId": "uuid"
}
```

Mọi phiếu chi > threshold (configurable) → cần approval.

---

## Database Schema

```sql
CREATE TABLE invoices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             VARCHAR(50) NOT NULL UNIQUE,
  order_id         UUID NOT NULL REFERENCES orders(id),
  customer_id      UUID NOT NULL REFERENCES customers(id),
  status           VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
                   -- UNPAID, PARTIALLY_PAID, PAID, CANCELLED
  subtotal         DECIMAL(18,2) NOT NULL,
  discount_total   DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_amount     DECIMAL(18,2) NOT NULL,
  paid_amount      DECIMAL(18,2) NOT NULL DEFAULT 0,
  remaining_amount DECIMAL(18,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  due_date         DATE,
  issued_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       UUID NOT NULL REFERENCES invoices(id),
  customer_id      UUID NOT NULL REFERENCES customers(id),
  amount           DECIMAL(18,2) NOT NULL,
  method           VARCHAR(30) NOT NULL,
  bank_account_id  UUID REFERENCES bank_accounts(id),
  transaction_ref  VARCHAR(100),
  paid_at          TIMESTAMPTZ NOT NULL,
  notes            TEXT,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE accounts_payable (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id      UUID NOT NULL REFERENCES suppliers(id),
  stock_receipt_id UUID REFERENCES stock_receipts(id),
  amount           DECIMAL(18,2) NOT NULL,
  paid_amount      DECIMAL(18,2) NOT NULL DEFAULT 0,
  due_date         DATE NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cash_funds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  balance     DECIMAL(18,2) NOT NULL DEFAULT 0,
  currency    VARCHAR(10) NOT NULL DEFAULT 'VND',
  is_active   BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE bank_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name      VARCHAR(100) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_name   VARCHAR(255) NOT NULL,
  balance        DECIMAL(18,2) NOT NULL DEFAULT 0,
  currency       VARCHAR(10) NOT NULL DEFAULT 'VND',
  is_active      BOOLEAN NOT NULL DEFAULT true
);
```

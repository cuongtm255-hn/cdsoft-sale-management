# MODULE 4 — Customer Master Data: Backend Detail Design

> Ref: `usecase.md` UC-12 → UC-14 | `srs-tenant-detail.md` Ch.2.2 | Feature list tasks #38–#45

---

## Architecture Notes

- Module path: `src/tenant-module/customers/`
- Guard: `@UseGuards(JwtAuthGuard)` on controller class — **no `RolesGuard`**
- Route prefix: `tenant/customers`
- Service uses `getRepo()` pattern via `TenantDataSourceManager` + `TenantContextService`
- Register in `TenantAppModule.controllers[]` and `providers[]`

### Service Base Pattern

```typescript
private async getRepo() {
  const code = this.tenantCtx.getTenantCode()!;
  const ds = await this.dsManager.getDataSource(code);
  return ds.getRepository(Customer);
}
```

---

## 4.1 Customer List

### Task #38 — `GET /tenant/customers`

**Auth:** `@UseGuards(JwtAuthGuard)`

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Match trên `name`, `code`, `phone`, `email` |
| `group` | string | Filter theo nhóm KH: `RETAIL`, `WHOLESALE`, `AGENT`, `VIP` |
| `isActive` | boolean | Filter active/inactive |
| `salesRepId` | uuid | Filter theo nhân viên phụ trách |
| `page` / `limit` | number | Phân trang |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "code": "KH-0001",
      "name": "Công ty TNHH ABC",
      "phone": "0901234567",
      "email": "abc@company.com",
      "group": "WHOLESALE",
      "creditLimit": 50000000,
      "currentDebt": 12500000,
      "salesRep": { "id": "uuid", "name": "Nguyen Van A" },
      "loyaltyPoints": 1200,
      "memberTier": "GOLD",
      "isActive": true
    }
  ],
  "meta": { "total": 85, "page": 1, "limit": 20 }
}
```

**DB:** `customers`, `users` (join cho salesRep)

---

## 4.2 Create Customer

### Task #40 — `POST /tenant/customers`

**Auth:** `@UseGuards(JwtAuthGuard)`

**Request Body:**
```json
{
  "code": "KH-0001",
  "name": "Công ty TNHH ABC",
  "taxCode": "0123456789",
  "phone": "0901234567",
  "email": "abc@company.com",
  "address": {
    "street": "123 Nguyen Hue",
    "district": "Quan 1",
    "city": "Ho Chi Minh"
  },
  "group": "WHOLESALE",
  "creditLimit": 50000000,
  "paymentTermDays": 30,
  "salesRepId": "uuid",
  "notes": "Khách mua số lượng lớn"
}
```

**Business Rules:**
1. `code` unique trong tenant; nếu không nhập → auto-generate: `KH-XXXX` (sequential)
2. `taxCode` optional; có thể dùng để auto-fill tên công ty (integration tổng cục thuế — future scope)
3. `group` default là `RETAIL` nếu không nhập
4. `creditLimit` default 0 (không cho nợ); chỉ `MANAGER`, `TENANT_ADMIN` mới được set > 0
5. `paymentTermDays` default 0 (thanh toán ngay)
6. `salesRepId` phải là user có role `STAFF` hoặc `MANAGER` trong tenant

**Response 201:** Customer object đầy đủ

**Errors:**
| Code | HTTP | Condition |
|------|------|-----------|
| `CUSTOMER_CODE_EXISTS` | 409 | Code đã tồn tại |
| `SALES_REP_NOT_FOUND` | 404 | salesRepId không hợp lệ |
| `PERMISSION_DENIED` | 403 | STAFF cố set creditLimit > 0 |

**DB:** `customers`, `customer_addresses`

---

## 4.3 Update Customer

### Task #41 — `PUT /tenant/customers/:id`

**Auth:** `@UseGuards(JwtAuthGuard)`

**Request Body:** Tương tự POST, tất cả optional

**Business Rules:**
1. STAFF không được sửa `creditLimit`, `paymentTermDays`, `group`
2. Thay đổi `group` → update bảng giá áp dụng trong các đơn hàng mới
3. Giảm `creditLimit` xuống dưới `currentDebt` → cảnh báo nhưng vẫn cho phép (không block)

**Response 200:** Customer object đã cập nhật

---

## 4.4 Assign Sales Rep

### Task #42 — Được thực hiện qua `PUT /tenant/customers/:id`

Field `salesRepId` trong body của PUT request.

**Business Rules:**
1. salesRepId phải là active user trong tenant với role STAFF/MANAGER
2. Khi thay đổi salesRep: ghi audit log
3. Một user có thể phụ trách nhiều khách hàng (1-N)

---

## 4.5 Customer Transaction History

### Task #44 — `GET /tenant/customers/:id/transactions`

**Auth:** `@UseGuards(JwtAuthGuard)`

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `type` | `ORDER\|PAYMENT\|RETURN` | Filter theo loại |
| `from` / `to` | date | Khoảng thời gian |
| `page` / `limit` | number | Phân trang |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "ORDER",
      "refCode": "SO-2026-0001",
      "date": "2026-04-01",
      "amount": 5000000,
      "status": "CONFIRMED",
      "balance": -5000000
    },
    {
      "id": "uuid",
      "type": "PAYMENT",
      "refCode": "PT-2026-0012",
      "date": "2026-04-05",
      "amount": 3000000,
      "status": "COMPLETED",
      "balance": -2000000
    }
  ],
  "summary": {
    "totalOrders": 15,
    "totalPurchased": 45000000,
    "currentDebt": 2000000,
    "loyaltyPoints": 1200,
    "memberTier": "GOLD"
  },
  "meta": { "total": 30, "page": 1, "limit": 20 }
}
```

**DB:** `orders`, `payments`, `return_orders` — UNION với customer_id filter

---

## 4.6 Customer Detail

### Task — `GET /tenant/customers/:id`

**Response 200:** Customer object đầy đủ + summary stats

```json
{
  "id": "uuid",
  "code": "KH-0001",
  "name": "Công ty TNHH ABC",
  "taxCode": "0123456789",
  "phone": "0901234567",
  "email": "abc@company.com",
  "address": { "street": "...", "district": "...", "city": "..." },
  "group": "WHOLESALE",
  "creditLimit": 50000000,
  "currentDebt": 12500000,
  "availableCredit": 37500000,
  "paymentTermDays": 30,
  "salesRep": { "id": "uuid", "name": "Nguyen Van A" },
  "loyaltyPoints": 1200,
  "memberTier": "GOLD",
  "isActive": true,
  "stats": {
    "totalOrders": 25,
    "totalPurchased": 120000000,
    "lastOrderDate": "2026-04-10"
  }
}
```

---

## Database Schema

```sql
CREATE TABLE customers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              VARCHAR(50) NOT NULL UNIQUE,
  name              VARCHAR(255) NOT NULL,
  tax_code          VARCHAR(20),
  phone             VARCHAR(20),
  email             VARCHAR(255),
  customer_group    VARCHAR(30) NOT NULL DEFAULT 'RETAIL',
                    -- CHECK IN ('RETAIL','WHOLESALE','AGENT','VIP')
  credit_limit      DECIMAL(18,2) NOT NULL DEFAULT 0,
  current_debt      DECIMAL(18,2) NOT NULL DEFAULT 0,
  payment_term_days INT NOT NULL DEFAULT 0,
  sales_rep_id      UUID REFERENCES users(id),
  loyalty_points    INT NOT NULL DEFAULT 0,
  member_tier       VARCHAR(20) NOT NULL DEFAULT 'NONE',
                    -- CHECK IN ('NONE','SILVER','GOLD','DIAMOND')
  notes             TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customer_addresses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label        VARCHAR(50) DEFAULT 'default',
  street       VARCHAR(255),
  district     VARCHAR(100),
  city         VARCHAR(100),
  is_default   BOOLEAN NOT NULL DEFAULT false
);
```

---

## Notes

- `current_debt` là derived value — cập nhật qua trigger/service khi có payment/order mới
- Nên có view hoặc materialized view `customer_debt_summary` để tính toán hiệu quả
- Khi `currentDebt >= creditLimit`: warning khi tạo đơn hàng mới (không block, chỉ cảnh báo theo SRS 4.1)
- Khách hàng đồng thời là nhà cung cấp: thêm flag `is_supplier BOOLEAN` + FK sang `suppliers` table

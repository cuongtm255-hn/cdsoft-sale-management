# MODULE 5 — Supplier Master Data: Backend Detail Design

> Ref: `srs-tenant-detail.md` Ch.2.3 | Feature list tasks #46–#48

---

## 5.1 Supplier CRUD

### `GET /suppliers`

**Auth:** JWT · Roles: `TENANT_ADMIN`, `MANAGER`, `ACCOUNTANT`, `WAREHOUSE`

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Match trên `name`, `code`, `phone`, `taxCode` |
| `isActive` | boolean | Filter |
| `page` / `limit` | number | Phân trang |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "code": "NCC-0001",
      "name": "Công ty CP Phân phối XYZ",
      "taxCode": "0987654321",
      "phone": "028-3812-3456",
      "email": "supply@xyz.com",
      "contactPerson": "Nguyen Van B",
      "paymentTermDays": 30,
      "currentDebt": 25000000,
      "isCustomer": false,
      "customerId": null,
      "isActive": true
    }
  ],
  "meta": { "total": 20, "page": 1, "limit": 20 }
}
```

---

### `POST /suppliers`

**Auth:** JWT · Roles: `TENANT_ADMIN`, `MANAGER`

**Request Body:**
```json
{
  "code": "NCC-0001",
  "name": "Công ty CP Phân phối XYZ",
  "taxCode": "0987654321",
  "phone": "028-3812-3456",
  "email": "supply@xyz.com",
  "contactPerson": "Nguyen Van B",
  "address": {
    "street": "456 Le Loi",
    "district": "Quan 1",
    "city": "Ho Chi Minh"
  },
  "paymentTermDays": 30,
  "discountTerms": "2% nếu thanh toán trong 10 ngày",
  "bankAccounts": [
    {
      "bankName": "Vietcombank",
      "accountNumber": "1234567890",
      "accountName": "CONG TY CP XYZ",
      "branch": "TP HCM"
    }
  ],
  "isCustomer": false,
  "customerId": null,
  "notes": "NCC chính cho ngành hàng đồ uống"
}
```

**Business Rules:**
1. `code` unique trong tenant; auto-generate `NCC-XXXX` nếu bỏ trống
2. `isCustomer = true` + `customerId` cho phép đối tác vừa là KH vừa là NCC (cấn trừ công nợ 2 chiều)
3. Nếu `isCustomer = true`, `customerId` phải là valid customer trong tenant
4. `paymentTermDays` default 0 (thanh toán ngay)

**Response 201:** Supplier object đầy đủ

**Errors:**
| Code | HTTP | Condition |
|------|------|-----------|
| `SUPPLIER_CODE_EXISTS` | 409 | Code trùng |
| `CUSTOMER_NOT_FOUND` | 404 | customerId không tồn tại khi isCustomer = true |

---

### `PUT /suppliers/:id`

**Auth:** JWT · Roles: `TENANT_ADMIN`, `MANAGER`

**Request Body:** Tương tự POST, tất cả optional

**Business Rules:**
- Thay đổi `isCustomer` từ false → true: validate customerId
- Thay đổi `isCustomer` từ true → false: kiểm tra không có debt offset records đang pending

---

### `DELETE /suppliers/:id` (Soft delete)

**Auth:** JWT · Roles: `TENANT_ADMIN`

**Business Rules:**
1. Chặn nếu `currentDebt > 0`
2. Chặn nếu có pending stock receipts từ NCC này
3. Soft delete: `is_active = false`, `deleted_at = NOW()`

**Errors:**
| Code | HTTP | Condition |
|------|------|-----------|
| `SUPPLIER_HAS_DEBT` | 400 | Còn công nợ chưa thanh toán |
| `SUPPLIER_HAS_PENDING_RECEIPT` | 400 | Còn phiếu nhập đang xử lý |

---

## Database Schema

```sql
CREATE TABLE suppliers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                VARCHAR(50) NOT NULL UNIQUE,
  name                VARCHAR(255) NOT NULL,
  tax_code            VARCHAR(20),
  phone               VARCHAR(20),
  email               VARCHAR(255),
  contact_person      VARCHAR(255),
  payment_term_days   INT NOT NULL DEFAULT 0,
  discount_terms      TEXT,
  current_debt        DECIMAL(18,2) NOT NULL DEFAULT 0,
  is_customer         BOOLEAN NOT NULL DEFAULT false,
  customer_id         UUID REFERENCES customers(id),
  notes               TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE supplier_addresses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id  UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  street       VARCHAR(255),
  district     VARCHAR(100),
  city         VARCHAR(100),
  is_default   BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE supplier_bank_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id    UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  bank_name      VARCHAR(100),
  account_number VARCHAR(50),
  account_name   VARCHAR(255),
  branch         VARCHAR(100)
);
```

---

## Notes

- `currentDebt` được cập nhật tự động khi confirm stock receipt (tăng) và khi record AP payment (giảm)
- Dual-role partner (vừa KH vừa NCC): logic cấn trừ xử lý ở Module 8 (AP offset)
- Lịch sử nhập hàng từ NCC: query từ `stock_receipts` by `supplier_id`

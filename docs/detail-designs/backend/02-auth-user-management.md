# MODULE 2 — Auth & User Management: Backend Detail Design

> Ref: `usecase.md` UC-06, UC-07 | `srs-tenant-detail.md` Ch.8.1 | Feature list tasks #14–#24

---

## 2.1 Login

### Task #14 — `POST /auth/login`

**Auth:** None (public)

**Request Body:**
```json
{
  "email": "staff@acme.com",
  "password": "SecurePass123!",
  "tenantSlug": "acme-corp"
}
```

**Business Rules:**
1. Lookup user bằng `email` + `tenantSlug` (mỗi tenant có user space riêng)
2. Kiểm tra tenant status → từ chối login nếu `SUSPENDED` (403)
3. Kiểm tra user `isActive` → từ chối nếu bị deactivate (403)
4. So sánh password với `bcrypt.compare`
5. Nếu user có `twoFactorEnabled = true` → không trả token, trả `requiresTwoFactor = true`
6. Ghi nhận failed login — lock account sau 5 lần liên tiếp (lockout 15 phút)

**Response 200 (login bình thường):**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "uuid-v4",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "name": "John Staff",
    "email": "staff@acme.com",
    "role": "STAFF",
    "tenantId": "uuid"
  }
}
```

**Response 200 (cần 2FA):**
```json
{
  "requiresTwoFactor": true,
  "twoFactorToken": "short-lived-token-for-2fa-step"
}
```

**Errors:**
| Code | HTTP | Condition |
|------|------|-----------|
| `INVALID_CREDENTIALS` | 401 | Email/password sai |
| `TENANT_SUSPENDED` | 403 | Tenant bị suspend |
| `USER_INACTIVE` | 403 | User bị deactivate |
| `ACCOUNT_LOCKED` | 429 | Quá số lần thử |
| `TENANT_NOT_FOUND` | 404 | Slug không tồn tại |

**DB:** `users`, `tenants`, `login_attempts`

---

### Task #15 — JWT + Refresh Token

**Access Token:**
- Algorithm: HS256 (hoặc RS256 cho production)
- Expiry: 15 phút
- Payload: `{ sub: userId, tenantId, role, iat, exp }`

**Refresh Token:**
- Stored in DB (table `refresh_tokens`)
- Expiry: 7 ngày
- One-time use (rotate on refresh)

**`POST /auth/refresh`:**
```json
Request:  { "refreshToken": "uuid" }
Response: { "accessToken": "...", "refreshToken": "new-uuid", "expiresIn": 900 }
```

**`POST /auth/logout`:**
- Delete refresh token khỏi DB
- Response: 204 No Content

**DB:** `refresh_tokens(id, user_id, tenant_id, token_hash, expires_at, created_at)`

---

### Task #16 — Two-Factor Authentication (2FA)

**Scope:** Bắt buộc cho role `ADMIN`, `MANAGER`; optional cho các role khác (SRS 8.1)

**Flow:**
1. Login thành công nhưng user có `twoFactorEnabled = true`
2. Server trả `twoFactorToken` (short-lived JWT, 5 phút, scope = "2fa")
3. Server gửi OTP 6 chữ số qua email/SMS

**`POST /auth/verify-2fa`:**
```json
Request:
{
  "twoFactorToken": "short-lived-token",
  "otp": "123456"
}
Response: (giống response login thành công)
{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresIn": 900
}
```

**Business Rules:**
- OTP có hiệu lực 5 phút
- Hết hiệu lực hoặc sai 3 lần: yêu cầu login lại
- OTP stored hashed trong `two_factor_codes(user_id, code_hash, expires_at, used_at)`

---

## 2.2 User Management

### Task #19 — `GET /users`

**Auth:** JWT · Roles: `TENANT_ADMIN`, `MANAGER`

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `role` | string | Filter theo role |
| `isActive` | boolean | Filter active/inactive |
| `search` | string | Tìm theo tên, email |
| `page` / `limit` | number | Phân trang |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Jane Staff",
      "email": "jane@acme.com",
      "role": "STAFF",
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "meta": { "total": 15, "page": 1, "limit": 20 }
}
```

---

### Task #19 (cont.) — `POST /users`

**Auth:** JWT · Roles: `TENANT_ADMIN`

**Request Body:**
```json
{
  "name": "Jane Staff",
  "email": "jane@acme.com",
  "role": "STAFF",
  "phone": "0901234567",
  "password": "TempPass123!"
}
```

**Business Rules:**
1. Email unique trong tenant
2. Role phải là một trong: `STAFF`, `WAREHOUSE`, `ACCOUNTANT`, `MANAGER`, `TENANT_ADMIN`
3. `TENANT_ADMIN` chỉ tạo được khi không có user nào khác là `TENANT_ADMIN` (hoặc cho phép multiple — cần confirm)
4. Gửi welcome email với credentials nếu `sendWelcomeEmail = true`
5. Kiểm tra `maxUsers` config của tenant trước khi tạo

**Response 201:** User object (không trả password)

**Errors:**
| Code | HTTP | Condition |
|------|------|-----------|
| `EMAIL_EXISTS` | 409 | Email đã tồn tại trong tenant |
| `MAX_USERS_REACHED` | 403 | Đã đạt giới hạn user của tenant |
| `INVALID_ROLE` | 422 | Role không hợp lệ |

---

### Task #19 (cont.) — `PUT /users/:id`

**Auth:** JWT · Roles: `TENANT_ADMIN`

**Request Body:** (optional fields)
```json
{
  "name": "Jane Updated",
  "phone": "0909876543",
  "role": "MANAGER"
}
```

**Business Rules:**
1. Không cho phép tự đổi role của chính mình
2. Không cho phép sửa email (phải deactivate + tạo mới)

---

### Task #24 — `PATCH /users/:id/deactivate` & `/activate`

**Auth:** JWT · Roles: `TENANT_ADMIN`

**Business Rules:**
1. Không thể deactivate chính mình
2. Khi deactivate: invalidate refresh tokens của user đó
3. User deactivated không thể login (trả `USER_INACTIVE`)

**Response 200:** `{ "isActive": false }`

---

### Task #20 — `POST /users/:id/assign-role`

**Auth:** JWT · Roles: `TENANT_ADMIN`

**Request Body:**
```json
{ "role": "MANAGER" }
```

**Business Rules:**
1. Chỉ `TENANT_ADMIN` mới gán được role
2. `TENANT_ADMIN` không thể hạ cấp chính mình xuống role khác (trừ khi có admin khác)
3. Ghi audit log khi thay đổi role

**Response 200:** User object với role mới

---

### Task #21 — Seed Default Roles (run at provision time)

Roles và permissions mặc định tạo ra khi provision tenant:

| Role | Key Permissions |
|------|----------------|
| `TENANT_ADMIN` | Full access |
| `MANAGER` | View all reports, approve discounts, view all data within branch |
| `ACCOUNTANT` | Payments, AR/AP, financial reports; no product edit |
| `WAREHOUSE` | Stock in/out/adjust/transfer, stocktaking; no financial data |
| `STAFF` | Create orders, view products/customers, no cost price |

**DB:** `roles`, `permissions`, `role_permissions` (trong tenant schema)

---

## Database Schema

```sql
-- Platform DB (shared)
CREATE TABLE users (  -- For SUPER_ADMIN only
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50) NOT NULL DEFAULT 'SUPER_ADMIN',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tenant Schema (per tenant)
CREATE TABLE users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               VARCHAR(255) NOT NULL,
  email              VARCHAR(255) NOT NULL UNIQUE,
  password_hash      VARCHAR(255) NOT NULL,
  phone              VARCHAR(20),
  role               VARCHAR(50) NOT NULL,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  failed_login_count INT NOT NULL DEFAULT 0,
  locked_until       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE two_factor_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash   VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ
);

CREATE TABLE login_attempts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  email       VARCHAR(255),
  ip_address  VARCHAR(45),
  success     BOOLEAN NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

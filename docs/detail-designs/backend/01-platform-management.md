# MODULE 1 — Platform Management: Backend Detail Design

> Ref: `usecase.md` UC-01 → UC-05 | Feature list tasks #1–#13

---

## 1.1 Tenant List

### Task #1 — `GET /tenants`

**Auth:** JWT · Roles: `SUPER_ADMIN`

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | `PENDING\|ACTIVE\|SUSPENDED\|FAILED` | Filter theo trạng thái |
| `search` | string | Match trên `name`, `slug`, `domain` |
| `page` | number (default 1) | Phân trang |
| `limit` | number (default 20, max 100) | Số items/trang |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "domain": "acme.app.com",
      "status": "ACTIVE",
      "adminEmail": "admin@acme.com",
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-10T00:00:00Z"
    }
  ],
  "meta": { "total": 50, "page": 1, "limit": 20, "totalPages": 3 }
}
```

**DB:** `tenants`

---

## 1.2 Create Tenant + Provision

### Task #2 — `POST /tenants`

**Auth:** JWT · Roles: `SUPER_ADMIN`

**Request Body:**
```json
{
  "name": "Acme Corp",
  "slug": "acme-corp",
  "domain": "acme.app.com",
  "adminEmail": "admin@acme.com",
  "adminName": "John Doe",
  "config": {
    "maxUsers": 50,
    "features": ["loyalty", "serial_tracking"]
  }
}
```

**Business Rules:**
1. `slug` duy nhất globally (lowercase, chỉ cho phép `a-z0-9-`)
2. `domain` duy nhất globally (optional, nếu dùng subdomain routing)
3. Tenant tạo ra với `status = PENDING`
4. Sau khi lưu thành công, dispatch async job `ProvisionTenantJob`

**Response 201:**
```json
{
  "id": "uuid",
  "name": "Acme Corp",
  "slug": "acme-corp",
  "status": "PENDING",
  "message": "Tenant created. Provisioning started."
}
```

**Errors:**
| Code | HTTP | Condition |
|------|------|-----------|
| `TENANT_SLUG_EXISTS` | 409 | slug đã tồn tại |
| `TENANT_DOMAIN_EXISTS` | 409 | domain đã tồn tại |
| `VALIDATION_ERROR` | 422 | Thiếu/sai trường bắt buộc |

**DB:** `tenants`, `tenant_configs`

---

### Task #3 — Async Job: `ProvisionTenantJob`

**Trigger:** Sau khi `POST /tenants` thành công.

**Steps:**
1. Tạo schema/database riêng cho tenant: `tenant_<slug>`
2. Run migrations cho tenant schema (tạo đủ tables)
3. Seed dữ liệu mặc định: roles hệ thống, cấu hình currency, đơn vị mặc định
4. Gọi `CreateTenantAdminStep` (Task #4)
5. Cập nhật `tenants.status = ACTIVE`

**On failure:**
- Cập nhật `tenants.status = FAILED`
- Ghi log lỗi chi tiết vào `provision_logs`
- Gửi alert email cho SUPER_ADMIN

**Idempotency:** Job phải idempotent — có thể retry an toàn khi bị lỗi giữa chừng.

---

### Task #4 — Create Tenant Admin (step trong ProvisionTenantJob)

**Actions:**
1. Generate random password (16 ký tự, `[A-Za-z0-9!@#$%]`)
2. Hash password với bcrypt (rounds = 12)
3. Tạo user record trong tenant schema với role `TENANT_ADMIN`
4. Gửi email onboarding kèm credentials (template `tenant_welcome`)
5. Cập nhật `tenants.status = ACTIVE`

**DB:** `users` (trong tenant schema)

---

## 1.3 Update Tenant

### Task #8 — `PUT /tenants/:id`

**Auth:** JWT · Roles: `SUPER_ADMIN`

**Request Body:** (tất cả optional)
```json
{
  "name": "New Corp Name",
  "domain": "new-domain.app.com",
  "config": {
    "maxUsers": 100,
    "features": ["loyalty", "batch_tracking", "serial_tracking"]
  }
}
```

**Business Rules:**
1. Không cho phép thay đổi `slug` (immutable sau khi tạo)
2. Nếu thay đổi `domain`: validate unique
3. Chỉ cho phép update tenant có status `ACTIVE` hoặc `SUSPENDED`

**Response 200:** Tenant object đầy đủ sau khi cập nhật

**Errors:**
| Code | HTTP | Condition |
|------|------|-----------|
| `TENANT_NOT_FOUND` | 404 | Không tìm thấy tenant |
| `TENANT_DOMAIN_EXISTS` | 409 | Domain mới đã tồn tại |
| `CANNOT_UPDATE_PROVISIONING` | 400 | Tenant đang ở status PENDING/FAILED |

**DB:** `tenants`, `tenant_configs`

---

## 1.4 Suspend / Activate Tenant

### Task #10 — `PATCH /tenants/:id/status`

**Auth:** JWT · Roles: `SUPER_ADMIN`

**Request Body:**
```json
{
  "status": "SUSPENDED",
  "reason": "Payment overdue for 30 days"
}
```

**Business Rules:**
1. Transition hợp lệ: `ACTIVE → SUSPENDED`, `SUSPENDED → ACTIVE`
2. Transition không hợp lệ: `PENDING → SUSPENDED`, `FAILED → ACTIVE`, v.v.
3. Khi `SUSPENDED`: Invalidate toàn bộ active sessions (JWT + refresh tokens) của tenant
4. Khi user của tenant suspended cố login: API trả 403 `TENANT_SUSPENDED`
5. `reason` bắt buộc khi chuyển sang `SUSPENDED`

**Response 200:**
```json
{
  "id": "uuid",
  "status": "SUSPENDED",
  "suspendedAt": "2026-04-22T10:00:00Z",
  "suspendedReason": "Payment overdue for 30 days"
}
```

**Errors:**
| Code | HTTP | Condition |
|------|------|-----------|
| `INVALID_STATUS_TRANSITION` | 400 | Transition không được phép |
| `REASON_REQUIRED` | 422 | Thiếu reason khi suspend |
| `TENANT_NOT_FOUND` | 404 | Không tìm thấy |

**DB:** `tenants`, `refresh_tokens` (delete by tenant_id)

---

## 1.5 Reset Tenant Admin Password

### Task #12 — `POST /tenants/:id/reset-admin`

**Auth:** JWT · Roles: `SUPER_ADMIN`

**Request Body:** (không có — action thực hiện tự động)

**Actions:**
1. Tìm user có role `TENANT_ADMIN` trong tenant
2. Generate mật khẩu mới (16 ký tự)
3. Hash và cập nhật `users.password_hash`
4. Xoá tất cả refresh tokens của admin đó
5. Gửi email với mật khẩu mới (template `password_reset_by_admin`)

**Response 200:**
```json
{
  "message": "Password reset. Email sent to admin@acme.com"
}
```

**Errors:**
| Code | HTTP | Condition |
|------|------|-----------|
| `TENANT_NOT_FOUND` | 404 | Không tìm thấy tenant |
| `ADMIN_NOT_FOUND` | 404 | Tenant chưa có admin (status PENDING/FAILED) |

**DB:** `users`, `refresh_tokens`

---

## Database Schema

```sql
CREATE TABLE tenants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL,
  slug             VARCHAR(100) NOT NULL UNIQUE,
  domain           VARCHAR(255) UNIQUE,
  status           VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                   -- CHECK status IN ('PENDING','ACTIVE','SUSPENDED','FAILED')
  admin_email      VARCHAR(255) NOT NULL,
  suspended_reason TEXT,
  suspended_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tenant_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key         VARCHAR(100) NOT NULL,
  value       JSONB NOT NULL DEFAULT '{}',
  UNIQUE (tenant_id, key)
);

CREATE TABLE provision_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  step        VARCHAR(100),
  status      VARCHAR(20), -- 'SUCCESS' | 'FAILED'
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Notes

- `slug` dùng làm database schema name: `tenant_<slug>` → cần sanitize trước khi dùng làm SQL identifier
- Job queue: sử dụng BullMQ (Redis-backed) để đảm bảo provision chạy reliably với retry logic
- Tenant schema isolation giúp dữ liệu của từng tenant hoàn toàn tách biệt về mặt DB
- SUPER_ADMIN không thuộc tenant nào — stored trong platform (shared) database

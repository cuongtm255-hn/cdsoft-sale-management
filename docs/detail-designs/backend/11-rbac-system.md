# MODULE 11 — RBAC, Audit Log & System: Backend Detail Design

> Ref: `usecase.md` UC-29, UC-30 | `srs-tenant-detail.md` Ch.8 | Feature list tasks #125–#136

---

## 11.1 Role-Based Access Control

### Task #125 — RBAC Schema

```
User ──has──> Role ──has-many──> RolePermission ──references──> Permission
```

**Permission format:** `{resource}:{action}`

| Resource | Actions |
|----------|---------|
| `products` | `read`, `write`, `delete` |
| `customers` | `read`, `write`, `delete` |
| `orders` | `read`, `write`, `confirm`, `cancel` |
| `inventory` | `read`, `write`, `adjust` |
| `invoices` | `read`, `write` |
| `payments` | `read`, `write` |
| `reports` | `read` |
| `reports.finance` | `read` (subset của reports) |
| `users` | `read`, `write` |
| `roles` | `read`, `write` |
| `settings` | `read`, `write` |
| `cost_price` | `read` |
| `audit_logs` | `read` |

**Default role permissions (seed data):**

| Permission | STAFF | WAREHOUSE | ACCOUNTANT | MANAGER | ADMIN |
|-----------|-------|-----------|------------|---------|-------|
| products:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| products:write | ✅ | ❌ | ❌ | ✅ | ✅ |
| cost_price:read | ❌ | ❌ | ✅ | ✅ | ✅ |
| orders:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| orders:write | ✅ | ❌ | ❌ | ✅ | ✅ |
| orders:confirm | ✅ | ❌ | ❌ | ✅ | ✅ |
| inventory:write | ❌ | ✅ | ❌ | ✅ | ✅ |
| payments:write | ✅ | ❌ | ✅ | ✅ | ✅ |
| reports:read | ❌ | ❌ | ✅ | ✅ | ✅ |
| reports.finance:read | ❌ | ❌ | ✅ | ✅ | ✅ |
| users:write | ❌ | ❌ | ❌ | ❌ | ✅ |
| settings:write | ❌ | ❌ | ❌ | ❌ | ✅ |
| audit_logs:read | ❌ | ❌ | ❌ | ✅ | ✅ |

---

### Task #126 — Permission Middleware

```typescript
// Middleware function: checkPermission(permission: string)
export const checkPermission = (permission: string) => {
  return async (req, res, next) => {
    const userRole = req.user.role
    const hasPermission = await rolePermissionCache.has(userRole, permission)
    if (!hasPermission) {
      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        message: `Role '${userRole}' lacks permission: '${permission}'`
      })
    }
    next()
  }
}

// Usage on routes:
router.get('/products', checkPermission('products:read'), handler)
router.delete('/products/:id', checkPermission('products:delete'), handler)
```

**Caching:** Role-permission map cache trong Redis với TTL 5 phút. Invalidate khi `PUT /roles/:id/permissions` được gọi.

---

### Task #127 — `GET /roles`

**Auth:** JWT · Roles: `TENANT_ADMIN`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "STAFF",
      "label": "Nhân viên bán hàng",
      "isSystem": true,
      "userCount": 5,
      "permissions": ["products:read", "orders:read", "orders:write", "orders:confirm"]
    }
  ]
}
```

### Task #127 — `POST /roles`

**Request Body:**
```json
{
  "name": "CUSTOM_ROLE",
  "label": "Vai trò tùy chỉnh",
  "permissions": ["products:read", "orders:read"]
}
```

**Business Rules:**
1. `name` unique trong tenant
2. Không cho phép trùng tên với system roles
3. `isSystem = false` cho roles tự tạo

### Task #127 — `PUT /roles/:id/permissions`

**Request Body:**
```json
{
  "permissions": ["products:read", "orders:read", "orders:write"]
}
```

**Business Rules:**
1. Không cho phép sửa permissions của system roles (STAFF, WAREHOUSE, ACCOUNTANT, MANAGER)
2. TENANT_ADMIN role không thể bị sửa
3. Sau khi update: invalidate permission cache cho role đó

---

## 11.2 Audit Log

### Task #129 — Audit Log Middleware

**Trigger:** Tự động sau mọi mutation (POST, PUT, PATCH, DELETE) thành công

```typescript
// Applied as post-handler middleware
const auditLogMiddleware = async (req, res, next) => {
  const originalJson = res.json.bind(res)
  res.json = (body) => {
    // After response sent, log the action
    if (res.statusCode < 400) {
      await auditLogger.log({
        userId: req.user?.id,
        tenantId: req.user?.tenantId,
        action: `${req.method}:${req.route.path}`,
        resource: extractResource(req.route.path),
        resourceId: req.params.id,
        before: req.beforeSnapshot,  // set by route handler if needed
        after: sanitize(body),       // remove sensitive fields
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date()
      })
    }
    return originalJson(body)
  }
  next()
}
```

**Important:** `before` snapshot chỉ cần thiết cho PUT/PATCH. Middleware sẽ fetch before state trước khi execute.

**Sensitive data masking:** Không log `password`, `token`, thông tin thẻ ngân hàng.

---

### Task #130 — `GET /audit-logs`

**Auth:** JWT · Roles: `MANAGER`, `TENANT_ADMIN`

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `userId` | uuid | Filter actor |
| `resource` | string | `products`, `orders`, `customers`, etc. |
| `action` | string | `POST`, `PUT`, `DELETE` |
| `from` / `to` | datetime | Khoảng thời gian |
| `page` / `limit` | number | Phân trang |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user": { "id": "uuid", "name": "Nguyen Van A", "role": "STAFF" },
      "action": "PUT:/orders/:id/confirm",
      "resource": "orders",
      "resourceId": "uuid",
      "before": { "status": "DRAFT" },
      "after": { "status": "CONFIRMED" },
      "ipAddress": "192.168.1.10",
      "createdAt": "2026-04-22T14:30:00Z"
    }
  ],
  "meta": { "total": 1250, "page": 1, "limit": 50 }
}
```

---

## 11.3 Cash & Bank Management

### Task #132 — Warehouse CRUD

**`GET /warehouses`:** Danh sách kho
**`POST /warehouses`:** Tạo kho mới
**`PUT /warehouses/:id`:** Cập nhật kho
**`DELETE /warehouses/:id`:** Chỉ khi không có tồn kho

### Task #132 — Cash Fund & Bank Account CRUD

**`GET /cash-funds`:** Danh sách quỹ + số dư
**`POST /cash-funds`:** Tạo quỹ
**`GET /bank-accounts`:** Danh sách tài khoản ngân hàng
**`POST /bank-accounts`:** Thêm tài khoản

### Task #133 — Manual Receipt/Disbursement Approval

**Approval flow:**
1. STAFF tạo phiếu chi > threshold → `status = PENDING_APPROVAL`
2. MANAGER/ADMIN duyệt: `PATCH /cash-disbursements/:id/approve`
3. Từ chối: `PATCH /cash-disbursements/:id/reject { reason }`
4. Sau duyệt: debit tài khoản/quỹ, ghi transaction

### Task #134 — Bank Reconciliation

**`POST /bank-reconciliation/import`:**
- Upload file CSV/XLSX sao kê ngân hàng
- Parse transactions từ file
- Auto-match với `cash_receipts`/`cash_disbursements` bằng `transactionRef` hoặc `amount + date`

**`GET /bank-reconciliation/unmatched`:**
- Trả danh sách giao dịch chưa khớp từ cả 2 phía

---

## Database Schema

```sql
CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50) NOT NULL UNIQUE,
  label       VARCHAR(100) NOT NULL,
  is_system   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(100) NOT NULL UNIQUE,
  label       VARCHAR(255),
  resource    VARCHAR(50) NOT NULL,
  action      VARCHAR(30) NOT NULL
);

CREATE TABLE role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id),
  user_name    VARCHAR(255),
  user_role    VARCHAR(50),
  action       VARCHAR(100) NOT NULL,
  resource     VARCHAR(50) NOT NULL,
  resource_id  UUID,
  before_data  JSONB,
  after_data   JSONB,
  ip_address   VARCHAR(45),
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partitioned by month for performance
CREATE TABLE audit_logs PARTITION BY RANGE (created_at);
```

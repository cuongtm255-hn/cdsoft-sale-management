# MODULE 1 — Platform Management: Frontend Detail Design

> Ref: `usecase.md` UC-01 → UC-05 | Feature list tasks #5–#7, #9, #11, #13

---

## Architecture Notes

- Platform pages: `src/platform/pages/`
- Import aliases: `@shared/components/PageHeader`, `@shared/components/DataTable`, `@shared/hooks/useApi`, `@api/platform.api`
- Hooks: `usePagination(apiFn)` → `{ fetch, loading, data, pagination, onTableChange }`, `useApi(apiFn, { successMessage, onSuccess })` → `{ execute, loading }`
- API functions: `tenantsApi`, `platformUsersApi`, `auditLogsApi` from `@api/platform.api`
- Auth: `useAuth()` from `@auth/AuthContext` — accesses `platformUser`
- Navigation: React Router v6 `useNavigate()`

### Component Pattern

```jsx
import { useEffect } from 'react';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination } from '@shared/hooks/useApi';
import { tenantsApi } from '@api/platform.api';

export default function TenantList() {
  const { fetch, loading, data, pagination, onTableChange } = usePagination(tenantsApi.list);
  useEffect(() => { fetch(); }, []);
  // ...
}
```

---

## 1.1 Tenant List Screen

### Tasks: #5, #6, #7

**Route:** `/platform/tenants`
**Access:** SUPER_ADMIN, PLATFORM_OPERATOR

### Layout
```
[Header: "Tenants"]                              [+ New Tenant]
─────────────────────────────────────────────────────
| Code      | Name     | Company      | Status    | Provision  | Actions |
|-----------|----------|--------------|-----------|------------|---------|
| ACME_CORP | Acme     | Acme Corp    | ● ACTIVE  | ✅ ACTIVE  | View    |
| BИЗCO     | BizCo    | BizCo Ltd    | ○ INACTIVE| ⏳ PENDING | View    |
─────────────────────────────────────────────────────
[Pagination]
```

### Columns
- `tenantCode` — unique identifier
- `tenantName` — display name
- `companyName`
- `status` — `<Tag color={statusColor[v]}>` where `statusColor = { ACTIVE:'green', INACTIVE:'default', SUSPENDED:'red' }`
- `provisioningStatus` — `<Tag>` (PENDING, PROVISIONING, ACTIVE, FAILED)
- Actions: View button → navigate to `/platform/tenants/:id`

### Implementation

```jsx
const statusColor = { ACTIVE: 'green', INACTIVE: 'default', SUSPENDED: 'red' };

const columns = [
  { title: 'Code', dataIndex: 'tenantCode', key: 'tenantCode' },
  { title: 'Name', dataIndex: 'tenantName', key: 'tenantName' },
  { title: 'Company', dataIndex: 'companyName', key: 'companyName' },
  { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={statusColor[v]}>{v}</Tag> },
  { title: 'Provision', dataIndex: 'provisioningStatus', render: (v) => <Tag>{v}</Tag> },
  { title: 'Actions', render: (_, row) => (
    <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/platform/tenants/${row.id}`)}>View</Button>
  )},
];
```

---

## 1.2 Create Tenant Screen

### Task: #6, #7

**Route:** `/platform/tenants/new`

### Form Fields
| Field | Name | Required | Type |
|-------|------|----------|------|
| Tenant Code | `tenantCode` | ✅ | Text — uppercase, unique |
| Tenant Name | `tenantName` | ✅ | Text |
| Company Name | `companyName` | ✅ | Text |
| Contact Name | `contactName` | ✅ | Text |
| Contact Email | `contactEmail` | ✅ | Email |
| Contact Phone | `contactPhone` | ❌ | Text |
| DB Host | `dbHost` | ❌ | Text, default `localhost` |
| DB Port | `dbPort` | ❌ | Number, default `3306` |

### Implementation

```jsx
import { Form, Input, InputNumber, Button, Card, Row, Col } from 'antd';
import { tenantsApi } from '@api/platform.api';

export default function TenantCreate() {
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    try {
      await tenantsApi.create(values);
      message.success('Tenant provisioning started');
      navigate('/platform/tenants');
    } catch {
      message.error('Failed to create tenant');
    }
  };

  return (
    <div>
      <PageHeader title="Create Tenant" />
      <Card>
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="tenantCode" label="Tenant Code" rules={[{ required: true }]}>
                <Input placeholder="ACME_CORP" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactEmail" label="Contact Email" rules={[{ required: true, type: 'email' }]}>
                <Input />
              </Form.Item>
            </Col>
            {/* dbHost, dbPort, etc. */}
          </Row>
          <Form.Item>
            <Button type="primary" htmlType="submit">Create & Provision</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
```

### Flow
1. Submit → `tenantsApi.create(values)`
2. Success: `message.success(...)` → navigate to `/platform/tenants`
3. Error: `message.error(...)`

---

## 1.3 Tenant Detail Screen

### Task: #9

**Route:** `/platform/tenants/:id`
**File:** `src/platform/pages/TenantDetail.jsx`

### Layout
```
[← Back]  [tenantName]   [Status Tag]
─────────────────────────
Tabs: [Info] [Provision Log]
─────────────────────────
Info tab:
  Tenant Code: (read-only)
  Tenant Name: [input]
  Company Name: [input]
  Contact Email: [input]
  Contact Phone: [input]
  [Save Changes]
```

### API Integration

```jsx
import { tenantsApi } from '@api/platform.api';
import { useApi } from '@shared/hooks/useApi';

const { execute: updateTenant } = useApi(
  (data) => tenantsApi.update(id, data),
  { successMessage: 'Tenant updated' }
);
```

---

## 1.4 Suspend / Activate

### Task: #11

**Location:** Tenant Detail page

```jsx
import { tenantsApi } from '@api/platform.api';

// Suspend
await tenantsApi.updateStatus(id, { status: 'SUSPENDED' });
// Activate
await tenantsApi.updateStatus(id, { status: 'ACTIVE' });
```

**Status transitions:** `ACTIVE → SUSPENDED`, `SUSPENDED → ACTIVE`
Button shown/hidden based on current `status`.

---

## 1.5 Platform Users Screen

### Task: #13

**Route:** `/platform/users`
**File:** `src/platform/pages/PlatformUsers.jsx`

### Pattern

```jsx
import { platformUsersApi } from '@api/platform.api';

const { fetch, loading, data, pagination, onTableChange } = usePagination(platformUsersApi.list);
const { execute: toggleLock } = useApi(platformUsersApi.toggleLock, { onSuccess: () => fetch() });
```

### Columns
- `username`, `email`, `role` (`<Tag>`), `status` (`<Tag color={v === 'ACTIVE' ? 'green' : 'red'}>`)
- Actions: Lock/Unlock button — `PATCH /platform/users/:id/lock`

---

## API Reference

```javascript
// src/api/platform.api.js
export const tenantsApi = {
  list:          (params) => platformApi.get('/platform/tenants', { params }),
  get:           (id)     => platformApi.get(`/platform/tenants/${id}`),
  create:        (data)   => platformApi.post('/platform/tenants', data),
  update:        (id, d)  => platformApi.put(`/platform/tenants/${id}`, d),
  updateStatus:  (id, d)  => platformApi.patch(`/platform/tenants/${id}/status`, d),
  reprovision:   (id)     => platformApi.post(`/platform/tenants/${id}/provision`),
  resetAdmin:    (id)     => platformApi.post(`/platform/tenants/${id}/reset-admin`),
  provisioningLog:(id)    => platformApi.get(`/platform/tenants/${id}/provisioning-log`),
};

export const platformUsersApi = {
  list:       (params) => platformApi.get('/platform/users', { params }),
  create:     (data)   => platformApi.post('/platform/users', data),
  update:     (id, d)  => platformApi.put(`/platform/users/${id}`, d),
  toggleLock: (id)     => platformApi.patch(`/platform/users/${id}/lock`),
};
```

---

## Navigation Flow

```
/platform/tenants (TenantList)
  └─ Click "+ New Tenant" → /platform/tenants/new (TenantCreate)
  └─ Click "View" → /platform/tenants/:id (TenantDetail)
       ├─ Edit info → Save
       ├─ updateStatus (Suspend/Activate)
       └─ resetAdmin → toast

/platform/users (PlatformUsers)
  └─ Lock/Unlock inline
  └─ Add User → modal or drawer
```

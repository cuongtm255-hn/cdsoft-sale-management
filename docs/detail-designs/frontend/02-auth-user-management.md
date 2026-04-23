# MODULE 2 — Auth & User Management: Frontend Detail Design

> Ref: `usecase.md` UC-06, UC-07 | `srs-tenant-detail.md` Ch.8.1 | Feature list tasks #17–#24

---

## Architecture Notes

- Tenant pages: `src/tenant/pages/`
- Platform auth: `src/platform/pages/Login.jsx`
- Auth state: `useAuth()` from `@auth/AuthContext` — `{ tenantUser, tenantLogin, tenantLogout, platformUser, platformLogin, platformLogout }`
- Token storage: `localStorage` (via `AuthContext`) — **not httpOnly cookie**
- API: `tenantAuth` from `@api/tenant.api`, `platformAuth` from `@api/platform.api`
- JWT payload decoded from token: `{ sub, email, role, tenantCode, userType: 'TENANT' }`

---

## 2.1 Tenant Login Screen

### Task: #17

**Route:** `/tenant/login`
**File:** `src/tenant/pages/Login.jsx`
**Access:** Public (redirect to dashboard if already authenticated)

### Layout
```
─────────────────────────
      "Tenant Portal"
─────────────────────────
  Tenant Code  [BankOutlined icon]
  Email        [UserOutlined icon]
  Password     [LockOutlined icon] [👁]
  [Sign In]
─────────────────────────
```

### Implementation

```jsx
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, BankOutlined } from '@ant-design/icons';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@auth/AuthContext';
import { tenantAuth } from '@api/tenant.api';

export default function TenantLoginPage() {
  const { tenantLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    try {
      const { data } = await tenantAuth.login(values);
      tenantLogin(data.data?.accessToken || data.accessToken);
      navigate(location.state?.from?.pathname || '/tenant/dashboard', { replace: true });
    } catch {
      message.error('Invalid credentials or tenant not found');
    }
  };

  return (
    <Form form={form} onFinish={onFinish} layout="vertical"
          initialValues={{ tenantCode: searchParams.get('tenant') || '' }}>
      <Form.Item name="tenantCode" rules={[{ required: true }]}>
        <Input prefix={<BankOutlined />} placeholder="Tenant Code" size="large" />
      </Form.Item>
      <Form.Item name="email" rules={[{ required: true, type: 'email' }]}>
        <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
      </Form.Item>
      <Form.Item name="password" rules={[{ required: true }]}>
        <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" size="large" block>Sign In</Button>
      </Form.Item>
    </Form>
  );
}
```

### Form Fields
| Field | Name | Required | Notes |
|-------|------|----------|-------|
| Tenant Code | `tenantCode` | ✅ | Pre-filled from `?tenant=` query param |
| Email | `email` | ✅ | Valid email format |
| Password | `password` | ✅ | Input.Password |

### Flow
1. User điền form → submit
2. `tenantAuth.login({ tenantCode, email, password })`
3. Success: `tenantLogin(accessToken)` → stores in localStorage → redirect to `/tenant/dashboard`
4. Error: `message.error('Invalid credentials or tenant not found')`

> Note: 2FA is not implemented. Token stored in localStorage (not httpOnly cookie).

---

## 2.2 Platform Login Screen

### Task: #17 (platform side)

**Route:** `/platform/login`
**File:** `src/platform/pages/Login.jsx`

```jsx
import { platformAuth } from '@api/platform.api';
import { useAuth } from '@auth/AuthContext';

const { platformLogin } = useAuth();

const onFinish = async (values) => {
  const { data } = await platformAuth.login(values);
  platformLogin(data.data?.accessToken || data.accessToken);
  navigate('/platform/dashboard');
};
```

---

## 2.3 AuthContext

**File:** `src/auth/AuthContext.jsx`

```jsx
// State shape
const initialState = {
  platformUser: null,  // decoded JWT payload for platform
  tenantUser: null,    // decoded JWT payload for tenant
};

// Provided values
{
  platformUser, tenantUser,
  platformLogin(token), tenantLogin(token),
  platformLogout(), tenantLogout()
}
```

- Token stored in `localStorage` under `PLATFORM_TOKEN_KEY` / `TENANT_TOKEN_KEY`
- JWT payload auto-decoded with `JSON.parse(atob(token.split('.')[1]))`
- `tenantUser.role` available for role-based UI rendering

---

## 2.4 User Management Screen

### Tasks: #19, #20, #23, #24

**Route:** `/tenant/users`
**File:** `src/tenant/pages/Users.jsx`

### Layout
```
[Header: "Users"]
────────────────────────────────────────────────────
| Name       | Email           | Role     | Status  |
|------------|-----------------|----------|---------|
| Jane Staff | jane@acme.com   | STAFF    | ACTIVE  |
| John Mgr   | john@acme.com   | MANAGER  | ACTIVE  |
────────────────────────────────────────────────────
```

### Implementation

```jsx
import { Tag } from 'antd';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination } from '@shared/hooks/useApi';
import { tenantApi } from '@api/axios';

const usersApi = { list: (params) => tenantApi.get('/tenant/users', { params }) };

export default function TenantUsers() {
  const { fetch, loading, data, pagination, onTableChange } = usePagination(usersApi.list);
  useEffect(() => { fetch(); }, []);

  const columns = [
    { title: 'Name', dataIndex: 'fullName' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Role', dataIndex: 'role', render: (v) => <Tag>{v}</Tag> },
    { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={v === 'ACTIVE' ? 'green' : 'red'}>{v}</Tag> },
  ];
  // ...
}
```

### Create User Form
Fields: `fullName`, `email`, `password`, `role` (Select), `phone`

```jsx
import { useApi } from '@shared/hooks/useApi';

const { execute: createUser, loading } = useApi(
  (data) => tenantApi.post('/tenant/users', data),
  { successMessage: 'User created', onSuccess: () => { fetch(); setModalOpen(false); } }
);
```

---

## 2.5 Change Password

**Route:** `/tenant/profile` (or modal)

```jsx
const { execute: changePassword } = useApi(
  (data) => tenantApi.patch('/tenant/auth/change-password', data),
  { successMessage: 'Password changed successfully' }
);
```

---

## Shared Auth Components

| Component | Mô tả |
|-----------|-------|
| `<ProtectedRoute>` | `src/auth/ProtectedRoute.jsx` — redirects if not authenticated |
| `useAuth()` | Returns `{ tenantUser, platformUser, tenantLogin, ... }` |

---

## Route Guard Pattern

```jsx
// src/auth/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ children, type = 'tenant' }) {
  const { tenantUser, platformUser } = useAuth();
  const location = useLocation();
  const user = type === 'platform' ? platformUser : tenantUser;
  if (!user) return <Navigate to={`/${type}/login`} state={{ from: location }} replace />;
  return children;
}
```

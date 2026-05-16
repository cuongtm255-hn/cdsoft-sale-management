# Frontend — Tài Liệu Cấu Trúc Source Code

> **Project:** `sales-platform-frontend`  
> **Framework:** React 18 · Vite 5 · Ant Design 5  
> **Mục đích tài liệu:** Tham khảo thiết kế chi tiết (Detailed Design)

---

## 1. Tổng Quan Kiến Trúc

### 1.1 Hai Ứng Dụng Trong Một Codebase

Frontend phục vụ hai vai trò người dùng hoàn toàn tách biệt, được routing theo path:

| Portal | URL Prefix | Người dùng | Theme |
|--------|-----------|-----------|-------|
| **Platform Admin** | `/platform/...` | SUPER_ADMIN, PLATFORM_OPERATOR | Dark sidebar |
| **Tenant Portal** | `/tenant/...` | Tenant users | Light sidebar |

### 1.2 Kiến Trúc Tổng Thể

```
index.html
└── main.jsx               ← React entry point
    └── App.jsx
        ├── BrowserRouter  ← React Router v6
        └── AuthProvider   ← Global auth state (useReducer)
            └── AppRouter  ← Route definitions
                ├── /platform/*  → PlatformLayout + pages
                └── /tenant/*   → TenantLayout + pages
```

### 1.3 State Management

Không dùng Redux/Zustand cho auth state. Dùng **React Context + useReducer** pattern:

```
AuthContext
├── state.platformUser    ← JWT payload của platform user
├── state.tenantUser      ← JWT payload của tenant user
├── platformLogin(token)  ← save to localStorage + dispatch
├── tenantLogin(token)
├── platformLogout()      ← remove from localStorage + dispatch
└── tenantLogout()
```

---

## 2. Cấu Trúc Thư Mục

```
frontend/
├── src/
│   ├── main.jsx                        # React entry point
│   ├── App.jsx                         # Root component
│   ├── index.css                       # Global styles
│   │
│   ├── router/
│   │   └── index.jsx                   # Toàn bộ route definitions
│   │
│   ├── api/                            # Tầng giao tiếp API
│   │   ├── axios.js                    # Axios instances + interceptors
│   │   ├── platform.api.js             # Platform API functions
│   │   └── tenant.api.js               # Tenant API functions
│   │
│   ├── auth/                           # Authentication
│   │   ├── AuthContext.jsx             # Context + useReducer
│   │   └── ProtectedRoute.jsx          # Route guards
│   │
│   ├── shared/                         # Shared components & hooks
│   │   ├── components/
│   │   │   ├── DataTable.jsx           # Ant Design Table wrapper
│   │   │   └── PageHeader.jsx          # Tiêu đề trang + actions
│   │   └── hooks/
│   │       └── useApi.js               # useApi + usePagination hooks
│   │
│   ├── platform/                       # Platform Admin Portal
│   │   ├── layout/
│   │   │   └── PlatformLayout.jsx      # Shell layout với dark sidebar
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Dashboard.jsx
│   │       ├── TenantList.jsx
│   │       ├── TenantCreate.jsx
│   │       ├── TenantDetail.jsx
│   │       ├── PlatformUsers.jsx
│   │       └── AuditLogs.jsx
│   │
│   └── tenant/                         # Tenant Business Portal
│       ├── layout/
│       │   └── TenantLayout.jsx        # Shell layout với light sidebar
│       └── pages/
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           ├── Products.jsx
│           ├── Categories.jsx
│           ├── Customers.jsx
│           ├── Suppliers.jsx
│           ├── Inventory.jsx
│           ├── PurchaseOrders.jsx
│           ├── SalesOrders.jsx
│           ├── Payments.jsx
│           └── Users.jsx
│
├── index.html
├── vite.config.js                      # Vite + path aliases
├── package.json
└── Dockerfile
```

---

## 3. Chi Tiết Từng Thành Phần

### 3.1 Entry Points

#### `main.jsx`

```jsx
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
```

#### `App.jsx`

Wrap toàn bộ app với:
- `BrowserRouter` (React Router v6)
- `AuthProvider` (auth state context)

---

### 3.2 `router/index.jsx` — Route Definitions

**Path Alias:** `@/router` → `src/router`

Cấu trúc route dạng nested (React Router v6):

```
/                        → Navigate to /platform/login

/platform/login          → PlatformLoginPage (Public)
/platform                → PlatformProtectedRoute
  /platform/dashboard    → PlatformDashboard
  /platform/tenants      → TenantList
  /platform/tenants/new  → TenantCreate
  /platform/tenants/:id  → TenantDetail
  /platform/users        → PlatformUsers
  /platform/audit-logs   → AuditLogs

/tenant/login            → TenantLoginPage (Public)
/tenant                  → TenantProtectedRoute
  /tenant/dashboard      → TenantDashboard
  /tenant/products       → Products
  /tenant/categories     → Categories
  /tenant/customers      → Customers
  /tenant/suppliers      → Suppliers
  /tenant/inventory      → Inventory
  /tenant/purchase-orders → PurchaseOrders
  /tenant/sales-orders   → SalesOrders
  /tenant/payments       → Payments
  /tenant/users          → TenantUsers
```

---

### 3.3 `api/` — Tầng API

#### 3.3.1 `api/axios.js`

Tạo hai Axios instances riêng biệt:

| Instance | Base URL | Token Key | Redirect khi 401 |
|----------|----------|-----------|-----------------|
| `platformApi` | `$VITE_API_BASE_URL/api` | `platform_token` | `/platform/login` |
| `tenantApi` | `$VITE_API_BASE_URL/api` | `tenant_token` | `/tenant/login` |

Mỗi instance có:
- **Request interceptor:** Đọc token từ `localStorage` → gắn `Authorization: Bearer <token>`
- **Response interceptor:** Khi nhận 401 → xóa token + redirect về login page

```javascript
// Env var
VITE_API_BASE_URL = "http://localhost:8080"  // dev
VITE_API_BASE_URL = ""                       // prod (same origin)
```

#### 3.3.2 `api/platform.api.js`

Tất cả API calls cho Platform portal, dùng `platformApi`:

| Export | Methods | Endpoints |
|--------|---------|-----------|
| `platformAuth` | `login(data)` | POST `/platform/auth/login` |
| `tenantsApi` | `list(params)` | GET `/platform/tenants` |
| | `get(id)` | GET `/platform/tenants/:id` |
| | `create(data)` | POST `/platform/tenants` |
| | `update(id, data)` | PUT `/platform/tenants/:id` |
| | `updateStatus(id, data)` | PATCH `/platform/tenants/:id/status` |
| | `reprovision(id)` | POST `/platform/tenants/:id/provision` |
| | `resetAdmin(id)` | POST `/platform/tenants/:id/reset-admin` |
| | `provisioningLog(id)` | GET `/platform/tenants/:id/provisioning-log` |
| `platformUsersApi` | `list(params)` | GET `/platform/users` |
| | `create(data)` | POST `/platform/users` |
| | `update(id, data)` | PUT `/platform/users/:id` |
| | `toggleLock(id)` | PATCH `/platform/users/:id/lock` |
| `auditLogsApi` | `list(params)` | GET `/platform/audit-logs` |

#### 3.3.3 `api/tenant.api.js`

Tất cả API calls cho Tenant portal, dùng `tenantApi`:

| Export | Methods | Endpoints |
|--------|---------|-----------|
| `tenantAuth` | `login(data)` | POST `/tenant/auth/login` |
| `productsApi` | `list/get/create/update/remove` | CRUD `/tenant/products` |
| `categoriesApi` | `list/create` | `/tenant/categories` |
| `customersApi` | `list/create/update` | `/tenant/customers` |
| `suppliersApi` | `list/create` | `/tenant/suppliers` |
| `inventoryApi` | `transactions/stockIn/stockOut/adjust` | `/tenant/inventory/...` |
| `purchaseOrdersApi` | `list/create/confirm/receive` | `/tenant/purchase-orders` |
| `salesOrdersApi` | `list/create/confirm/ship/complete` | `/tenant/sales-orders` |
| `paymentsApi` | `list/record` | `/tenant/invoices`, `/tenant/payments` |
| `dashboardApi` | `stats()` | GET `/tenant/dashboard/stats` |

---

### 3.4 `auth/` — Authentication

#### 3.4.1 `auth/AuthContext.jsx`

**State Shape:**
```javascript
{
  platformUser: null | JwtPayload,  // { sub, email, role, userType: 'PLATFORM' }
  tenantUser:   null | JwtPayload,  // { sub, email, role, tenantCode, userType: 'TENANT' }
}
```

**Actions (useReducer):**

| Action Type | Effect |
|------------|--------|
| `PLATFORM_LOGIN` | Set `platformUser` = JWT payload |
| `TENANT_LOGIN` | Set `tenantUser` = JWT payload |
| `PLATFORM_LOGOUT` | Set `platformUser` = null |
| `TENANT_LOGOUT` | Set `tenantUser` = null |

**Context API (exported via `useAuth()` hook):**

| Method/Property | Mô tả |
|----------------|-------|
| `platformUser` | Thông tin user đang đăng nhập (platform) |
| `tenantUser` | Thông tin user đang đăng nhập (tenant) |
| `platformLogin(token)` | Save token to localStorage + decode payload |
| `tenantLogin(token)` | Save token to localStorage + decode payload |
| `platformLogout()` | Remove token + clear state |
| `tenantLogout()` | Remove token + clear state |

**Khởi tạo:** `useEffect` khi mount → đọc token từ localStorage, decode và set state (persist login qua refresh).

**Decode JWT:** `parseJwt(token)` = `JSON.parse(atob(token.split('.')[1]))` (client-side decode, không verify signature).

#### 3.4.2 `auth/ProtectedRoute.jsx`

Hai component guard:

**`PlatformProtectedRoute`:**
- Nếu `!platformUser` → redirect `/platform/login` (giữ `state.from` cho redirect sau login)
- Nếu có `roles` prop và không match → redirect `/platform/dashboard`

**`TenantProtectedRoute`:**
- Nếu `!tenantUser` → redirect `/tenant/login`
- Nếu có `roles` prop và không match → redirect `/tenant/dashboard`

---

### 3.5 `shared/` — Shared Utilities

#### 3.5.1 `shared/hooks/useApi.js`

**`useApi(apiFn, options)`**

Hook generic để gọi bất kỳ API function:

| Return | Type | Mô tả |
|--------|------|-------|
| `execute(...args)` | async function | Thực thi API call |
| `loading` | boolean | Trạng thái đang gọi |
| `data` | any | Kết quả (unwrapped từ `res.data.data`) |
| `error` | string | Thông báo lỗi |

Options:
| Option | Type | Mô tả |
|--------|------|-------|
| `onSuccess(result)` | callback | Callback khi thành công |
| `onError(err)` | callback | Callback khi lỗi |
| `successMessage` | string | Toast success message (Ant Design) |

**Behavior:**
- Auto show `message.error(msg)` khi lỗi (Ant Design notification)
- Unwrap response: `res.data?.data ?? res.data`

**`usePagination(apiFn)`**

Hook pagination tích hợp với `useApi`:

| Return | Mô tả |
|--------|-------|
| `fetch(params)` | Gọi API với page/limit hiện tại |
| `loading` | Trạng thái loading |
| `data` | Array items (từ `res.data`) |
| `pagination` | `{ page, limit, total }` |
| `onTableChange({current, pageSize})` | Sync với Ant Design Table onChange |

#### 3.5.2 `shared/components/DataTable.jsx`

Wrapper của Ant Design `<Table>`:

| Prop | Mô tả |
|------|-------|
| `columns` | Ant Design column definitions |
| `dataSource` | Array data |
| `loading` | Boolean |
| `pagination` | Object `{ page, limit, total }` hoặc `false` |
| `onChange` | Callback khi đổi trang/sort |
| `rowKey` | Default: `'id'` |

**Tính năng:**
- Tự động format pagination hiển thị: `Total N items`
- `showSizeChanger: true`
- `scroll={{ x: 'max-content' }}` → horizontal scroll khi nhiều cột

#### 3.5.3 `shared/components/PageHeader.jsx`

Component tiêu đề trang chuẩn với title + action buttons.

---

### 3.6 `platform/` — Platform Admin Portal

#### 3.6.1 `platform/layout/PlatformLayout.jsx`

Shell layout cho Platform portal:

| Vùng | Mô tả |
|------|-------|
| `<Sider>` | Dark theme, width 220px, menu sidebar |
| `<Header>` | White background, Logout button bên phải |
| `<Content>` | White background, margin 24px, border-radius 8px |

**Menu items:**

| Key/Path | Icon | Label |
|----------|------|-------|
| `/platform/dashboard` | DashboardOutlined | Dashboard |
| `/platform/tenants` | TeamOutlined | Tenants |
| `/platform/users` | UserOutlined | Users |
| `/platform/audit-logs` | AuditOutlined | Audit Logs |

**Navigation:** `selectedKeys` = `[location.pathname]` → highlight menu theo URL hiện tại.

#### 3.6.2 Platform Pages

| Page | File | Mô tả |
|------|------|-------|
| Login | `pages/Login.jsx` | Form đăng nhập, gọi `platformAuth.login()`, store token qua `platformLogin()` |
| Dashboard | `pages/Dashboard.jsx` | Overview stats platform (số tenant, users, ...) |
| TenantList | `pages/TenantList.jsx` | Bảng danh sách tenant, search, phân trang |
| TenantCreate | `pages/TenantCreate.jsx` | Form tạo tenant mới |
| TenantDetail | `pages/TenantDetail.jsx` | Xem/edit tenant, xem provisioning status, reprovision |
| PlatformUsers | `pages/PlatformUsers.jsx` | Quản lý platform users (create, update, lock) |
| AuditLogs | `pages/AuditLogs.jsx` | Xem audit logs (readonly) |

---

### 3.7 `tenant/` — Tenant Business Portal

#### 3.7.1 `tenant/layout/TenantLayout.jsx`

Shell layout cho Tenant portal:

| Vùng | Mô tả |
|------|-------|
| `<Sider>` | Light theme, width 220px, border phải |
| `<Header>` | White, Logout button, border dưới |
| `<Content>` | Grey background (#f5f5f5), padding 24px |

Hiển thị `tenantUser.tenantCode` làm tiêu đề sidebar.

**Menu items (10 items):**

| Path | Icon | Label |
|------|------|-------|
| `/tenant/dashboard` | DashboardOutlined | Dashboard |
| `/tenant/products` | ShoppingOutlined | Products |
| `/tenant/categories` | AppstoreOutlined | Categories |
| `/tenant/customers` | UserOutlined | Customers |
| `/tenant/suppliers` | TruckOutlined | Suppliers |
| `/tenant/inventory` | InboxOutlined | Inventory |
| `/tenant/purchase-orders` | ShoppingCartOutlined | Purchase Orders |
| `/tenant/sales-orders` | FileTextOutlined | Sales Orders |
| `/tenant/payments` | DollarOutlined | Payments |
| `/tenant/users` | TeamOutlined | Users |

#### 3.7.2 Tenant Pages

| Page | File | API | Mô tả |
|------|------|-----|-------|
| Login | `pages/Login.jsx` | `tenantAuth.login()` | Form đăng nhập, cần nhập tenantCode |
| Dashboard | `pages/Dashboard.jsx` | `dashboardApi.stats()` | KPI cards: doanh thu, đơn hàng, tồn kho thấp, ... |
| Products | `pages/Products.jsx` | `productsApi` | CRUD sản phẩm, tìm kiếm, phân trang |
| Categories | `pages/Categories.jsx` | `categoriesApi` | Quản lý danh mục sản phẩm |
| Customers | `pages/Customers.jsx` | `customersApi` | Quản lý khách hàng |
| Suppliers | `pages/Suppliers.jsx` | `suppliersApi` | Quản lý nhà cung cấp |
| Inventory | `pages/Inventory.jsx` | `inventoryApi` | Lịch sử giao dịch kho, nhập/xuất/điều chỉnh |
| PurchaseOrders | `pages/PurchaseOrders.jsx` | `purchaseOrdersApi` | Đơn mua hàng, duyệt, xác nhận nhận hàng |
| SalesOrders | `pages/SalesOrders.jsx` | `salesOrdersApi` | Đơn bán, duyệt, giao hàng, hoàn thành |
| Payments | `pages/Payments.jsx` | `paymentsApi` | Hóa đơn và ghi nhận thanh toán |
| Users | `pages/Users.jsx` | (tenant users API) | Quản lý user trong tenant |

---

## 4. Path Aliases (Vite)

Được cấu hình trong `vite.config.js`:

| Alias | Trỏ đến |
|-------|---------|
| `@/` | `src/` |
| `@auth/` | `src/auth/` |
| `@api/` | `src/api/` |
| `@platform/` | `src/platform/` |
| `@tenant/` | `src/tenant/` |
| `@shared/` | `src/shared/` |

---

## 5. Luồng Xác Thực (Authentication Flow)

### 5.1 Platform Login

```
User → /platform/login
  └─ [LoginPage] submit form
      └─ platformAuth.login({ email, password })
          └─ POST /api/platform/auth/login
              └─ Nhận { accessToken }
                  └─ platformLogin(accessToken)
                      ├─ localStorage.setItem('platform_token', accessToken)
                      └─ dispatch PLATFORM_LOGIN { payload: parseJwt(accessToken) }
  └─ Navigate to /platform/dashboard
```

### 5.2 Tenant Login

```
User → /tenant/login
  └─ [TenantLoginPage] submit form (tenantCode + email + password)
      └─ tenantAuth.login({ tenantCode, email, password })
          └─ POST /api/tenant/auth/login
              └─ Nhận { accessToken }
                  └─ tenantLogin(accessToken)
                      ├─ localStorage.setItem('tenant_token', accessToken)
                      └─ dispatch TENANT_LOGIN { payload: parseJwt(accessToken) }
  └─ Navigate to /tenant/dashboard
```

### 5.3 Session Persistence

Khi F5/reload:
```
AuthProvider mount
  └─ useEffect
      ├─ đọc 'platform_token' từ localStorage → parseJwt → dispatch PLATFORM_LOGIN
      └─ đọc 'tenant_token' từ localStorage → parseJwt → dispatch TENANT_LOGIN
```

### 5.4 Auto Logout khi Token hết hạn

```
tenantApi (hoặc platformApi) nhận response 401
  └─ interceptors.response.use(_, error)
      ├─ localStorage.removeItem('tenant_token')
      └─ window.location.href = '/tenant/login'
```

---

## 6. Luồng Data Fetching Pattern

### 6.1 Simple API Call

```jsx
const { execute, loading } = useApi(productsApi.create, {
  successMessage: 'Product created',
  onSuccess: () => fetchList(),
});

// Trong handler:
await execute(formData);
```

### 6.2 Paginated List

```jsx
const { fetch, loading, data, pagination, onTableChange } = usePagination(productsApi.list);

useEffect(() => { fetch(); }, []);

return (
  <DataTable
    dataSource={data}
    loading={loading}
    pagination={pagination}
    onChange={onTableChange}
    columns={columns}
  />
);
```

---

## 7. Dependencies Chính

| Package | Version | Mục đích |
|---------|---------|---------|
| `react` | ^18.2 | UI framework |
| `react-dom` | ^18.2 | DOM rendering |
| `react-router-dom` | ^6.20 | Client-side routing |
| `axios` | ^1.6 | HTTP client |
| `antd` | ^5.12 | UI component library |
| `@ant-design/icons` | ^5.2 | Icon set |
| `zustand` | ^4.4 | State management (available, chưa dùng) |
| `dayjs` | ^1.11 | Date formatting |
| `vite` | ^5.0 | Build tool |
| `@vitejs/plugin-react` | ^4.2 | React + Fast Refresh |

---

## 8. Build & Environment

### 8.1 Scripts

| Script | Lệnh | Mô tả |
|--------|------|-------|
| Dev server | `npm run dev` | Vite dev server (mặc định port 5173) |
| Build | `npm run build` | Build production → `dist/` |
| Preview | `npm run preview` | Serve build output |
| Lint | `npm run lint` | ESLint check |

### 8.2 Environment Variables

| Variable | Default | Mô tả |
|----------|---------|-------|
| `VITE_API_BASE_URL` | `""` (empty) | Base URL của backend API |

---

## 9. Conventions & Patterns

### Naming

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| File component | PascalCase + `.jsx` | `TenantList.jsx` |
| File hook | camelCase + `.js` | `useApi.js` |
| File API | kebab-case + `.js` | `platform.api.js` |
| Component export | `default` named | `export default function TenantList()` |
| Hook export | named | `export function useApi()` |

### Component Structure (convention)

```jsx
// 1. Imports
// 2. Constants (columns definitions, menu items, ...)
// 3. Component function
//    - Hooks (useState, useEffect, custom hooks)
//    - Handlers
//    - Return JSX
```

### API Pattern

- Tất cả API functions trả về Axios promise
- Gọi qua `useApi` hook để có loading state + error handling
- Không dùng `try/catch` trực tiếp trong component — để `useApi` xử lý

---

## 10. Điểm Cần Chú Ý Khi Thiết Kế Chi Tiết

| Mục | Hiện trạng | Cần thiết kế thêm |
|-----|-----------|-------------------|
| Tenant Login | Cần nhập `tenantCode` | Backend cần route `/tenant/auth/login` nhận `tenantCode` |
| JWT decode | Client-side decode không verify | Cần backend validate token signature |
| Role-based UI | Chưa ẩn/hiện menu theo role | Cần `tenantUser.role` để control UI |
| Form validation | Ant Design Form + rules | Cần sync với backend DTO validation |
| Error handling | Global via `useApi` | Cần handle các lỗi business (conflict, not found) riêng |
| Tenant Portal | 10 pages, đa số là placeholder | Cần thiết kế state management cho các form phức tạp (đơn hàng, thanh toán) |
| Provisioning status | TenantDetail hiển thị provisioning log | Backend chưa implement endpoint này |

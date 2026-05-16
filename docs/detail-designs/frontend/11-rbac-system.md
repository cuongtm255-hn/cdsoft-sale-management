# MODULE 11 — RBAC, Audit Log & System: Frontend Detail Design

> Ref: `usecase.md` UC-29, UC-30 | `srs-tenant-detail.md` Ch.8 | Feature list tasks #128, #131, #135–#136
> Stack: **React 18 + Ant Design 5 + Zustand + React Router v6** | Source: `frontend/src/`

---

## Cấu trúc file đề xuất

```
frontend/src/
├── tenant/
│   ├── pages/
│   │   ├── settings/
│   │   │   ├── Roles.jsx           — Phân quyền vai trò (Task #128)
│   │   │   ├── AuditLogs.jsx       — Nhật ký hoạt động (Task #131)
│   │   │   ├── Warehouses.jsx      — Quản lý kho (Task #135)
│   │   │   └── Finance.jsx         — Quỹ/TK ngân hàng (Task #135, #136)
│   └── components/
│       ├── PermissionMatrix.jsx    — Grid checkbox phân quyền
│       ├── AuditLogDrawer.jsx      — Drawer chi tiết log
│       └── CashFundCard.jsx        — Card quỹ tiền mặt
├── shared/
│   ├── hooks/
│   │   └── usePermission.js        — Hook check quyền FE-side
│   └── context/
│       └── PermissionContext.jsx   — Context lưu permissions user
└── api/
    └── tenant.api.js               — Thêm rolesApi, auditApi, financeApi
```

---

## 11.1 Role & Permission Management Screen

### Task: #128

**Route:** `/tenant/settings/roles`
**Access:** TENANT_ADMIN

**File:** `frontend/src/tenant/pages/settings/Roles.jsx`

### Layout

```jsx
// Ant Design Tabs — mỗi tab là 1 role
<Tabs
  tabBarExtraContent={<Button icon={<PlusOutlined />} onClick={openCreateModal}>Tạo vai trò</Button>}
  items={roles.map(role => ({
    key: role.id,
    label: (
      <span>
        {role.label}
        {role.isSystem && <Tag color="blue" style={{ marginLeft: 4 }}>Hệ thống</Tag>}
        <Badge count={role.userCount} style={{ marginLeft: 8, background: '#999' }} />
      </span>
    ),
    children: <PermissionMatrix role={role} onSave={handleSave} />,
  }))}
/>
```

### Component: `PermissionMatrix.jsx`

```jsx
// Ma trận checkbox: rows = resource groups, cols = actions
const PERMISSION_GROUPS = [
  { label: 'Sản phẩm', permissions: ['products:read', 'products:write', 'products:delete'] },
  { label: 'Giá vốn', permissions: ['cost_price:read'] },
  { label: 'Khách hàng', permissions: ['customers:read', 'customers:write'] },
  { label: 'Đơn hàng', permissions: ['orders:read', 'orders:write', 'orders:confirm', 'orders:cancel'] },
  { label: 'Kho hàng', permissions: ['inventory:read', 'inventory:write', 'inventory:adjust'] },
  { label: 'Thanh toán', permissions: ['payments:read', 'payments:write'] },
  { label: 'Báo cáo', permissions: ['reports:read', 'reports.finance:read'] },
  { label: 'Nhân sự', permissions: ['users:read', 'users:write'] },
  { label: 'Phân quyền', permissions: ['roles:write'] },
  { label: 'Cài đặt', permissions: ['settings:write'] },
  { label: 'Nhật ký', permissions: ['audit_logs:read'] },
];

export function PermissionMatrix({ role, onSave }) {
  const [checked, setChecked] = useState(new Set(role.permissions));
  const isSystem = role.isSystem;

  const toggle = (code) => {
    if (isSystem) return; // system roles: read-only
    const next = new Set(checked);
    next.has(code) ? next.delete(code) : next.add(code);
    setChecked(next);
  };

  return (
    <Form layout="vertical">
      {isSystem && <Alert message="Vai trò hệ thống — không thể sửa quyền" type="info" showIcon />}
      <Table
        dataSource={PERMISSION_GROUPS}
        pagination={false}
        rowKey="label"
        columns={[
          { title: 'Nhóm chức năng', dataIndex: 'label', width: 180 },
          .../* dynamic permission columns with Checkbox */
        ]}
      />
      {!isSystem && (
        <Button type="primary" onClick={() => onSave(role.id, [...checked])}>
          Lưu thay đổi
        </Button>
      )}
    </Form>
  );
}
```

**API Integration:**
```javascript
// tenant.api.js — thêm vào
export const rolesApi = {
  list:              () => api.get('/tenant/roles'),
  create:            (data) => api.post('/tenant/roles', data),
  updatePermissions: (id, permissions) => api.put(`/tenant/roles/${id}/permissions`, { permissions }),
};
```

### Create Role Modal

```jsx
<Modal title="Tạo vai trò mới" open={open} onOk={form.submit}>
  <Form form={form} onFinish={handleCreate} layout="vertical">
    <Form.Item name="label" label="Tên hiển thị" rules={[{ required: true }]}>
      <Input placeholder="VD: Nhân viên kho phụ" />
    </Form.Item>
    <Form.Item
      name="name"
      label="Mã vai trò"
      rules={[{ required: true }, { pattern: /^[A-Z_]+$/, message: 'Chỉ dùng CHỮ HOA và dấu _' }]}
    >
      <Input placeholder="VD: CUSTOM_WAREHOUSE" />
    </Form.Item>
  </Form>
</Modal>
// Sau khi tạo → switch sang tab mới để gán permissions
```

---

## 11.2 Audit Log Screen

### Task: #131

**Route:** `/tenant/settings/audit-logs`
**Access:** MANAGER, TENANT_ADMIN

**File:** `frontend/src/tenant/pages/settings/AuditLogs.jsx`

### Layout

```jsx
export default function AuditLogs() {
  const { fetch, loading, data, pagination, onTableChange } = usePagination(auditApi.list);
  const [filters, setFilters] = useState({ resource: '', action: '', userId: '', from: null, to: null });
  const [selectedLog, setSelectedLog] = useState(null);

  const columns = [
    { title: 'Thời gian', dataIndex: 'createdAt',
      render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm:ss'), width: 160 },
    { title: 'Người dùng', dataIndex: 'userName',
      render: (v, r) => <><strong>{v}</strong> <Tag>{r.userRole}</Tag></> },
    { title: 'Hành động', dataIndex: 'action',
      render: (v) => {
        const method = v.split(' ')[0];
        const colors = { POST: 'blue', PUT: 'orange', PATCH: 'gold', DELETE: 'red' };
        return <><Tag color={colors[method] ?? 'default'}>{method}</Tag> {v.split(' ')[1]}</>;
      }
    },
    { title: 'Đối tượng', dataIndex: 'resource',
      render: (v, r) => <>{v} {r.resourceId && <Text type="secondary" copyable>{r.resourceId.slice(0,8)}...</Text>}</>
    },
    { title: 'IP', dataIndex: 'ipAddress', width: 130 },
    { title: '', render: (_, r) => <Button size="small" onClick={() => setSelectedLog(r)}>Chi tiết</Button> },
  ];

  return (
    <div>
      <PageHeader title="Nhật ký hoạt động" />
      {/* Filter bar */}
      <Space wrap style={{ marginBottom: 16 }}>
        <Select placeholder="Đối tượng" allowClear onChange={(v) => setFilters(f => ({...f, resource: v}))}>
          {['orders','products','customers','inventory','payments','users','settings'].map(r =>
            <Option key={r} value={r}>{r}</Option>
          )}
        </Select>
        <Select placeholder="Hành động" allowClear onChange={(v) => setFilters(f => ({...f, action: v}))}>
          {['POST','PUT','PATCH','DELETE'].map(a => <Option key={a} value={a}>{a}</Option>)}
        </Select>
        <RangePicker onChange={([from, to]) => setFilters(f => ({...f, from, to}))} />
        <Button type="primary" onClick={() => fetch(filters)}>Lọc</Button>
      </Space>
      <DataTable columns={columns} dataSource={data} loading={loading}
        pagination={pagination} onChange={onTableChange} />

      {/* Detail Drawer */}
      <AuditLogDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
```

### Component: `AuditLogDrawer.jsx`

```jsx
export function AuditLogDrawer({ log, onClose }) {
  if (!log) return null;
  return (
    <Drawer title="Chi tiết thao tác" open={!!log} onClose={onClose} width={520}>
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Người thực hiện">{log.userName} ({log.userRole})</Descriptions.Item>
        <Descriptions.Item label="Thời gian">{dayjs(log.createdAt).format('DD/MM/YYYY HH:mm:ss')}</Descriptions.Item>
        <Descriptions.Item label="Hành động">{log.action}</Descriptions.Item>
        <Descriptions.Item label="IP">{log.ipAddress}</Descriptions.Item>
      </Descriptions>

      {log.beforeData && (
        <>
          <Divider>Dữ liệu trước</Divider>
          <pre style={{ background: '#fef2f2', padding: 12, borderRadius: 4, fontSize: 12 }}>
            {JSON.stringify(log.beforeData, null, 2)}
          </pre>
        </>
      )}
      {log.afterData && (
        <>
          <Divider>Dữ liệu sau</Divider>
          <pre style={{ background: '#f0fdf4', padding: 12, borderRadius: 4, fontSize: 12 }}>
            {JSON.stringify(log.afterData, null, 2)}
          </pre>
        </>
      )}
    </Drawer>
  );
}
```

---

## 11.3 Warehouse Management Screen

### Task: #135

**Route:** `/tenant/settings/warehouses` (tab trong Settings)
**Access:** TENANT_ADMIN

```jsx
// Tương tự pattern Products.jsx — simple CRUD với Modal
export default function Warehouses() {
  const { fetch, data, loading } = usePagination(warehousesApi.list);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const columns = [
    { title: 'Tên kho', dataIndex: 'name' },
    { title: 'Địa chỉ', dataIndex: 'address' },
    { title: 'Trạng thái', dataIndex: 'isActive',
      render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Đang dùng' : 'Ngưng'}</Tag> },
    { title: '', render: (_, r) => <Button onClick={() => { setEditing(r); setOpen(true); }}>Sửa</Button> },
  ];

  return (
    <div>
      <PageHeader title="Kho hàng" extra={<Button type="primary" onClick={() => { setEditing(null); setOpen(true); }}>+ Thêm kho</Button>} />
      <DataTable columns={columns} dataSource={data} loading={loading} pagination={false} />
      <Modal title={editing ? 'Sửa kho' : 'Thêm kho'} open={open} onCancel={() => setOpen(false)} onOk={form.submit}>
        <Form form={form} layout="vertical" initialValues={editing} onFinish={async (v) => {
          editing ? await warehousesApi.update(editing.id, v) : await warehousesApi.create(v);
          setOpen(false); fetch();
        }}>
          <Form.Item name="name" label="Tên kho" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="address" label="Địa chỉ"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="isActive" label="Đang hoạt động" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
```

---

## 11.4 Cash & Bank Management Screen

### Task: #135, #136

**Route:** `/tenant/settings/finance`
**Access:** ACCOUNTANT, MANAGER, TENANT_ADMIN

```jsx
// 3 tabs: Quỹ tiền mặt | Tài khoản NH | Phiếu chờ duyệt
<Tabs items={[
  { key: 'cash', label: 'Quỹ tiền mặt', children: <CashFundList /> },
  { key: 'bank', label: 'Tài khoản ngân hàng', children: <BankAccountList /> },
  { key: 'pending', label: <Badge count={pendingCount}>Chờ duyệt</Badge>, children: <PendingApprovals /> },
]} />
```

### `CashFundCard.jsx`
```jsx
export function CashFundCard({ fund, onReceipt, onDisbursement }) {
  return (
    <Card
      title={fund.name}
      extra={<Tag color="green">{fund.currency}</Tag>}
      actions={[
        <Button type="text" icon={<PlusOutlined />} onClick={onReceipt}>Phiếu thu</Button>,
        <Button type="text" icon={<MinusOutlined />} danger onClick={onDisbursement}>Phiếu chi</Button>,
      ]}
    >
      <Statistic
        title="Số dư"
        value={fund.balance}
        suffix="₫"
        formatter={(v) => v.toLocaleString('vi-VN')}
      />
    </Card>
  );
}
```

### Manual Disbursement Modal (Task #136)
```jsx
<Modal title="Phiếu chi thủ công" open={open} onOk={form.submit}>
  <Form form={form} layout="vertical" onFinish={handleSubmit}>
    <Form.Item name="disbursementType" label="Loại chi" rules={[{ required: true }]}>
      <Select options={[
        { value: 'SUPPLIER_PAYMENT', label: 'Trả nhà cung cấp' },
        { value: 'SALARY',           label: 'Chi lương' },
        { value: 'OVERHEAD',         label: 'Chi phí vận hành' },
        { value: 'OTHER',            label: 'Khác' },
      ]} />
    </Form.Item>
    <Form.Item name="amount" label="Số tiền" rules={[{ required: true }, { type: 'number', min: 0.01 }]}>
      <InputNumber min={0} addonAfter="₫" style={{ width: '100%' }}
        formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
    </Form.Item>
    <Form.Item name="cashFundId" label="Quỹ / Tài khoản">
      <Select placeholder="Chọn nguồn tiền">
        {cashFunds.map(f => <Option key={f.id} value={f.id}>{f.name} — {f.balance.toLocaleString('vi-VN')}₫</Option>)}
      </Select>
    </Form.Item>
    <Form.Item name="description" label="Mô tả" rules={[{ required: true }]}>
      <Input.TextArea rows={2} />
    </Form.Item>
    <Form.Item name="requiresApproval" valuePropName="checked">
      <Checkbox>Yêu cầu phê duyệt trước khi thực hiện</Checkbox>
    </Form.Item>
  </Form>
</Modal>
```

### Pending Approvals Tab
```jsx
// Danh sách phiếu chi chờ duyệt
const columns = [
  { title: 'Loại', dataIndex: 'disbursementType' },
  { title: 'Số tiền', dataIndex: 'amount', render: (v) => `${v.toLocaleString('vi-VN')}₫` },
  { title: 'Người tạo', dataIndex: ['createdBy', 'name'] },
  { title: 'Mô tả', dataIndex: 'description' },
  {
    title: 'Thao tác',
    render: (_, r) => (
      <Space>
        <Button type="primary" size="small" onClick={() => handleApprove(r.id)}>Duyệt</Button>
        <Popconfirm title="Lý do từ chối?" onConfirm={(reason) => handleReject(r.id, reason)}>
          <Button danger size="small">Từ chối</Button>
        </Popconfirm>
      </Space>
    ),
  },
];
```

---

## 11.5 Permission Guard — FE side

### `usePermission.js`

```javascript
// frontend/src/shared/hooks/usePermission.js
import { useAuthStore } from '../stores/authStore';

export function usePermission() {
  const permissions = useAuthStore((s) => s.permissions); // Set<string>

  return {
    can: (code) => permissions.has(code),
    canAny: (...codes) => codes.some(c => permissions.has(c)),
    canAll: (...codes) => codes.every(c => permissions.has(c)),
  };
}
```

**Zustand store:** `authStore.js` lưu `permissions: Set<string>` sau khi login thành công (lấy từ `/tenant/auth/me` response).

**Usage:**
```jsx
const { can } = usePermission();

// Ẩn/hiện UI element
{can('products:write') && <Button>Sửa sản phẩm</Button>}
{can('cost_price:read') && <Table.Column title="Giá vốn" dataIndex="costPrice" />}

// Navigate guard (trong ProtectedRoute hoặc route config)
if (!can('roles:write')) return <Navigate to="/403" />;
```

**Quan trọng:** FE permission chỉ để UX — BE luôn phải validate lại qua `PermissionGuard`.

---

## Navigation & Route Config

```jsx
// router/index.jsx — thêm vào tenant routes
{
  path: 'settings',
  children: [
    { path: 'roles',       element: <Roles />,     /* ADMIN only */ },
    { path: 'audit-logs',  element: <AuditLogs />, /* MANAGER+ */  },
    { path: 'warehouses',  element: <Warehouses />,               },
    { path: 'finance',     element: <Finance />,                  },
  ]
}
```

**Settings navigation menu** (trong `TenantLayout.jsx`):
```jsx
{
  key: 'settings',
  label: 'Cài đặt',
  icon: <SettingOutlined />,
  children: [
    { key: 'roles',      label: 'Phân quyền',       path: '/settings/roles',      show: can('roles:write') },
    { key: 'audit-logs', label: 'Nhật ký HĐ',       path: '/settings/audit-logs', show: can('audit_logs:read') },
    { key: 'warehouses', label: 'Kho hàng',          path: '/settings/warehouses', show: can('settings:write') },
    { key: 'finance',    label: 'Quỹ & Ngân hàng',   path: '/settings/finance',    show: can('settings:write') },
  ]
}
```

---

## API additions — `tenant.api.js`

```javascript
export const rolesApi = {
  list:              () => api.get('/tenant/roles'),
  create:            (data) => api.post('/tenant/roles', data),
  updatePermissions: (id, perms) => api.put(`/tenant/roles/${id}/permissions`, { permissions: perms }),
};

export const auditApi = {
  list: (params) => api.get('/tenant/audit-logs', { params }),
};

export const warehousesApi = {
  list:   (p) => api.get('/tenant/warehouses', { params: p }),
  create: (d) => api.post('/tenant/warehouses', d),
  update: (id, d) => api.put(`/tenant/warehouses/${id}`, d),
};

export const financeApi = {
  cashFunds:         () => api.get('/tenant/finance/cash-funds'),
  bankAccounts:      () => api.get('/tenant/finance/bank-accounts'),
  createDisbursement:(d) => api.post('/tenant/finance/disbursements', d),
  createReceipt:     (d) => api.post('/tenant/finance/receipts', d),
  pendingApprovals:  () => api.get('/tenant/finance/disbursements?status=PENDING_APPROVAL'),
  approve:           (id) => api.patch(`/tenant/finance/disbursements/${id}/approve`),
  reject:            (id, reason) => api.patch(`/tenant/finance/disbursements/${id}/reject`, { reason }),
};
```

import { useState } from 'react';
import { Alert, Button, Checkbox, Table, message } from 'antd';
import { rolesApi } from '@api/tenant.api';

const PERMISSION_GROUPS = [
  { label: 'Sản phẩm',   permissions: ['products:read', 'products:write', 'products:delete', 'cost_price:read'] },
  { label: 'Khách hàng', permissions: ['customers:read', 'customers:write'] },
  { label: 'Đơn hàng',   permissions: ['orders:read', 'orders:write', 'orders:confirm', 'orders:cancel'] },
  { label: 'Kho hàng',   permissions: ['inventory:read', 'inventory:write', 'inventory:adjust'] },
  { label: 'Thanh toán', permissions: ['payments:read', 'payments:write'] },
  { label: 'Báo cáo',    permissions: ['reports:read', 'reports.finance:read'] },
  { label: 'Nhân sự',    permissions: ['users:read', 'users:write'] },
  { label: 'Phân quyền', permissions: ['roles:read', 'roles:write'] },
  { label: 'Cài đặt',    permissions: ['settings:write'] },
  { label: 'Nhật ký',    permissions: ['audit_logs:read'] },
];

const PERM_LABELS = {
  'products:read':       'Xem',
  'products:write':      'Tạo/Sửa',
  'products:delete':     'Xóa',
  'cost_price:read':     'Giá vốn',
  'customers:read':      'Xem',
  'customers:write':     'Tạo/Sửa',
  'orders:read':         'Xem',
  'orders:write':        'Tạo/Sửa',
  'orders:confirm':      'Xác nhận',
  'orders:cancel':       'Hủy',
  'inventory:read':      'Xem',
  'inventory:write':     'Nhập/Xuất',
  'inventory:adjust':    'Điều chỉnh',
  'payments:read':       'Xem',
  'payments:write':      'Ghi nhận',
  'reports:read':        'Xem BC',
  'reports.finance:read':'BC tài chính',
  'users:read':          'Xem',
  'users:write':         'Tạo/Sửa',
  'roles:read':          'Xem',
  'roles:write':         'Sửa',
  'settings:write':      'Sửa',
  'audit_logs:read':     'Xem',
};

export default function PermissionMatrix({ role, onSaved }) {
  const [checked, setChecked] = useState(new Set(role.permissions));
  const [saving, setSaving]   = useState(false);

  const toggle = (code) => {
    if (role.isSystem) return;
    const next = new Set(checked);
    next.has(code) ? next.delete(code) : next.add(code);
    setChecked(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      await rolesApi.updatePermissions(role.id, [...checked]);
      message.success('Đã lưu phân quyền');
      onSaved?.();
    } catch {
      message.error('Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: 'Nhóm chức năng', dataIndex: 'label', key: 'label', width: 150 },
    {
      title: 'Quyền',
      key: 'perms',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {row.permissions.map((code) => (
            <Checkbox
              key={code}
              checked={checked.has(code)}
              disabled={role.isSystem}
              onChange={() => toggle(code)}
            >
              {PERM_LABELS[code] ?? code}
            </Checkbox>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div>
      {role.isSystem && (
        <Alert
          message="Vai trò hệ thống — không thể sửa quyền"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Table
        dataSource={PERMISSION_GROUPS}
        columns={columns}
        pagination={false}
        rowKey="label"
        size="small"
        bordered
      />
      {!role.isSystem && (
        <Button
          type="primary"
          style={{ marginTop: 16 }}
          loading={saving}
          onClick={save}
        >
          Lưu thay đổi
        </Button>
      )}
    </div>
  );
}

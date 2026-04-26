import { useEffect, useState, useCallback } from 'react';
import { Button, Tag, Space, Input, Select, Typography, Tooltip } from 'antd';
import { PlusOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination } from '@shared/hooks/useApi';
import { useAuth } from '@auth/AuthContext';
import { customersApi } from '@api/tenant.api';

const GROUP_COLORS = { RETAIL: 'default', WHOLESALE: 'blue', AGENT: 'purple', VIP: 'gold' };
const GROUP_LABELS = { RETAIL: 'Lẻ', WHOLESALE: 'Buôn sỉ', AGENT: 'Đại lý', VIP: 'VIP' };
const TIER_ICONS = { NONE: '—', SILVER: '🥈', GOLD: '🥇', DIAMOND: '💎' };

function GroupBadge({ group }) {
  return <Tag color={GROUP_COLORS[group]}>{GROUP_LABELS[group] ?? group}</Tag>;
}

function DebtCell({ currentDebt, creditLimit }) {
  const debt = Number(currentDebt);
  const limit = Number(creditLimit);
  const overLimit = limit > 0 && debt >= limit;

  if (debt === 0) {
    return <Typography.Text type="secondary">Không nợ</Typography.Text>;
  }

  const cell = (
    <Typography.Text style={{ color: overLimit ? '#cf1322' : '#d46b08', fontWeight: 500 }}>
      {debt.toLocaleString('vi-VN')} ₫
    </Typography.Text>
  );

  return overLimit ? (
    <Tooltip title="Đã đạt hạn mức tín dụng">{cell}</Tooltip>
  ) : cell;
}

function TierCell({ memberTier, loyaltyPoints }) {
  return (
    <Space size={4}>
      <span>{TIER_ICONS[memberTier] ?? '—'}</span>
      <Typography.Text>{Number(loyaltyPoints).toLocaleString()}</Typography.Text>
    </Space>
  );
}

const GROUP_OPTIONS = [
  { label: 'Tất cả nhóm', value: undefined },
  { label: 'Lẻ', value: 'RETAIL' },
  { label: 'Buôn sỉ', value: 'WHOLESALE' },
  { label: 'Đại lý', value: 'AGENT' },
  { label: 'VIP', value: 'VIP' },
];

export default function Customers() {
  const navigate = useNavigate();
  const { tenantUser } = useAuth();
  const canFilterSalesRep = ['MANAGER', 'TENANT_ADMIN'].includes(tenantUser?.role);

  const [search, setSearch] = useState('');
  const [group, setGroup] = useState(undefined);
  const [isActive] = useState(true);

  const { fetch, loading, data, pagination, onTableChange } = usePagination(customersApi.list);

  const doFetch = useCallback(() => {
    fetch({ search: search || undefined, group, isActive });
  }, [fetch, search, group, isActive]);

  useEffect(() => { doFetch(); }, [group, isActive]);

  const columns = [
    { title: 'Mã KH', dataIndex: 'code', key: 'code', width: 110 },
    {
      title: 'Tên khách hàng',
      dataIndex: 'name',
      key: 'name',
      render: (name, row) => (
        <Button
          type="link"
          style={{ padding: 0, fontWeight: 500 }}
          onClick={() => navigate(`/tenant/customers/${row.id}`)}
        >
          {name}
        </Button>
      ),
    },
    {
      title: 'Nhóm',
      dataIndex: 'customerGroup',
      key: 'group',
      width: 100,
      render: (v) => <GroupBadge group={v} />,
    },
    {
      title: 'Nợ hiện tại',
      key: 'debt',
      width: 150,
      render: (_, row) => <DebtCell currentDebt={row.currentDebt} creditLimit={row.creditLimit} />,
    },
    {
      title: 'Điểm tích lũy',
      key: 'loyalty',
      width: 130,
      render: (_, row) => <TierCell memberTier={row.memberTier} loyaltyPoints={row.loyaltyPoints} />,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, row) => (
        <Button
          size="small"
          onClick={() => navigate(`/tenant/customers/${row.id}/edit`)}
        >
          Sửa
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Khách hàng"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/tenant/customers/new')}
          >
            Thêm khách hàng
          </Button>
        }
      />

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Tìm Mã / Tên / SĐT / Email"
          style={{ width: 280 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={doFetch}
          allowClear
        />
        <Select
          placeholder="Nhóm khách hàng"
          options={GROUP_OPTIONS}
          style={{ width: 160 }}
          value={group}
          onChange={setGroup}
        />
      </Space>

      <DataTable
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={pagination}
        onChange={onTableChange}
      />
    </div>
  );
}

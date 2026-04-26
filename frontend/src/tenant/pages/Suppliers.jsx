import { useCallback, useEffect, useState } from 'react';
import { Button, Input, Select, Space, Tooltip, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination } from '@shared/hooks/useApi';
import { suppliersApi } from '@api/tenant.api';

const STATUS_OPTIONS = [
  { label: 'Tất cả', value: undefined },
  { label: 'Đang hoạt động', value: true },
  { label: 'Ngừng hoạt động', value: false },
];

function DebtCell({ currentDebt }) {
  const debt = Number(currentDebt);
  if (debt === 0) return <Typography.Text type="secondary">Không nợ</Typography.Text>;
  return (
    <Typography.Text style={{ color: '#cf1322', fontWeight: 500 }}>
      {debt.toLocaleString('vi-VN')} ₫
    </Typography.Text>
  );
}

export default function Suppliers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState(undefined);

  const { fetch, loading, data, pagination, onTableChange } = usePagination(suppliersApi.list);

  const doFetch = useCallback(() => {
    fetch({ search: search || undefined, isActive });
  }, [fetch, search, isActive]);

  useEffect(() => { doFetch(); }, [isActive]);

  const columns = [
    { title: 'Mã NCC', dataIndex: 'code', key: 'code', width: 110 },
    {
      title: 'Tên nhà cung cấp',
      dataIndex: 'name',
      key: 'name',
      render: (name, row) => (
        <Space size={4}>
          <Button
            type="link"
            style={{ padding: 0, fontWeight: 500 }}
            onClick={() => navigate(`/tenant/suppliers/${row.id}`)}
          >
            {name}
          </Button>
          {row.isCustomer && (
            <Tooltip title="Vừa là khách hàng">
              <span style={{ fontSize: 14 }}>🔄</span>
            </Tooltip>
          )}
        </Space>
      ),
    },
    { title: 'MST', dataIndex: 'taxCode', key: 'taxCode', width: 130, render: (v) => v || '—' },
    {
      title: 'Nợ phải trả',
      key: 'debt',
      width: 150,
      render: (_, row) => <DebtCell currentDebt={row.currentDebt} />,
    },
    {
      title: 'Hạn TT',
      dataIndex: 'paymentTermDays',
      key: 'paymentTermDays',
      width: 100,
      render: (v) => `${v ?? 0} ngày`,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, row) => (
        <Button size="small" onClick={() => navigate(`/tenant/suppliers/${row.id}/edit`)}>
          Sửa
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Nhà cung cấp"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/tenant/suppliers/new')}
          >
            Thêm NCC
          </Button>
        }
      />

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Mã / Tên / MST / SĐT"
          style={{ width: 280 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={doFetch}
          allowClear
        />
        <Select
          options={STATUS_OPTIONS}
          style={{ width: 180 }}
          value={isActive}
          onChange={setIsActive}
          placeholder="Trạng thái"
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

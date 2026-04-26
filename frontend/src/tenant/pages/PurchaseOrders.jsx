import { useEffect, useState, useCallback } from 'react';
import { Button, Space, Input, Select, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import OrderStatusBadge from '@shared/components/OrderStatusBadge';
import { usePagination, useApi } from '@shared/hooks/useApi';
import { purchaseOrdersApi } from '@api/tenant.api';

const fmt = (v) => Number(v || 0).toLocaleString('vi-VN') + '₫';

const STATUS_OPTIONS = [
  { label: 'Tất cả', value: undefined },
  { label: 'Nháp', value: 'DRAFT' },
  { label: 'Đã xác nhận', value: 'CONFIRMED' },
  { label: 'Đã nhập hàng', value: 'DELIVERED' },
  { label: 'Đã hủy', value: 'CANCELLED' },
];

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(undefined);

  const { fetch, loading, data, pagination, onTableChange } = usePagination(purchaseOrdersApi.list);

  const doFetch = useCallback(() => {
    fetch({ search: search || undefined, status });
  }, [fetch, search, status]);

  useEffect(() => { doFetch(); }, [status]);

  const handleConfirm = async (id) => {
    try {
      await purchaseOrdersApi.confirm(id);
      message.success('Đã xác nhận đơn hàng');
      doFetch();
    } catch {
      message.error('Thao tác thất bại');
    }
  };

  const handleReceive = async (id) => {
    try {
      await purchaseOrdersApi.receive(id);
      message.success('Đã nhập hàng thành công');
      doFetch();
    } catch {
      message.error('Thao tác thất bại');
    }
  };

  const columns = [
    {
      title: 'Mã PO',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (v) => <Typography.Text strong>{v}</Typography.Text>,
    },
    {
      title: 'Nhà cung cấp',
      key: 'supplier',
      render: (_, row) => row.supplier?.name ?? row.supplierId ?? '—',
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'total',
      width: 140,
      render: (v) => <Typography.Text strong>{fmt(v)}</Typography.Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (v) => <OrderStatusBadge status={v} />,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'date',
      width: 110,
      render: (v) => dayjs(v).format('DD/MM/YYYY'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 200,
      render: (_, row) => (
        <Space size="small">
          {row.status === 'DRAFT' && (
            <Button size="small" type="primary" onClick={() => handleConfirm(row.id)}>Xác nhận</Button>
          )}
          {row.status === 'CONFIRMED' && (
            <Button size="small" onClick={() => handleReceive(row.id)}>Nhập hàng</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Đơn mua hàng" />

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Tìm mã PO"
          style={{ width: 200 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={doFetch}
          allowClear
        />
        <Select
          placeholder="Trạng thái"
          options={STATUS_OPTIONS}
          style={{ width: 160 }}
          value={status}
          onChange={setStatus}
          allowClear
        />
      </Space>

      <DataTable
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={pagination}
        onChange={onTableChange}
        rowKey="id"
      />
    </div>
  );
}

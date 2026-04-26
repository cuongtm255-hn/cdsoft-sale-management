import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Select, Space, Tag, Typography,
} from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination } from '@shared/hooks/useApi';
import { inventoryApi, warehousesApi } from '@api/tenant.api';

const STATUS_COLORS = {
  PENDING: 'blue',
  IN_TRANSIT: 'orange',
  RECEIVED: 'green',
  CANCELLED: 'default',
};
const STATUS_LABELS = {
  PENDING: 'Chờ xuất kho',
  IN_TRANSIT: 'Đang vận chuyển',
  RECEIVED: 'Đã nhận',
  CANCELLED: 'Đã hủy',
};

export default function TransfersList() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);

  const { fetch, loading, data, pagination, onTableChange } = usePagination(
    (params) => inventoryApi.getTransfers(params),
  );

  useEffect(() => {
    warehousesApi.list().then((res) => {
      const list = res.data?.data ?? res.data ?? [];
      setWarehouses(list.map((w) => ({ label: w.name, value: w.id })));
    });
    fetch({});
  }, []);

  const columns = [
    {
      title: 'Kho đi',
      dataIndex: 'fromWarehouseId',
      key: 'fromWarehouseId',
      width: 150,
    },
    {
      title: 'Kho đến',
      dataIndex: 'toWarehouseId',
      key: 'toWarehouseId',
      width: 150,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (v) => <Tag color={STATUS_COLORS[v]}>{STATUS_LABELS[v] ?? v}</Tag>,
    },
    {
      title: 'Ngày dự kiến',
      dataIndex: 'expectedDate',
      key: 'expectedDate',
      width: 130,
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '—',
    },
    {
      title: 'Số mặt hàng',
      key: 'itemCount',
      width: 120,
      render: (_, row) => (
        <Typography.Text>{(row.items ?? []).length} mặt hàng</Typography.Text>
      ),
    },
    {
      title: 'Tạo lúc',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, row) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/tenant/inventory/transfers/${row.id}`)}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Điều chuyển kho"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/tenant/inventory/transfers/new')}
          >
            Tạo lệnh điều chuyển
          </Button>
        }
      />

      <DataTable
        columns={columns}
        dataSource={Array.isArray(data) ? data : data?.data ?? []}
        loading={loading}
        pagination={pagination}
        onChange={onTableChange}
        rowKey="id"
      />
    </div>
  );
}

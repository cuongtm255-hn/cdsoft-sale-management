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

const STATUS_COLORS = { DRAFT: 'orange', CONFIRMED: 'green', CANCELLED: 'default' };
const STATUS_LABELS = { DRAFT: 'Nháp', CONFIRMED: 'Đã xác nhận', CANCELLED: 'Đã hủy' };

function fmtVND(v) {
  return Number(v ?? 0).toLocaleString('vi-VN') + ' ₫';
}

export default function StockReceiptsList() {
  const navigate = useNavigate();
  const [warehouseId, setWarehouseId] = useState(undefined);
  const [warehouses, setWarehouses] = useState([]);

  const { fetch, loading, data, pagination, onTableChange } = usePagination(
    (params) => inventoryApi.getReceipts(params),
  );

  useEffect(() => {
    warehousesApi.list().then((res) => {
      const list = res.data?.data ?? res.data ?? [];
      setWarehouses(list.map((w) => ({ label: w.name, value: w.id })));
    });
  }, []);

  const doFetch = useCallback(() => {
    fetch({ warehouseId });
  }, [fetch, warehouseId]);

  useEffect(() => { doFetch(); }, [warehouseId]);

  const columns = [
    {
      title: 'Mã phiếu',
      dataIndex: 'refCode',
      key: 'refCode',
      width: 150,
      render: (v, row) => (
        <Button
          type="link"
          style={{ padding: 0 }}
          onClick={() => navigate(`/tenant/inventory/receipts/${row.id}`)}
        >
          {v || `NK-${row.id?.slice(0, 8)}`}
        </Button>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (v) => <Tag color={STATUS_COLORS[v]}>{STATUS_LABELS[v] ?? v}</Tag>,
    },
    {
      title: 'Kho nhập',
      dataIndex: 'warehouseId',
      key: 'warehouseId',
      width: 140,
      render: (v) => warehouses.find((w) => w.value === v)?.label ?? v,
    },
    {
      title: 'Ngày dự kiến',
      dataIndex: 'expectedDate',
      key: 'expectedDate',
      width: 130,
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '—',
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      width: 150,
      render: (v) => (
        <Typography.Text style={{ fontWeight: 500, color: '#1890ff' }}>
          {fmtVND(v)}
        </Typography.Text>
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
          onClick={() => navigate(`/tenant/inventory/receipts/${row.id}`)}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Phiếu nhập kho"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/tenant/inventory/receipts/new')}
          >
            Tạo phiếu nhập
          </Button>
        }
      />

      <Space style={{ marginBottom: 16 }}>
        <Select
          options={warehouses}
          style={{ width: 200 }}
          value={warehouseId}
          onChange={setWarehouseId}
          placeholder="Tất cả kho"
          allowClear
        />
      </Space>

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

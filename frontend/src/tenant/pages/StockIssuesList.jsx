import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Select, Space, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination } from '@shared/hooks/useApi';
import { inventoryApi, warehousesApi } from '@api/tenant.api';

const ISSUE_TYPE_LABELS = {
  SALE: 'Xuất bán',
  INTERNAL: 'Xuất nội bộ',
  DAMAGED: 'Hỏng / Hủy',
};
const ISSUE_TYPE_COLORS = { SALE: 'blue', INTERNAL: 'green', DAMAGED: 'red' };

export default function StockIssuesList() {
  const navigate = useNavigate();
  const [warehouseId, setWarehouseId] = useState(undefined);
  const [warehouses, setWarehouses] = useState([]);

  const { fetch, loading, data, pagination, onTableChange } = usePagination(
    (params) => inventoryApi.getIssues(params),
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
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Sản phẩm',
      key: 'product',
      render: (_, row) => (
        <span>
          <Typography.Text code>{row.sku}</Typography.Text>{' '}
          {row.productName}
        </span>
      ),
    },
    {
      title: 'Kho xuất',
      dataIndex: 'warehouseName',
      key: 'warehouseName',
      width: 140,
    },
    {
      title: 'Loại xuất',
      dataIndex: 'issueType',
      key: 'issueType',
      width: 130,
      render: (v) => (
        <Tag color={ISSUE_TYPE_COLORS[v] ?? 'default'}>
          {ISSUE_TYPE_LABELS[v] ?? v ?? '—'}
        </Tag>
      ),
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      render: (v) => Number(v).toLocaleString('vi-VN'),
    },
    {
      title: 'Đơn giá TB',
      dataIndex: 'unitCost',
      key: 'unitCost',
      width: 130,
      align: 'right',
      render: (v) => v ? `${Number(v).toLocaleString('vi-VN')} ₫` : '—',
    },
    {
      title: 'Mã đơn hàng',
      dataIndex: 'refId',
      key: 'refId',
      width: 140,
      render: (v) => v || '—',
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      key: 'notes',
      render: (v) => v || '—',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Phiếu xuất kho"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/tenant/inventory/issues/new')}
          >
            Tạo phiếu xuất
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

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Select, Space, Tag, Typography,
} from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination } from '@shared/hooks/useApi';
import { inventoryApi, warehousesApi } from '@api/tenant.api';

const STATUS_COLORS = { DRAFT: 'orange', CONFIRMED: 'green', CANCELLED: 'default' };

function fmtVND(v) {
  return Number(v ?? 0).toLocaleString('vi-VN') + ' ₫';
}

export default function StockReceiptsList() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  const statusLabels = {
    DRAFT: t('status.draft'),
    CONFIRMED: t('status.confirmed'),
    CANCELLED: t('status.cancelled'),
  };

  const columns = [
    {
      title: t('inventoryPage.receiptCode'),
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
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (v) => <Tag color={STATUS_COLORS[v]}>{statusLabels[v] ?? v}</Tag>,
    },
    {
      title: t('inventoryPage.warehouseIn'),
      dataIndex: 'warehouseId',
      key: 'warehouseId',
      width: 140,
      render: (v) => warehouses.find((w) => w.value === v)?.label ?? v,
    },
    {
      title: t('inventoryPage.expectedDate'),
      dataIndex: 'expectedDate',
      key: 'expectedDate',
      width: 130,
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '—',
    },
    {
      title: t('inventoryPage.totalAmount'),
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
      title: t('common.createdAt'),
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
        title={t('inventory.receipts')}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/tenant/inventory/receipts/new')}
          >
            {t('inventoryPage.newReceipt')}
          </Button>
        }
      />

      <Space style={{ marginBottom: 16 }}>
        <Select
          options={warehouses}
          style={{ width: 200 }}
          value={warehouseId}
          onChange={setWarehouseId}
          placeholder={t('inventoryPage.warehouseAll')}
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

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

const STATUS_COLORS = {
  PENDING: 'blue',
  IN_TRANSIT: 'orange',
  RECEIVED: 'green',
  CANCELLED: 'default',
};

export default function TransfersList() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  const statusLabels = {
    PENDING: t('inventoryPage.statusPending'),
    IN_TRANSIT: t('inventoryPage.statusInTransit'),
    RECEIVED: t('inventoryPage.statusReceived'),
    CANCELLED: t('status.cancelled'),
  };

  const columns = [
    {
      title: t('inventoryPage.fromWarehouse'),
      dataIndex: 'fromWarehouseName',
      key: 'fromWarehouseName',
      width: 150,
      render: (v, row) => v || row.fromWarehouseId,
    },
    {
      title: t('inventoryPage.toWarehouse'),
      dataIndex: 'toWarehouseName',
      key: 'toWarehouseName',
      width: 150,
      render: (v, row) => v || row.toWarehouseId,
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (v) => <Tag color={STATUS_COLORS[v]}>{statusLabels[v] ?? v}</Tag>,
    },
    {
      title: t('inventoryPage.expectedDate'),
      dataIndex: 'expectedDate',
      key: 'expectedDate',
      width: 130,
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '—',
    },
    {
      title: t('inventoryPage.itemCount'),
      key: 'itemCount',
      width: 120,
      render: (_, row) => (
        <Typography.Text>{(row.items ?? []).length} {t('inventoryPage.itemsLabel')}</Typography.Text>
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
          onClick={() => navigate(`/tenant/inventory/transfers/${row.id}`)}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('menu.transfers')}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/tenant/inventory/transfers/new')}
          >
            {t('inventoryPage.createTransfer')}
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

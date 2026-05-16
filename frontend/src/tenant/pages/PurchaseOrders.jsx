import { useEffect, useState, useCallback } from 'react';
import { Button, Space, Input, Select, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import OrderStatusBadge from '@shared/components/OrderStatusBadge';
import { usePagination, useApi } from '@shared/hooks/useApi';
import { purchaseOrdersApi } from '@api/tenant.api';

const fmt = (v) => Number(v || 0).toLocaleString('vi-VN') + '₫';

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      message.success(t('purchaseOrders.confirmSuccess'));
      doFetch();
    } catch {
      message.error(t('purchaseOrders.actionFailed'));
    }
  };

  const handleReceive = async (id) => {
    try {
      await purchaseOrdersApi.receive(id);
      message.success(t('purchaseOrders.receiveSuccess'));
      doFetch();
    } catch {
      message.error(t('purchaseOrders.actionFailed'));
    }
  };

  const statusOptions = [
    { label: t('purchaseOrders.all'), value: undefined },
    { label: t('purchaseOrders.draft'), value: 'DRAFT' },
    { label: t('purchaseOrders.confirmed'), value: 'CONFIRMED' },
    { label: t('purchaseOrders.received'), value: 'DELIVERED' },
    { label: t('purchaseOrders.cancelled'), value: 'CANCELLED' },
  ];

  const columns = [
    {
      title: t('purchaseOrders.poCode'),
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (v) => <Typography.Text strong>{v}</Typography.Text>,
    },
    {
      title: t('purchaseOrders.supplier'),
      key: 'supplier',
      render: (_, row) => row.supplier_name ?? row.supplier_code ?? '—',
    },
    {
      title: t('purchaseOrders.totalAmount'),
      key: 'total',
      width: 140,
      render: (_, row) => <Typography.Text strong>{fmt(row.total_amount ?? row.totalAmount)}</Typography.Text>,
    },
    {
      title: t('common.status'),
      key: 'status',
      width: 130,
      render: (_, row) => <OrderStatusBadge status={row.status} />,
    },
    {
      title: t('common.createdAt'),
      key: 'date',
      width: 110,
      render: (_, row) => dayjs(row.created_at ?? row.createdAt).format('DD/MM/YYYY'),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 200,
      render: (_, row) => (
        <Space size="small">
          <Button size="small" onClick={() => navigate(`/tenant/purchase-orders/${row.id}`)}>{t('purchaseOrders.view')}</Button>
          {row.status === 'DRAFT' && (
            <Button size="small" type="primary" onClick={() => handleConfirm(row.id)}>{t('purchaseOrders.confirm')}</Button>
          )}
          {row.status === 'CONFIRMED' && (
            <Button size="small" onClick={() => handleReceive(row.id)}>{t('purchaseOrders.receive')}</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('purchaseOrders.title')}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tenant/purchase-orders/new')}>{t('purchaseOrders.createOrder')}</Button>}
      />

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder={t('purchaseOrders.searchPlaceholder')}
          style={{ width: 200 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={doFetch}
          allowClear
        />
        <Select
          placeholder={t('common.status')}
          options={statusOptions}
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

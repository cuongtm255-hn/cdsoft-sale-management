import { useEffect, useState, useCallback } from 'react';
import { Button, Space, Input, Select, DatePicker, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import OrderStatusBadge from '@shared/components/OrderStatusBadge';
import { usePagination } from '@shared/hooks/useApi';
import { salesOrdersApi } from '@api/tenant.api';

const fmt = (v) => Number(v || 0).toLocaleString('vi-VN') + '₫';

export default function SalesOrders() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(undefined);
  const [dateRange, setDateRange] = useState(null);

  const { fetch, loading, data, pagination, onTableChange } = usePagination(salesOrdersApi.list);

  const doFetch = useCallback(() => {
    fetch({
      search: search || undefined,
      status,
      from: dateRange?.[0]?.format('YYYY-MM-DD'),
      to: dateRange?.[1]?.format('YYYY-MM-DD'),
    });
  }, [fetch, search, status, dateRange]);

  useEffect(() => { doFetch(); }, [status, dateRange]);

  const statusOptions = [
    { label: t('salesOrders.all'), value: undefined },
    { label: t('salesOrders.draft'), value: 'DRAFT' },
    { label: t('salesOrders.confirmed'), value: 'CONFIRMED' },
    { label: t('salesOrders.delivering'), value: 'DELIVERING' },
    { label: t('salesOrders.delivered'), value: 'DELIVERED' },
    { label: t('salesOrders.cancelled'), value: 'CANCELLED' },
    { label: t('salesOrders.partialReturn'), value: 'PARTIALLY_RETURNED' },
  ];

  const columns = [
    {
      title: t('salesOrders.orderCode'),
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (v, row) => (
        <Button type="link" style={{ padding: 0, fontWeight: 600 }} onClick={() => navigate(`/tenant/sales-orders/${row.id}`)}>
          {v}
        </Button>
      ),
    },
    {
      title: t('salesOrders.customer'),
      key: 'customer',
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{row.customer_name ?? row.customer?.name ?? '—'}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{row.customer_code ?? row.customer?.code}</Typography.Text>
        </div>
      ),
    },
    {
      title: t('salesOrders.totalAmount'),
      dataIndex: 'total_amount',
      key: 'total',
      width: 140,
      render: (v) => <Typography.Text strong>{fmt(v)}</Typography.Text>,
    },
    {
      title: t('salesOrders.paidAmount'),
      dataIndex: 'paid_amount',
      key: 'paid',
      width: 120,
      render: (v) => fmt(v),
    },
    {
      title: t('salesOrders.remaining'),
      key: 'debt',
      width: 120,
      render: (_, row) => {
        const debt = Number(row.total_amount ?? 0) - Number(row.paid_amount ?? 0);
        return debt > 0 ? (
          <Typography.Text type="danger">{fmt(debt)}</Typography.Text>
        ) : <Typography.Text type="secondary">0₫</Typography.Text>;
      },
    },
    {
      title: t('salesOrders.salesRep'),
      key: 'salesRep',
      width: 130,
      render: (_, row) => row.sales_rep_name ?? row.salesRep?.name ?? '—',
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (v) => <OrderStatusBadge status={v} />,
    },
    {
      title: t('common.createdAt'),
      dataIndex: 'created_at',
      key: 'date',
      width: 110,
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '—',
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('salesOrders.title')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tenant/sales-orders/new')}>
            {t('salesOrders.createOrder')}
          </Button>
        }
      />

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder={t('salesOrders.searchPlaceholder')}
          style={{ width: 220 }}
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
        <DatePicker.RangePicker
          format="DD/MM/YYYY"
          value={dateRange}
          onChange={setDateRange}
          placeholder={[t('common.fromDate'), t('common.toDate')]}
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

import { useEffect, useState, useCallback } from 'react';
import { Button, Space, Input, Select, DatePicker, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import InvoiceStatusBadge from '@shared/components/InvoiceStatusBadge';
import PaymentModal from '@shared/components/PaymentModal';
import { usePagination } from '@shared/hooks/useApi';
import { invoicesApi } from '@api/tenant.api';

const fmt = (v) => Number(v || 0).toLocaleString('vi-VN') + '₫';

const STATUS_OPTIONS = [
  { label: 'Tất cả', value: undefined },
  { label: 'Chưa thanh toán', value: 'UNPAID' },
  { label: 'Thanh toán 1 phần', value: 'PARTIALLY_PAID' },
  { label: 'Đã thanh toán', value: 'PAID' },
];

export default function Payments() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(undefined);
  const [dateRange, setDateRange] = useState(null);
  const [payModal, setPayModal] = useState(null);

  const { fetch, loading, data, pagination, onTableChange } = usePagination(invoicesApi.list);

  const doFetch = useCallback(() => {
    fetch({
      search: search || undefined,
      status,
      from: dateRange?.[0]?.format('YYYY-MM-DD'),
      to: dateRange?.[1]?.format('YYYY-MM-DD'),
    });
  }, [fetch, search, status, dateRange]);

  useEffect(() => { doFetch(); }, [status, dateRange]);

  const columns = [
    {
      title: 'Mã hoá đơn',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (v, row) => (
        <Button type="link" style={{ padding: 0, fontWeight: 600 }} onClick={() => navigate(`/tenant/invoices/${row.id}`)}>
          {v}
        </Button>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_, row) => row.customer?.name ?? row.customerId ?? '—',
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'total',
      width: 140,
      render: (v) => <Typography.Text strong>{fmt(v)}</Typography.Text>,
    },
    {
      title: 'Đã thanh toán',
      dataIndex: 'paidAmount',
      key: 'paid',
      width: 140,
      render: (v) => fmt(v),
    },
    {
      title: 'Còn lại',
      key: 'remaining',
      width: 130,
      render: (_, row) => {
        const rem = Number(row.totalAmount) - Number(row.paidAmount);
        return rem > 0
          ? <Typography.Text type="danger">{fmt(rem)}</Typography.Text>
          : <Typography.Text type="secondary">0₫</Typography.Text>;
      },
    },
    {
      title: 'Hạn TT',
      dataIndex: 'dueDate',
      key: 'due',
      width: 110,
      render: (v) => {
        if (!v) return '—';
        const isOverdue = dayjs(v).isBefore(dayjs(), 'day');
        return (
          <Typography.Text type={isOverdue ? 'danger' : undefined}>
            {dayjs(v).format('DD/MM/YYYY')}
          </Typography.Text>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      render: (v) => <InvoiceStatusBadge status={v} />,
    },
    {
      title: '',
      key: 'action',
      width: 100,
      render: (_, row) =>
        row.status !== 'PAID' && (
          <Button size="small" type="primary" onClick={() => setPayModal(row)}>
            Thu tiền
          </Button>
        ),
    },
  ];

  return (
    <div>
      <PageHeader title="Hoá đơn & Thanh toán" />

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Tìm mã hoá đơn"
          style={{ width: 220 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={doFetch}
          allowClear
        />
        <Select
          placeholder="Trạng thái"
          options={STATUS_OPTIONS}
          style={{ width: 180 }}
          value={status}
          onChange={setStatus}
          allowClear
        />
        <DatePicker.RangePicker
          format="DD/MM/YYYY"
          value={dateRange}
          onChange={setDateRange}
          placeholder={['Từ ngày', 'Đến ngày']}
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

      <PaymentModal
        open={!!payModal}
        invoice={payModal}
        onClose={() => setPayModal(null)}
        onPaid={() => { setPayModal(null); doFetch(); }}
      />
    </div>
  );
}

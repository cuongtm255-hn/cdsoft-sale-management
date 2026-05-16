import { useEffect, useState, useCallback } from 'react';
import { Button, Space, Typography, Select, Input } from 'antd';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { apApi } from '@api/tenant.api';

const fmt = (v) => Number(v || 0).toLocaleString('vi-VN') + '₫';

const DAYS_OPTIONS = [
  { label: '7 ngày tới', value: 7 },
  { label: '15 ngày tới', value: 15 },
  { label: '30 ngày tới', value: 30 },
  { label: '60 ngày tới', value: 60 },
  { label: 'Tất cả', value: 365 },
];

export default function AccountsPayable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [daysAhead, setDaysAhead] = useState(30);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apApi.schedule({ daysAhead });
      setData(res.data?.data?.data ?? res.data?.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [daysAhead]);

  useEffect(() => { load(); }, [daysAhead]);

  const filtered = search
    ? data.filter((r) => r.supplier_name?.toLowerCase().includes(search.toLowerCase()))
    : data;

  const columns = [
    {
      title: 'Nhà cung cấp',
      dataIndex: 'supplier_name',
      key: 'supplier',
      render: (v) => <Typography.Text strong>{v}</Typography.Text>,
    },
    {
      title: 'Mã phiếu',
      dataIndex: 'invoice_ref',
      key: 'ref',
      width: 130,
    },
    {
      title: 'Số tiền',
      key: 'amount',
      width: 140,
      render: (_, row) => (
        <Typography.Text strong>{fmt(Number(row.amount) - Number(row.paid_amount ?? 0))}</Typography.Text>
      ),
    },
    {
      title: 'Đến hạn',
      dataIndex: 'due_date',
      key: 'due',
      width: 120,
      render: (v, row) => (
        <Typography.Text type={row.isOverdue ? 'danger' : undefined}>
          {dayjs(v).format('DD/MM/YYYY')}
        </Typography.Text>
      ),
    },
    {
      title: 'Còn (ngày)',
      dataIndex: 'days_until_due',
      key: 'days',
      width: 110,
      render: (v, row) => (
        <Typography.Text type={row.isOverdue ? 'danger' : Number(v) <= 7 ? 'warning' : undefined}>
          {row.isOverdue ? `${v} ngày 🔴` : `${v} ngày`}
        </Typography.Text>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Công nợ phải trả" />

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          value={daysAhead}
          options={DAYS_OPTIONS}
          style={{ width: 150 }}
          onChange={setDaysAhead}
        />
        <Input.Search
          placeholder="Tìm nhà cung cấp"
          style={{ width: 220 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />
        <Button onClick={load}>Làm mới</Button>
      </Space>

      <DataTable
        columns={columns}
        dataSource={filtered}
        loading={loading}
        pagination={false}
        rowKey="id"
        rowClassName={(row) => row.isOverdue ? 'ant-table-row-danger' : ''}
      />
    </div>
  );
}

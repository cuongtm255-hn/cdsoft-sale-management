import { useEffect, useState } from 'react';
import { Table, Tag, Typography, Spin } from 'antd';
import dayjs from 'dayjs';
import { loyaltyApi } from '@api/tenant.api';

const TYPE_CONFIG = {
  EARN:   { color: 'green',   label: 'Tích điểm', sign: '+' },
  REDEEM: { color: 'red',     label: 'Dùng điểm', sign: '' },
  EXPIRE: { color: 'default', label: 'Hết hạn',   sign: '' },
  ADJUST: { color: 'blue',    label: 'Điều chỉnh', sign: '' },
};

const columns = [
  {
    title: 'Ngày',
    dataIndex: 'created_at',
    key: 'date',
    width: 120,
    render: (v) => dayjs(v).format('DD/MM/YYYY'),
  },
  {
    title: 'Loại',
    dataIndex: 'type',
    key: 'type',
    width: 120,
    render: (v) => {
      const cfg = TYPE_CONFIG[v] ?? { color: 'default', label: v };
      return <Tag color={cfg.color}>{cfg.label}</Tag>;
    },
  },
  {
    title: 'Mô tả',
    dataIndex: 'description',
    key: 'desc',
    render: (v) => v ?? '—',
  },
  {
    title: 'Điểm',
    dataIndex: 'points',
    key: 'points',
    width: 100,
    align: 'right',
    render: (v) => {
      const n = Number(v);
      const color = n > 0 ? '#52c41a' : '#cf1322';
      const prefix = n > 0 ? '+' : '';
      return (
        <Typography.Text style={{ color, fontWeight: 600 }}>
          {prefix}{n.toLocaleString()}
        </Typography.Text>
      );
    },
  },
  {
    title: 'Hết hạn',
    dataIndex: 'expires_at',
    key: 'exp',
    width: 110,
    render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '—',
  },
];

export default function LoyaltyTransactionsList({ customerId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    loyaltyApi.getCustomerLoyalty(customerId)
      .then((res) => {
        const result = res.data?.data ?? res.data;
        setData(result?.transactions ?? []);
      })
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) return <Spin size="small" style={{ margin: 16 }} />;

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={data}
      size="small"
      pagination={{ pageSize: 20, size: 'small' }}
      locale={{ emptyText: 'Chưa có lịch sử điểm.' }}
    />
  );
}

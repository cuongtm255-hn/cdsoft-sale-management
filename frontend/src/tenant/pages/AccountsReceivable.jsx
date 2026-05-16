import { useEffect, useState, useCallback } from 'react';
import { Button, Space, Typography, DatePicker, Input, Modal, Select, InputNumber, message } from 'antd';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { useApi } from '@shared/hooks/useApi';
import { arApi } from '@api/tenant.api';

const fmt = (v) => (Number(v || 0) === 0 ? '—' : Number(v).toLocaleString('vi-VN') + '₫');
const fmtNum = (v) => Number(v || 0).toLocaleString('vi-VN') + '₫';

function AmountCell({ value, highlight }) {
  if (!Number(value)) return <Typography.Text type="secondary">—</Typography.Text>;
  return (
    <Typography.Text style={{ color: highlight ? '#cf1322' : undefined }}>
      {fmtNum(value)}
    </Typography.Text>
  );
}

export default function AccountsReceivable() {
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [asOfDate, setAsOfDate] = useState(dayjs());
  const [search, setSearch] = useState('');
  const [matchModal, setMatchModal] = useState(null);

  const { execute: matchPayment, loading: matching } = useApi(arApi.match);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await arApi.aging({ asOfDate: asOfDate?.format('YYYY-MM-DD') });
      const result = res.data?.data ?? res.data;
      setData(result?.data ?? []);
      setTotals(result?.totals ?? null);
    } finally {
      setLoading(false);
    }
  }, [asOfDate]);

  useEffect(() => { load(); }, [asOfDate]);

  const filtered = search
    ? data.filter((r) => r.customer_name?.toLowerCase().includes(search.toLowerCase()))
    : data;

  const columns = [
    {
      title: 'Khách hàng',
      dataIndex: 'customer_name',
      key: 'name',
      render: (v) => <Typography.Text strong>{v}</Typography.Text>,
    },
    {
      title: 'Hiện tại',
      dataIndex: 'current_amount',
      key: 'current',
      width: 130,
      render: (v) => <AmountCell value={v} />,
    },
    {
      title: '1–30 ngày',
      dataIndex: 'days1_30',
      key: 'd1',
      width: 120,
      render: (v) => <AmountCell value={v} />,
    },
    {
      title: '31–60 ngày',
      dataIndex: 'days31_60',
      key: 'd2',
      width: 120,
      render: (v) => <AmountCell value={v} />,
    },
    {
      title: '61–90 ngày',
      dataIndex: 'days61_90',
      key: 'd3',
      width: 120,
      render: (v) => <AmountCell value={v} />,
    },
    {
      title: '>90 ngày',
      dataIndex: 'over90',
      key: 'd4',
      width: 120,
      render: (v) => <AmountCell value={v} highlight={Number(v) > 0} />,
    },
    {
      title: 'Tổng',
      dataIndex: 'total',
      key: 'total',
      width: 140,
      render: (v) => <Typography.Text strong>{fmtNum(v)}</Typography.Text>,
    },
  ];

  const summaryRow = totals ? (
    <DataTable.Summary fixed>
      <DataTable.Summary.Row>
        <DataTable.Summary.Cell index={0}>
          <Typography.Text strong>TỔNG</Typography.Text>
        </DataTable.Summary.Cell>
        {['current', 'days1_30', 'days31_60', 'days61_90', 'over90', 'total'].map((k, i) => (
          <DataTable.Summary.Cell key={k} index={i + 1}>
            <Typography.Text strong>{fmtNum(totals[k])}</Typography.Text>
          </DataTable.Summary.Cell>
        ))}
      </DataTable.Summary.Row>
    </DataTable.Summary>
  ) : undefined;

  return (
    <div>
      <PageHeader title="Công nợ phải thu" />

      <Space style={{ marginBottom: 16 }} wrap>
        <DatePicker
          value={asOfDate}
          onChange={setAsOfDate}
          format="DD/MM/YYYY"
          placeholder="Ngày báo cáo"
        />
        <Input.Search
          placeholder="Tìm khách hàng"
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
        rowKey="customer_id"
        summary={() => summaryRow}
        rowClassName={(row) => Number(row.over90) > 0 ? 'ant-table-row-danger' : ''}
      />
    </div>
  );
}

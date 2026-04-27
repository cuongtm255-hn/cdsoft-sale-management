import { useEffect, useState } from 'react';
import {
  Button, Card, Select, Space, Spin, Table, Tag, Tabs, Typography,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import ReportDateRangePicker from '@shared/components/ReportDateRangePicker';
import { reportsApi } from '@api/tenant.api';

const fmt = (v) => Number(v ?? 0).toLocaleString('vi-VN');
const defaultRange = [dayjs().startOf('month'), dayjs()];

const ABC_COLOR = { A: 'red', B: 'orange', C: 'default' };
const ABC_LABEL = { A: '🅐 A', B: '🅑 B', C: '🅒 C' };

function ABCPareto({ data = [] }) {
  if (!data.length) return null;
  const W = Math.max(data.length * 24, 400);
  const H = 180;
  const maxRev = Math.max(...data.map((d) => d.revenueContribution), 1);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 30}`} preserveAspectRatio="none" style={{ display: 'block', marginBottom: 8 }}>
      {data.map((d, i) => {
        const x  = i * 24 + 2;
        const bh = Math.max((d.revenueContribution / maxRev) * H, 1);
        const by = H - bh;
        const color = d.abcClass === 'A' ? '#ff4d4f' : d.abcClass === 'B' ? '#fa8c16' : '#8c8c8c';
        return <rect key={i} x={x} y={by} width={20} height={bh} fill={color} opacity={0.7} rx={2} />;
      })}
      {/* cumulative line */}
      <polyline
        fill="none"
        stroke="#1677ff"
        strokeWidth={1.5}
        points={data.map((d, i) => `${i * 24 + 12},${H - (d.cumulativePercent / 100) * H}`).join(' ')}
      />
      <line x1={0} y1={H} x2={W} y2={H} stroke="#e8e8e8" />
      <text x={4}  y={H + 20} fontSize={9} fill="#888">% tích lũy (xanh) · Doanh thu (màu cột theo hạng)</text>
    </svg>
  );
}

function MovementTab() {
  const [dateRange, setDateRange] = useState(defaultRange);
  const [loading, setLoading]     = useState(false);
  const [data, setData]           = useState([]);

  const load = () => {
    setLoading(true);
    reportsApi.movement({
      from: dateRange?.[0]?.format('YYYY-MM-DD'),
      to:   dateRange?.[1]?.format('YYYY-MM-DD'),
    }).then((res) => setData((res.data?.data ?? res.data)?.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateRange]);

  const columns = [
    { title: 'SKU',          dataIndex: 'sku',          key: 'sku',          width: 110 },
    { title: 'Tên SP',       dataIndex: 'name',         key: 'name' },
    { title: 'ĐVT',          dataIndex: 'unit',         key: 'unit',         width: 70 },
    { title: 'Đầu kỳ',       dataIndex: 'openingQty',   key: 'openingQty',   align: 'right', render: fmt },
    { title: 'Nhập',         dataIndex: 'stockIn',      key: 'stockIn',      align: 'right', render: (v) => <Typography.Text style={{ color: '#389e0d' }}>{fmt(v)}</Typography.Text> },
    { title: 'Xuất',         dataIndex: 'stockOut',     key: 'stockOut',     align: 'right', render: (v) => <Typography.Text style={{ color: '#cf1322' }}>{fmt(v)}</Typography.Text> },
    { title: 'Cuối kỳ',      dataIndex: 'closingQty',   key: 'closingQty',   align: 'right', render: fmt },
    { title: 'Giá trị kho',  dataIndex: 'closingValue', key: 'closingValue', align: 'right', render: (v) => fmt(v) + '₫' },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12 }} wrap>
        <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading} size="small">Làm mới</Button>
      </Space>
      <Table columns={columns} dataSource={data} rowKey="productId" loading={loading} size="small" pagination={{ pageSize: 20 }} locale={{ emptyText: 'Chưa có dữ liệu' }} />
    </>
  );
}

function DeadstockTab() {
  const [days, setDays]       = useState(90);
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState([]);

  const load = () => {
    setLoading(true);
    reportsApi.deadstock({ daysSinceLastSale: days })
      .then((res) => setData((res.data?.data ?? res.data)?.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [days]);

  const columns = [
    { title: 'Sản phẩm',       dataIndex: 'name',             key: 'name' },
    { title: 'Tồn kho',        dataIndex: 'currentStock',     key: 'currentStock',     align: 'right', render: fmt },
    {
      title: 'Ngày bán cuối', dataIndex: 'lastSaleDate', key: 'lastSaleDate',
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : <Typography.Text type="secondary">Chưa bán</Typography.Text>,
    },
    {
      title: 'Số ngày', dataIndex: 'daysSinceLastSale', key: 'daysSinceLastSale', align: 'right',
      render: (v) => v ? <Typography.Text style={{ color: '#d46b08' }}>{v} ngày</Typography.Text> : '—',
    },
    { title: 'Giá trị tồn', dataIndex: 'stockValue', key: 'stockValue', align: 'right', render: (v) => fmt(v) + '₫' },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12 }} wrap>
        <span>Không bán trong:</span>
        <Select
          value={days}
          onChange={setDays}
          options={[
            { label: '30 ngày', value: 30 },
            { label: '60 ngày', value: 60 },
            { label: '90 ngày', value: 90 },
            { label: '180 ngày', value: 180 },
          ]}
          style={{ width: 120 }}
        />
      </Space>
      <Table columns={columns} dataSource={data} rowKey="productId" loading={loading} size="small" pagination={{ pageSize: 20 }} locale={{ emptyText: 'Không có hàng tồn lâu' }} />
    </>
  );
}

function AbcTab() {
  const [dateRange, setDateRange] = useState(defaultRange);
  const [loading, setLoading]     = useState(false);
  const [data, setData]           = useState([]);

  const load = () => {
    setLoading(true);
    reportsApi.abcAnalysis({
      from: dateRange?.[0]?.format('YYYY-MM-DD'),
      to:   dateRange?.[1]?.format('YYYY-MM-DD'),
    }).then((res) => setData((res.data?.data ?? res.data)?.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateRange]);

  const columns = [
    { title: '#', key: 'rank', width: 50, render: (_, __, i) => i + 1 },
    { title: 'Sản phẩm',      dataIndex: 'name',                key: 'name' },
    { title: 'Doanh thu',     dataIndex: 'revenueContribution', key: 'rev',   align: 'right', render: (v) => fmt(v) + '₫' },
    { title: '% DT',          dataIndex: 'revenuePercent',      key: 'pct',   align: 'right', render: (v) => v + '%' },
    { title: '% Tích lũy',    dataIndex: 'cumulativePercent',   key: 'cum',   align: 'right', render: (v) => v + '%' },
    {
      title: 'Hạng', dataIndex: 'abcClass', key: 'class', width: 80,
      render: (v) => <Tag color={ABC_COLOR[v]}>{ABC_LABEL[v] ?? v}</Tag>,
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12 }} wrap>
        <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading} size="small">Làm mới</Button>
      </Space>
      {data.length > 0 && <AbcTab.Pareto data={data} />}
      <Table columns={columns} dataSource={data} rowKey="productId" loading={loading} size="small" pagination={{ pageSize: 30 }} locale={{ emptyText: 'Chưa có dữ liệu' }} />
    </>
  );
}
AbcTab.Pareto = ABCPareto;

export default function ReportInventory() {
  return (
    <div>
      <PageHeader title="Báo cáo Kho" />
      <Card size="small">
        <Tabs
          items={[
            { key: 'movement', label: 'Nhập-Xuất-Tồn',   children: <MovementTab /> },
            { key: 'deadstock', label: 'Hàng tồn lâu',   children: <DeadstockTab /> },
            { key: 'abc',       label: 'Phân tích ABC',   children: <AbcTab /> },
          ]}
        />
      </Card>
    </div>
  );
}

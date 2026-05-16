import { useEffect, useState } from 'react';
import {
  Button, Card, Input, Select, Space, Spin, Table, Tag, Tabs, Typography,
} from 'antd';
import { PrinterOutlined, ReloadOutlined } from '@ant-design/icons';
import { printReportInventoryMovement } from '@shared/utils/printDocument';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import ReportDateRangePicker from '@shared/components/ReportDateRangePicker';
import { reportsApi, warehousesApi, categoriesApi } from '@api/tenant.api';

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

const STOCK_FILTER_OPTIONS = [
  { label: 'Tất cả',        value: 'all' },
  { label: 'Còn hàng',      value: 'in_stock' },
  { label: 'Hết hàng',      value: 'out_of_stock' },
  { label: 'Sắp hết (≤10)', value: 'low_stock' },
];

function MovementTab() {
  const [dateRange, setDateRange]   = useState(defaultRange);
  const [warehouseId, setWarehouse] = useState(undefined);
  const [categoryId, setCategory]   = useState(undefined);
  const [productCode, setProductCode] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    warehousesApi.list().then((res) => {
      const list = res.data?.data ?? res.data ?? [];
      setWarehouses(list.map((w) => ({ label: w.name, value: w.id })));
    });
    categoriesApi.flat().then((res) => {
      const list = res.data?.data ?? res.data ?? [];
      setCategories(list.map((c) => ({ label: c.name, value: c.id })));
    });
  }, []);

  const load = () => {
    setLoading(true);
    reportsApi.movement({
      from: dateRange?.[0]?.format('YYYY-MM-DD'),
      to:   dateRange?.[1]?.format('YYYY-MM-DD'),
      warehouseId: warehouseId || undefined,
      categoryId:  categoryId  || undefined,
      productCode: productCode || undefined,
      stockFilter,
    }).then((res) => {
      const payload = res.data?.data ?? res.data;
      setResult(payload);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateRange, warehouseId, categoryId, stockFilter]);

  const data    = result?.data    ?? [];
  const summary = result?.summary ?? {};

  const columns = [
    { title: 'STT',         key: 'stt',           width: 50,  align: 'center', render: (_, __, i) => i + 1 },
    { title: 'SKU',         dataIndex: 'sku',          key: 'sku',          width: 110 },
    { title: 'Tên SP',      dataIndex: 'name',         key: 'name' },
    { title: 'Danh mục',    dataIndex: 'categoryName', key: 'categoryName', width: 130 },
    { title: 'ĐVT',         dataIndex: 'unit',         key: 'unit',         width: 70 },
    { title: 'Đầu kỳ',      dataIndex: 'openingQty',   key: 'openingQty',   align: 'right', width: 90,  render: fmt },
    { title: 'Nhập kỳ',     dataIndex: 'stockIn',      key: 'stockIn',      align: 'right', width: 90,
      render: (v) => <Typography.Text style={{ color: '#389e0d' }}>{fmt(v)}</Typography.Text> },
    { title: 'Xuất kỳ',     dataIndex: 'stockOut',     key: 'stockOut',     align: 'right', width: 90,
      render: (v) => <Typography.Text style={{ color: '#cf1322' }}>{fmt(v)}</Typography.Text> },
    { title: 'Cuối kỳ',     dataIndex: 'closingQty',   key: 'closingQty',   align: 'right', width: 90,
      render: (v) => <Typography.Text strong type={v < 0 ? 'danger' : undefined}>{fmt(v)}</Typography.Text> },
    { title: 'Giá vốn',     dataIndex: 'costPrice',    key: 'costPrice',    align: 'right', width: 110, render: (v) => fmt(v) + '₫' },
    { title: 'Giá trị tồn', dataIndex: 'closingValue', key: 'closingValue', align: 'right', width: 120, render: (v) => fmt(v) + '₫' },
  ];

  const summaryRow = () => (
    <Table.Summary.Row style={{ fontWeight: 600, background: '#fafafa' }}>
      <Table.Summary.Cell index={0} colSpan={5} align="center">
        <Typography.Text strong>Tổng cộng</Typography.Text>
      </Table.Summary.Cell>
      <Table.Summary.Cell index={5} align="right"><Typography.Text strong>{fmt(summary.total_opening_qty)}</Typography.Text></Table.Summary.Cell>
      <Table.Summary.Cell index={6} align="right"><Typography.Text strong style={{ color: '#389e0d' }}>{fmt(summary.total_stock_in)}</Typography.Text></Table.Summary.Cell>
      <Table.Summary.Cell index={7} align="right"><Typography.Text strong style={{ color: '#cf1322' }}>{fmt(summary.total_stock_out)}</Typography.Text></Table.Summary.Cell>
      <Table.Summary.Cell index={8} align="right"><Typography.Text strong>{fmt(summary.total_closing_qty)}</Typography.Text></Table.Summary.Cell>
      <Table.Summary.Cell index={9} />
      <Table.Summary.Cell index={10} align="right"><Typography.Text strong>{fmt(summary.total_closing_value)}₫</Typography.Text></Table.Summary.Cell>
    </Table.Summary.Row>
  );

  const handlePrint = () => printReportInventoryMovement({
    from:    dateRange?.[0]?.format('DD/MM/YYYY') ?? '',
    to:      dateRange?.[1]?.format('DD/MM/YYYY') ?? '',
    summary,
    data,
  });

  return (
    <>
      <Space style={{ marginBottom: 12 }} wrap>
        <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
        <Select
          placeholder="Tất cả kho"
          allowClear
          value={warehouseId}
          onChange={setWarehouse}
          options={warehouses}
          style={{ width: 150 }}
        />
        <Select
          placeholder="Tất cả danh mục"
          allowClear
          value={categoryId}
          onChange={setCategory}
          options={categories}
          style={{ width: 160 }}
        />
        <Input.Search
          placeholder="Mã / tên sản phẩm"
          allowClear
          value={productCode}
          onChange={(e) => setProductCode(e.target.value)}
          onSearch={load}
          style={{ width: 180 }}
        />
        <Select
          options={STOCK_FILTER_OPTIONS}
          value={stockFilter}
          onChange={setStockFilter}
          style={{ width: 140 }}
        />
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading} size="small">Làm mới</Button>
        <Button icon={<PrinterOutlined />} onClick={handlePrint} size="small">In báo cáo</Button>
      </Space>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="productId"
        loading={loading}
        size="small"
        pagination={{ pageSize: 20 }}
        summary={summaryRow}
        scroll={{ x: 1000 }}
        locale={{ emptyText: 'Chưa có dữ liệu' }}
      />
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

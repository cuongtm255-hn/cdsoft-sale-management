import { useEffect, useState } from 'react';
import {
  Button, Card, Input, Row, Col, Select, Space, Spin, Statistic, Table, Typography,
} from 'antd';
import { PrinterOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import ReportDateRangePicker from '@shared/components/ReportDateRangePicker';
import { reportsApi } from '@api/tenant.api';
import { printReportPurchaseBySupplier } from '@shared/utils/printDocument';

const { Text } = Typography;

const fmt = (v) => Number(v ?? 0).toLocaleString('vi-VN');

const PAYMENT_FILTER_OPTIONS = [
  { label: 'Tất cả',         value: 'all' },
  { label: 'Đã thanh toán',  value: 'paid' },
  { label: 'Thanh toán 1 phần', value: 'partial' },
  { label: 'Chưa thanh toán', value: 'unpaid' },
];

const defaultRange = [dayjs().startOf('month'), dayjs()];

export default function ReportPurchaseBySupplier() {
  const [dateRange, setDateRange]       = useState(defaultRange);
  const [supplierCode, setSupplierCode] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState(null);

  const load = () => {
    setLoading(true);
    reportsApi.purchaseBySupplier({
      from:          dateRange?.[0]?.format('YYYY-MM-DD'),
      to:            dateRange?.[1]?.format('YYYY-MM-DD'),
      supplierCode:  supplierCode || undefined,
      paymentFilter,
    })
      .then((res) => setResult(res.data?.data ?? res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateRange, paymentFilter]);

  const summary = result?.summary ?? {};
  const data    = result?.data    ?? [];

  const columns = [
    {
      title: 'STT', key: 'stt', width: 55, align: 'center',
      render: (_, __, i) => i + 1,
    },
    { title: 'Mã NCC',           dataIndex: 'supplier_code', key: 'supplier_code', width: 100, align: 'center' },
    { title: 'Tên nhà cung cấp', dataIndex: 'supplier_name', key: 'supplier_name' },
    { title: 'Địa chỉ',          dataIndex: 'address',       key: 'address',       width: 160 },
    { title: 'Số đơn',           dataIndex: 'order_count',   key: 'order_count',   width: 80, align: 'center' },
    {
      title: 'Tiền hàng', dataIndex: 'subtotal', key: 'subtotal',
      align: 'right', width: 130,
      render: (v) => fmt(v),
    },
    {
      title: 'Chiết khấu', dataIndex: 'total_discount', key: 'total_discount',
      align: 'right', width: 110,
      render: (v) => fmt(v),
    },
    {
      title: 'Thuế (VAT)', dataIndex: 'total_tax', key: 'total_tax',
      align: 'right', width: 110,
      render: (v) => fmt(v),
    },
    {
      title: 'Tổng phải trả', dataIndex: 'total_payable', key: 'total_payable',
      align: 'right', width: 130,
      render: (v) => <Text strong>{fmt(v)}</Text>,
    },
    {
      title: 'Đã thanh toán', dataIndex: 'total_paid', key: 'total_paid',
      align: 'right', width: 130,
      render: (v) => <Text style={{ color: '#52c41a' }}>{fmt(v)}</Text>,
    },
    {
      title: 'Còn lại', dataIndex: 'remaining', key: 'remaining',
      align: 'right', width: 120,
      render: (v) => (
        <Text strong style={{ color: v > 0 ? '#fa8c16' : '#52c41a' }}>{fmt(v)}</Text>
      ),
    },
  ];

  const summaryRow = () => (
    <Table.Summary.Row style={{ fontWeight: 600, background: '#fafafa' }}>
      <Table.Summary.Cell index={0} colSpan={4} align="center">
        <Text strong>Tổng cộng</Text>
      </Table.Summary.Cell>
      <Table.Summary.Cell index={4} align="center">
        <Text strong>{summary.total_order_count ?? 0}</Text>
      </Table.Summary.Cell>
      <Table.Summary.Cell index={5} align="right">
        <Text strong>{fmt(summary.total_subtotal)}</Text>
      </Table.Summary.Cell>
      <Table.Summary.Cell index={6} align="right">
        <Text strong>{fmt(summary.total_discount)}</Text>
      </Table.Summary.Cell>
      <Table.Summary.Cell index={7} align="right">
        <Text strong>{fmt(summary.total_tax)}</Text>
      </Table.Summary.Cell>
      <Table.Summary.Cell index={8} align="right">
        <Text strong>{fmt(summary.total_payable)}</Text>
      </Table.Summary.Cell>
      <Table.Summary.Cell index={9} align="right">
        <Text strong style={{ color: '#52c41a' }}>{fmt(summary.total_paid)}</Text>
      </Table.Summary.Cell>
      <Table.Summary.Cell index={10} align="right">
        <Text strong style={{ color: summary.total_remaining > 0 ? '#fa8c16' : '#52c41a' }}>
          {fmt(summary.total_remaining)}
        </Text>
      </Table.Summary.Cell>
    </Table.Summary.Row>
  );

  const handlePrint = () => printReportPurchaseBySupplier({
    from:    dateRange?.[0]?.format('DD/MM/YYYY') ?? '',
    to:      dateRange?.[1]?.format('DD/MM/YYYY') ?? '',
    summary,
    data,
  });

  return (
    <div>
      <PageHeader
        title="Mua hàng theo nhà cung cấp"
        extra={<Button icon={<PrinterOutlined />} onClick={handlePrint}>In báo cáo</Button>}
      />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 8]} align="middle">
          <Col>
            <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
          </Col>
          <Col flex="220px">
            <Input.Search
              placeholder="Tìm mã / tên nhà cung cấp"
              allowClear
              value={supplierCode}
              onChange={(e) => setSupplierCode(e.target.value)}
              onSearch={load}
              style={{ width: '100%' }}
            />
          </Col>
          <Col>
            <Select
              options={PAYMENT_FILTER_OPTIONS}
              value={paymentFilter}
              onChange={setPaymentFilter}
              style={{ width: 170 }}
            />
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
              Làm mới
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Tổng phải trả"
              value={summary.total_payable ?? 0}
              formatter={(v) => fmt(v)}
              suffix="₫"
              valueStyle={{ fontSize: 16 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Đã thanh toán"
              value={summary.total_paid ?? 0}
              formatter={(v) => fmt(v)}
              suffix="₫"
              valueStyle={{ fontSize: 16, color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Còn lại"
              value={summary.total_remaining ?? 0}
              formatter={(v) => fmt(v)}
              suffix="₫"
              valueStyle={{
                fontSize: 16,
                color: (summary.total_remaining ?? 0) > 0 ? '#fa8c16' : '#52c41a',
              }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Số đơn nhập"
              value={summary.total_order_count ?? 0}
              valueStyle={{ fontSize: 16 }}
            />
          </Card>
        </Col>
      </Row>

      <Spin spinning={loading}>
        <Table
          size="small"
          bordered
          dataSource={data}
          columns={columns}
          rowKey="supplier_code"
          pagination={false}
          summary={summaryRow}
          scroll={{ x: 1100 }}
          style={{ background: '#fff' }}
          locale={{ emptyText: 'Chưa có dữ liệu' }}
        />
      </Spin>
    </div>
  );
}

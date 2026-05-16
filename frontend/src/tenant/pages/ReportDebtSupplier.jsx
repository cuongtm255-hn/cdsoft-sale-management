import { useEffect, useState } from 'react';
import {
  Button, Card, Input, Row, Col, Select, Space, Spin, Statistic, Table, Typography,
} from 'antd';
import { PrinterOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import ReportDateRangePicker from '@shared/components/ReportDateRangePicker';
import { reportsApi } from '@api/tenant.api';
import { printReportDebtSupplier } from '@shared/utils/printDocument';

const { Text } = Typography;

const fmt = (v) => Number(v ?? 0).toLocaleString('vi-VN');

const DEBT_FILTER_OPTIONS = [
  { label: 'Tất cả',   value: 'all' },
  { label: 'Có nợ',    value: 'has_debt' },
  { label: 'Không nợ', value: 'no_debt' },
];

const defaultRange = [dayjs().startOf('month'), dayjs()];

export default function ReportDebtSupplier() {
  const [dateRange, setDateRange]     = useState(defaultRange);
  const [supplierCode, setSupplierCode] = useState('');
  const [debtFilter, setDebtFilter]   = useState('all');
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState(null);

  const load = () => {
    setLoading(true);
    reportsApi.debtBySupplier({
      from:         dateRange?.[0]?.format('YYYY-MM-DD'),
      to:           dateRange?.[1]?.format('YYYY-MM-DD'),
      supplierCode: supplierCode || undefined,
      debtFilter,
    })
      .then((res) => setResult(res.data?.data ?? res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateRange, debtFilter]);

  const summary = result?.summary ?? {};
  const data    = result?.data ?? [];

  const columns = [
    {
      title: 'STT', key: 'stt', width: 55, align: 'center',
      render: (_, __, i) => i + 1,
    },
    { title: 'Mã NCC',            dataIndex: 'supplier_code', key: 'supplier_code', width: 100, align: 'center' },
    { title: 'Tên nhà cung cấp',  dataIndex: 'supplier_name', key: 'supplier_name' },
    { title: 'Điện thoại',        dataIndex: 'phone',         key: 'phone',         width: 130 },
    {
      title: 'Nợ đầu kỳ', dataIndex: 'opening_debt', key: 'opening_debt',
      align: 'right', width: 130,
      render: (v) => <Text type={v < 0 ? 'danger' : undefined}>{fmt(v)}</Text>,
    },
    {
      title: 'Phát sinh tăng', dataIndex: 'debit_amount', key: 'debit_amount',
      align: 'right', width: 140,
      render: (v) => fmt(v),
    },
    {
      title: 'Phát sinh giảm', dataIndex: 'credit_amount', key: 'credit_amount',
      align: 'right', width: 140,
      render: (v) => fmt(v),
    },
    {
      title: 'Nợ cuối kỳ', dataIndex: 'closing_debt', key: 'closing_debt',
      align: 'right', width: 130,
      render: (v) => (
        <Text strong type={v < 0 ? 'danger' : undefined}>{fmt(v)}</Text>
      ),
    },
  ];

  const summaryRow = () => (
    <Table.Summary.Row style={{ fontWeight: 600, background: '#fafafa' }}>
      <Table.Summary.Cell index={0} colSpan={4} align="center">
        <Text strong>Tổng cộng</Text>
      </Table.Summary.Cell>
      <Table.Summary.Cell index={4} align="right">
        <Text strong type={summary.total_opening_debt < 0 ? 'danger' : undefined}>
          {fmt(summary.total_opening_debt)}
        </Text>
      </Table.Summary.Cell>
      <Table.Summary.Cell index={5} align="right">
        <Text strong>{fmt(summary.total_debit)}</Text>
      </Table.Summary.Cell>
      <Table.Summary.Cell index={6} align="right">
        <Text strong>{fmt(summary.total_credit)}</Text>
      </Table.Summary.Cell>
      <Table.Summary.Cell index={7} align="right">
        <Text strong type={summary.total_closing_debt < 0 ? 'danger' : undefined}>
          {fmt(summary.total_closing_debt)}
        </Text>
      </Table.Summary.Cell>
    </Table.Summary.Row>
  );

  const handlePrint = () => printReportDebtSupplier({
    from:    dateRange?.[0]?.format('DD/MM/YYYY') ?? '',
    to:      dateRange?.[1]?.format('DD/MM/YYYY') ?? '',
    summary,
    data,
  });

  return (
    <div>
      <PageHeader
        title="Công nợ phải trả theo nhà cung cấp"
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
              options={DEBT_FILTER_OPTIONS}
              value={debtFilter}
              onChange={setDebtFilter}
              style={{ width: 130 }}
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
              title="Nợ đầu kỳ"
              value={summary.total_opening_debt ?? 0}
              formatter={(v) => fmt(v)}
              suffix="₫"
              valueStyle={{ fontSize: 16 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Phát sinh tăng"
              value={summary.total_debit ?? 0}
              formatter={(v) => fmt(v)}
              suffix="₫"
              valueStyle={{ fontSize: 16, color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Phát sinh giảm"
              value={summary.total_credit ?? 0}
              formatter={(v) => fmt(v)}
              suffix="₫"
              valueStyle={{ fontSize: 16, color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Nợ cuối kỳ"
              value={summary.total_closing_debt ?? 0}
              formatter={(v) => fmt(v)}
              suffix="₫"
              valueStyle={{
                fontSize: 16,
                color: (summary.total_closing_debt ?? 0) > 0 ? '#fa8c16' : '#52c41a',
              }}
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
          scroll={{ x: 900 }}
          style={{ background: '#fff' }}
          locale={{ emptyText: 'Chưa có dữ liệu' }}
        />
      </Spin>
    </div>
  );
}

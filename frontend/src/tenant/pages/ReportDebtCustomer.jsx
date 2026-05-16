import { useEffect, useRef, useState } from 'react';
import {
  Button, Card, Input, Row, Col, Select, Space, Spin, Statistic, Table, Tag, Typography,
} from 'antd';
import { PrinterOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import ReportDateRangePicker from '@shared/components/ReportDateRangePicker';
import { reportsApi } from '@api/tenant.api';

const { Text } = Typography;

const fmt = (v) => Number(v ?? 0).toLocaleString('vi-VN');

const DEBT_FILTER_OPTIONS = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Có nợ',  value: 'has_debt' },
  { label: 'Không nợ', value: 'no_debt' },
  { label: 'Quá hạn mức', value: 'over_limit' },
];

const defaultRange = [dayjs().startOf('month'), dayjs()];

export default function ReportDebtCustomer() {
  const [dateRange, setDateRange]   = useState(defaultRange);
  const [customerCode, setCustomerCode] = useState('');
  const [debtFilter, setDebtFilter] = useState('all');
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const printRef                    = useRef(null);

  const load = () => {
    setLoading(true);
    reportsApi.debtByCustomer({
      from:         dateRange?.[0]?.format('YYYY-MM-DD'),
      to:           dateRange?.[1]?.format('YYYY-MM-DD'),
      customerCode: customerCode || undefined,
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
    {
      title: 'Mã KH', dataIndex: 'customer_code', key: 'customer_code',
      width: 100, align: 'center',
    },
    {
      title: 'Tên khách hàng', dataIndex: 'customer_name', key: 'customer_name',
      render: (name, row) => (
        <Space>
          {name}
          {row.over_limit && (
            <Tag color="error" icon={<WarningOutlined />}>Quá hạn mức</Tag>
          )}
        </Space>
      ),
    },
    { title: 'Điện thoại', dataIndex: 'phone', key: 'phone', width: 120 },
    {
      title: 'Nợ đầu kỳ', dataIndex: 'opening_debt', key: 'opening_debt',
      align: 'right', width: 130,
      render: (v) => (
        <Text type={v < 0 ? 'danger' : undefined}>{fmt(v)}</Text>
      ),
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
      render: (v, row) => (
        <Text strong type={v < 0 ? 'danger' : row.over_limit ? 'danger' : undefined}>
          {fmt(v)}
        </Text>
      ),
    },
    {
      title: 'Hạn mức TD', dataIndex: 'credit_limit', key: 'credit_limit',
      align: 'right', width: 120,
      render: (v) => (v > 0 ? fmt(v) : <Text type="secondary">—</Text>),
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
      <Table.Summary.Cell index={8} />
    </Table.Summary.Row>
  );

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const w = window.open('', '_blank');
    w.document.write(`
      <html>
        <head>
          <title>Công nợ phải thu theo khách hàng</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
            h2, h3 { text-align: center; margin: 4px 0; }
            p.period { text-align: center; font-size: 11px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #ccc; padding: 4px 6px; }
            th { background: #f0f0f0; text-align: center; }
            td.right { text-align: right; }
            td.center { text-align: center; }
            .total-row { font-weight: bold; background: #f9f9f9; }
            .over-limit { color: red; }
            .footer { display: flex; justify-content: space-around; margin-top: 40px; text-align: center; }
            .footer div { width: 200px; }
            .footer p { margin: 4px 0; }
            @media print { @page { margin: 15mm; } }
          </style>
        </head>
        <body>
          <h3>BÁO CÁO CÔNG NỢ PHẢI THU THEO KHÁCH HÀNG</h3>
          <p class="period">
            Từ ngày: ${dateRange?.[0]?.format('DD/MM/YYYY') ?? ''}
            &nbsp;&nbsp;—&nbsp;&nbsp;
            Đến ngày: ${dateRange?.[1]?.format('DD/MM/YYYY') ?? ''}
          </p>
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã KH</th>
                <th>Tên khách hàng</th>
                <th>Điện thoại</th>
                <th>Nợ đầu kỳ</th>
                <th>Phát sinh tăng</th>
                <th>Phát sinh giảm</th>
                <th>Nợ cuối kỳ</th>
                <th>Hạn mức TD</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((r, i) => `
                <tr class="${r.over_limit ? 'over-limit' : ''}">
                  <td class="center">${i + 1}</td>
                  <td class="center">${r.customer_code}</td>
                  <td>${r.customer_name}</td>
                  <td class="center">${r.phone ?? ''}</td>
                  <td class="right">${fmt(r.opening_debt)}</td>
                  <td class="right">${fmt(r.debit_amount)}</td>
                  <td class="right">${fmt(r.credit_amount)}</td>
                  <td class="right">${fmt(r.closing_debt)}</td>
                  <td class="right">${r.credit_limit > 0 ? fmt(r.credit_limit) : '—'}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td class="center" colspan="4">Tổng cộng</td>
                <td class="right">${fmt(summary.total_opening_debt)}</td>
                <td class="right">${fmt(summary.total_debit)}</td>
                <td class="right">${fmt(summary.total_credit)}</td>
                <td class="right">${fmt(summary.total_closing_debt)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            <div>
              <p><strong>KẾ TOÁN VIÊN</strong></p>
              <p><em>(Ký, ghi rõ họ tên)</em></p>
              <br/><br/><br/>
              <p>................................</p>
            </div>
            <div>
              <p><strong>KẾ TOÁN TRƯỞNG</strong></p>
              <p><em>(Ký, ghi rõ họ tên)</em></p>
              <br/><br/><br/>
              <p>................................</p>
            </div>
          </div>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  return (
    <div>
      <PageHeader
        title="Công nợ phải thu theo khách hàng"
        extra={
          <Space>
            <Button icon={<PrinterOutlined />} onClick={handlePrint}>In báo cáo</Button>
          </Space>
        }
      />

      {/* Filter bar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 8]} align="middle">
          <Col>
            <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
          </Col>
          <Col flex="220px">
            <Input.Search
              placeholder="Tìm mã / tên khách hàng"
              allowClear
              value={customerCode}
              onChange={(e) => setCustomerCode(e.target.value)}
              onSearch={load}
              style={{ width: '100%' }}
            />
          </Col>
          <Col>
            <Select
              options={DEBT_FILTER_OPTIONS}
              value={debtFilter}
              onChange={setDebtFilter}
              style={{ width: 150 }}
            />
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
              Làm mới
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Summary cards */}
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
              title={
                <Space>
                  Nợ cuối kỳ
                  {summary.over_limit_count > 0 && (
                    <Tag color="error" icon={<WarningOutlined />}>
                      {summary.over_limit_count} quá hạn mức
                    </Tag>
                  )}
                </Space>
              }
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

      {/* Table */}
      <div ref={printRef}>
        <Spin spinning={loading}>
          <Table
            size="small"
            bordered
            dataSource={data}
            columns={columns}
            rowKey="customer_code"
            pagination={false}
            summary={summaryRow}
            rowClassName={(r) => (r.over_limit ? 'ant-table-row-danger' : '')}
            scroll={{ x: 900 }}
            style={{ background: '#fff' }}
          />
        </Spin>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  Button, Card, Col, Row, Select, Spin, Statistic, Table, Typography,
} from 'antd';
import { PrinterOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import ReportDateRangePicker from '@shared/components/ReportDateRangePicker';
import { customersApi, reportsApi } from '@api/tenant.api';

const { Text } = Typography;

const fmt = (v) => Number(v ?? 0).toLocaleString('vi-VN');

const DEBT_FILTER_OPTIONS = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Còn nợ', value: 'has_debt' },
  { label: 'Đã thanh toán', value: 'no_debt' },
];

const defaultRange = [dayjs().startOf('month'), dayjs()];

export default function ReportSalesByCustomer() {
  const [dateRange, setDateRange] = useState(defaultRange);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [debtFilter, setDebtFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    customersApi
      .list({ limit: 500, isActive: true })
      .then((res) => setCustomers(res.data?.data?.data ?? res.data?.data ?? []));
  }, []);

  const load = () => {
    setLoading(true);
    reportsApi.salesByCustomer({
      from: dateRange?.[0]?.format('YYYY-MM-DD'),
      to: dateRange?.[1]?.format('YYYY-MM-DD'),
      customerIds: selectedCustomerIds.length ? selectedCustomerIds.join(',') : undefined,
      debtFilter,
    })
      .then((res) => setResult(res.data?.data ?? res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateRange, selectedCustomerIds, debtFilter]);

  const summary = result?.summary ?? {};
  const data = result?.data ?? [];
  const customerOptions = customers.map((customer) => ({
    value: customer.id,
    label: `${customer.code} - ${customer.name}`,
    searchText: `${customer.code ?? ''} ${customer.name ?? ''}`.toLowerCase(),
  }));

  const columns = [
    {
      title: 'STT', key: 'stt', width: 55, align: 'center',
      render: (_, __, i) => i + 1,
    },
    { title: 'Mã KH', dataIndex: 'customer_code', key: 'customer_code', width: 100, align: 'center' },
    { title: 'Tên khách hàng', dataIndex: 'customer_name', key: 'customer_name' },
    { title: 'Địa chỉ', dataIndex: 'address', key: 'address' },
    {
      title: 'Công nợ đầu kỳ',
      dataIndex: 'opening_debt',
      key: 'opening_debt',
      align: 'right',
      width: 145,
      render: (v) => <Text type={v < 0 ? 'danger' : undefined}>{fmt(v)}</Text>,
    },
    {
      title: 'Tổng tiền trong kỳ',
      dataIndex: 'total_sales',
      key: 'total_sales',
      align: 'right',
      width: 155,
      render: (v) => fmt(v),
    },
    {
      title: 'Tổng thanh toán',
      dataIndex: 'total_payment',
      key: 'total_payment',
      align: 'right',
      width: 145,
      render: (v) => fmt(v),
    },
    {
      title: 'Công nợ cuối kỳ',
      dataIndex: 'closing_debt',
      key: 'closing_debt',
      align: 'right',
      width: 145,
      render: (v) => (
        <Text strong type={v < 0 ? 'danger' : v > 0 ? undefined : 'success'}>
          {fmt(v)}
        </Text>
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
        <Text strong>{fmt(summary.total_sales)}</Text>
      </Table.Summary.Cell>
      <Table.Summary.Cell index={6} align="right">
        <Text strong>{fmt(summary.total_payment)}</Text>
      </Table.Summary.Cell>
      <Table.Summary.Cell index={7} align="right">
        <Text strong type={summary.total_closing_debt < 0 ? 'danger' : undefined}>
          {fmt(summary.total_closing_debt)}
        </Text>
      </Table.Summary.Cell>
    </Table.Summary.Row>
  );

  const handlePrint = () => {
    const from = dateRange?.[0]?.format('DD/MM/YYYY') ?? '';
    const to = dateRange?.[1]?.format('DD/MM/YYYY') ?? '';
    const w = window.open('', '_blank');
    w.document.write(`
      <html>
        <head>
          <title>Doanh thu bán hàng theo khách hàng</title>
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
            .negative { color: red; }
            .footer { display: flex; justify-content: space-around; margin-top: 40px; text-align: center; }
            .footer div { width: 200px; }
            .footer p { margin: 4px 0; }
            @media print { @page { margin: 15mm; } }
          </style>
        </head>
        <body>
          <h3>BÁO CÁO DOANH THU BÁN HÀNG THEO KHÁCH HÀNG</h3>
          <p class="period">
            Từ ngày: ${from}&nbsp;&nbsp;-&nbsp;&nbsp;Đến ngày: ${to}
          </p>
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã KH</th>
                <th>Tên khách hàng</th>
                <th>Địa chỉ</th>
                <th>Công nợ đầu kỳ</th>
                <th>Tổng tiền trong kỳ</th>
                <th>Tổng thanh toán</th>
                <th>Công nợ cuối kỳ</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((r, i) => `
                <tr>
                  <td class="center">${i + 1}</td>
                  <td class="center">${r.customer_code}</td>
                  <td>${r.customer_name}</td>
                  <td>${r.address ?? ''}</td>
                  <td class="right${r.opening_debt < 0 ? ' negative' : ''}">${fmt(r.opening_debt)}</td>
                  <td class="right">${fmt(r.total_sales)}</td>
                  <td class="right">${fmt(r.total_payment)}</td>
                  <td class="right${r.closing_debt < 0 ? ' negative' : ''}">${fmt(r.closing_debt)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td class="center" colspan="4">Tổng cộng</td>
                <td class="right">${fmt(summary.total_opening_debt)}</td>
                <td class="right">${fmt(summary.total_sales)}</td>
                <td class="right">${fmt(summary.total_payment)}</td>
                <td class="right">${fmt(summary.total_closing_debt)}</td>
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
        title="Doanh thu bán hàng theo khách hàng"
        extra={<Button icon={<PrinterOutlined />} onClick={handlePrint}>In báo cáo</Button>}
      />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 8]} align="middle">
          <Col>
            <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
          </Col>
          <Col flex="320px">
            <Select
              mode="multiple"
              allowClear
              showSearch
              maxTagCount="responsive"
              placeholder="Chọn khách hàng (để trống = tất cả)"
              options={customerOptions}
              value={selectedCustomerIds}
              onChange={setSelectedCustomerIds}
              optionFilterProp="searchText"
              style={{ width: '100%' }}
            />
          </Col>
          <Col>
            <Select
              options={DEBT_FILTER_OPTIONS}
              value={debtFilter}
              onChange={setDebtFilter}
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
              title="Công nợ đầu kỳ"
              value={summary.total_opening_debt ?? 0}
              formatter={(v) => fmt(v)}
              suffix="VND"
              valueStyle={{ fontSize: 16 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Tổng tiền trong kỳ"
              value={summary.total_sales ?? 0}
              formatter={(v) => fmt(v)}
              suffix="VND"
              valueStyle={{ fontSize: 16, color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Tổng thanh toán"
              value={summary.total_payment ?? 0}
              formatter={(v) => fmt(v)}
              suffix="VND"
              valueStyle={{ fontSize: 16, color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Công nợ cuối kỳ"
              value={summary.total_closing_debt ?? 0}
              formatter={(v) => fmt(v)}
              suffix="VND"
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
          rowKey="customer_code"
          pagination={false}
          summary={summaryRow}
          scroll={{ x: 960 }}
          style={{ background: '#fff' }}
          locale={{ emptyText: 'Không có dữ liệu' }}
        />
      </Spin>
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  Button, Card, Col, Row, Select, Space, Spin, Statistic, Table, Tabs, Tag, Typography, Radio,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import ReportDateRangePicker from '@shared/components/ReportDateRangePicker';
import RevenueChart from '@shared/components/RevenueChart';
import { reportsApi } from '@api/tenant.api';

const fmt = (v) => Number(v ?? 0).toLocaleString('vi-VN');

const GROUP_OPTIONS = [
  { label: 'Ngày',   value: 'day' },
  { label: 'Tuần',   value: 'week' },
  { label: 'Tháng',  value: 'month' },
  { label: 'Năm',    value: 'year' },
];

const defaultRange = [dayjs().startOf('month'), dayjs()];

export default function ReportSales() {
  const [dateRange, setDateRange] = useState(defaultRange);
  const [groupBy, setGroupBy]     = useState('month');
  const [chartMode, setChartMode] = useState('bar');
  const [loading, setLoading]     = useState(false);
  const [data, setData]           = useState(null);

  const load = () => {
    setLoading(true);
    reportsApi.sales({
      from:    dateRange?.[0]?.format('YYYY-MM-DD'),
      to:      dateRange?.[1]?.format('YYYY-MM-DD'),
      groupBy,
    }).then((res) => setData(res.data?.data ?? res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateRange, groupBy]);

  const summary = data?.summary ?? {};

  const productColumns = [
    { title: '#', key: 'rank', width: 50, render: (_, __, i) => i + 1 },
    { title: 'Sản phẩm', dataIndex: 'name', key: 'name' },
    {
      title: 'Doanh thu', dataIndex: 'revenue', key: 'revenue', align: 'right',
      render: (v) => fmt(v) + '₫',
      sorter: (a, b) => a.revenue - b.revenue, defaultSortOrder: 'descend',
    },
    { title: 'Số lượng', dataIndex: 'qty', key: 'qty', align: 'right', render: (v) => fmt(v) },
  ];

  const customerColumns = [
    { title: '#', key: 'rank', width: 50, render: (_, __, i) => i + 1 },
    { title: 'Khách hàng', dataIndex: 'name', key: 'name' },
    {
      title: 'Doanh thu', dataIndex: 'revenue', key: 'revenue', align: 'right',
      render: (v) => fmt(v) + '₫',
      sorter: (a, b) => a.revenue - b.revenue, defaultSortOrder: 'descend',
    },
    { title: 'Đơn hàng', dataIndex: 'orders', key: 'orders', align: 'right' },
  ];

  return (
    <div>
      <PageHeader title="Báo cáo Doanh số" />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
          <Select
            options={GROUP_OPTIONS}
            value={groupBy}
            onChange={setGroupBy}
            style={{ width: 110 }}
          />
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
            Làm mới
          </Button>
        </Space>
      </Card>

      <Spin spinning={loading}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic title="Doanh thu" value={fmt(summary.totalRevenue)} suffix="₫" />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic title="Số đơn hàng" value={summary.totalOrders ?? 0} suffix="đơn" />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic title="Giá trị TB / đơn" value={fmt(summary.averageOrderValue)} suffix="₫" />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic title="Tỷ lệ trả hàng" value={summary.returnRate ?? 0} suffix="%" precision={1} />
            </Card>
          </Col>
        </Row>

        <Card
          size="small"
          style={{ marginBottom: 16 }}
          title="Biểu đồ doanh số"
          extra={
            <Radio.Group size="small" value={chartMode} onChange={(e) => setChartMode(e.target.value)}>
              <Radio.Button value="bar">Cột</Radio.Button>
              <Radio.Button value="line">Đường</Radio.Button>
            </Radio.Group>
          }
        >
          <RevenueChart data={data?.chart ?? []} groupBy={groupBy} mode={chartMode} />
        </Card>

        <Card size="small">
          <Tabs
            items={[
              {
                key: 'products',
                label: 'Top sản phẩm',
                children: (
                  <Table
                    columns={productColumns}
                    dataSource={data?.topProducts ?? []}
                    rowKey="productId"
                    size="small"
                    pagination={false}
                    locale={{ emptyText: 'Chưa có dữ liệu' }}
                  />
                ),
              },
              {
                key: 'customers',
                label: 'Top khách hàng',
                children: (
                  <Table
                    columns={customerColumns}
                    dataSource={data?.topCustomers ?? []}
                    rowKey="customerId"
                    size="small"
                    pagination={false}
                    locale={{ emptyText: 'Chưa có dữ liệu' }}
                  />
                ),
              },
            ]}
          />
        </Card>
      </Spin>
    </div>
  );
}

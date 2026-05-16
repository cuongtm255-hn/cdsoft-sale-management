import { useEffect, useState } from 'react';
import { Button, Card, Space, Spin, Table, Tag, Typography } from 'antd';
import { PrinterOutlined, ReloadOutlined } from '@ant-design/icons';
import { printReportKPI } from '@shared/utils/printDocument';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import ReportDateRangePicker from '@shared/components/ReportDateRangePicker';
import KPIProgressBar from '@shared/components/KPIProgressBar';
import { reportsApi } from '@api/tenant.api';

const fmt = (v) => Number(v ?? 0).toLocaleString('vi-VN');
const defaultRange = [dayjs().startOf('month'), dayjs()];

function achievementTag(pct) {
  if (pct >= 90) return <Tag color="success">{pct}% ✅</Tag>;
  if (pct >= 70) return <Tag color="warning">{pct}% ⚠️</Tag>;
  return <Tag color="error">{pct}% ❌</Tag>;
}

export default function ReportKPI() {
  const [dateRange, setDateRange] = useState(defaultRange);
  const [loading, setLoading]     = useState(false);
  const [data, setData]           = useState([]);

  const load = () => {
    setLoading(true);
    reportsApi.kpi({
      from: dateRange?.[0]?.format('YYYY-MM-DD'),
      to:   dateRange?.[1]?.format('YYYY-MM-DD'),
    }).then((res) => setData((res.data?.data ?? res.data)?.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateRange]);

  const columns = [
    { title: 'Nhân viên',    dataIndex: 'userName',    key: 'userName' },
    {
      title: 'Doanh số đạt',
      dataIndex: 'achieved', key: 'achieved', align: 'right',
      render: (v) => <Typography.Text strong>{fmt(v)}₫</Typography.Text>,
      sorter: (a, b) => a.achieved - b.achieved,
      defaultSortOrder: 'descend',
    },
    {
      title: 'Chỉ tiêu',
      dataIndex: 'target', key: 'target', align: 'right',
      render: (v) => v > 0 ? fmt(v) + '₫' : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: '% Hoàn thành',
      key: 'progress',
      width: 180,
      render: (_, row) => row.target > 0
        ? <KPIProgressBar achieved={row.achieved} target={row.target} />
        : <Typography.Text type="secondary">Chưa đặt KPI</Typography.Text>,
    },
    { title: 'KH mới',    dataIndex: 'newCustomers', key: 'newCustomers', align: 'right' },
    { title: 'Số đơn',   dataIndex: 'totalOrders',  key: 'totalOrders',  align: 'right' },
    {
      title: 'Nợ quá hạn',
      dataIndex: 'overdueDebt', key: 'overdueDebt', align: 'right',
      render: (v) => (
        <Typography.Text style={{ color: Number(v) > 0 ? '#cf1322' : 'inherit' }}>
          {fmt(v)}₫
        </Typography.Text>
      ),
    },
  ];

  const handlePrint = () => printReportKPI({
    from: dateRange?.[0]?.format('DD/MM/YYYY') ?? '',
    to:   dateRange?.[1]?.format('DD/MM/YYYY') ?? '',
    data,
  });

  return (
    <div>
      <PageHeader
        title="Báo cáo KPI Nhân viên"
        extra={<Button icon={<PrinterOutlined />} onClick={handlePrint}>In báo cáo</Button>}
      />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Làm mới</Button>
        </Space>
      </Card>

      <Card size="small">
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={data}
            rowKey="userId"
            size="small"
            pagination={false}
            locale={{ emptyText: 'Chưa có dữ liệu' }}
          />
        </Spin>
      </Card>
    </div>
  );
}

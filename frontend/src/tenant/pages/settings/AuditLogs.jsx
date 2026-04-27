import { useState } from 'react';
import { Button, Card, DatePicker, Select, Space, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import AuditLogDrawer from '@tenant/components/AuditLogDrawer';
import { auditApi } from '@api/tenant.api';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const METHOD_COLORS = { POST: 'blue', PUT: 'orange', PATCH: 'gold', DELETE: 'red' };
const RESOURCES     = ['orders', 'products', 'customers', 'inventory', 'payments', 'users', 'settings', 'roles'];
const METHODS       = ['POST', 'PUT', 'PATCH', 'DELETE'];

export default function AuditLogs() {
  const [loading, setLoading]       = useState(false);
  const [data, setData]             = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [filters, setFilters]       = useState({ resource: undefined, action: undefined });
  const [dateRange, setDateRange]   = useState(null);

  const load = (pg = 1) => {
    setLoading(true);
    setPage(pg);
    auditApi.list({
      ...filters,
      from:  dateRange?.[0]?.format('YYYY-MM-DD'),
      to:    dateRange?.[1]?.format('YYYY-MM-DD'),
      page:  pg,
      limit: 50,
    }).then((res) => {
      const d = res.data?.data ?? res.data;
      setData(d.data ?? []);
      setTotal(d.meta?.total ?? 0);
    }).finally(() => setLoading(false));
  };

  const columns = [
    {
      title: 'Thời gian', dataIndex: 'createdAt', key: 'createdAt', width: 160,
      render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm:ss'),
    },
    {
      title: 'Người dùng', key: 'user', width: 180,
      render: (_, r) => (
        <Space size={4}>
          <strong>{r.userName ?? '—'}</strong>
          {r.userRole && <Tag>{r.userRole}</Tag>}
        </Space>
      ),
    },
    {
      title: 'Hành động', dataIndex: 'action', key: 'action',
      render: (v) => {
        if (!v) return '—';
        const [method, ...rest] = v.split(' ');
        return (
          <Space size={4}>
            <Tag color={METHOD_COLORS[method] ?? 'default'}>{method}</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>{rest.join(' ')}</Text>
          </Space>
        );
      },
    },
    {
      title: 'Đối tượng', key: 'resource', width: 150,
      render: (_, r) => (
        <Space size={4}>
          <Tag>{r.resource}</Tag>
          {r.resourceId && <Text type="secondary" copyable={{ text: r.resourceId }} style={{ fontSize: 11 }}>{r.resourceId.slice(0, 8)}…</Text>}
        </Space>
      ),
    },
    { title: 'IP', dataIndex: 'ipAddress', key: 'ip', width: 130 },
    {
      title: '', key: 'detail', width: 80,
      render: (_, r) => <Button size="small" onClick={() => setSelectedLog(r)}>Chi tiết</Button>,
    },
  ];

  return (
    <div>
      <PageHeader title="Nhật ký hoạt động" />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="Đối tượng"
            allowClear
            style={{ width: 150 }}
            options={RESOURCES.map((r) => ({ label: r, value: r }))}
            value={filters.resource}
            onChange={(v) => setFilters((f) => ({ ...f, resource: v }))}
          />
          <Select
            placeholder="Phương thức"
            allowClear
            style={{ width: 130 }}
            options={METHODS.map((m) => ({ label: m, value: m }))}
            value={filters.action}
            onChange={(v) => setFilters((f) => ({ ...f, action: v }))}
          />
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="DD/MM/YYYY"
            placeholder={['Từ ngày', 'Đến ngày']}
          />
          <Button type="primary" onClick={() => load(1)}>Lọc</Button>
        </Space>
      </Card>

      <Card size="small">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{
            current: page, total, pageSize: 50,
            onChange: (p) => load(p),
            showTotal: (t) => `${t} bản ghi`,
          }}
          locale={{ emptyText: 'Nhấn "Lọc" để tải nhật ký' }}
        />
      </Card>

      <AuditLogDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}

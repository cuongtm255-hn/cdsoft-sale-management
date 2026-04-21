import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Spin } from 'antd';
import { ShoppingOutlined, UserOutlined, DollarOutlined, InboxOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
import { dashboardApi } from '@api/tenant.api';

export default function TenantDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.stats()
      .then((res) => setStats(res.data?.data || res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin />;

  return (
    <div>
      <PageHeader title="Dashboard" />
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Total Products" value={stats?.totalProducts ?? '—'} prefix={<ShoppingOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Total Customers" value={stats?.totalCustomers ?? '—'} prefix={<UserOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Revenue (Month)" value={stats?.monthRevenue ?? '—'} prefix={<DollarOutlined />} precision={2} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Low Stock Items" value={stats?.lowStockCount ?? '—'} prefix={<InboxOutlined />} /></Card>
        </Col>
      </Row>
    </div>
  );
}

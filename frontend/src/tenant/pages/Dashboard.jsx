import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Spin } from 'antd';
import { ShoppingOutlined, UserOutlined, DollarOutlined, InboxOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PageHeader from '@shared/components/PageHeader';
import { dashboardApi } from '@api/tenant.api';

export default function TenantDashboard() {
  const { t } = useTranslation();
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
      <PageHeader title={t('dashboard.title')} />
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title={t('dashboard.totalProducts')} value={stats?.totalProducts ?? '—'} prefix={<ShoppingOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title={t('dashboard.totalCustomers')} value={stats?.totalCustomers ?? '—'} prefix={<UserOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title={t('dashboard.monthRevenue')} value={stats?.monthRevenue ?? '—'} prefix={<DollarOutlined />} precision={2} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title={t('dashboard.lowStockItems')} value={stats?.lowStockCount ?? '—'} prefix={<InboxOutlined />} /></Card>
        </Col>
      </Row>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Spin } from 'antd';
import { TeamOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
import { platformApi } from '@api/axios';

export default function PlatformDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformApi.get('/platform/tenants?limit=1')
      .then((res) => setStats({ total: res.data?.data?.total || 0 }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin />;

  return (
    <div>
      <PageHeader title="Platform Dashboard" />
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Total Tenants" value={stats?.total ?? 0} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Active Tenants" value="—" prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Pending Provision" value="—" prefix={<WarningOutlined style={{ color: '#faad14' }} />} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

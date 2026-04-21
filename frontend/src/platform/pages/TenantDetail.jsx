import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Space, Spin, message } from 'antd';
import PageHeader from '@shared/components/PageHeader';
import { tenantsApi } from '@api/platform.api';

const statusColor = { ACTIVE: 'green', INACTIVE: 'default', SUSPENDED: 'red' };

export default function TenantDetail() {
  const { id } = useParams();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    tenantsApi.get(id).then((res) => setTenant(res.data?.data || res.data)).finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleStatusChange = async (status) => {
    try {
      await tenantsApi.updateStatus(id, { status });
      message.success('Status updated');
      load();
    } catch {
      message.error('Failed to update status');
    }
  };

  if (loading) return <Spin />;
  if (!tenant) return null;

  return (
    <div>
      <PageHeader
        title={tenant.tenantName}
        extra={
          <Space>
            {tenant.status !== 'ACTIVE' && <Button type="primary" onClick={() => handleStatusChange('ACTIVE')}>Activate</Button>}
            {tenant.status === 'ACTIVE' && <Button danger onClick={() => handleStatusChange('SUSPENDED')}>Suspend</Button>}
          </Space>
        }
      />
      <Card>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Tenant Code">{tenant.tenantCode}</Descriptions.Item>
          <Descriptions.Item label="Company">{tenant.companyName}</Descriptions.Item>
          <Descriptions.Item label="Contact">{tenant.contactName}</Descriptions.Item>
          <Descriptions.Item label="Email">{tenant.contactEmail}</Descriptions.Item>
          <Descriptions.Item label="Status"><Tag color={statusColor[tenant.status]}>{tenant.status}</Tag></Descriptions.Item>
          <Descriptions.Item label="Provisioning"><Tag>{tenant.provisioningStatus}</Tag></Descriptions.Item>
          <Descriptions.Item label="DB Host">{tenant.dbHost}</Descriptions.Item>
          <Descriptions.Item label="DB Name">{tenant.dbName}</Descriptions.Item>
          <Descriptions.Item label="Created">{new Date(tenant.createdAt).toLocaleString()}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}

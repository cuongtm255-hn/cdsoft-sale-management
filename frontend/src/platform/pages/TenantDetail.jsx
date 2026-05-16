import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tag, Button, Space, Spin, Tabs, Form, Input, Descriptions, Empty } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
import { useApi } from '@shared/hooks/useApi';
import { tenantsApi } from '@api/platform.api';

const statusColor = { ACTIVE: 'green', INACTIVE: 'default', SUSPENDED: 'red' };
const provisionColor = { ACTIVE: 'green', PENDING: 'gold', PROVISIONING: 'blue', FAILED: 'red', SUSPENDED: 'default' };

export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [tenant, setTenant] = useState(null);
  const [loadingTenant, setLoadingTenant] = useState(true);

  const { execute: updateTenant, loading: saving } = useApi(
    (data) => tenantsApi.update(id, data),
    {
      successMessage: 'Tenant updated',
      onSuccess: (updated) => setTenant(updated),
    },
  );

  const { execute: changeStatus, loading: statusLoading } = useApi(
    (status) => tenantsApi.updateStatus(id, { status }),
    {
      successMessage: 'Status updated',
      onSuccess: (updated) => setTenant(updated),
    },
  );

  const load = useCallback(() => {
    setLoadingTenant(true);
    tenantsApi
      .get(id)
      .then((res) => {
        const t = res.data?.data ?? res.data;
        setTenant(t);
        form.setFieldsValue({
          tenantName: t.tenantName,
          companyName: t.companyName,
          contactName: t.contactName,
          contactEmail: t.contactEmail,
          contactPhone: t.contactPhone,
          address: t.address,
        });
      })
      .finally(() => setLoadingTenant(false));
  }, [id, form]);

  useEffect(() => { load(); }, [load]);

  if (loadingTenant) return <Spin style={{ display: 'block', marginTop: 80 }} />;
  if (!tenant) return null;

  const statusActions = (
    <Space>
      {tenant.status === 'ACTIVE' && (
        <Button danger loading={statusLoading} onClick={() => changeStatus('SUSPENDED')}>
          Suspend
        </Button>
      )}
      {tenant.status !== 'ACTIVE' && (
        <Button type="primary" loading={statusLoading} onClick={() => changeStatus('ACTIVE')}>
          Activate
        </Button>
      )}
    </Space>
  );

  const infoTab = (
    <Form form={form} layout="vertical" onFinish={updateTenant}>
      <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Tenant Code">
          <strong>{tenant.tenantCode}</strong>
        </Descriptions.Item>
        <Descriptions.Item label="Provisioning Status">
          <Tag color={provisionColor[tenant.provisioningStatus]}>{tenant.provisioningStatus}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="DB Host">{tenant.dbHost || '—'}</Descriptions.Item>
        <Descriptions.Item label="DB Name">{tenant.dbName || '—'}</Descriptions.Item>
        <Descriptions.Item label="Created">{new Date(tenant.createdAt).toLocaleString()}</Descriptions.Item>
      </Descriptions>

      <Form.Item name="tenantName" label="Tenant Name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="companyName" label="Company Name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="contactName" label="Contact Name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="contactEmail" label="Contact Email" rules={[{ required: true, type: 'email' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="contactPhone" label="Contact Phone">
        <Input />
      </Form.Item>
      <Form.Item name="address" label="Address">
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>
          Save Changes
        </Button>
      </Form.Item>
    </Form>
  );

  const provisionTab = (
    <Empty description="Provisioning log not yet available" style={{ marginTop: 40 }} />
  );

  const tabItems = [
    { key: 'info', label: 'Info', children: infoTab },
    { key: 'provision-log', label: 'Provision Log', children: provisionTab },
  ];

  return (
    <div>
      <PageHeader
        title={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              type="text"
              onClick={() => navigate('/platform/tenants')}
            />
            {tenant.tenantName}
            <Tag color={statusColor[tenant.status]}>{tenant.status}</Tag>
          </Space>
        }
        extra={statusActions}
      />
      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}

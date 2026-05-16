import { Form, Input, InputNumber, Button, Card, Row, Col, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@shared/components/PageHeader';
import { tenantsApi } from '@api/platform.api';

export default function TenantCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    try {
      await tenantsApi.create(values);
      message.success('Tenant provisioning started');
      navigate('/platform/tenants');
    } catch {
      message.error('Failed to create tenant');
    }
  };

  return (
    <div>
      <PageHeader title="Create Tenant" />
      <Card>
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="tenantCode" label="Tenant Code" rules={[{ required: true }]}>
                <Input placeholder="ACME_CORP" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tenantName" label="Tenant Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="companyName" label="Company Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactEmail" label="Contact Email" rules={[{ required: true, type: 'email' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactName" label="Contact Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactPhone" label="Contact Phone">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dbHost" label="DB Host" initialValue="localhost">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dbPort" label="DB Port" initialValue={3306}>
                <InputNumber style={{ width: '100%' }} min={1} max={65535} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button type="primary" htmlType="submit">Create & Provision</Button>
            <Button style={{ marginLeft: 8 }} onClick={() => navigate(-1)}>Cancel</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

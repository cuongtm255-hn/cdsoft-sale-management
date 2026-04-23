import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, BankOutlined } from '@ant-design/icons';
import { useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@auth/AuthContext';
import { tenantAuth } from '@api/tenant.api';

export default function TenantLoginPage() {
  const { tenantLogin, tenantUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();

  useEffect(() => {
    if (tenantUser) {
      navigate(location.state?.from?.pathname || '/tenant/dashboard', { replace: true });
    }
  }, [location.state, navigate, tenantUser]);

  const onFinish = async (values) => {
    try {
      const { data } = await tenantAuth.login(values);
      tenantLogin(data.data?.accessToken || data.accessToken);
      navigate(location.state?.from?.pathname || '/tenant/dashboard', { replace: true });
    } catch {
      message.error('Invalid credentials or tenant not found');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 400, boxShadow: '0 4px 20px rgba(0,0,0,.08)' }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 32 }}>
          Tenant Portal
        </Typography.Title>
        <Form form={form} onFinish={onFinish} layout="vertical" initialValues={{ tenantCode: searchParams.get('tenant') || '' }}>
          <Form.Item name="tenantCode" rules={[{ required: true }]}>
            <Input prefix={<BankOutlined />} placeholder="Tenant Code" size="large" />
          </Form.Item>
          <Form.Item name="email" rules={[{ required: true, type: 'email' }]}>
            <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block>Sign In</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

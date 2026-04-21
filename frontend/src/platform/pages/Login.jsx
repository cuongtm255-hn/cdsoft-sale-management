import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@auth/AuthContext';
import { platformAuth } from '@api/platform.api';

export default function PlatformLoginPage() {
  const { platformLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    try {
      const { data } = await platformAuth.login(values);
      platformLogin(data.data?.accessToken || data.accessToken);
      navigate(location.state?.from?.pathname || '/platform/dashboard', { replace: true });
    } catch {
      message.error('Invalid credentials');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 380, boxShadow: '0 4px 20px rgba(0,0,0,.08)' }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 32 }}>
          Platform Admin
        </Typography.Title>
        <Form form={form} onFinish={onFinish} layout="vertical">
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

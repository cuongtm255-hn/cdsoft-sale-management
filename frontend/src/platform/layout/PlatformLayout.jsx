import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  UserOutlined,
  AuditOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '@auth/AuthContext';
import LanguageToggle from '@shared/components/LanguageToggle';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/platform/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/platform/tenants', icon: <TeamOutlined />, label: 'Tenants' },
  { key: '/platform/users', icon: <UserOutlined />, label: 'Users' },
  { key: '/platform/audit-logs', icon: <AuditOutlined />, label: 'Audit Logs' },
];

export default function PlatformLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { platformLogout } = useAuth();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={220}>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Typography.Text strong style={{ color: '#fff', fontSize: 16 }}>
            Sales Platform
          </Typography.Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <LanguageToggle />
          <Button icon={<LogoutOutlined />} onClick={platformLogout}>Logout</Button>
        </Header>
        <Content style={{ margin: '24px', background: '#fff', padding: '24px', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

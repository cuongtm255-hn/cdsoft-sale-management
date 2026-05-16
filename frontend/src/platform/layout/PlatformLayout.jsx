import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography, Drawer, Grid } from 'antd';
import {
  DashboardOutlined, TeamOutlined, UserOutlined,
  AuditOutlined, LogoutOutlined, MenuOutlined,
} from '@ant-design/icons';
import { useAuth } from '@auth/AuthContext';
import LanguageToggle from '@shared/components/LanguageToggle';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

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
  const screens = useBreakpoint();
  const isMobile = screens.md === false;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleMenuClick = ({ key }) => {
    navigate(key);
    if (isMobile) setDrawerOpen(false);
  };

  const menu = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={handleMenuClick}
      style={{ border: 'none', flex: 1 }}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && (
        <Sider
          theme="dark"
          width={220}
          style={{
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflow: 'auto',
          }}
        >
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <Typography.Text strong style={{ color: '#fff', fontSize: 16 }}>
              Sales Platform
            </Typography.Text>
          </div>
          {menu}
        </Sider>
      )}

      {isMobile && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={260}
          styles={{ body: { padding: 0, background: '#001529', display: 'flex', flexDirection: 'column' } }}
          title={
            <Typography.Text strong style={{ color: '#fff', fontSize: 14 }}>
              Sales Platform
            </Typography.Text>
          }
          style={{ '--ant-drawer-header-bg': '#001529' }}
        >
          {menu}
        </Drawer>
      )}

      <Layout style={{ minWidth: 0 }}>
        <Header
          style={{
            background: '#fff',
            padding: isMobile ? '0 12px' : '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setDrawerOpen(true)}
                size="large"
              />
            )}
            {isMobile && (
              <Typography.Text strong style={{ fontSize: 14 }}>
                Sales Platform
              </Typography.Text>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LanguageToggle />
            <Button icon={<LogoutOutlined />} onClick={platformLogout} size={isMobile ? 'small' : 'middle'}>
              {!isMobile && 'Logout'}
            </Button>
          </div>
        </Header>

        <Content
          style={{
            margin: isMobile ? 8 : 24,
            padding: isMobile ? 12 : 24,
            background: '#f5f5f5',
            borderRadius: 8,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

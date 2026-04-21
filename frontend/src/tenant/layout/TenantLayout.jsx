import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography } from 'antd';
import {
  DashboardOutlined, ShoppingOutlined, AppstoreOutlined, UserOutlined,
  TruckOutlined, InboxOutlined, ShoppingCartOutlined, FileTextOutlined,
  DollarOutlined, TeamOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '@auth/AuthContext';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/tenant/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/tenant/products', icon: <ShoppingOutlined />, label: 'Products' },
  { key: '/tenant/categories', icon: <AppstoreOutlined />, label: 'Categories' },
  { key: '/tenant/customers', icon: <UserOutlined />, label: 'Customers' },
  { key: '/tenant/suppliers', icon: <TruckOutlined />, label: 'Suppliers' },
  { key: '/tenant/inventory', icon: <InboxOutlined />, label: 'Inventory' },
  { key: '/tenant/purchase-orders', icon: <ShoppingCartOutlined />, label: 'Purchase Orders' },
  { key: '/tenant/sales-orders', icon: <FileTextOutlined />, label: 'Sales Orders' },
  { key: '/tenant/payments', icon: <DollarOutlined />, label: 'Payments' },
  { key: '/tenant/users', icon: <TeamOutlined />, label: 'Users' },
];

export default function TenantLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenantUser, tenantLogout } = useAuth();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={220} style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <Typography.Text strong style={{ fontSize: 14 }}>
            {tenantUser?.tenantCode || 'Tenant Portal'}
          </Typography.Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ border: 'none' }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <Button icon={<LogoutOutlined />} onClick={tenantLogout}>Logout</Button>
        </Header>
        <Content style={{ margin: '24px', background: '#f5f5f5', padding: '24px', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

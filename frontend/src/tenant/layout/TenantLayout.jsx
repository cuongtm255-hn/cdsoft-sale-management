import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography } from 'antd';
import {
  DashboardOutlined, ShoppingOutlined, AppstoreOutlined, UserOutlined,
  TruckOutlined, InboxOutlined, ShoppingCartOutlined, FileTextOutlined,
  DollarOutlined, TeamOutlined, LogoutOutlined, SettingOutlined,
  HomeOutlined, GiftOutlined, StarOutlined, ImportOutlined, ExportOutlined,
  SwapOutlined, AuditOutlined,
} from '@ant-design/icons';
import { useAuth } from '@auth/AuthContext';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/tenant/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/tenant/products', icon: <ShoppingOutlined />, label: 'Sản phẩm' },
  { key: '/tenant/categories', icon: <AppstoreOutlined />, label: 'Danh mục' },
  { key: '/tenant/customers', icon: <UserOutlined />, label: 'Khách hàng' },
  { key: '/tenant/suppliers', icon: <TruckOutlined />, label: 'Nhà cung cấp' },
  {
    key: 'inventory-group',
    icon: <InboxOutlined />,
    label: 'Kho hàng',
    children: [
      { key: '/tenant/inventory',                  icon: <InboxOutlined />,   label: 'Tồn kho' },
      { key: '/tenant/inventory/receipts',         icon: <ImportOutlined />,  label: 'Phiếu nhập' },
      { key: '/tenant/inventory/issues/new',       icon: <ExportOutlined />,  label: 'Phiếu xuất' },
      { key: '/tenant/inventory/transfers',        icon: <SwapOutlined />,    label: 'Chuyển kho' },
      { key: '/tenant/inventory/stocktaking',      icon: <AuditOutlined />,   label: 'Kiểm kho' },
    ],
  },
  { key: '/tenant/purchase-orders', icon: <ShoppingCartOutlined />, label: 'Đơn mua' },
  { key: '/tenant/sales-orders', icon: <FileTextOutlined />, label: 'Đơn bán' },
  { key: '/tenant/payments', icon: <DollarOutlined />, label: 'Thanh toán' },
  { key: '/tenant/users', icon: <TeamOutlined />, label: 'Người dùng' },
  {
    key: 'settings-group',
    icon: <SettingOutlined />,
    label: 'Cài đặt',
    children: [
      { key: '/tenant/settings/warehouses', icon: <HomeOutlined />, label: 'Kho' },
      { key: '/tenant/settings/promotions', icon: <GiftOutlined />, label: 'Khuyến mãi' },
      { key: '/tenant/settings/loyalty', icon: <StarOutlined />, label: 'Loyalty' },
      { key: '/tenant/settings/finance', icon: <DollarOutlined />, label: 'Tài chính' },
      { key: '/tenant/settings/roles', icon: <TeamOutlined />, label: 'Phân quyền' },
    ],
  },
];

export default function TenantLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenantUser, tenantLogout } = useAuth();

  const openKeys = [
    ...(location.pathname.startsWith('/tenant/settings') ? ['settings-group'] : []),
    ...(location.pathname.startsWith('/tenant/inventory') ? ['inventory-group'] : []),
  ];

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
          defaultOpenKeys={openKeys}
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

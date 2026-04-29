import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography } from 'antd';
import {
  DashboardOutlined, ShoppingOutlined, AppstoreOutlined, UserOutlined,
  TruckOutlined, InboxOutlined, ShoppingCartOutlined, FileTextOutlined,
  DollarOutlined, TeamOutlined, LogoutOutlined, SettingOutlined,
  HomeOutlined, GiftOutlined, StarOutlined, ImportOutlined, ExportOutlined,
  SwapOutlined, AuditOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@auth/AuthContext';
import LanguageToggle from '@shared/components/LanguageToggle';

const { Header, Sider, Content } = Layout;

export default function TenantLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenantUser, tenantLogout } = useAuth();
  const { t } = useTranslation();

  const menuItems = [
    { key: '/tenant/dashboard', icon: <DashboardOutlined />, label: t('menu.dashboard') },
    { key: '/tenant/products', icon: <ShoppingOutlined />, label: t('menu.products') },
    { key: '/tenant/categories', icon: <AppstoreOutlined />, label: t('menu.categories') },
    { key: '/tenant/customers', icon: <UserOutlined />, label: t('menu.customers') },
    { key: '/tenant/suppliers', icon: <TruckOutlined />, label: t('menu.suppliers') },
    {
      key: 'inventory-group',
      icon: <InboxOutlined />,
      label: t('menu.inventory'),
      children: [
        { key: '/tenant/inventory',               icon: <InboxOutlined />,   label: t('menu.stockBalance') },
        { key: '/tenant/inventory/receipts',      icon: <ImportOutlined />,  label: t('menu.stockIn') },
        { key: '/tenant/inventory/issues',        icon: <ExportOutlined />,  label: t('menu.stockOut') },
        { key: '/tenant/inventory/transfers',     icon: <SwapOutlined />,    label: t('menu.transfers') },
        { key: '/tenant/inventory/stocktaking',   icon: <AuditOutlined />,   label: t('menu.stocktaking') },
      ],
    },
    { key: '/tenant/purchase-orders', icon: <ShoppingCartOutlined />, label: t('menu.purchaseOrders') },
    { key: '/tenant/sales-orders', icon: <FileTextOutlined />, label: t('menu.salesOrders') },
    { key: '/tenant/payments', icon: <DollarOutlined />, label: t('menu.payments') },
    { key: '/tenant/users', icon: <TeamOutlined />, label: t('menu.users') },
    {
      key: 'settings-group',
      icon: <SettingOutlined />,
      label: t('menu.settings'),
      children: [
        { key: '/tenant/settings/warehouses', icon: <HomeOutlined />, label: t('menu.warehouses') },
        { key: '/tenant/settings/promotions', icon: <GiftOutlined />, label: t('menu.promotions') },
        { key: '/tenant/settings/loyalty', icon: <StarOutlined />, label: t('menu.loyalty') },
        { key: '/tenant/settings/finance', icon: <DollarOutlined />, label: t('menu.finance') },
        { key: '/tenant/settings/roles', icon: <TeamOutlined />, label: t('menu.roles') },
      ],
    },
  ];

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
          <LanguageToggle />
          <Button icon={<LogoutOutlined />} onClick={tenantLogout}>{t('common.logout')}</Button>
        </Header>
        <Content style={{ margin: '24px', background: '#f5f5f5', padding: '24px', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography, Drawer, Grid } from 'antd';
import {
  DashboardOutlined, ShoppingOutlined, AppstoreOutlined, UserOutlined,
  TruckOutlined, InboxOutlined, ShoppingCartOutlined, FileTextOutlined,
  DollarOutlined, TeamOutlined, LogoutOutlined, SettingOutlined,
  HomeOutlined, GiftOutlined, StarOutlined, ImportOutlined, ExportOutlined,
  SwapOutlined, AuditOutlined, MenuOutlined, TagsOutlined, BarChartOutlined,
  BankOutlined, WalletOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@auth/AuthContext';
import LanguageToggle from '@shared/components/LanguageToggle';
import ChatbotWidget from '@tenant/components/Chatbot/ChatbotWidget';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

export default function TenantLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenantUser, tenantLogout } = useAuth();
  const { t } = useTranslation();
  const screens = useBreakpoint();
  const isMobile = screens.md === false;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const catalogPaths = ['/tenant/settings/warehouses', '/tenant/products', '/tenant/categories', '/tenant/customers', '/tenant/suppliers', '/tenant/cash-funds', '/tenant/bank-accounts'];
  const isCatalogPath = (path) => catalogPaths.some((p) => path === p || path.startsWith(p + '/'));
  const settingsPaths = ['/tenant/settings/promotions', '/tenant/settings/loyalty', '/tenant/settings/roles'];
  const isSettingsPath = (path) => settingsPaths.some((p) => path === p || path.startsWith(p + '/'));
  const isReportsPath = (path) => path.startsWith('/tenant/reports');

  const menuItems = [
    { key: '/tenant/dashboard', icon: <DashboardOutlined />, label: t('menu.dashboard') },
    {
      key: 'catalog-group',
      icon: <TagsOutlined />,
      label: t('menu.catalogGroup'),
      children: [
        { key: '/tenant/settings/warehouses', icon: <HomeOutlined />,     label: t('menu.warehouses') },
        { key: '/tenant/products',            icon: <ShoppingOutlined />, label: t('menu.products') },
        { key: '/tenant/categories',          icon: <AppstoreOutlined />, label: t('menu.categories') },
        { key: '/tenant/customers',    icon: <UserOutlined />,   label: t('menu.customers') },
        { key: '/tenant/suppliers',    icon: <TruckOutlined />,  label: t('menu.suppliers') },
        { key: '/tenant/cash-funds',   icon: <WalletOutlined />, label: t('menu.cashFunds') },
        { key: '/tenant/bank-accounts',icon: <BankOutlined />,   label: t('menu.bankAccounts') },
      ],
    },
    {
      key: 'inventory-group',
      icon: <InboxOutlined />,
      label: t('menu.inventory'),
      children: [
        { key: '/tenant/inventory',             icon: <InboxOutlined />,  label: t('menu.stockBalance') },
        { key: '/tenant/inventory/receipts',    icon: <ImportOutlined />, label: t('menu.stockIn') },
        { key: '/tenant/inventory/issues',      icon: <ExportOutlined />, label: t('menu.stockOut') },
        { key: '/tenant/inventory/transfers',   icon: <SwapOutlined />,   label: t('menu.transfers') },
        { key: '/tenant/inventory/stocktaking', icon: <AuditOutlined />,  label: t('menu.stocktaking') },
      ],
    },
    { key: '/tenant/purchase-orders', icon: <ShoppingCartOutlined />, label: t('menu.purchaseOrders') },
    { key: '/tenant/sales-orders',    icon: <FileTextOutlined />,     label: t('menu.salesOrders') },
    { key: '/tenant/finance',           icon: <DollarOutlined />,      label: t('menu.finance') },
    { key: '/tenant/payments',        icon: <DollarOutlined />,       label: t('menu.payments') },
    { key: '/tenant/users',           icon: <TeamOutlined />,         label: t('menu.users') },
    {
      key: 'reports-group',
      icon: <BarChartOutlined />,
      label: t('menu.reports'),
      children: [
        { key: '/tenant/reports/sales',             icon: <FileTextOutlined />,   label: t('menu.reportSales') },
        { key: '/tenant/reports/sales-by-customer', icon: <UserOutlined />,       label: t('menu.reportSalesByCustomer') },
        { key: '/tenant/reports/sales-by-product',  icon: <ShoppingOutlined />,   label: t('menu.reportSalesByProduct') },
        { key: '/tenant/reports/inventory',      icon: <InboxOutlined />,      label: t('menu.reportInventory') },
        { key: '/tenant/reports/finance',        icon: <DollarOutlined />,     label: t('menu.reportFinance') },
        { key: '/tenant/reports/debt-customer',  icon: <UserOutlined />,       label: t('menu.reportDebtCustomer') },
        { key: '/tenant/reports/debt-supplier',         icon: <TruckOutlined />,        label: t('menu.reportDebtSupplier') },
        { key: '/tenant/reports/purchase-by-supplier', icon: <ShoppingCartOutlined />,  label: t('menu.reportPurchase') },
        { key: '/tenant/reports/kpi',            icon: <BarChartOutlined />,   label: t('menu.reportKpi') },
        { key: '/tenant/reports/commissions',    icon: <TeamOutlined />,       label: t('menu.reportCommissions') },
      ],
    },
    {
      key: 'settings-group',
      icon: <SettingOutlined />,
      label: t('menu.settings'),
      children: [
        { key: '/tenant/settings/promotions', icon: <GiftOutlined />,   label: t('menu.promotions') },
        { key: '/tenant/settings/loyalty',    icon: <StarOutlined />,   label: t('menu.loyalty') },
        { key: '/tenant/settings/roles',      icon: <TeamOutlined />,   label: t('menu.roles') },
      ],
    },
  ];

  const [openKeys, setOpenKeys] = useState(() => {
    return [
      ...(isCatalogPath(location.pathname)                  ? ['catalog-group']   : []),
      ...(isSettingsPath(location.pathname)                  ? ['settings-group']  : []),
      ...(location.pathname.startsWith('/tenant/inventory') ? ['inventory-group'] : []),
      ...(isReportsPath(location.pathname)                  ? ['reports-group']   : []),
    ];
  });

  useEffect(() => {
    setOpenKeys((prev) => {
      const keys = [...prev];
      if (isCatalogPath(location.pathname) && !keys.includes('catalog-group')) {
        keys.push('catalog-group');
      }
      if (isSettingsPath(location.pathname) && !keys.includes('settings-group')) {
        keys.push('settings-group');
      }
      if (location.pathname.startsWith('/tenant/inventory') && !keys.includes('inventory-group')) {
        keys.push('inventory-group');
      }
      if (isReportsPath(location.pathname) && !keys.includes('reports-group')) {
        keys.push('reports-group');
      }
      return keys;
    });
  }, [location.pathname]);

  const handleOpenChange = (keys) => {
    setOpenKeys(keys);
  };

  // Find the best matching menu key for the current path (longest prefix wins)
  const allLeafKeys = menuItems.flatMap((item) =>
    item.children ? item.children.map((c) => c.key) : [item.key],
  );
  const selectedKey =
    allLeafKeys
      .filter((k) => location.pathname === k || location.pathname.startsWith(k + '/'))
      .sort((a, b) => b.length - a.length)[0] ?? location.pathname;

  const handleMenuClick = ({ key }) => {
    navigate(key);
    if (isMobile) setDrawerOpen(false);
  };

  const siderLogo = (
    <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
      <Typography.Text strong style={{ fontSize: 14 }}>
        {tenantUser?.tenantCode || 'Tenant Portal'}
      </Typography.Text>
    </div>
  );

  const menu = (
    <Menu
      mode="inline"
      selectedKeys={[selectedKey]}
      openKeys={openKeys}
      onOpenChange={handleOpenChange}
      items={menuItems}
      onClick={handleMenuClick}
      style={{ border: 'none', flex: 1 }}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop sidebar */}
      {!isMobile && (
        <Sider
          theme="light"
          width={220}
          style={{
            borderRight: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflow: 'auto',
          }}
        >
          {siderLogo}
          {menu}
        </Sider>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={260}
          styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
          title={
            <Typography.Text strong style={{ fontSize: 14 }}>
              {tenantUser?.tenantCode || 'Tenant Portal'}
            </Typography.Text>
          }
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
                {tenantUser?.tenantCode || 'Tenant'}
              </Typography.Text>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LanguageToggle />
            <Button icon={<LogoutOutlined />} onClick={tenantLogout} size={isMobile ? 'small' : 'middle'}>
              {!isMobile && t('common.logout')}
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
      <ChatbotWidget />
    </Layout>
  );
}

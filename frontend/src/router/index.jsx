import { Routes, Route, Navigate } from 'react-router-dom';
import { PlatformProtectedRoute, TenantProtectedRoute } from '@auth/ProtectedRoute';

import PlatformLayout from '@platform/layout/PlatformLayout';
import PlatformLoginPage from '@platform/pages/Login';
import PlatformDashboard from '@platform/pages/Dashboard';
import TenantList from '@platform/pages/TenantList';
import TenantCreate from '@platform/pages/TenantCreate';
import TenantDetail from '@platform/pages/TenantDetail';
import PlatformUsers from '@platform/pages/PlatformUsers';
import AuditLogs from '@platform/pages/AuditLogs';

import TenantLayout from '@tenant/layout/TenantLayout';
import TenantLoginPage from '@tenant/pages/Login';
import TenantDashboard from '@tenant/pages/Dashboard';
import Products from '@tenant/pages/Products';
import ProductForm from '@tenant/pages/ProductForm';
import Categories from '@tenant/pages/Categories';
import Customers from '@tenant/pages/Customers';
import CustomerDetail from '@tenant/pages/CustomerDetail';
import CustomerForm from '@tenant/pages/CustomerForm';
import Suppliers from '@tenant/pages/Suppliers';
import SupplierDetail from '@tenant/pages/SupplierDetail';
import SupplierForm from '@tenant/pages/SupplierForm';
import Inventory from '@tenant/pages/Inventory';
import StockReceiptsList from '@tenant/pages/StockReceiptsList';
import StockReceiptDetail from '@tenant/pages/StockReceiptDetail';
import StockInForm from '@tenant/pages/StockInForm';
import StockOutForm from '@tenant/pages/StockOutForm';
import StockIssuesList from '@tenant/pages/StockIssuesList';
import StockIssueDetail from '@tenant/pages/StockIssueDetail';
import AdjustmentForm from '@tenant/pages/AdjustmentForm';
import TransfersList from '@tenant/pages/TransfersList';
import TransferForm from '@tenant/pages/TransferForm';
import TransferDetail from '@tenant/pages/TransferDetail';
import TransferReceivePage from '@tenant/pages/TransferReceivePage';
import StocktakingPage from '@tenant/pages/StocktakingPage';
import PurchaseOrders from '@tenant/pages/PurchaseOrders';
import PurchaseOrderForm from '@tenant/pages/PurchaseOrderForm';
import PurchaseOrderDetail from '@tenant/pages/PurchaseOrderDetail';
import SalesOrders from '@tenant/pages/SalesOrders';
import SalesOrderForm from '@tenant/pages/SalesOrderForm';
import SalesOrderDetail from '@tenant/pages/SalesOrderDetail';
import SalesOrderReturn from '@tenant/pages/SalesOrderReturn';
import Promotions from '@tenant/pages/Promotions';
import LoyaltySettings from '@tenant/pages/LoyaltySettings';
import Payments from '@tenant/pages/Payments';
import InvoiceDetail from '@tenant/pages/InvoiceDetail';
import AccountsReceivable from '@tenant/pages/AccountsReceivable';
import AccountsPayable from '@tenant/pages/AccountsPayable';
import CashManagement from '@tenant/pages/CashManagement';
import TenantUsers from '@tenant/pages/Users';
import SettingsRoles from '@tenant/pages/settings/Roles';
import SettingsAuditLogs from '@tenant/pages/settings/AuditLogs';
import SettingsWarehouses from '@tenant/pages/settings/Warehouses';
import SettingsFinance from '@tenant/pages/settings/Finance';
import ReportSales from '@tenant/pages/ReportSales';
import ReportInventory from '@tenant/pages/ReportInventory';
import ReportFinance from '@tenant/pages/ReportFinance';
import ReportKPI from '@tenant/pages/ReportKPI';
import ReportCommissions from '@tenant/pages/ReportCommissions';
import ExpiryAlerts from '@tenant/pages/inventory/ExpiryAlerts';
import WarrantyLookup from '@tenant/pages/serial/WarrantyLookup';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/platform/login" replace />} />

      {/* Platform public */}
      <Route path="/platform/login" element={<PlatformLoginPage />} />

      {/* Platform protected */}
      <Route
        path="/platform"
        element={<PlatformProtectedRoute><PlatformLayout /></PlatformProtectedRoute>}
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PlatformDashboard />} />
        <Route path="tenants" element={<TenantList />} />
        <Route path="tenants/new" element={<TenantCreate />} />
        <Route path="tenants/:id" element={<TenantDetail />} />
        <Route path="users" element={<PlatformUsers />} />
        <Route path="audit-logs" element={<AuditLogs />} />
      </Route>

      {/* Tenant public */}
      <Route path="/tenant/login" element={<TenantLoginPage />} />

      {/* Tenant protected */}
      <Route
        path="/tenant"
        element={<TenantProtectedRoute><TenantLayout /></TenantProtectedRoute>}
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TenantDashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id/edit" element={<ProductForm />} />
        <Route path="categories" element={<Categories />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/new" element={<CustomerForm />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="customers/:id/edit" element={<CustomerForm />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="suppliers/new" element={<SupplierForm />} />
        <Route path="suppliers/:id" element={<SupplierDetail />} />
        <Route path="suppliers/:id/edit" element={<SupplierForm />} />

        {/* ── Inventory (Module 6) ── */}
        <Route path="inventory" element={<Inventory />} />
        <Route path="inventory/receipts" element={<StockReceiptsList />} />
        <Route path="inventory/receipts/new" element={<StockInForm />} />
        <Route path="inventory/receipts/:id" element={<StockReceiptDetail />} />
        <Route path="inventory/receipts/:id/edit" element={<StockInForm />} />
        <Route path="inventory/issues" element={<StockIssuesList />} />
        <Route path="inventory/issues/new" element={<StockOutForm />} />
        <Route path="inventory/issues/:id" element={<StockIssueDetail />} />
        <Route path="inventory/issues/:id/edit" element={<StockOutForm />} />
        <Route path="inventory/adjustments/new" element={<AdjustmentForm />} />
        <Route path="inventory/transfers" element={<TransfersList />} />
        <Route path="inventory/transfers/new" element={<TransferForm />} />
        <Route path="inventory/transfers/:id" element={<TransferDetail />} />
        <Route path="inventory/transfers/:id/receive" element={<TransferReceivePage />} />
        <Route path="inventory/stocktaking" element={<StocktakingPage />} />

        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="purchase-orders/new" element={<PurchaseOrderForm />} />
        <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
        <Route path="sales-orders" element={<SalesOrders />} />
        <Route path="sales-orders/new" element={<SalesOrderForm />} />
        <Route path="sales-orders/:id" element={<SalesOrderDetail />} />
        <Route path="sales-orders/:id/return" element={<SalesOrderReturn />} />
        <Route path="settings/promotions" element={<Promotions />} />
        <Route path="settings/loyalty" element={<LoyaltySettings />} />
        <Route path="payments" element={<Payments />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="finance/ar" element={<AccountsReceivable />} />
        <Route path="finance/ap" element={<AccountsPayable />} />
        <Route path="finance/cash" element={<CashManagement />} />
        <Route path="users" element={<TenantUsers />} />
        <Route path="settings/roles"      element={<SettingsRoles />} />
        <Route path="settings/audit-logs" element={<SettingsAuditLogs />} />
        <Route path="settings/warehouses" element={<SettingsWarehouses />} />
        <Route path="settings/finance"    element={<SettingsFinance />} />
        <Route path="reports/sales"       element={<ReportSales />} />
        <Route path="reports/inventory"   element={<ReportInventory />} />
        <Route path="reports/finance"     element={<ReportFinance />} />
        <Route path="reports/kpi"         element={<ReportKPI />} />
        <Route path="reports/commissions" element={<ReportCommissions />} />
        <Route path="inventory/expiry-alerts" element={<ExpiryAlerts />} />
        <Route path="serial/warranty-lookup"  element={<WarrantyLookup />} />
      </Route>
    </Routes>
  );
}


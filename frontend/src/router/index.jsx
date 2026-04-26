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
import Inventory from '@tenant/pages/Inventory';
import PurchaseOrders from '@tenant/pages/PurchaseOrders';
import SalesOrders from '@tenant/pages/SalesOrders';
import Payments from '@tenant/pages/Payments';
import TenantUsers from '@tenant/pages/Users';

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
        <Route path="inventory" element={<Inventory />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="sales-orders" element={<SalesOrders />} />
        <Route path="payments" element={<Payments />} />
        <Route path="users" element={<TenantUsers />} />
      </Route>
    </Routes>
  );
}

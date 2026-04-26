import { tenantApi } from './axios';

export const tenantAuth = {
  login: (data) => tenantApi.post('/tenant/auth/login', data),
  changePassword: (data) => tenantApi.patch('/tenant/auth/change-password', data),
};

export const usersApi = {
  list: (params) => tenantApi.get('/tenant/users', { params }),
  create: (data) => tenantApi.post('/tenant/users', data),
  update: (id, data) => tenantApi.put(`/tenant/users/${id}`, data),
  updateStatus: (id, data) => tenantApi.patch(`/tenant/users/${id}/status`, data),
  changePassword: (data) => tenantApi.patch('/tenant/auth/change-password', data),
};

export const productsApi = {
  list: (params) => tenantApi.get('/tenant/products', { params }),
  get: (id) => tenantApi.get(`/tenant/products/${id}`),
  create: (data) => tenantApi.post('/tenant/products', data),
  update: (id, data) => tenantApi.put(`/tenant/products/${id}`, data),
  toggleActive: (id) => tenantApi.patch(`/tenant/products/${id}/toggle-active`),
  remove: (id) => tenantApi.delete(`/tenant/products/${id}`),
};

export const categoriesApi = {
  tree: () => tenantApi.get('/tenant/categories'),
  flat: () => tenantApi.get('/tenant/categories/flat'),
  create: (data) => tenantApi.post('/tenant/categories', data),
  update: (id, data) => tenantApi.put(`/tenant/categories/${id}`, data),
  remove: (id) => tenantApi.delete(`/tenant/categories/${id}`),
};

export const customersApi = {
  list: (params) => tenantApi.get('/tenant/customers', { params }),
  get: (id) => tenantApi.get(`/tenant/customers/${id}`),
  create: (data) => tenantApi.post('/tenant/customers', data),
  update: (id, data) => tenantApi.put(`/tenant/customers/${id}`, data),
  transactions: (id, params) => tenantApi.get(`/tenant/customers/${id}/transactions`, { params }),
};

export const suppliersApi = {
  list: (params) => tenantApi.get('/tenant/suppliers', { params }),
  get: (id) => tenantApi.get(`/tenant/suppliers/${id}`),
  create: (data) => tenantApi.post('/tenant/suppliers', data),
  update: (id, data) => tenantApi.put(`/tenant/suppliers/${id}`, data),
  remove: (id) => tenantApi.delete(`/tenant/suppliers/${id}`),
};

export const inventoryApi = {
  transactions: (params) => tenantApi.get('/tenant/inventory/transactions', { params }),
  stockIn: (data) => tenantApi.post('/tenant/inventory/stock-in', data),
  stockOut: (data) => tenantApi.post('/tenant/inventory/stock-out', data),
  adjust: (data) => tenantApi.post('/tenant/inventory/adjust', data),
};

export const purchaseOrdersApi = {
  list: (params) => tenantApi.get('/tenant/purchase-orders', { params }),
  create: (data) => tenantApi.post('/tenant/purchase-orders', data),
  confirm: (id) => tenantApi.patch(`/tenant/purchase-orders/${id}/confirm`),
  receive: (id) => tenantApi.patch(`/tenant/purchase-orders/${id}/receive`),
};

export const salesOrdersApi = {
  list: (params) => tenantApi.get('/tenant/sales-orders', { params }),
  create: (data) => tenantApi.post('/tenant/sales-orders', data),
  confirm: (id) => tenantApi.patch(`/tenant/sales-orders/${id}/confirm`),
  ship: (id) => tenantApi.patch(`/tenant/sales-orders/${id}/ship`),
  complete: (id) => tenantApi.patch(`/tenant/sales-orders/${id}/complete`),
};

export const paymentsApi = {
  list: (params) => tenantApi.get('/tenant/invoices', { params }),
  record: (data) => tenantApi.post('/tenant/payments', data),
};

export const dashboardApi = {
  stats: () => tenantApi.get('/tenant/dashboard/stats'),
};

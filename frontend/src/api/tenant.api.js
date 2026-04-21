import { tenantApi } from './axios';

export const tenantAuth = {
  login: (data) => tenantApi.post('/tenant/auth/login', data),
};

export const productsApi = {
  list: (params) => tenantApi.get('/tenant/products', { params }),
  get: (id) => tenantApi.get(`/tenant/products/${id}`),
  create: (data) => tenantApi.post('/tenant/products', data),
  update: (id, data) => tenantApi.put(`/tenant/products/${id}`, data),
  remove: (id) => tenantApi.delete(`/tenant/products/${id}`),
};

export const categoriesApi = {
  list: () => tenantApi.get('/tenant/categories'),
  create: (data) => tenantApi.post('/tenant/categories', data),
};

export const customersApi = {
  list: (params) => tenantApi.get('/tenant/customers', { params }),
  create: (data) => tenantApi.post('/tenant/customers', data),
  update: (id, data) => tenantApi.put(`/tenant/customers/${id}`, data),
};

export const suppliersApi = {
  list: (params) => tenantApi.get('/tenant/suppliers', { params }),
  create: (data) => tenantApi.post('/tenant/suppliers', data),
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

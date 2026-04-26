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

export const warehousesApi = {
  list: () => tenantApi.get('/tenant/warehouses'),
  create: (data) => tenantApi.post('/tenant/warehouses', data),
  update: (id, data) => tenantApi.put(`/tenant/warehouses/${id}`, data),
};

export const inventoryApi = {
  // Inventory balance / overview
  transactions: (params) => tenantApi.get('/tenant/inventory/transactions', { params }),
  productStock: (productId, warehouseId) =>
    tenantApi.get('/tenant/inventory/product-stock', { params: { productId, warehouseId } }),
  productTransactions: (productId, warehouseId) =>
    tenantApi.get('/tenant/inventory/product-transactions', { params: { productId, warehouseId } }),

  // Stock receipts (nhập kho)
  getReceipts: (params) => tenantApi.get('/tenant/inventory/stock-receipts', { params }),
  getReceipt: (id) => tenantApi.get(`/tenant/inventory/stock-receipts/${id}`),
  stockIn: (data) => tenantApi.post('/tenant/inventory/stock-in', data),
  confirmReceipt: (id, data) => tenantApi.patch(`/tenant/inventory/stock-receipts/${id}/confirm`, data),
  cancelReceipt: (id) => tenantApi.patch(`/tenant/inventory/stock-receipts/${id}/cancel`),

  // Stock out (xuất kho)
  stockOut: (data) => tenantApi.post('/tenant/inventory/stock-out', data),

  // Stock adjustment (điều chỉnh kho)
  adjust: (data) => tenantApi.post('/tenant/inventory/adjust', data),

  // Stock transfers (điều chuyển kho)
  getTransfers: (params) => tenantApi.get('/tenant/inventory/transfers', { params }),
  getTransfer: (id) => tenantApi.get(`/tenant/inventory/transfers/${id}`),
  createTransfer: (data) => tenantApi.post('/tenant/inventory/transfers', data),
  dispatchTransfer: (id) => tenantApi.patch(`/tenant/inventory/transfers/${id}/dispatch`),
  receiveTransfer: (id, data) => tenantApi.patch(`/tenant/inventory/transfers/${id}/receive`, data),

  // Stocktaking (kiểm kê kho)
  getStocktakings: (params) => tenantApi.get('/tenant/inventory/stocktaking', { params }),
  getStocktaking: (id) => tenantApi.get(`/tenant/inventory/stocktaking/${id}`),
  createStocktaking: (data) => tenantApi.post('/tenant/inventory/stocktaking', data),
  completeStocktaking: (id, data) => tenantApi.patch(`/tenant/inventory/stocktaking/${id}/complete`, data),
};

export const purchaseOrdersApi = {
  list: (params) => tenantApi.get('/tenant/purchase-orders', { params }),
  get: (id) => tenantApi.get(`/tenant/purchase-orders/${id}`),
  create: (data) => tenantApi.post('/tenant/purchase-orders', data),
  confirm: (id) => tenantApi.patch(`/tenant/purchase-orders/${id}/confirm`),
  receive: (id) => tenantApi.patch(`/tenant/purchase-orders/${id}/receive`),
  cancel: (id, data) => tenantApi.patch(`/tenant/purchase-orders/${id}/cancel`, data),
};

export const salesOrdersApi = {
  list: (params) => tenantApi.get('/tenant/sales-orders', { params }),
  get: (id) => tenantApi.get(`/tenant/sales-orders/${id}`),
  create: (data) => tenantApi.post('/tenant/sales-orders', data),
  confirm: (id) => tenantApi.patch(`/tenant/sales-orders/${id}/confirm`),
  ship: (id) => tenantApi.patch(`/tenant/sales-orders/${id}/ship`),
  complete: (id) => tenantApi.patch(`/tenant/sales-orders/${id}/complete`),
  cancel: (id, data) => tenantApi.patch(`/tenant/sales-orders/${id}/cancel`, data),
};

export const returnsApi = {
  create: (data) => tenantApi.post('/tenant/returns', data),
};

export const vouchersApi = {
  list: () => tenantApi.get('/tenant/vouchers'),
  create: (data) => tenantApi.post('/tenant/vouchers', data),
  validate: (data) => tenantApi.post('/tenant/vouchers/validate', data),
};

export const promotionsApi = {
  list: (params) => tenantApi.get('/tenant/promotions', { params }),
  create: (data) => tenantApi.post('/tenant/promotions', data),
  update: (id, data) => tenantApi.patch(`/tenant/promotions/${id}`, data),
};

export const paymentsApi = {
  list: (params) => tenantApi.get('/tenant/invoices', { params }),
  record: (data) => tenantApi.post('/tenant/payments', data),
};

export const dashboardApi = {
  stats: () => tenantApi.get('/tenant/dashboard/stats'),
};

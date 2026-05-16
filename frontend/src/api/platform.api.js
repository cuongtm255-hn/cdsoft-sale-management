import { platformApi } from './axios';

export const platformAuth = {
  login: (data) => platformApi.post('/platform/auth/login', data),
};

export const tenantsApi = {
  list: (params) => platformApi.get('/platform/tenants', { params }),
  get: (id) => platformApi.get(`/platform/tenants/${id}`),
  create: (data) => platformApi.post('/platform/tenants', data),
  update: (id, data) => platformApi.put(`/platform/tenants/${id}`, data),
  updateStatus: (id, data) => platformApi.patch(`/platform/tenants/${id}/status`, data),
  reprovision: (id) => platformApi.post(`/platform/tenants/${id}/provision`),
  resetAdmin: (id) => platformApi.post(`/platform/tenants/${id}/reset-admin`),
  provisioningLog: (id) => platformApi.get(`/platform/tenants/${id}/provisioning-log`),
};

export const platformUsersApi = {
  list: (params) => platformApi.get('/platform/users', { params }),
  create: (data) => platformApi.post('/platform/users', data),
  update: (id, data) => platformApi.put(`/platform/users/${id}`, data),
  toggleLock: (id) => platformApi.patch(`/platform/users/${id}/lock`),
};

export const auditLogsApi = {
  list: (params) => platformApi.get('/platform/audit-logs', { params }),
};

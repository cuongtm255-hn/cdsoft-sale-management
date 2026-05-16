import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const PLATFORM_TOKEN_KEY = 'platform_token';
const TENANT_TOKEN_KEY = 'tenant_token';

export const platformApi = axios.create({ baseURL: `${BASE_URL}/api` });
export const tenantApi = axios.create({ baseURL: `${BASE_URL}/api` });

function attachToken(instance, tokenKey, loginPath) {
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem(tokenKey);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem(tokenKey);
        window.location.href = loginPath;
      }
      return Promise.reject(error);
    },
  );
}

attachToken(platformApi, PLATFORM_TOKEN_KEY, '/platform/login');
attachToken(tenantApi, TENANT_TOKEN_KEY, '/tenant/login');

export { PLATFORM_TOKEN_KEY, TENANT_TOKEN_KEY };

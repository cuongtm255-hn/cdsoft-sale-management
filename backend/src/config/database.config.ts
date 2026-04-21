import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'sp_admin',
  password: process.env.DB_PASSWORD,
  name: process.env.DB_NAME || 'salesplatform_system',
  tenantDbHost: process.env.TENANT_DB_HOST || process.env.DB_HOST || 'localhost',
  tenantDbPort: parseInt(process.env.TENANT_DB_PORT || '3306', 10),
  tenantDbUsername: process.env.TENANT_DB_USERNAME || 'sp_admin',
  tenantDbPassword: process.env.TENANT_DB_PASSWORD || process.env.DB_PASSWORD,
  dsCacheTtlMinutes: parseInt(process.env.DS_CACHE_TTL_MINUTES || '60', 10),
}));

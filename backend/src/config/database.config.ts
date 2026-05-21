import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'sp_admin',
  password: process.env.DB_PASSWORD,
  name: process.env.DB_NAME || 'salesplatform_system',
  ssl: process.env.DB_SSL === 'true',
  tenantDbHost: process.env.TENANT_DB_HOST || process.env.DB_HOST || 'localhost',
  tenantDbPort: parseInt(process.env.TENANT_DB_PORT || '3306', 10),
  tenantDbUsername: process.env.TENANT_DB_USERNAME || 'sp_admin',
  tenantDbPassword: process.env.TENANT_DB_PASSWORD || process.env.DB_PASSWORD,
  tenantDbSsl: process.env.TENANT_DB_SSL === 'true' || process.env.DB_SSL === 'true',
  dsCacheTtlMinutes: parseInt(process.env.DS_CACHE_TTL_MINUTES || '60', 10),
  passwordKey: process.env.TENANT_DB_PASSWORD_KEY || '',
}));

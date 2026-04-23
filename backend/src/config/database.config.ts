import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'sp_admin',
  password: process.env.DB_PASSWORD,
  name: process.env.DB_NAME || 'salesplatform_system',
  autoCreateDatabase: (process.env.DB_AUTO_CREATE_DATABASE || 'true') === 'true',
  autoSyncSchema: (process.env.DB_AUTO_SYNC_SCHEMA || 'true') === 'true',
  autoRunMigrations: (process.env.DB_AUTO_RUN_MIGRATIONS || 'true') === 'true',
  tenantDbHost: process.env.TENANT_DB_HOST || process.env.DB_HOST || 'localhost',
  tenantDbPort: parseInt(process.env.TENANT_DB_PORT || '3306', 10),
  tenantDbUsername: process.env.TENANT_DB_USERNAME || 'sp_admin',
  tenantDbPassword: process.env.TENANT_DB_PASSWORD || process.env.DB_PASSWORD,
  tenantAutoCreateDatabase:
    (process.env.TENANT_DB_AUTO_CREATE_DATABASE || process.env.DB_AUTO_CREATE_DATABASE || 'true') ===
    'true',
  tenantAutoSyncSchema:
    (process.env.TENANT_DB_AUTO_SYNC_SCHEMA || process.env.DB_AUTO_SYNC_SCHEMA || 'true') === 'true',
  tenantAutoRunMigrations:
    (process.env.TENANT_DB_AUTO_RUN_MIGRATIONS || process.env.DB_AUTO_RUN_MIGRATIONS || 'true') ===
    'true',
  seed: {
    superAdminUsername: process.env.SEED_SUPER_ADMIN_USERNAME || 'superadmin',
    superAdminEmail: process.env.SEED_SUPER_ADMIN_EMAIL || 'superadmin@platform.com',
    superAdminPassword: process.env.SEED_SUPER_ADMIN_PASSWORD || 'Admin@12345!',
  },
  dsCacheTtlMinutes: parseInt(process.env.DS_CACHE_TTL_MINUTES || '60', 10),
}));

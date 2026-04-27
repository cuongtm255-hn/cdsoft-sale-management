import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlatformSnakeCase1745800000000 implements MigrationInterface {
  name = 'PlatformSnakeCase1745800000000';

  private async safeRename(qr: QueryRunner, table: string, from: string, to: string) {
    const [{ cnt }] = await qr.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
      [table, from],
    );
    if (Number(cnt) > 0) {
      await qr.query(`ALTER TABLE \`${table}\` RENAME COLUMN \`${from}\` TO \`${to}\``);
    }
  }

  async up(qr: QueryRunner): Promise<void> {
    // platform_users
    await this.safeRename(qr, 'platform_users', 'passwordHash',  'password_hash');
    await this.safeRename(qr, 'platform_users', 'lastLoginAt',   'last_login_at');
    await this.safeRename(qr, 'platform_users', 'createdAt',     'created_at');
    await this.safeRename(qr, 'platform_users', 'updatedAt',     'updated_at');
    await this.safeRename(qr, 'platform_users', 'deletedAt',     'deleted_at');

    // tenants
    await this.safeRename(qr, 'tenants', 'tenantCode',            'tenant_code');
    await this.safeRename(qr, 'tenants', 'tenantName',            'tenant_name');
    await this.safeRename(qr, 'tenants', 'companyName',           'company_name');
    await this.safeRename(qr, 'tenants', 'contactName',           'contact_name');
    await this.safeRename(qr, 'tenants', 'contactEmail',          'contact_email');
    await this.safeRename(qr, 'tenants', 'contactPhone',          'contact_phone');
    await this.safeRename(qr, 'tenants', 'provisioningStatus',    'provisioning_status');
    await this.safeRename(qr, 'tenants', 'dbHost',                'db_host');
    await this.safeRename(qr, 'tenants', 'dbPort',                'db_port');
    await this.safeRename(qr, 'tenants', 'dbName',                'db_name');
    await this.safeRename(qr, 'tenants', 'dbUsername',            'db_username');
    await this.safeRename(qr, 'tenants', 'dbPasswordEncrypted',   'db_password_encrypted');
    await this.safeRename(qr, 'tenants', 'createdBy',             'created_by');
    await this.safeRename(qr, 'tenants', 'createdAt',             'created_at');
    await this.safeRename(qr, 'tenants', 'updatedAt',             'updated_at');
    await this.safeRename(qr, 'tenants', 'deletedAt',             'deleted_at');
  }

  async down(qr: QueryRunner): Promise<void> {
    // platform_users
    await this.safeRename(qr, 'platform_users', 'password_hash',  'passwordHash');
    await this.safeRename(qr, 'platform_users', 'last_login_at',  'lastLoginAt');
    await this.safeRename(qr, 'platform_users', 'created_at',     'createdAt');
    await this.safeRename(qr, 'platform_users', 'updated_at',     'updatedAt');
    await this.safeRename(qr, 'platform_users', 'deleted_at',     'deletedAt');

    // tenants
    await this.safeRename(qr, 'tenants', 'tenant_code',            'tenantCode');
    await this.safeRename(qr, 'tenants', 'tenant_name',            'tenantName');
    await this.safeRename(qr, 'tenants', 'company_name',           'companyName');
    await this.safeRename(qr, 'tenants', 'contact_name',           'contactName');
    await this.safeRename(qr, 'tenants', 'contact_email',          'contactEmail');
    await this.safeRename(qr, 'tenants', 'contact_phone',          'contactPhone');
    await this.safeRename(qr, 'tenants', 'provisioning_status',    'provisioningStatus');
    await this.safeRename(qr, 'tenants', 'db_host',                'dbHost');
    await this.safeRename(qr, 'tenants', 'db_port',                'dbPort');
    await this.safeRename(qr, 'tenants', 'db_name',                'dbName');
    await this.safeRename(qr, 'tenants', 'db_username',            'dbUsername');
    await this.safeRename(qr, 'tenants', 'db_password_encrypted',  'dbPasswordEncrypted');
    await this.safeRename(qr, 'tenants', 'created_by',             'createdBy');
    await this.safeRename(qr, 'tenants', 'created_at',             'createdAt');
    await this.safeRename(qr, 'tenants', 'updated_at',             'updatedAt');
    await this.safeRename(qr, 'tenants', 'deleted_at',             'deletedAt');
  }
}

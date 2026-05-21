import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { AddStocktakingAndInventoryLots1745700000000 } from '../database/tenant-migrations/1745700000000-AddStocktakingAndInventoryLots';
import { TenantSnakeCase1745800000001 } from '../database/tenant-migrations/1745800000001-TenantSnakeCase';
import { CreateMissingTables1745800000002 } from '../database/tenant-migrations/1745800000002-CreateMissingTables';
import { CreateStockIssues1745800000003 } from '../database/tenant-migrations/1745800000003-CreateStockIssues';
import { AddPaymentCashFundId1745800000004 } from '../database/tenant-migrations/1745800000004-AddPaymentCashFundId';
import { CreatePurchaseInvoices1745800000005 } from '../database/tenant-migrations/1745800000005-CreatePurchaseInvoices';
import { AddStockReceiptPurchaseOrderId1745800000006 } from '../database/tenant-migrations/1745800000006-AddStockReceiptPurchaseOrderId';
import { RedisCacheService } from '../common/cache/redis-cache.service';
import { TENANT_ENTITIES } from './tenant-entities';

export interface TenantDbConfig {
  tenantCode: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

const TENANT_CONFIG_TTL = 600; // 10 minutes

@Injectable()
export class TenantDataSourceManager {
  private readonly logger = new Logger(TenantDataSourceManager.name);
  private readonly registry = new Map<string, DataSource>();

  constructor(
    private readonly config: ConfigService,
    @InjectDataSource() private readonly platformDs: DataSource,
    private readonly cache: RedisCacheService,
  ) {}

  async getDataSource(tenantCode: string): Promise<DataSource> {
    if (this.registry.has(tenantCode)) {
      return this.registry.get(tenantCode)!;
    }
    return this.createAndCache(tenantCode);
  }

  private async createAndCache(tenantCode: string): Promise<DataSource> {
    const dbConfig = await this.resolveTenantDbConfig(tenantCode);
    const useSsl = this.config.get<boolean>('database.tenantDbSsl');
    const options: DataSourceOptions = {
      type: 'mysql',
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      entities: [...TENANT_ENTITIES],
      migrations: [
        AddStocktakingAndInventoryLots1745700000000,
        TenantSnakeCase1745800000001,
        CreateMissingTables1745800000002,
        CreateStockIssues1745800000003,
        AddPaymentCashFundId1745800000004,
        CreatePurchaseInvoices1745800000005,
        AddStockReceiptPurchaseOrderId1745800000006,
      ],
      migrationsRun: true,
      migrationsTableName: 'typeorm_migrations',
      synchronize: false,
      namingStrategy: new SnakeNamingStrategy(),
    };

    const ds = new DataSource(options);
    await ds.initialize();
    this.registry.set(tenantCode, ds);
    this.logger.log(`DataSource initialized for tenant: ${tenantCode}`);
    return ds;
  }

  async evict(tenantCode: string): Promise<void> {
    const ds = this.registry.get(tenantCode);
    if (ds?.isInitialized) await ds.destroy();
    this.registry.delete(tenantCode);
    await this.cache.del(`tenant:config:${tenantCode}`);
  }

  // Call this after updating tenant DB credentials in the tenants table
  async invalidateTenantConfig(tenantCode: string): Promise<void> {
    await this.evict(tenantCode);
  }

  private getEncryptionKey(): Buffer {
    const keyHex = this.config.get<string>('database.passwordKey');
    if (keyHex && keyHex.length === 64) {
      try {
        return Buffer.from(keyHex, 'hex');
      } catch (err) {
        this.logger.error('Failed to parse TENANT_DB_PASSWORD_KEY as hex, falling back to hashed key');
      }
    }
    const fallbackSeed = keyHex || 'default-salesplatform-tenant-encryption-seed';
    return crypto.createHash('sha256').update(fallbackSeed).digest();
  }

  private encrypt(plainText: string): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decrypt(cipherText: string): string {
    const key = this.getEncryptionKey();
    const [ivHex, encryptedText] = cipherText.split(':');
    if (!ivHex || !encryptedText) {
      throw new Error('Invalid cipher text format');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private async resolveTenantDbConfig(tenantCode: string): Promise<TenantDbConfig> {
    const cacheKey = `tenant:config:${tenantCode}`;

    const cachedEncrypted = await this.cache.get<string>(cacheKey);
    if (cachedEncrypted) {
      try {
        const decrypted = this.decrypt(cachedEncrypted);
        const cached = JSON.parse(decrypted) as TenantDbConfig;
        this.logger.debug(`Tenant config cache HIT: ${tenantCode}`);
        return cached;
      } catch (err: any) {
        this.logger.warn(`Failed to decrypt cached tenant config for ${tenantCode}: ${err.message}`);
      }
    }

    const [tenant] = await this.platformDs.query(
      'SELECT db_host, db_port, db_name, db_username, status FROM tenants WHERE tenant_code = ? AND status = ?',
      [tenantCode, 'ACTIVE'],
    );

    if (!tenant) {
      throw new NotFoundException(`Tenant config not found for code: ${tenantCode} or tenant is inactive`);
    }
    if (!tenant.db_name) {
      throw new NotFoundException(`Tenant ${tenantCode} has not been provisioned properly yet`);
    }

    const dbConfig: TenantDbConfig = {
      tenantCode,
      host: tenant.db_host || this.config.get<string>('database.host') || 'localhost',
      port: tenant.db_port || this.config.get<number>('database.port') || 3306,
      username: tenant.db_username || this.config.get<string>('database.username') || 'root',
      password: this.config.get<string>('database.password') || '',
      database: tenant.db_name,
    };

    try {
      const serialized = JSON.stringify(dbConfig);
      const encrypted = this.encrypt(serialized);
      await this.cache.set(cacheKey, encrypted, TENANT_CONFIG_TTL);
    } catch (err: any) {
      this.logger.error(`Failed to cache tenant config for ${tenantCode}: ${err.message}`);
    }

    return dbConfig;
  }
}

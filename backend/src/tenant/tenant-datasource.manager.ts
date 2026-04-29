import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { TenantSnakeCase1745800000001 } from '../database/tenant-migrations/1745800000001-TenantSnakeCase';
import { CreateMissingTables1745800000002 } from '../database/tenant-migrations/1745800000002-CreateMissingTables';
import { CreateStockIssues1745800000003 } from '../database/tenant-migrations/1745800000003-CreateStockIssues';

export interface TenantDbConfig {
  tenantCode: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

@Injectable()
export class TenantDataSourceManager {
  private readonly logger = new Logger(TenantDataSourceManager.name);
  private readonly registry = new Map<string, DataSource>();

  constructor(
    private readonly config: ConfigService,
    @InjectDataSource() private readonly platformDs: DataSource,
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
      entities: [__dirname + '/../tenant-module/**/*.entity{.ts,.js}'],
      migrations: [TenantSnakeCase1745800000001, CreateMissingTables1745800000002, CreateStockIssues1745800000003],
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
  }

  private async resolveTenantDbConfig(tenantCode: string): Promise<TenantDbConfig> {
    const [tenant] = await this.platformDs.query(
      'SELECT db_host, db_port, db_name, db_username, status FROM tenants WHERE tenant_code = ? AND status = "ACTIVE"',
      [tenantCode]
    );

    if (!tenant) {
      throw new NotFoundException(`Tenant config not found for code: ${tenantCode} or tenant is inactive`);
    }

    if (!tenant.db_name) {
      throw new NotFoundException(`Tenant ${tenantCode} has not been provisioned properly yet`);
    }

    return {
      tenantCode,
      host: tenant.db_host || this.config.get<string>('database.host') || 'localhost',
      port: tenant.db_port || this.config.get<number>('database.port') || 3306,
      username: tenant.db_username || this.config.get<string>('database.username') || 'root',
      password: this.config.get<string>('database.password') || '',
      database: tenant.db_name,
    };
  }
}

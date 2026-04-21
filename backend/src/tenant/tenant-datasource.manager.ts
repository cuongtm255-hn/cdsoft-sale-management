import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

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

  constructor(private readonly config: ConfigService) {}

  async getDataSource(tenantCode: string): Promise<DataSource> {
    if (this.registry.has(tenantCode)) {
      return this.registry.get(tenantCode)!;
    }
    return this.createAndCache(tenantCode);
  }

  private async createAndCache(tenantCode: string): Promise<DataSource> {
    const dbConfig = await this.resolveTenantDbConfig(tenantCode);
    const options: DataSourceOptions = {
      type: 'mysql',
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      entities: [__dirname + '/../tenant-module/**/*.entity{.ts,.js}'],
      synchronize: false,
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

  private async resolveTenantDbConfig(_tenantCode: string): Promise<TenantDbConfig> {
    // Resolved by querying system DB — injected via TenantMetadataService
    throw new NotFoundException(`Tenant config not found`);
  }
}

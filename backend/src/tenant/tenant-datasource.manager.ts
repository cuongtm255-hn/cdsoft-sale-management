import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
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

  private async resolveTenantDbConfig(tenantCode: string): Promise<TenantDbConfig> {
    const [tenant] = await this.platformDs.query(
      'SELECT dbHost, dbPort, dbName, dbUsername, status FROM tenants WHERE tenantCode = ? AND status = "ACTIVE"',
      [tenantCode]
    );

    if (!tenant) {
      throw new NotFoundException(`Tenant config not found for code: ${tenantCode} or tenant is inactive`);
    }

    if (!tenant.dbName) {
      throw new NotFoundException(`Tenant ${tenantCode} has not been provisioned properly yet`);
    }

    return {
      tenantCode,
      host: tenant.dbHost || this.config.get<string>('database.host') || 'localhost',
      port: tenant.dbPort || this.config.get<number>('database.port') || 3306,
      username: tenant.dbUsername || this.config.get<string>('database.username') || 'root',
      password: this.config.get<string>('database.password') || '', // Có thể lưu riêng hoặc dùng chung
      database: tenant.dbName,
    };
  }
}

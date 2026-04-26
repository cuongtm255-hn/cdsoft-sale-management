import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Tenant, ProvisioningStatus, TenantStatus } from './entities/tenant.entity';
import { User, UserRole, UserStatus } from '../../tenant-module/users/entities/user.entity';

@Injectable()
export class TenantProvisioningService {
  private readonly logger = new Logger(TenantProvisioningService.name);

  constructor(
    @InjectDataSource() private readonly platformDataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async provisionTenant(tenantId: string): Promise<void> {
    const tenantRepo = this.platformDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({ where: { id: tenantId } });

    if (!tenant) {
      this.logger.error(`Tenant ${tenantId} not found for provisioning.`);
      return;
    }

    try {
      // 1. Cập nhật trạng thái đang khởi tạo
      tenant.provisioningStatus = ProvisioningStatus.PROVISIONING;
      await tenantRepo.save(tenant);

      const dbName = `tenant_${tenant.tenantCode}`;
      const dbHost = this.config.get<string>('database.host') || 'localhost';
      const dbPort = this.config.get<number>('database.port') || 3306;
      const dbUsername = this.config.get<string>('database.username') || 'root';
      const dbPassword = this.config.get<string>('database.password') || '';

      this.logger.log(`Creating database ${dbName} for tenant ${tenant.tenantCode}...`);

      // 2. Tạo vật lý database
      await this.platformDataSource.query(
        `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );

      // 3. Kết nối vào DB mới để tạo schema và user
      const tenantOptions: DataSourceOptions = {
        type: 'mysql',
        host: dbHost,
        port: dbPort,
        username: dbUsername,
        password: dbPassword,
        database: dbName,
        entities: [__dirname + '/../../tenant-module/**/*.entity{.ts,.js}'],
        synchronize: true, // Auto create schema
      };

      const tenantDs = new DataSource(tenantOptions);
      await tenantDs.initialize();

      this.logger.log(`Database schema synchronized for ${dbName}.`);

      // 4. Tạo Tenant Admin User
      const bcryptRounds = this.config.get<number>('app.bcryptRounds') || 12;
      const defaultPassword = 'Admin@123'; // Hoặc sinh ngẫu nhiên và gửi email
      const passwordHash = await bcrypt.hash(defaultPassword, bcryptRounds);

      const userRepo = tenantDs.getRepository(User);
      const existingUser = await userRepo.findOne({ where: { email: tenant.contactEmail } });

      if (!existingUser) {
        const adminUser = userRepo.create({
          fullName: tenant.contactName || 'Tenant Admin',
          email: tenant.contactEmail,
          passwordHash: passwordHash,
          role: UserRole.TENANT_ADMIN,
          status: UserStatus.ACTIVE,
        });
        await userRepo.save(adminUser);
        this.logger.log(`Created admin user ${tenant.contactEmail} for ${tenant.tenantCode}.`);
      }

      await tenantDs.destroy();

      // 5. Cập nhật Tenant record: đã hoàn thành
      tenant.dbHost = dbHost;
      tenant.dbPort = dbPort;
      tenant.dbName = dbName;
      tenant.dbUsername = dbUsername;
      // Trong thực tế có thể tạo user MySQL riêng biệt thay vì dùng chung root
      // tenant.dbPasswordEncrypted = ...
      
      tenant.status = TenantStatus.ACTIVE;
      tenant.provisioningStatus = ProvisioningStatus.ACTIVE;
      await tenantRepo.save(tenant);

      this.logger.log(`Successfully provisioned tenant ${tenant.tenantCode}.`);
    } catch (error) {
      this.logger.error(`Failed to provision tenant ${tenant.tenantCode}:`, error);
      
      // Đánh dấu là FAILED
      tenant.provisioningStatus = ProvisioningStatus.FAILED;
      await tenantRepo.save(tenant);
    }
  }
}

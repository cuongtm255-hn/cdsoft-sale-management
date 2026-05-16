import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { PlatformRole, PlatformUser, UserStatus } from '../platform/users/entities/platform-user.entity';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedSuperAdmin();
  }

  private async seedSuperAdmin(): Promise<void> {
    const username = this.config.get<string>('seed.superAdminUsername');
    const email = this.config.get<string>('seed.superAdminEmail');
    const password = this.config.get<string>('seed.superAdminPassword');

    if (!username || !email || !password) {
      this.logger.warn('Super admin seed env variables not set. Skipping seed.');
      return;
    }

    try {
      const repo = this.dataSource.getRepository(PlatformUser);
      const existing = await repo.findOne({ where: { username } });

      if (existing) {
        this.logger.log(`Super admin "${username}" already exists. Skipping seed.`);
        return;
      }

      const bcryptRounds = this.config.get<number>('app.bcryptRounds') ?? 12;
      const passwordHash = await bcrypt.hash(password, bcryptRounds);

      const superAdmin = repo.create({
        username,
        email,
        passwordHash,
        role: PlatformRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
      });

      await repo.save(superAdmin);
      this.logger.log(`Super admin "${username}" seeded successfully.`);
    } catch (err) {
      this.logger.error('Failed to seed super admin', err);
      // Keep startup alive if seeding fails after migrations completed.
    }
  }
}

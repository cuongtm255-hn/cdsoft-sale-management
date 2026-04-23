import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { PlatformRole, PlatformUser, UserStatus } from '../platform/users/entities/platform-user.entity';

@Injectable()
export class DatabaseBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseBootstrapService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(PlatformUser)
    private readonly platformUsersRepository: Repository<PlatformUser>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.ensureDefaultSuperAdmin();
  }

  private async ensureDefaultSuperAdmin(): Promise<void> {
    const username = this.configService.get<string>('database.seed.superAdminUsername');
    const email = this.configService.get<string>('database.seed.superAdminEmail');
    const password = this.configService.get<string>('database.seed.superAdminPassword');
    const role = PlatformRole.SUPER_ADMIN;

    if (!username || !email || !password) {
      this.logger.warn('Skip default super admin seed because seed credentials are incomplete');
      return;
    }

    const existingUser = await this.platformUsersRepository.findOne({
      where: [{ username }, { email }],
      withDeleted: true,
    });

    if (existingUser) {
      this.logger.log(`Default super admin already exists: ${existingUser.username}`);
      return;
    }

    const passwordHash = await bcrypt.hash(
      password,
      this.configService.get<number>('app.bcryptRounds', 12),
    );

    const user = this.platformUsersRepository.create({
      username,
      email,
      passwordHash,
      role,
      status: UserStatus.ACTIVE,
    });

    await this.platformUsersRepository.save(user);
    this.logger.log(`Created default super admin: ${email}`);
  }
}

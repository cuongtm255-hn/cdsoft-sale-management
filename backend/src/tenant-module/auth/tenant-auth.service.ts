import { Injectable, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { TenantLoginDto } from './dto/tenant-login.dto';
import { TenantDataSourceManager } from '../../tenant/tenant-datasource.manager';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { User } from '../users/entities/user.entity';
import { ChangePasswordDto } from '../users/dto/user.dto';

@Injectable()
export class TenantAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly dsManager: TenantDataSourceManager,
    private readonly tenantCtx: TenantContextService,
  ) {}

  async login(dto: TenantLoginDto) {
    const ds = await this.dsManager.getDataSource(dto.tenantCode);
    const user = await this.findUserWithPassword(ds, dto.email);

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== 'ACTIVE') throw new ForbiddenException('Account is inactive');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantCode: dto.tenantCode,
      userType: 'TENANT',
    };

    return {
      accessToken: this.jwtService.sign(payload),
      expiresIn: 8 * 60 * 60,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const tenantCode = this.tenantCtx.getTenantCode();
    if (!tenantCode) throw new ForbiddenException('Tenant context missing');

    const ds = await this.dsManager.getDataSource(tenantCode);
    const user = await ds
      .getRepository(User)
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id: userId })
      .getOne();

    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await ds.getRepository(User).save(user);
  }

  private async findUserWithPassword(ds: DataSource, email: string): Promise<User | null> {
    return ds
      .getRepository(User)
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email })
      .andWhere('u.deletedAt IS NULL')
      .getOne();
  }
}

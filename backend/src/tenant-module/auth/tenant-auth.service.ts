import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { TenantLoginDto } from './dto/tenant-login.dto';
import { TenantDataSourceManager } from '../../tenant/tenant-datasource.manager';

interface TenantUser {
  id: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  passwordHash: string;
}

@Injectable()
export class TenantAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly dsManager: TenantDataSourceManager,
  ) {}

  async login(dto: TenantLoginDto) {
    const ds = await this.dsManager.getDataSource(dto.tenantCode);
    const user = await this.findTenantUser(ds, dto.email);

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

  private async findTenantUser(ds: unknown, email: string): Promise<TenantUser | null> {
    // TODO: query tenant DB users table
    void ds; void email;
    return null;
  }
}

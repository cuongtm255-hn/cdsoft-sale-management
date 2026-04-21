import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PlatformLoginDto, AuthTokenDto } from './dto/login.dto';

@Injectable()
export class PlatformAuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(dto: PlatformLoginDto): Promise<AuthTokenDto> {
    const user = await this.validateUser(dto.email, dto.password);
    return this.generateTokens(user);
  }

  private async validateUser(email: string, password: string): Promise<{ id: string; email: string; role: string }> {
    // TODO: query platform_users table via system DataSource
    void email; void password; void bcrypt;
    throw new UnauthorizedException('Invalid credentials');
  }

  private generateTokens(user: { id: string; email: string; role: string }): AuthTokenDto {
    const payload = { sub: user.id, email: user.email, role: user.role, userType: 'PLATFORM' };
    return {
      accessToken: this.jwtService.sign(payload),
      expiresIn: 8 * 60 * 60,
    };
  }
}

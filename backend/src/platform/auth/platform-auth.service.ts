import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { PlatformLoginDto, AuthTokenDto } from './dto/login.dto';
import { PlatformUser, UserStatus } from '../users/entities/platform-user.entity';

@Injectable()
export class PlatformAuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(PlatformUser)
    private readonly userRepo: Repository<PlatformUser>,
  ) {}

  async login(dto: PlatformLoginDto): Promise<AuthTokenDto> {
    const user = await this.validateUser(dto.email, dto.password);
    return this.generateTokens(user);
  }

  private async validateUser(
    email: string,
    password: string,
  ): Promise<{ id: string; email: string; role: string }> {
    // Query user kèm passwordHash (field có select: false)
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email })
      .andWhere('u.deletedAt IS NULL')
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is inactive or locked');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Cập nhật lastLoginAt
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    return { id: user.id, email: user.email, role: user.role };
  }

  private generateTokens(user: { id: string; email: string; role: string }): AuthTokenDto {
    const payload = { sub: user.id, email: user.email, role: user.role, userType: 'PLATFORM' };
    return {
      accessToken: this.jwtService.sign(payload),
      expiresIn: 8 * 60 * 60,
    };
  }
}

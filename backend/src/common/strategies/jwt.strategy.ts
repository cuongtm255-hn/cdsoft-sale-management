import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret') || 'secret',
    });
  }

  async validate(payload: any) {
    // payload: { sub: user.id, email: user.email, role: user.role, userType: 'PLATFORM' }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      userType: payload.userType,
      tenantCode: payload.tenantCode,
    };
  }
}

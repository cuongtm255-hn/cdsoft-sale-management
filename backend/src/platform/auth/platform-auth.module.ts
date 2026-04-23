import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformUser } from '../users/entities/platform-user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlatformUser]),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: { expiresIn: config.get('jwt.accessExpiresIn', '8h') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [PlatformAuthController],
  providers: [PlatformAuthService],
  exports: [JwtModule],
})
export class PlatformAuthModule {}

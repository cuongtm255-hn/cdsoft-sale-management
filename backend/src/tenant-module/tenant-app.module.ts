import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TenantAuthController } from './auth/tenant-auth.controller';
import { TenantAuthService } from './auth/tenant-auth.service';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: { expiresIn: config.get('jwt.accessExpiresIn', '8h') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TenantAuthController, ProductsController, UsersController],
  providers: [TenantAuthService, ProductsService, UsersService],
})
export class TenantAppModule {}

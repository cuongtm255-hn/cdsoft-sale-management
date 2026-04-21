import { Module } from '@nestjs/common';
import { PlatformAuthModule } from './auth/platform-auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [PlatformAuthModule, TenantsModule, UsersModule],
})
export class PlatformModule {}

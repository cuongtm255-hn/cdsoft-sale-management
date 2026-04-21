import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantDataSourceManager } from './tenant-datasource.manager';

@Global()
@Module({
  providers: [TenantContextService, TenantDataSourceManager],
  exports: [TenantContextService, TenantDataSourceManager],
})
export class TenantContextModule {}

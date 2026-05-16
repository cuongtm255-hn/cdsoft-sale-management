import { Injectable } from '@nestjs/common';
import { TenantDataSourceManager } from '../../tenant/tenant-datasource.manager';
import { TenantContextService } from '../../tenant/tenant-context.service';

@Injectable()
export class ChatbotQueryContextService {
  constructor(
    private readonly dsManager: TenantDataSourceManager,
    private readonly tenantCtx: TenantContextService,
  ) {}

  async getDs() {
    return this.dsManager.getDataSource(this.tenantCtx.getTenantCode()!);
  }

  getTenantCode() {
    return this.tenantCtx.getTenantCode()!;
  }

  like(query?: string) {
    return query ? `%${query.trim()}%` : '%';
  }

  clampLimit(limit: number | undefined, defaultValue: number, max = 50) {
    const raw = Number.isFinite(limit) ? Number(limit) : defaultValue;
    return Math.min(Math.max(raw, 1), max);
  }
}

import { Injectable } from '@nestjs/common';
import { TenantDataSourceManager } from '@tenant/tenant-datasource.manager';
import { TenantContextService } from '@tenant/tenant-context.service';
import { AuditLog } from './entities/audit-log.entity';
import { PaginationDto } from '@common/dto/pagination.dto';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class AuditLogQueryDto extends PaginationDto {
  @IsOptional() @IsUUID()     userId?: string;
  @IsOptional() @IsString()   resource?: string;
  @IsOptional() @IsString()   action?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export interface LogPayload {
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  beforeData?: object;
  afterData?: object;
  ipAddress?: string;
}

@Injectable()
export class AuditLogService {
  constructor(
    private readonly dsManager: TenantDataSourceManager,
    private readonly tenantCtx: TenantContextService,
  ) {}

  async log(payload: LogPayload): Promise<void> {
    try {
      const tenantCode = this.tenantCtx.getTenantCode();
      if (!tenantCode) return;
      const ds   = await this.dsManager.getDataSource(tenantCode);
      const repo = ds.getRepository(AuditLog);
      await repo.save(repo.create(payload));
    } catch {
      // audit log failure must never crash the request
    }
  }

  async list(dto: AuditLogQueryDto) {
    const ds   = await this.dsManager.getDataSource(this.tenantCtx.getTenantCode()!);
    const repo = ds.getRepository(AuditLog);
    const qb   = repo.createQueryBuilder('log').orderBy('log.createdAt', 'DESC');

    if (dto.userId)   qb.andWhere('log.userId = :userId',       { userId:   dto.userId });
    if (dto.resource) qb.andWhere('log.resource = :resource',   { resource: dto.resource });
    if (dto.action)   qb.andWhere('log.action LIKE :action',    { action:   `${dto.action}%` });
    if (dto.from)     qb.andWhere('log.createdAt >= :from',     { from:     dto.from });
    if (dto.to)       qb.andWhere('log.createdAt <= :to',       { to:       dto.to });

    const [data, total] = await qb.skip(dto.skip).take(dto.limit).getManyAndCount();
    return { data, meta: { total, page: dto.page, limit: dto.limit } };
  }
}

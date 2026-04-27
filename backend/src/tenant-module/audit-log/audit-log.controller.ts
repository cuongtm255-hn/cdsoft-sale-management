import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { RequirePermission } from '@common/decorators/permission.decorator';
import { AuditLogService, AuditLogQueryDto } from './audit-log.service';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('tenant/audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @RequirePermission('audit_logs:read')
  list(@Query() dto: AuditLogQueryDto) {
    return this.auditLogService.list(dto);
  }
}

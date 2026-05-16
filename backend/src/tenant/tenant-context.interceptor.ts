import { CallHandler, ExecutionContext, Injectable, NestInterceptor, BadRequestException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly tenantCtx: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    
    // 1. Lấy tenantCode từ Header (ưu tiên cao nhất)
    let tenantCode = req.headers['x-tenant-code'] as string;
    
    // 2. Nếu không có header, lấy từ JWT payload (req.user do JwtAuthGuard set)
    if (!tenantCode && req.user && req.user.tenantCode) {
      tenantCode = req.user.tenantCode;
    }

    // 3. Nếu là route public như login, lấy từ body
    if (!tenantCode && req.body && req.body.tenantCode) {
      tenantCode = req.body.tenantCode;
    }

    if (!tenantCode && req.url.startsWith('/api/tenant')) {
      throw new BadRequestException('Tenant context is missing (Missing x-tenant-code header or tenantCode in payload)');
    }

    if (tenantCode) {
      this.tenantCtx.setTenantCode(tenantCode);
    }

    return next.handle();
  }
}

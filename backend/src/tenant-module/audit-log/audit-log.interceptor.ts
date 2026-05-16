import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { tap } from 'rxjs/operators';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const { method, url, user, params } = req;

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next.handle();

    return next.handle().pipe(
      tap(async (responseData) => {
        await this.auditLogService.log({
          userId:     user?.id,
          userName:   user?.name ?? user?.email,
          userRole:   user?.role,
          action:     `${method} ${url}`,
          resource:   this.extractResource(url),
          resourceId: params?.id,
          afterData:  this.sanitize(responseData),
          ipAddress:  req.ip,
        });
      }),
    );
  }

  private extractResource(url: string): string {
    const clean = url.replace(/\/api\/tenant\//, '').replace(/\/tenant\//, '');
    return clean.split('/')[0] ?? 'unknown';
  }

  private sanitize(data: any): any {
    if (!data) return null;
    try {
      const clone = JSON.parse(JSON.stringify(data ?? {}));
      ['password', 'passwordHash', 'token', 'refreshToken'].forEach((k) => delete clone[k]);
      return clone;
    } catch {
      return null;
    }
  }
}

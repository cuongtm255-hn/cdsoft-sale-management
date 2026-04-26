import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantCtx: TenantContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Khởi tạo context rỗng, bọc toàn bộ request lifecycle
    this.tenantCtx.run({}, () => {
      next();
    });
  }
}

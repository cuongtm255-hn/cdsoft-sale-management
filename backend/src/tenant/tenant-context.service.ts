import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  tenantCode?: string;
  userId?: string;
  userRole?: string;
}

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContext>();

  run<T>(context: TenantContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  get(): TenantContext | undefined {
    return this.storage.getStore();
  }

  getTenantCode(): string | undefined {
    return this.storage.getStore()?.tenantCode;
  }

  setTenantCode(code: string): void {
    const store = this.storage.getStore();
    if (store) {
      store.tenantCode = code;
    }
  }
}

import { Injectable } from '@nestjs/common';
import { TenantDataSourceManager } from '../../tenant/tenant-datasource.manager';
import { TenantContextService } from '../../tenant/tenant-context.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly dsManager: TenantDataSourceManager,
    private readonly tenantCtx: TenantContextService,
  ) {}

  private async getDs() {
    return this.dsManager.getDataSource(this.tenantCtx.getTenantCode()!);
  }

  async getStats() {
    const ds = await this.getDs();

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalProducts,
      totalCustomers,
      monthRevenue,
      lowStockCount,
      pendingOrders,
      totalOrders,
    ] = await Promise.all([
      ds.query(`SELECT COUNT(*) AS cnt FROM products WHERE deleted_at IS NULL`),
      ds.query(`SELECT COUNT(*) AS cnt FROM customers WHERE deleted_at IS NULL`),
      ds.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS total
         FROM invoices
         WHERE created_at >= ? AND deleted_at IS NULL`,
        [firstOfMonth],
      ),
      ds.query(
        `SELECT COUNT(*) AS cnt
         FROM inventory_balances ib
         JOIN products p ON p.id = ib.product_id AND p.deleted_at IS NULL
         WHERE ib.quantity > 0 AND ib.quantity <= p.min_stock_level AND p.min_stock_level > 0`,
      ),
      ds.query(
        `SELECT COUNT(*) AS cnt FROM orders WHERE status IN ('CONFIRMED','DELIVERING') AND deleted_at IS NULL`,
      ),
      ds.query(
        `SELECT COUNT(*) AS cnt FROM orders WHERE deleted_at IS NULL`,
      ),
    ]);

    return {
      totalProducts: Number(totalProducts[0]?.cnt ?? 0),
      totalCustomers: Number(totalCustomers[0]?.cnt ?? 0),
      monthRevenue: Number(monthRevenue[0]?.total ?? 0),
      lowStockCount: Number(lowStockCount[0]?.cnt ?? 0),
      pendingOrders: Number(pendingOrders[0]?.cnt ?? 0),
      totalOrders: Number(totalOrders[0]?.cnt ?? 0),
    };
  }
}

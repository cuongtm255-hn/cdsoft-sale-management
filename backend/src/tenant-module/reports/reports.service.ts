import { Injectable } from '@nestjs/common';
import { TenantDataSourceManager } from '../../tenant/tenant-datasource.manager';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { CommissionConfigEntity } from './entities/commission-config.entity';
import {
  SalesReportFilterDto, InventoryMovementFilterDto, DeadstockFilterDto,
  FinanceReportFilterDto, CommissionFilterDto, KpiFilterDto, UpdateCommissionConfigDto,
} from './dto/reports.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly dsManager: TenantDataSourceManager,
    private readonly tenantCtx: TenantContextService,
  ) {}

  private async getDs() {
    return this.dsManager.getDataSource(this.tenantCtx.getTenantCode()!);
  }

  private periodFormat(groupBy: string): string {
    switch (groupBy) {
      case 'day':   return '%Y-%m-%d';
      case 'week':  return '%Y-%u';
      case 'year':  return '%Y';
      default:      return '%Y-%m';
    }
  }

  async getSalesReport(filter: SalesReportFilterDto) {
    const ds = await this.getDs();
    const { groupBy = 'month', from, to, salesRepId } = filter;
    const fmt = this.periodFormat(groupBy);

    const base = `
      FROM orders o
      WHERE o.type = 'SALES'
        AND o.status NOT IN ('DRAFT', 'CANCELLED')
        AND o.deleted_at IS NULL
        ${from ? `AND DATE(o.created_at) >= '${from}'` : ''}
        ${to   ? `AND DATE(o.created_at) <= '${to}'`   : ''}
        ${salesRepId ? `AND o.sales_rep_id = '${salesRepId}'` : ''}
    `;

    const [summaryRows] = await ds.query(`
      SELECT
        COUNT(o.id)                              AS totalOrders,
        COALESCE(SUM(o.total_amount), 0)         AS totalRevenue,
        COALESCE(AVG(o.total_amount), 0)         AS averageOrderValue
      ${base}
    `);

    const [returnRows] = await ds.query(`
      SELECT COUNT(r.id) AS returnCount
      FROM return_orders r
      WHERE r.deleted_at IS NULL
        ${from ? `AND DATE(r.created_at) >= '${from}'` : ''}
        ${to   ? `AND DATE(r.created_at) <= '${to}'`   : ''}
    `);

    const totalOrders = Number(summaryRows.totalOrders || 0);
    const returnCount = Number(returnRows.returnCount || 0);
    const returnRate = totalOrders > 0 ? +((returnCount / totalOrders) * 100).toFixed(2) : 0;

    const chart = await ds.query(`
      SELECT
        DATE_FORMAT(o.created_at, '${fmt}') AS period,
        COALESCE(SUM(o.total_amount), 0)    AS revenue,
        COUNT(o.id)                          AS orders
      ${base}
      GROUP BY period
      ORDER BY period
    `);

    const topProducts = await ds.query(`
      SELECT
        oi.product_id AS productId,
        p.name,
        COALESCE(SUM(oi.line_total), 0) AS revenue,
        COALESCE(SUM(oi.quantity), 0)   AS qty
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE o.type = 'SALES'
        AND o.status NOT IN ('DRAFT', 'CANCELLED')
        AND o.deleted_at IS NULL AND oi.deleted_at IS NULL
        ${from ? `AND DATE(o.created_at) >= '${from}'` : ''}
        ${to   ? `AND DATE(o.created_at) <= '${to}'`   : ''}
      GROUP BY oi.product_id, p.name
      ORDER BY revenue DESC
      LIMIT 10
    `);

    const topCustomers = await ds.query(`
      SELECT
        o.customer_id AS customerId,
        c.name,
        COALESCE(SUM(o.total_amount), 0) AS revenue,
        COUNT(o.id)                       AS orders
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.type = 'SALES'
        AND o.status NOT IN ('DRAFT', 'CANCELLED')
        AND o.deleted_at IS NULL AND c.deleted_at IS NULL
        ${from ? `AND DATE(o.created_at) >= '${from}'` : ''}
        ${to   ? `AND DATE(o.created_at) <= '${to}'`   : ''}
      GROUP BY o.customer_id, c.name
      ORDER BY revenue DESC
      LIMIT 10
    `);

    return {
      summary: {
        totalRevenue:      +Number(summaryRows.totalRevenue).toFixed(0),
        totalOrders,
        averageOrderValue: +Number(summaryRows.averageOrderValue).toFixed(0),
        returnRate,
      },
      chart: chart.map((r: any) => ({
        period:  r.period,
        revenue: +Number(r.revenue).toFixed(0),
        orders:  Number(r.orders),
      })),
      topProducts: topProducts.map((r: any) => ({
        productId: r.productId,
        name:      r.name,
        revenue:   +Number(r.revenue).toFixed(0),
        qty:       +Number(r.qty).toFixed(2),
      })),
      topCustomers: topCustomers.map((r: any) => ({
        customerId: r.customerId,
        name:       r.name,
        revenue:    +Number(r.revenue).toFixed(0),
        orders:     Number(r.orders),
      })),
    };
  }

  async getProfitByProduct(filter: FinanceReportFilterDto) {
    const ds = await this.getDs();
    const { from, to } = filter;

    const rows = await ds.query(`
      SELECT
        oi.product_id                                              AS productId,
        p.name                                                     AS productName,
        cat.name                                                   AS category,
        COALESCE(SUM(oi.line_total), 0)                           AS revenue,
        COALESCE(SUM(oi.cost_price * oi.quantity), 0)             AS cogs,
        COALESCE(SUM(oi.line_total) - SUM(oi.cost_price * oi.quantity), 0) AS grossProfit
      FROM order_items oi
      JOIN orders o   ON oi.order_id   = o.id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories cat ON p.category_id = cat.id
      WHERE o.type = 'SALES'
        AND o.status NOT IN ('DRAFT', 'CANCELLED')
        AND o.deleted_at IS NULL AND oi.deleted_at IS NULL
        ${from ? `AND DATE(o.created_at) >= '${from}'` : ''}
        ${to   ? `AND DATE(o.created_at) <= '${to}'`   : ''}
      GROUP BY oi.product_id, p.name, cat.name
      ORDER BY revenue DESC
    `);

    return {
      data: rows.map((r: any) => {
        const revenue     = +Number(r.revenue).toFixed(0);
        const cogs        = +Number(r.cogs).toFixed(0);
        const grossProfit = +Number(r.grossProfit).toFixed(0);
        return {
          productId:          r.productId,
          productName:        r.productName,
          category:           r.category ?? '—',
          revenue,
          cogs,
          grossProfit,
          grossMarginPercent: revenue > 0 ? +((grossProfit / revenue) * 100).toFixed(1) : 0,
        };
      }),
    };
  }

  async getInventoryMovement(filter: InventoryMovementFilterDto) {
    const ds = await this.getDs();
    const { from, to, productId, warehouseId } = filter;

    const rows = await ds.query(`
      SELECT
        p.id                                                          AS productId,
        p.sku,
        p.name,
        u.name                                                        AS unit,
        COALESCE(SUM(CASE WHEN it.type = 'STOCK_IN'  THEN it.quantity ELSE 0 END), 0) AS stockIn,
        COALESCE(SUM(CASE WHEN it.type = 'STOCK_OUT' THEN it.quantity ELSE 0 END), 0) AS stockOut,
        COALESCE(ib.quantity, 0)                                      AS currentQty,
        COALESCE(ib.quantity * p.cost_price, 0)                      AS closingValue
      FROM products p
      LEFT JOIN inventory_transactions it ON it.product_id = p.id
        AND it.deleted_at IS NULL
        ${from ? `AND DATE(it.created_at) >= '${from}'` : ''}
        ${to   ? `AND DATE(it.created_at) <= '${to}'`   : ''}
        ${warehouseId ? `AND it.warehouse_id = '${warehouseId}'` : ''}
      LEFT JOIN units u ON p.unit_id = u.id
      LEFT JOIN inventory_balances ib ON ib.product_id = p.id
        ${warehouseId ? `AND ib.warehouse_id = '${warehouseId}'` : ''}
      WHERE p.deleted_at IS NULL
        ${productId   ? `AND p.id = '${productId}'`       : ''}
      GROUP BY p.id, p.sku, p.name, u.name, ib.quantity, p.cost_price
      ORDER BY p.name
    `);

    return {
      data: rows.map((r: any) => {
        const stockIn    = +Number(r.stockIn).toFixed(2);
        const stockOut   = +Number(r.stockOut).toFixed(2);
        const closingQty = +Number(r.currentQty).toFixed(2);
        const openingQty = +(closingQty - stockIn + stockOut).toFixed(2);
        return {
          productId:    r.productId,
          sku:          r.sku,
          name:         r.name,
          unit:         r.unit ?? '—',
          openingQty,
          stockIn,
          stockOut,
          closingQty,
          closingValue: +Number(r.closingValue).toFixed(0),
        };
      }),
    };
  }

  async getDeadstock(filter: DeadstockFilterDto) {
    const ds = await this.getDs();
    const { warehouseId, daysSinceLastSale = 90 } = filter;

    const rows = await ds.query(`
      SELECT
        p.id                                           AS productId,
        p.name,
        COALESCE(ib.quantity, 0)                      AS currentStock,
        COALESCE(ib.quantity * p.cost_price, 0)       AS stockValue,
        MAX(DATE(o.created_at))                        AS lastSaleDate,
        DATEDIFF(NOW(), MAX(o.created_at))             AS daysSinceLastSale
      FROM products p
      LEFT JOIN inventory_balances ib ON ib.product_id = p.id
        ${warehouseId ? `AND ib.warehouse_id = '${warehouseId}'` : ''}
      LEFT JOIN order_items oi ON oi.product_id = p.id AND oi.deleted_at IS NULL
      LEFT JOIN orders o ON oi.order_id = o.id
        AND o.type = 'SALES' AND o.status NOT IN ('DRAFT', 'CANCELLED') AND o.deleted_at IS NULL
      WHERE p.deleted_at IS NULL
        AND COALESCE(ib.quantity, 0) > 0
      GROUP BY p.id, p.name, ib.quantity, p.cost_price
      HAVING lastSaleDate IS NULL OR DATEDIFF(NOW(), lastSaleDate) >= ${daysSinceLastSale}
      ORDER BY daysSinceLastSale DESC
    `);

    return {
      data: rows.map((r: any) => ({
        productId:         r.productId,
        name:              r.name,
        currentStock:      +Number(r.currentStock).toFixed(2),
        lastSaleDate:      r.lastSaleDate ?? null,
        daysSinceLastSale: r.daysSinceLastSale ?? null,
        stockValue:        +Number(r.stockValue).toFixed(0),
      })),
    };
  }

  async getAbcAnalysis(filter: FinanceReportFilterDto) {
    const ds = await this.getDs();
    const { from, to } = filter;

    const rows = await ds.query(`
      SELECT
        oi.product_id            AS productId,
        p.name,
        SUM(oi.line_total)       AS revenueContribution
      FROM order_items oi
      JOIN orders o   ON oi.order_id   = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE o.type = 'SALES'
        AND o.status NOT IN ('DRAFT', 'CANCELLED')
        AND o.deleted_at IS NULL AND oi.deleted_at IS NULL
        ${from ? `AND DATE(o.created_at) >= '${from}'` : ''}
        ${to   ? `AND DATE(o.created_at) <= '${to}'`   : ''}
      GROUP BY oi.product_id, p.name
      ORDER BY revenueContribution DESC
    `);

    const total = rows.reduce((sum: number, r: any) => sum + Number(r.revenueContribution), 0);
    let cumulative = 0;

    return {
      data: rows.map((r: any) => {
        const rev        = +Number(r.revenueContribution).toFixed(0);
        const pct        = total > 0 ? +((rev / total) * 100).toFixed(2) : 0;
        cumulative       += pct;
        const abcClass   = cumulative <= 70 ? 'A' : cumulative <= 90 ? 'B' : 'C';
        return {
          productId:            r.productId,
          name:                 r.name,
          revenueContribution:  rev,
          revenuePercent:       pct,
          cumulativePercent:    +cumulative.toFixed(2),
          abcClass,
        };
      }),
    };
  }

  async getPnl(filter: FinanceReportFilterDto) {
    const ds = await this.getDs();
    const { from, to } = filter;

    const dateWhere = `
      WHERE o.type = 'SALES' AND o.status NOT IN ('DRAFT','CANCELLED') AND o.deleted_at IS NULL
      ${from ? `AND DATE(o.created_at) >= '${from}'` : ''}
      ${to   ? `AND DATE(o.created_at) <= '${to}'`   : ''}
    `;

    const [rev] = await ds.query(`
      SELECT
        COALESCE(SUM(o.subtotal), 0)                       AS grossSales,
        COALESCE(SUM(o.discount_total + o.voucher_discount), 0) AS discounts
      FROM orders o ${dateWhere}
    `);

    const [ret] = await ds.query(`
      SELECT COALESCE(SUM(r.refund_amount), 0) AS returns
      FROM return_orders r
      WHERE r.deleted_at IS NULL
        ${from ? `AND DATE(r.created_at) >= '${from}'` : ''}
        ${to   ? `AND DATE(r.created_at) <= '${to}'`   : ''}
    `);

    const [cogs] = await ds.query(`
      SELECT COALESCE(SUM(oi.cost_price * oi.quantity), 0) AS cogs
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      ${dateWhere} AND oi.deleted_at IS NULL
    `);

    const grossSales  = +Number(rev.grossSales).toFixed(0);
    const returns     = +Number(ret.returns).toFixed(0);
    const discounts   = +Number(rev.discounts).toFixed(0);
    const netRevenue  = grossSales - returns - discounts;
    const cogsAmt     = +Number(cogs.cogs).toFixed(0);
    const grossProfit = netRevenue - cogsAmt;
    const opex        = 0; // placeholder — no opex entity yet
    const netProfit   = grossProfit - opex;

    return {
      revenue: {
        grossSales,
        returns,
        discounts,
        netRevenue,
      },
      cogs:              cogsAmt,
      grossProfit,
      grossMarginPercent: netRevenue > 0 ? +((grossProfit / netRevenue) * 100).toFixed(1) : 0,
      operatingExpenses: { selling: 0, adminGeneral: 0, total: opex },
      netProfit,
      netProfitMarginPercent: netRevenue > 0 ? +((netProfit / netRevenue) * 100).toFixed(1) : 0,
    };
  }

  async getCashflow(filter: FinanceReportFilterDto) {
    const ds = await this.getDs();
    const { from, to } = filter;

    const dateFilter = `
      ${from ? `AND DATE(cr.created_at) >= '${from}'` : ''}
      ${to   ? `AND DATE(cr.created_at) <= '${to}'`   : ''}
    `;

    const [opening] = await ds.query(`
      SELECT COALESCE(
        (SELECT SUM(CASE WHEN kind='RECEIPT' THEN amount ELSE -amount END)
         FROM cash_receipts WHERE status='APPROVED' AND deleted_at IS NULL
         ${from ? `AND DATE(created_at) < '${from}'` : ''}
        ), 0) AS openingBalance
    `);

    const receipts = await ds.query(`
      SELECT kind, category, COALESCE(SUM(amount), 0) AS total
      FROM cash_receipts cr
      WHERE cr.status = 'APPROVED' AND cr.deleted_at IS NULL ${dateFilter}
      GROUP BY kind, category
    `);

    const inflows  = receipts.filter((r: any) => r.kind === 'RECEIPT').map((r: any) => ({
      category: r.category,
      amount:   +Number(r.total).toFixed(0),
    }));
    const outflows = receipts.filter((r: any) => r.kind === 'DISBURSEMENT').map((r: any) => ({
      category: r.category,
      amount:   +Number(r.total).toFixed(0),
    }));

    const totalInflow  = inflows.reduce((s: number, r: any) => s + r.amount, 0);
    const totalOutflow = outflows.reduce((s: number, r: any) => s + r.amount, 0);
    const openBal      = +Number(opening.openingBalance).toFixed(0);

    return {
      openingBalance: openBal,
      inflows,
      outflows,
      totalInflow,
      totalOutflow,
      netCashFlow:    totalInflow - totalOutflow,
      closingBalance: openBal + totalInflow - totalOutflow,
    };
  }

  async getCommissionConfig() {
    const ds   = await this.getDs();
    const repo = ds.getRepository(CommissionConfigEntity);
    let cfg    = await repo.findOne({ where: {} });
    if (!cfg) {
      cfg = repo.create({ type: 'REVENUE_PERCENT', rules: [{ minRevenue: 0, rate: 1.5 }] });
      await repo.save(cfg);
    }
    return cfg;
  }

  async updateCommissionConfig(dto: UpdateCommissionConfigDto) {
    const ds   = await this.getDs();
    const repo = ds.getRepository(CommissionConfigEntity);
    let cfg    = await repo.findOne({ where: {} });
    if (!cfg) cfg = repo.create({});
    cfg.type  = dto.type;
    cfg.rules = dto.rules.sort((a, b) => a.minRevenue - b.minRevenue);
    return repo.save(cfg);
  }

  async getCommissions(filter: CommissionFilterDto) {
    const ds = await this.getDs();
    const { from, to, userId } = filter;
    const cfg = await this.getCommissionConfig();

    const rows = await ds.query(`
      SELECT
        o.sales_rep_id                       AS userId,
        u.full_name                          AS userName,
        COUNT(o.id)                          AS totalOrders,
        COALESCE(SUM(o.total_amount), 0)     AS totalRevenue,
        JSON_ARRAYAGG(
          JSON_OBJECT('orderId', o.id, 'orderCode', o.code, 'revenue', o.total_amount)
        )                                    AS detailsRaw
      FROM orders o
      JOIN users u ON o.sales_rep_id = u.id
      WHERE o.type = 'SALES'
        AND o.status NOT IN ('DRAFT','CANCELLED')
        AND o.deleted_at IS NULL AND u.deleted_at IS NULL
        AND o.sales_rep_id IS NOT NULL
        ${from   ? `AND DATE(o.created_at) >= '${from}'`   : ''}
        ${to     ? `AND DATE(o.created_at) <= '${to}'`     : ''}
        ${userId ? `AND o.sales_rep_id = '${userId}'`      : ''}
      GROUP BY o.sales_rep_id, u.full_name
      ORDER BY totalRevenue DESC
    `);

    const rules = [...(cfg.rules ?? [])].sort((a, b) => b.minRevenue - a.minRevenue);

    return {
      data: rows.map((r: any) => {
        const totalRevenue = +Number(r.totalRevenue).toFixed(0);
        const rule         = rules.find((ru) => totalRevenue >= ru.minRevenue) ?? rules[rules.length - 1];
        const rate         = rule?.rate ?? 0;
        const commission   = +(totalRevenue * rate / 100).toFixed(0);
        let details: any[] = [];
        try { details = JSON.parse(r.detailsRaw) ?? []; } catch {}
        return {
          userId:           r.userId,
          userName:         r.userName,
          totalRevenue,
          totalOrders:      Number(r.totalOrders),
          commissionRate:   rate,
          commissionAmount: commission,
          details:          details.map((d: any) => ({
            orderId:    d.orderId,
            orderCode:  d.orderCode,
            revenue:    +Number(d.revenue).toFixed(0),
            commission: +(Number(d.revenue) * rate / 100).toFixed(0),
          })),
        };
      }),
    };
  }

  async getKpiReport(filter: KpiFilterDto) {
    const ds = await this.getDs();
    const { from, to, userId } = filter;

    const rows = await ds.query(`
      SELECT
        o.sales_rep_id                   AS userId,
        u.full_name                      AS userName,
        COUNT(o.id)                      AS totalOrders,
        COALESCE(SUM(o.total_amount), 0) AS achieved,
        (
          SELECT COUNT(DISTINCT c.id) FROM customers c
          WHERE c.sales_rep_id = o.sales_rep_id AND c.deleted_at IS NULL
          ${from ? `AND DATE(c.created_at) >= '${from}'` : ''}
          ${to   ? `AND DATE(c.created_at) <= '${to}'`   : ''}
        )                                AS newCustomers
      FROM orders o
      JOIN users u ON o.sales_rep_id = u.id
      WHERE o.type = 'SALES'
        AND o.status NOT IN ('DRAFT','CANCELLED')
        AND o.deleted_at IS NULL AND u.deleted_at IS NULL
        AND o.sales_rep_id IS NOT NULL
        ${from   ? `AND DATE(o.created_at) >= '${from}'`   : ''}
        ${to     ? `AND DATE(o.created_at) <= '${to}'`     : ''}
        ${userId ? `AND o.sales_rep_id = '${userId}'`      : ''}
      GROUP BY o.sales_rep_id, u.full_name
      ORDER BY achieved DESC
    `);

    return {
      data: rows.map((r: any) => {
        const achieved = +Number(r.achieved).toFixed(0);
        return {
          userId:      r.userId,
          userName:    r.userName,
          target:      0, // KPI targets not yet configured
          achieved,
          achievementRate: 0,
          newCustomers:    Number(r.newCustomers),
          totalOrders:     Number(r.totalOrders),
          closingRate:     0,
          overdueDebt:     0,
        };
      }),
    };
  }
}

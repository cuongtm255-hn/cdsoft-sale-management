import { Injectable } from '@nestjs/common';
import { TenantDataSourceManager } from '../../tenant/tenant-datasource.manager';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { CommissionConfigEntity } from './entities/commission-config.entity';
import {
  SalesReportFilterDto, InventoryMovementFilterDto, DeadstockFilterDto,
  FinanceReportFilterDto, CommissionFilterDto, KpiFilterDto, UpdateCommissionConfigDto,
  DebtByCustomerFilterDto, DebtBySupplierFilterDto, PurchaseBySupplierFilterDto,
  SalesByCustomerFilterDto, SalesByProductFilterDto,
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

  private async expandCategoryIds(categoryId?: string): Promise<string[]> {
    if (!categoryId) return [];

    const ds = await this.getDs();
    const rows: Array<{ id: string; parent_id: string | null }> = await ds.query(`
      SELECT id, parent_id
      FROM categories
      WHERE deleted_at IS NULL
    `);

    const descendants = new Set<string>([categoryId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const row of rows) {
        if (!descendants.has(row.id) && row.parent_id && descendants.has(row.parent_id)) {
          descendants.add(row.id);
          changed = true;
        }
      }
    }

    return [...descendants];
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
    const { from, to, warehouseId, categoryId, productCode, stockFilter = 'all' } = filter;

    const searchClause = productCode ? `AND (p.sku LIKE ? OR p.name LIKE ?)` : '';
    const searchParams = productCode ? [`%${productCode}%`, `%${productCode}%`] : [];

    const rows: any[] = await ds.query(`
      SELECT
        p.id                                                                     AS productId,
        p.sku,
        p.name,
        p.base_unit                                                              AS unit,
        COALESCE(cat.name, '—')                                                  AS categoryName,
        COALESCE(open_tx.opening_qty, 0)                                         AS opening_qty,
        COALESCE(period_tx.stock_in,  0)                                         AS stock_in,
        COALESCE(period_tx.stock_out, 0)                                         AS stock_out,
        COALESCE(open_tx.opening_qty, 0) + COALESCE(period_tx.stock_in,  0)
          - COALESCE(period_tx.stock_out, 0)                                     AS closing_qty,
        COALESCE(bal.avg_cost, 0)                                                AS cost_price,
        (COALESCE(open_tx.opening_qty, 0) + COALESCE(period_tx.stock_in,  0)
          - COALESCE(period_tx.stock_out, 0)) * COALESCE(bal.avg_cost, 0)       AS closing_value
      FROM products p
      LEFT JOIN categories cat ON p.category_id = cat.id
      LEFT JOIN (
        SELECT product_id,
          SUM(CASE WHEN transaction_type IN ('STOCK_IN','ADJUSTMENT_IN','TRANSFER_IN')   THEN  quantity
                   WHEN transaction_type IN ('STOCK_OUT','ADJUSTMENT_OUT','TRANSFER_OUT') THEN -quantity
                   ELSE 0 END) AS opening_qty
        FROM inventory_transactions
        WHERE deleted_at IS NULL
          ${from ? `AND DATE(created_at) < '${from}'` : 'AND 1=0'}
          ${warehouseId ? `AND warehouse_id = '${warehouseId}'` : ''}
        GROUP BY product_id
      ) open_tx ON open_tx.product_id = p.id
      LEFT JOIN (
        SELECT product_id,
          SUM(CASE WHEN transaction_type IN ('STOCK_IN','ADJUSTMENT_IN','TRANSFER_IN')   THEN quantity ELSE 0 END) AS stock_in,
          SUM(CASE WHEN transaction_type IN ('STOCK_OUT','ADJUSTMENT_OUT','TRANSFER_OUT') THEN quantity ELSE 0 END) AS stock_out
        FROM inventory_transactions
        WHERE deleted_at IS NULL
          ${from ? `AND DATE(created_at) >= '${from}'` : ''}
          ${to   ? `AND DATE(created_at) <= '${to}'`   : ''}
          ${warehouseId ? `AND warehouse_id = '${warehouseId}'` : ''}
        GROUP BY product_id
      ) period_tx ON period_tx.product_id = p.id
      LEFT JOIN (
        SELECT product_id,
          SUM(quantity * avg_cost) / NULLIF(SUM(quantity), 0) AS avg_cost
        FROM inventory_balances
        WHERE 1=1
          ${warehouseId ? `AND warehouse_id = '${warehouseId}'` : ''}
        GROUP BY product_id
      ) bal ON bal.product_id = p.id
      WHERE p.deleted_at IS NULL
        ${categoryId ? `AND p.category_id = '${categoryId}'` : ''}
        ${searchClause}
      ORDER BY COALESCE(cat.name, ''), p.sku
    `, searchParams);

    let data = rows.map((r: any) => {
      const openingQty  = +Number(r.opening_qty).toFixed(2);
      const stockIn     = +Number(r.stock_in).toFixed(2);
      const stockOut    = +Number(r.stock_out).toFixed(2);
      const closingQty  = +Number(r.closing_qty).toFixed(2);
      const costPrice   = +Number(r.cost_price).toFixed(0);
      const closingValue = +Number(r.closing_value).toFixed(0);
      return {
        productId:    r.productId,
        sku:          r.sku,
        name:         r.name,
        unit:         r.unit ?? '—',
        categoryName: r.categoryName ?? '—',
        openingQty,
        stockIn,
        stockOut,
        closingQty,
        costPrice,
        closingValue,
      };
    });

    if (stockFilter === 'in_stock')    data = data.filter((r) => r.closingQty > 0);
    if (stockFilter === 'out_of_stock') data = data.filter((r) => r.closingQty <= 0);
    if (stockFilter === 'low_stock')   data = data.filter((r) => r.closingQty > 0 && r.closingQty <= 10);

    const summary = {
      total_opening_qty:  +data.reduce((s, r) => s + r.openingQty, 0).toFixed(2),
      total_stock_in:     +data.reduce((s, r) => s + r.stockIn,    0).toFixed(2),
      total_stock_out:    +data.reduce((s, r) => s + r.stockOut,   0).toFixed(2),
      total_closing_qty:  +data.reduce((s, r) => s + r.closingQty, 0).toFixed(2),
      total_closing_value: data.reduce((s, r) => s + r.closingValue, 0),
    };

    return { summary, data };
  }

  async getDeadstock(filter: DeadstockFilterDto) {
    const ds = await this.getDs();
    const { warehouseId, daysSinceLastSale = 90 } = filter;

    const rows = await ds.query(`
      SELECT
        p.id                                           AS productId,
        p.name,
        COALESCE(bal.currentStock, 0)                  AS currentStock,
        COALESCE(bal.stockValue, 0)                    AS stockValue,
        last_sale.lastSaleDate                         AS lastSaleDate,
        DATEDIFF(NOW(), last_sale.lastSaleDate)        AS daysSinceLastSale
      FROM products p
      LEFT JOIN (
        SELECT product_id,
               SUM(quantity) AS currentStock,
               SUM(quantity * COALESCE(avg_cost, 0)) AS stockValue
        FROM inventory_balances
        WHERE 1=1
          ${warehouseId ? `AND warehouse_id = '${warehouseId}'` : ''}
        GROUP BY product_id
      ) bal ON bal.product_id = p.id
      LEFT JOIN (
        SELECT oi.product_id, MAX(DATE(o.created_at)) AS lastSaleDate
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.type = 'SALES' AND o.status NOT IN ('DRAFT', 'CANCELLED') AND o.deleted_at IS NULL AND oi.deleted_at IS NULL
        GROUP BY oi.product_id
      ) last_sale ON last_sale.product_id = p.id
      WHERE p.deleted_at IS NULL
        AND COALESCE(bal.currentStock, 0) > 0
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
      SELECT
        kind,
        COALESCE(receipt_type, 'OTHER') AS category,
        COALESCE(SUM(amount), 0) AS total
      FROM cash_receipts cr
      WHERE cr.status = 'APPROVED' AND cr.deleted_at IS NULL ${dateFilter}
      GROUP BY kind, receipt_type
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

  async getPurchaseBySupplier(filter: PurchaseBySupplierFilterDto) {
    const ds = await this.getDs();
    const { from, to, supplierCode, paymentFilter = 'all' } = filter;

    const searchClause = supplierCode
      ? `AND (s.code LIKE ? OR s.name LIKE ?)`
      : '';
    const searchParams = supplierCode
      ? [`%${supplierCode}%`, `%${supplierCode}%`]
      : [];

    const rows: any[] = await ds.query(`
      SELECT
        s.id,
        s.code                                                              AS supplier_code,
        s.name                                                              AS supplier_name,
        addr.address,
        s.phone,
        COALESCE(o.order_count,    0)                                       AS order_count,
        COALESCE(o.subtotal,       0)                                       AS subtotal,
        COALESCE(o.total_discount, 0)                                       AS total_discount,
        COALESCE(o.total_payable,  0)                                       AS total_payable,
        COALESCE(p.total_paid,     0)                                       AS total_paid,
        COALESCE(o.total_payable,  0) - COALESCE(p.total_paid, 0)          AS remaining
      FROM suppliers s
      LEFT JOIN (
        SELECT
          supplier_id,
          COUNT(id)                                                         AS order_count,
          SUM(subtotal)                                                     AS subtotal,
          SUM(discount_total + COALESCE(voucher_discount, 0))              AS total_discount,
          SUM(total_amount)                                                 AS total_payable
        FROM orders
        WHERE type = 'PURCHASE'
          AND status NOT IN ('DRAFT', 'CANCELLED')
          AND deleted_at IS NULL
          ${from ? `AND DATE(created_at) >= '${from}'` : ''}
          ${to   ? `AND DATE(created_at) <= '${to}'`   : ''}
        GROUP BY supplier_id
      ) o ON s.id = o.supplier_id
      LEFT JOIN (
        SELECT supplier_id, SUM(amount) AS total_paid
        FROM disbursements
        WHERE disbursement_type = 'SUPPLIER_PAYMENT'
          AND status = 'APPROVED'
          AND deleted_at IS NULL
          ${from ? `AND DATE(created_at) >= '${from}'` : ''}
          ${to   ? `AND DATE(created_at) <= '${to}'`   : ''}
        GROUP BY supplier_id
      ) p ON s.id = p.supplier_id
      LEFT JOIN (
        SELECT
          supplier_id,
          CONCAT_WS(', ', street, district, city) AS address
        FROM supplier_addresses
        WHERE deleted_at IS NULL
          AND is_default = 1
      ) addr ON s.id = addr.supplier_id
      WHERE s.deleted_at IS NULL
        AND (COALESCE(o.order_count, 0) > 0 OR COALESCE(p.total_paid, 0) > 0)
        ${searchClause}
      ORDER BY COALESCE(o.total_payable, 0) DESC
    `, searchParams);

    let data = rows.map((r: any) => {
      const subtotal      = +Number(r.subtotal).toFixed(0);
      const totalDiscount = +Number(r.total_discount).toFixed(0);
      const totalPayable  = +Number(r.total_payable).toFixed(0);
      const totalTax      = Math.max(0, totalPayable - subtotal + totalDiscount);
      const totalPaid     = +Number(r.total_paid).toFixed(0);
      const remaining     = +Number(r.remaining).toFixed(0);
      return {
        supplier_code:  r.supplier_code,
        supplier_name:  r.supplier_name,
        address:        r.address ?? '',
        phone:          r.phone   ?? '',
        order_count:    Number(r.order_count),
        subtotal,
        total_discount: totalDiscount,
        total_tax:      totalTax,
        total_payable:  totalPayable,
        total_paid:     totalPaid,
        remaining,
      };
    });

    if (paymentFilter === 'paid')    data = data.filter((r) => r.remaining === 0);
    if (paymentFilter === 'partial') data = data.filter((r) => r.total_paid > 0 && r.remaining > 0);
    if (paymentFilter === 'unpaid')  data = data.filter((r) => r.total_paid === 0 && r.total_payable > 0);

    const summary = {
      total_order_count: data.reduce((s, r) => s + r.order_count, 0),
      total_subtotal:    data.reduce((s, r) => s + r.subtotal,    0),
      total_discount:    data.reduce((s, r) => s + r.total_discount, 0),
      total_tax:         data.reduce((s, r) => s + r.total_tax,    0),
      total_payable:     data.reduce((s, r) => s + r.total_payable, 0),
      total_paid:        data.reduce((s, r) => s + r.total_paid,   0),
      total_remaining:   data.reduce((s, r) => s + r.remaining,    0),
    };

    return { summary, data };
  }

  async getSalesByProduct(filter: SalesByProductFilterDto) {
    const ds = await this.getDs();
    const {
      from, to, productCode, productIds, categoryId, sortBy = 'net_revenue',
    } = filter;
    const params: Array<string> = [];
    const categoryIds = await this.expandCategoryIds(categoryId);

    let dateClause = '';
    if (from) {
      dateClause += ' AND DATE(o.created_at) >= ?';
      params.push(from);
    }
    if (to) {
      dateClause += ' AND DATE(o.created_at) <= ?';
      params.push(to);
    }

    const categoryClause = categoryIds.length
      ? `AND p.category_id IN (${categoryIds.map(() => '?').join(', ')})`
      : '';
    if (categoryIds.length) params.push(...categoryIds);

    const productIdsClause = productIds?.length
      ? `AND p.id IN (${productIds.map(() => '?').join(', ')})`
      : '';
    if (productIds?.length) params.push(...productIds);

    const searchClause = productCode ? 'AND (p.sku LIKE ? OR p.name LIKE ?)' : '';
    if (productCode) params.push(`%${productCode}%`, `%${productCode}%`);

    const orderClause =
      sortBy === 'quantity_sold' ? 'ORDER BY quantity_sold DESC' :
      sortBy === 'product_code'  ? 'ORDER BY p.sku ASC'         :
                                   'ORDER BY net_revenue DESC';

    const rows: any[] = await ds.query(`
      SELECT
        p.sku                                                    AS product_code,
        p.name                                                   AS product_name,
        COALESCE(cat.name, '—')                                  AS category_name,
        p.base_unit                                              AS unit,
        COALESCE(SUM(oi.quantity), 0)                            AS quantity_sold,
        COALESCE(SUM(oi.unit_price * oi.quantity), 0)            AS total_revenue,
        COALESCE(SUM(oi.discount_amount), 0)                     AS total_discount,
        COALESCE(SUM(oi.line_total), 0)                          AS net_revenue
      FROM order_items oi
      JOIN orders o   ON oi.order_id   = o.id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories cat ON p.category_id = cat.id
      WHERE o.type = 'SALES'
        AND o.status NOT IN ('DRAFT', 'CANCELLED')
        AND o.deleted_at IS NULL AND oi.deleted_at IS NULL
        ${dateClause}
        ${categoryClause}
        ${productIdsClause}
        ${searchClause}
      GROUP BY p.id, p.sku, p.name, p.base_unit, cat.name
      ${orderClause}
    `, params);

    const totalNetRevenue = rows.reduce((s, r) => s + +Number(r.net_revenue).toFixed(0), 0);

    const data = rows.map((r: any) => {
      const qtySold       = +Number(r.quantity_sold).toFixed(4);
      const totalRevenue  = +Number(r.total_revenue).toFixed(0);
      const totalDiscount = +Number(r.total_discount).toFixed(0);
      const netRevenue    = +Number(r.net_revenue).toFixed(0);
      const avgPrice      = qtySold > 0 ? Math.round(totalRevenue / qtySold) : 0;
      const revenueRatio  = totalNetRevenue > 0
        ? +((netRevenue / totalNetRevenue) * 100).toFixed(2)
        : 0;
      return {
        product_code:   r.product_code,
        product_name:   r.product_name,
        category_name:  r.category_name,
        unit:           r.unit ?? '',
        quantity_sold:  qtySold,
        avg_price:      avgPrice,
        total_revenue:  totalRevenue,
        total_discount: totalDiscount,
        net_revenue:    netRevenue,
        revenue_ratio:  revenueRatio,
      };
    });

    const summary = {
      total_quantity_sold: data.reduce((s, r) => s + r.quantity_sold, 0),
      total_revenue:       data.reduce((s, r) => s + r.total_revenue, 0),
      total_discount:      data.reduce((s, r) => s + r.total_discount, 0),
      total_net_revenue:   totalNetRevenue,
    };

    return { summary, data };
  }

  async getSalesByCustomer(filter: SalesByCustomerFilterDto) {
    const ds = await this.getDs();
    const {
      from, to, customerCode, customerIds, debtFilter = 'all',
    } = filter;
    const params: Array<string> = [];

    const openingSalesClause = from
      ? (params.push(from), 'AND DATE(created_at) < ?')
      : 'AND 1=0';
    const openingPaymentClause = from
      ? (params.push(from), 'AND DATE(paid_at) < ?')
      : 'AND 1=0';

    let periodSalesClause = '';
    if (from) {
      periodSalesClause += ' AND DATE(created_at) >= ?';
      params.push(from);
    }
    if (to) {
      periodSalesClause += ' AND DATE(created_at) <= ?';
      params.push(to);
    }

    let periodPaymentClause = '';
    if (from) {
      periodPaymentClause += ' AND DATE(paid_at) >= ?';
      params.push(from);
    }
    if (to) {
      periodPaymentClause += ' AND DATE(paid_at) <= ?';
      params.push(to);
    }

    const customerIdsClause = customerIds?.length
      ? `AND c.id IN (${customerIds.map(() => '?').join(', ')})`
      : '';
    if (customerIds?.length) params.push(...customerIds);

    const searchClause = customerCode
      ? 'AND (c.code LIKE ? OR c.name LIKE ?)'
      : '';
    if (customerCode) params.push(`%${customerCode}%`, `%${customerCode}%`);

    const rows: any[] = await ds.query(`
      SELECT
        c.code                                                       AS customer_code,
        c.name                                                       AS customer_name,
        CONCAT_WS(', ', NULLIF(ca.street, ''), NULLIF(ca.district, ''), NULLIF(ca.city, '')) AS address,
        COALESCE(od.amount, 0) - COALESCE(oc.amount, 0)            AS opening_debt,
        COALESCE(pd.amount, 0)                                       AS total_sales,
        COALESCE(pc.amount, 0)                                       AS total_payment,
        COALESCE(od.amount, 0) - COALESCE(oc.amount, 0)
          + COALESCE(pd.amount, 0) - COALESCE(pc.amount, 0)        AS closing_debt
      FROM customers c
      LEFT JOIN customer_addresses ca
        ON ca.customer_id = c.id
       AND ca.is_default = 1
       AND ca.deleted_at IS NULL
      LEFT JOIN (
        SELECT customer_id, SUM(total_amount) AS amount
        FROM orders
        WHERE type = 'SALES' AND status NOT IN ('DRAFT','CANCELLED') AND deleted_at IS NULL
          ${openingSalesClause}
        GROUP BY customer_id
      ) od ON c.id = od.customer_id
      LEFT JOIN (
        SELECT customer_id, SUM(amount) AS amount
        FROM payments
        WHERE deleted_at IS NULL
          ${openingPaymentClause}
        GROUP BY customer_id
      ) oc ON c.id = oc.customer_id
      LEFT JOIN (
        SELECT customer_id, SUM(total_amount) AS amount
        FROM orders
        WHERE type = 'SALES' AND status NOT IN ('DRAFT','CANCELLED') AND deleted_at IS NULL
          ${periodSalesClause}
        GROUP BY customer_id
      ) pd ON c.id = pd.customer_id
      LEFT JOIN (
        SELECT customer_id, SUM(amount) AS amount
        FROM payments
        WHERE deleted_at IS NULL
          ${periodPaymentClause}
        GROUP BY customer_id
      ) pc ON c.id = pc.customer_id
      WHERE c.deleted_at IS NULL
        AND (
          COALESCE(od.amount, 0) - COALESCE(oc.amount, 0) <> 0
          OR COALESCE(pd.amount, 0) > 0
          OR COALESCE(pc.amount, 0) > 0
        )
        ${customerIdsClause}
        ${searchClause}
      ORDER BY c.code ASC
    `, params);

    let data = rows
      .map((r: any) => ({
        customer_code: r.customer_code,
        customer_name: r.customer_name,
        address:       r.address ?? '',
        opening_debt:  +Number(r.opening_debt).toFixed(0),
        total_sales:   +Number(r.total_sales).toFixed(0),
        total_payment: +Number(r.total_payment).toFixed(0),
        closing_debt:  +Number(r.closing_debt).toFixed(0),
      }))
      .filter((r) => {
        if (debtFilter === 'has_debt') return r.closing_debt > 0;
        if (debtFilter === 'no_debt')  return r.closing_debt <= 0;
        return true;
      });

    const summary = {
      total_opening_debt: data.reduce((s, r) => s + r.opening_debt, 0),
      total_sales:        data.reduce((s, r) => s + r.total_sales,   0),
      total_payment:      data.reduce((s, r) => s + r.total_payment, 0),
      total_closing_debt: data.reduce((s, r) => s + r.closing_debt,  0),
    };

    return { summary, data };
  }

  async getDebtByCustomer(filter: DebtByCustomerFilterDto) {
    const ds = await this.getDs();
    const { from, to, customerCode, debtFilter = 'all' } = filter;

    const searchClause = customerCode
      ? `AND (c.code LIKE ? OR c.name LIKE ?)`
      : '';
    const searchParams = customerCode
      ? [`%${customerCode}%`, `%${customerCode}%`]
      : [];

    const rows: any[] = await ds.query(`
      SELECT
        c.id,
        c.code                                                     AS customer_code,
        c.name                                                     AS customer_name,
        c.phone,
        CAST(c.credit_limit AS DECIMAL(18,2))                     AS credit_limit,
        COALESCE(od.amount, 0) - COALESCE(oc.amount, 0)          AS opening_debt,
        COALESCE(pd.amount, 0)                                     AS debit_amount,
        COALESCE(pc.amount, 0)                                     AS credit_amount,
        COALESCE(od.amount, 0) - COALESCE(oc.amount, 0)
          + COALESCE(pd.amount, 0) - COALESCE(pc.amount, 0)      AS closing_debt
      FROM customers c
      LEFT JOIN (
        SELECT customer_id, SUM(total_amount) AS amount
        FROM orders
        WHERE type = 'SALES' AND status NOT IN ('DRAFT','CANCELLED') AND deleted_at IS NULL
          ${from ? `AND DATE(created_at) < '${from}'` : 'AND 1=0'}
        GROUP BY customer_id
      ) od ON c.id = od.customer_id
      LEFT JOIN (
        SELECT customer_id, SUM(amount) AS amount
        FROM payments
        WHERE deleted_at IS NULL
          ${from ? `AND DATE(paid_at) < '${from}'` : 'AND 1=0'}
        GROUP BY customer_id
      ) oc ON c.id = oc.customer_id
      LEFT JOIN (
        SELECT customer_id, SUM(total_amount) AS amount
        FROM orders
        WHERE type = 'SALES' AND status NOT IN ('DRAFT','CANCELLED') AND deleted_at IS NULL
          ${from ? `AND DATE(created_at) >= '${from}'` : ''}
          ${to   ? `AND DATE(created_at) <= '${to}'`   : ''}
        GROUP BY customer_id
      ) pd ON c.id = pd.customer_id
      LEFT JOIN (
        SELECT customer_id, SUM(amount) AS amount
        FROM payments
        WHERE deleted_at IS NULL
          ${from ? `AND DATE(paid_at) >= '${from}'` : ''}
          ${to   ? `AND DATE(paid_at) <= '${to}'`   : ''}
        GROUP BY customer_id
      ) pc ON c.id = pc.customer_id
      WHERE c.deleted_at IS NULL
        AND (
          COALESCE(od.amount, 0) - COALESCE(oc.amount, 0) <> 0
          OR COALESCE(pd.amount, 0) > 0
          OR COALESCE(pc.amount, 0) > 0
        )
        ${searchClause}
      ORDER BY closing_debt DESC
    `, searchParams);

    const filtered = rows.filter((r: any) => {
      const opening = +Number(r.opening_debt).toFixed(0);
      const closing = +Number(r.closing_debt).toFixed(0);
      const limit   = +Number(r.credit_limit).toFixed(0);
      if (debtFilter === 'has_debt')   return closing > 0;
      if (debtFilter === 'no_debt')    return closing <= 0;
      if (debtFilter === 'over_limit') return limit > 0 && closing > limit;
      return true;
    });

    const data = filtered.map((r: any, i: number) => {
      const opening  = +Number(r.opening_debt).toFixed(0);
      const debit    = +Number(r.debit_amount).toFixed(0);
      const credit   = +Number(r.credit_amount).toFixed(0);
      const closing  = +Number(r.closing_debt).toFixed(0);
      const limit    = +Number(r.credit_limit).toFixed(0);
      return {
        stt:           i + 1,
        customer_code: r.customer_code,
        customer_name: r.customer_name,
        phone:         r.phone ?? '',
        opening_debt:  opening,
        debit_amount:  debit,
        credit_amount: credit,
        closing_debt:  closing,
        credit_limit:  limit,
        over_limit:    limit > 0 && closing > limit,
      };
    });

    const summary = {
      total_opening_debt: data.reduce((s, r) => s + r.opening_debt, 0),
      total_debit:        data.reduce((s, r) => s + r.debit_amount, 0),
      total_credit:       data.reduce((s, r) => s + r.credit_amount, 0),
      total_closing_debt: data.reduce((s, r) => s + r.closing_debt, 0),
      over_limit_count:   data.filter((r) => r.over_limit).length,
    };

    return { summary, data };
  }

  async getDebtBySupplier(filter: DebtBySupplierFilterDto) {
    const ds = await this.getDs();
    const { from, to, supplierCode, debtFilter = 'all' } = filter;

    const searchClause = supplierCode
      ? `AND (s.code LIKE ? OR s.name LIKE ?)`
      : '';
    const searchParams = supplierCode
      ? [`%${supplierCode}%`, `%${supplierCode}%`]
      : [];

    const rows: any[] = await ds.query(`
      SELECT
        s.id,
        s.code                                                      AS supplier_code,
        s.name                                                      AS supplier_name,
        s.phone,
        COALESCE(od.amount, 0) - COALESCE(oc.amount, 0)            AS opening_debt,
        COALESCE(pd.amount, 0)                                      AS debit_amount,
        COALESCE(pc.amount, 0)                                      AS credit_amount,
        COALESCE(od.amount, 0) - COALESCE(oc.amount, 0)
          + COALESCE(pd.amount, 0) - COALESCE(pc.amount, 0)        AS closing_debt
      FROM suppliers s
      LEFT JOIN (
        SELECT supplier_id, SUM(total_amount) AS amount
        FROM orders
        WHERE type = 'PURCHASE' AND status NOT IN ('DRAFT','CANCELLED') AND deleted_at IS NULL
          ${from ? `AND DATE(created_at) < '${from}'` : 'AND 1=0'}
        GROUP BY supplier_id
      ) od ON s.id = od.supplier_id
      LEFT JOIN (
        SELECT supplier_id, SUM(amount) AS amount
        FROM disbursements
        WHERE disbursement_type = 'SUPPLIER_PAYMENT' AND status = 'APPROVED' AND deleted_at IS NULL
          ${from ? `AND DATE(created_at) < '${from}'` : 'AND 1=0'}
        GROUP BY supplier_id
      ) oc ON s.id = oc.supplier_id
      LEFT JOIN (
        SELECT supplier_id, SUM(total_amount) AS amount
        FROM orders
        WHERE type = 'PURCHASE' AND status NOT IN ('DRAFT','CANCELLED') AND deleted_at IS NULL
          ${from ? `AND DATE(created_at) >= '${from}'` : ''}
          ${to   ? `AND DATE(created_at) <= '${to}'`   : ''}
        GROUP BY supplier_id
      ) pd ON s.id = pd.supplier_id
      LEFT JOIN (
        SELECT supplier_id, SUM(amount) AS amount
        FROM disbursements
        WHERE disbursement_type = 'SUPPLIER_PAYMENT' AND status = 'APPROVED' AND deleted_at IS NULL
          ${from ? `AND DATE(created_at) >= '${from}'` : ''}
          ${to   ? `AND DATE(created_at) <= '${to}'`   : ''}
        GROUP BY supplier_id
      ) pc ON s.id = pc.supplier_id
      WHERE s.deleted_at IS NULL
        AND (
          COALESCE(od.amount, 0) - COALESCE(oc.amount, 0) <> 0
          OR COALESCE(pd.amount, 0) > 0
          OR COALESCE(pc.amount, 0) > 0
        )
        ${searchClause}
      ORDER BY closing_debt DESC
    `, searchParams);

    const filtered = rows.filter((r: any) => {
      const closing = +Number(r.closing_debt).toFixed(0);
      if (debtFilter === 'has_debt') return closing > 0;
      if (debtFilter === 'no_debt')  return closing <= 0;
      return true;
    });

    const data = filtered.map((r: any, i: number) => ({
      stt:           i + 1,
      supplier_code: r.supplier_code,
      supplier_name: r.supplier_name,
      phone:         r.phone ?? '',
      opening_debt:  +Number(r.opening_debt).toFixed(0),
      debit_amount:  +Number(r.debit_amount).toFixed(0),
      credit_amount: +Number(r.credit_amount).toFixed(0),
      closing_debt:  +Number(r.closing_debt).toFixed(0),
    }));

    const summary = {
      total_opening_debt: data.reduce((s, r) => s + r.opening_debt, 0),
      total_debit:        data.reduce((s, r) => s + r.debit_amount, 0),
      total_credit:       data.reduce((s, r) => s + r.credit_amount, 0),
      total_closing_debt: data.reduce((s, r) => s + r.closing_debt, 0),
    };

    return { summary, data };
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

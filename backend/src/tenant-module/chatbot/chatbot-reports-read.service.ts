import { Injectable } from '@nestjs/common';
import { ChatbotQueryContextService } from './chatbot-query-context.service';
import type { ChatbotAccessContext } from './chatbot-access.service';

@Injectable()
export class ChatbotReportsReadService {
  constructor(private readonly queryCtx: ChatbotQueryContextService) {}

  async getDashboardStats(access?: ChatbotAccessContext) {
    const ds = await this.queryCtx.getDs();
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
        `SELECT COALESCE(SUM(i.total_amount), 0) AS total
           FROM invoices i
           LEFT JOIN orders o ON o.id = i.order_id
          WHERE i.created_at >= ? AND i.deleted_at IS NULL
            ${access?.role === 'STAFF' ? 'AND o.sales_rep_id = ?' : ''}`,
        [firstOfMonth, ...(access?.role === 'STAFF' ? [access.userId] : [])],
      ),
      ds.query(
        `SELECT COUNT(*) AS cnt
           FROM inventory_balances ib
           JOIN products p ON p.id = ib.product_id AND p.deleted_at IS NULL
          WHERE ib.quantity > 0 AND ib.quantity <= p.min_stock_level AND p.min_stock_level > 0`,
      ),
      ds.query(
        `SELECT COUNT(*) AS cnt FROM orders
          WHERE status IN ('CONFIRMED', 'DELIVERING') AND deleted_at IS NULL
            ${access?.role === 'STAFF' ? 'AND sales_rep_id = ?' : ''}`,
        access?.role === 'STAFF' ? [access.userId] : [],
      ),
      ds.query(
        `SELECT COUNT(*) AS cnt FROM orders
          WHERE deleted_at IS NULL
            ${access?.role === 'STAFF' ? 'AND sales_rep_id = ?' : ''}`,
        access?.role === 'STAFF' ? [access.userId] : [],
      ),
    ]);

    return {
      summary: {
        totalProducts: Number(totalProducts[0]?.cnt ?? 0),
        totalCustomers: Number(totalCustomers[0]?.cnt ?? 0),
        monthRevenue: Number(monthRevenue[0]?.total ?? 0),
        lowStockCount: Number(lowStockCount[0]?.cnt ?? 0),
        pendingOrders: Number(pendingOrders[0]?.cnt ?? 0),
        totalOrders: Number(totalOrders[0]?.cnt ?? 0),
      },
    };
  }

  async getSalesReport({
    fromDate,
    toDate,
    groupBy = 'day',
  }: {
    fromDate?: string;
    toDate?: string;
    groupBy?: string;
  }, access?: ChatbotAccessContext) {
    const ds = await this.queryCtx.getDs();
    const bucket =
      groupBy === 'month'
        ? "DATE_FORMAT(i.issued_at, '%Y-%m')"
        : groupBy === 'year'
          ? "DATE_FORMAT(i.issued_at, '%Y')"
          : groupBy === 'week'
            ? "DATE_FORMAT(DATE_SUB(DATE(i.issued_at), INTERVAL WEEKDAY(i.issued_at) DAY), '%Y-%m-%d')"
            : 'DATE(i.issued_at)';

    const where: string[] = [`i.status <> 'CANCELLED'`];
    const params: any[] = [];
    if (fromDate) {
      where.push('DATE(i.issued_at) >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      where.push('DATE(i.issued_at) <= ?');
      params.push(toDate);
    }
    if (access?.role === 'STAFF') {
      where.push('o.sales_rep_id = ?');
      params.push(access.userId);
    }

    const [summaryRows, detailRows] = await Promise.all([
      ds.query(
        `SELECT COUNT(*) AS invoice_count,
                COALESCE(SUM(i.total_amount), 0) AS revenue,
                COALESCE(SUM(i.paid_amount), 0) AS paid_amount,
                COALESCE(SUM(i.total_amount - i.paid_amount), 0) AS balance_due
           FROM invoices i
           LEFT JOIN orders o ON o.id = i.order_id
          WHERE ${where.join(' AND ')}`,
        params,
      ),
      ds.query(
        `SELECT ${bucket} AS period,
                COUNT(*) AS invoice_count,
                COALESCE(SUM(i.total_amount), 0) AS revenue,
                COALESCE(SUM(i.paid_amount), 0) AS paid_amount
           FROM invoices i
           LEFT JOIN orders o ON o.id = i.order_id
          WHERE ${where.join(' AND ')}
          GROUP BY ${bucket}
          ORDER BY period DESC`,
        params,
      ),
    ]);

    return {
      summary: summaryRows[0],
      count: detailRows.length,
      items: detailRows,
      groupBy,
    };
  }

  async getProfitByProduct({
    fromDate,
    toDate,
    productQuery,
    limit = 20,
  }: {
    fromDate?: string;
    toDate?: string;
    productQuery?: string;
    limit?: number;
  }, access?: ChatbotAccessContext) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = [`o.type = 'SALES'`, `o.status <> 'CANCELLED'`];
    const params: any[] = [];

    if (fromDate) {
      where.push('DATE(o.created_at) >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      where.push('DATE(o.created_at) <= ?');
      params.push(toDate);
    }
    if (productQuery) {
      where.push('(p.sku LIKE ? OR p.name LIKE ?)');
      params.push(this.queryCtx.like(productQuery), this.queryCtx.like(productQuery));
    }
    if (access?.role === 'STAFF') {
      where.push('o.sales_rep_id = ?');
      params.push(access.userId);
    }
    params.push(lim);

    const rows = await ds.query(
      `SELECT p.sku, p.name AS product_name,
              SUM(oi.quantity) AS quantity_sold,
              SUM(oi.line_total) AS revenue,
              SUM(COALESCE(oi.cost_price, 0) * oi.quantity) AS cost_amount,
              SUM(oi.line_total - (COALESCE(oi.cost_price, 0) * oi.quantity)) AS gross_profit
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN products p ON p.id = oi.product_id
        WHERE ${where.join(' AND ')}
        GROUP BY p.id, p.sku, p.name
        ORDER BY gross_profit DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }

  async getCashflowReport({
    fromDate,
    toDate,
  }: {
    fromDate?: string;
    toDate?: string;
  }, access?: ChatbotAccessContext) {
    const ds = await this.queryCtx.getDs();
    const where: string[] = ['cr.status = ?'];
    const params: any[] = ['APPROVED'];
    if (fromDate) {
      where.push('DATE(cr.created_at) >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      where.push('DATE(cr.created_at) <= ?');
      params.push(toDate);
    }

    const [summaryRows, detailRows] = await Promise.all([
      ds.query(
        `SELECT
            COALESCE(SUM(CASE WHEN cr.kind = 'RECEIPT' THEN cr.amount ELSE 0 END), 0) AS cash_in,
            COALESCE(SUM(CASE WHEN cr.kind = 'DISBURSEMENT' THEN cr.amount ELSE 0 END), 0) AS cash_out,
            COALESCE(SUM(CASE WHEN cr.kind = 'RECEIPT' THEN cr.amount ELSE -cr.amount END), 0) AS net_cashflow
           FROM cash_receipts cr
          WHERE ${where.join(' AND ')}`,
        params,
      ),
      ds.query(
        `SELECT DATE(cr.created_at) AS period,
                COALESCE(SUM(CASE WHEN cr.kind = 'RECEIPT' THEN cr.amount ELSE 0 END), 0) AS cash_in,
                COALESCE(SUM(CASE WHEN cr.kind = 'DISBURSEMENT' THEN cr.amount ELSE 0 END), 0) AS cash_out,
                COALESCE(SUM(CASE WHEN cr.kind = 'RECEIPT' THEN cr.amount ELSE -cr.amount END), 0) AS net_cashflow
           FROM cash_receipts cr
          WHERE ${where.join(' AND ')}
          GROUP BY DATE(cr.created_at)
          ORDER BY period DESC`,
        params,
      ),
    ]);

    return { summary: summaryRows[0], count: detailRows.length, items: detailRows };
  }

  async getKpiReport({
    fromDate,
    toDate,
  }: {
    fromDate?: string;
    toDate?: string;
  }, access?: ChatbotAccessContext) {
    const ds = await this.queryCtx.getDs();
    const invoiceWhere: string[] = [`status <> 'CANCELLED'`];
    const orderWhere: string[] = ['1=1'];
    const invoiceParams: any[] = [];
    const orderParams: any[] = [];

    if (fromDate) {
      invoiceWhere.push('DATE(issued_at) >= ?');
      orderWhere.push('DATE(created_at) >= ?');
      invoiceParams.push(fromDate);
      orderParams.push(fromDate);
    }
    if (toDate) {
      invoiceWhere.push('DATE(issued_at) <= ?');
      orderWhere.push('DATE(created_at) <= ?');
      invoiceParams.push(toDate);
      orderParams.push(toDate);
    }
    if (access?.role === 'STAFF') {
      invoiceWhere.push('o.sales_rep_id = ?');
      orderWhere.push('sales_rep_id = ?');
      invoiceParams.push(access.userId);
      orderParams.push(access.userId);
    }

    const [invoiceStats, orderStats, customerStats] = await Promise.all([
      ds.query(
        `SELECT COUNT(*) AS invoice_count,
                COALESCE(SUM(total_amount), 0) AS revenue,
                COALESCE(AVG(total_amount), 0) AS average_invoice_value
           FROM invoices i
           LEFT JOIN orders o ON o.id = i.order_id
          WHERE ${invoiceWhere.join(' AND ')}`,
        invoiceParams,
      ),
      ds.query(
        `SELECT COUNT(*) AS order_count,
                SUM(CASE WHEN status IN ('DELIVERED', 'FULLY_RETURNED', 'PARTIALLY_RETURNED') THEN 1 ELSE 0 END) AS closed_order_count
           FROM orders
          WHERE ${orderWhere.join(' AND ')}`,
        orderParams,
      ),
      ds.query(
        `SELECT COUNT(*) AS customer_count FROM customers
          WHERE deleted_at IS NULL
            ${access?.role === 'STAFF' ? 'AND sales_rep_id = ?' : ''}`,
        access?.role === 'STAFF' ? [access.userId] : [],
      ),
    ]);

    return {
      summary: {
        invoiceCount: Number(invoiceStats[0]?.invoice_count ?? 0),
        revenue: Number(invoiceStats[0]?.revenue ?? 0),
        averageInvoiceValue: Number(invoiceStats[0]?.average_invoice_value ?? 0),
        orderCount: Number(orderStats[0]?.order_count ?? 0),
        closedOrderCount: Number(orderStats[0]?.closed_order_count ?? 0),
        customerCount: Number(customerStats[0]?.customer_count ?? 0),
      },
    };
  }

  async getDebtByCustomer({
    customerQuery,
    debtFilter = 'all',
    limit = 20,
  }: {
    customerQuery?: string;
    debtFilter?: string;
    limit?: number;
  }, access?: ChatbotAccessContext) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = ['deleted_at IS NULL'];
    const params: any[] = [];

    if (customerQuery) {
      where.push('(code LIKE ? OR name LIKE ?)');
      params.push(this.queryCtx.like(customerQuery), this.queryCtx.like(customerQuery));
    }
    if (access?.role === 'STAFF') {
      where.push('sales_rep_id = ?');
      params.push(access.userId);
    }
    if (debtFilter === 'has_debt') where.push('current_debt > 0');
    if (debtFilter === 'no_debt') where.push('current_debt = 0');
    if (debtFilter === 'over_limit') where.push('current_debt > credit_limit');
    params.push(lim);

    const rows = await ds.query(
      `SELECT code, name, credit_limit, current_debt,
              CASE WHEN credit_limit > 0 THEN ROUND((current_debt / credit_limit) * 100, 2) ELSE NULL END AS credit_usage_percent
         FROM customers
        WHERE ${where.join(' AND ')}
        ORDER BY current_debt DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }

  async getDebtBySupplier({
    supplierQuery,
    debtFilter = 'all',
    limit = 20,
  }: {
    supplierQuery?: string;
    debtFilter?: string;
    limit?: number;
  }, access?: ChatbotAccessContext) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = ['deleted_at IS NULL'];
    const params: any[] = [];

    if (supplierQuery) {
      where.push('(code LIKE ? OR name LIKE ?)');
      params.push(this.queryCtx.like(supplierQuery), this.queryCtx.like(supplierQuery));
    }
    if (debtFilter === 'has_debt') where.push('current_debt > 0');
    if (debtFilter === 'no_debt') where.push('current_debt = 0');
    params.push(lim);

    const rows = await ds.query(
      `SELECT code, name, current_debt
         FROM suppliers
        WHERE ${where.join(' AND ')}
        ORDER BY current_debt DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }

  async getSalesByProduct({
    fromDate,
    toDate,
    productQuery,
    sortBy = 'net_revenue',
    limit = 20,
  }: {
    fromDate?: string;
    toDate?: string;
    productQuery?: string;
    sortBy?: string;
    limit?: number;
  }, access?: ChatbotAccessContext) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = [`o.type = 'SALES'`, `o.status <> 'CANCELLED'`];
    const params: any[] = [];

    if (fromDate) {
      where.push('DATE(o.created_at) >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      where.push('DATE(o.created_at) <= ?');
      params.push(toDate);
    }
    if (productQuery) {
      where.push('(p.sku LIKE ? OR p.name LIKE ?)');
      params.push(this.queryCtx.like(productQuery), this.queryCtx.like(productQuery));
    }
    if (access?.role === 'STAFF') {
      where.push('o.sales_rep_id = ?');
      params.push(access.userId);
    }
    params.push(lim);

    const orderBy =
      sortBy === 'quantity_sold'
        ? 'quantity_sold DESC'
        : sortBy === 'product_code'
          ? 'sku ASC'
          : 'net_revenue DESC';

    const rows = await ds.query(
      `SELECT p.sku, p.name AS product_name,
              SUM(oi.quantity) AS quantity_sold,
              SUM(oi.line_total) AS net_revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN products p ON p.id = oi.product_id
        WHERE ${where.join(' AND ')}
        GROUP BY p.id, p.sku, p.name
        ORDER BY ${orderBy}
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows, sortBy };
  }

  async getSalesByCustomer({
    fromDate,
    toDate,
    customerQuery,
    limit = 20,
  }: {
    fromDate?: string;
    toDate?: string;
    customerQuery?: string;
    limit?: number;
  }, access?: ChatbotAccessContext) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = [`i.status <> 'CANCELLED'`];
    const params: any[] = [];

    if (fromDate) {
      where.push('DATE(i.issued_at) >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      where.push('DATE(i.issued_at) <= ?');
      params.push(toDate);
    }
    if (customerQuery) {
      where.push('(c.code LIKE ? OR c.name LIKE ?)');
      params.push(this.queryCtx.like(customerQuery), this.queryCtx.like(customerQuery));
    }
    if (access?.role === 'STAFF') {
      where.push('c.sales_rep_id = ?');
      params.push(access.userId);
    }
    params.push(lim);

    const rows = await ds.query(
      `SELECT c.code, c.name,
              COUNT(*) AS invoice_count,
              COALESCE(SUM(i.total_amount), 0) AS total_revenue,
              COALESCE(SUM(i.total_amount - i.paid_amount), 0) AS total_balance_due
         FROM invoices i
         JOIN customers c ON c.id = i.customer_id
        WHERE ${where.join(' AND ')}
        GROUP BY c.id, c.code, c.name
        ORDER BY total_revenue DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }

  async getPurchaseBySupplier({
    fromDate,
    toDate,
    supplierQuery,
    limit = 20,
  }: {
    fromDate?: string;
    toDate?: string;
    supplierQuery?: string;
    limit?: number;
  }, access?: ChatbotAccessContext) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = [`pi.status <> 'CANCELLED'`];
    const params: any[] = [];

    if (fromDate) {
      where.push('DATE(pi.issued_at) >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      where.push('DATE(pi.issued_at) <= ?');
      params.push(toDate);
    }
    if (supplierQuery) {
      where.push('(s.code LIKE ? OR s.name LIKE ?)');
      params.push(this.queryCtx.like(supplierQuery), this.queryCtx.like(supplierQuery));
    }
    params.push(lim);

    const rows = await ds.query(
      `SELECT s.code, s.name,
              COUNT(*) AS invoice_count,
              COALESCE(SUM(pi.total_amount), 0) AS total_purchase_amount,
              COALESCE(SUM(pi.total_amount - pi.paid_amount), 0) AS total_balance_due
         FROM purchase_invoices pi
         JOIN suppliers s ON s.id = pi.supplier_id
        WHERE ${where.join(' AND ')}
        GROUP BY s.id, s.code, s.name
        ORDER BY total_purchase_amount DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }

  async getDeadstockReport({
    warehouseQuery,
    daysSinceLastSale = 30,
    limit = 20,
  }: {
    warehouseQuery?: string;
    daysSinceLastSale?: number;
    limit?: number;
  }, access?: ChatbotAccessContext) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = ['ib.quantity > 0'];
    const params: any[] = [];

    if (warehouseQuery) {
      where.push('w.name LIKE ?');
      params.push(this.queryCtx.like(warehouseQuery));
    }
    params.push(Math.max(Number(daysSinceLastSale ?? 30), 0));
    params.push(lim);

    const rows = await ds.query(
      `SELECT p.sku, p.name AS product_name,
              w.name AS warehouse_name,
              ib.quantity,
              MAX(CASE WHEN o.type = 'SALES' THEN o.created_at ELSE NULL END) AS last_sale_at,
              DATEDIFF(CURDATE(), DATE(MAX(CASE WHEN o.type = 'SALES' THEN o.created_at ELSE NULL END))) AS days_since_last_sale
         FROM inventory_balances ib
         JOIN products p ON p.id = ib.product_id
         JOIN warehouses w ON w.id = ib.warehouse_id
         LEFT JOIN order_items oi ON oi.product_id = p.id
         LEFT JOIN orders o ON o.id = oi.order_id AND o.status <> 'CANCELLED'
        WHERE ${where.join(' AND ')}
        GROUP BY p.id, p.sku, p.name, w.name, ib.quantity
        HAVING last_sale_at IS NULL OR DATEDIFF(CURDATE(), DATE(last_sale_at)) >= ?
        ORDER BY days_since_last_sale DESC, ib.quantity DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows, threshold_days: Number(daysSinceLastSale ?? 30) };
  }

  async getAbcAnalysis({
    fromDate,
    toDate,
    limit = 50,
  }: {
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }, access?: ChatbotAccessContext) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 50, 200);
    const where: string[] = [`o.type = 'SALES'`, `o.status <> 'CANCELLED'`];
    const params: any[] = [];

    if (fromDate) {
      where.push('DATE(o.created_at) >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      where.push('DATE(o.created_at) <= ?');
      params.push(toDate);
    }
    params.push(lim);

    const rows = await ds.query(
      `SELECT p.sku, p.name AS product_name,
              SUM(oi.line_total) AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN products p ON p.id = oi.product_id
        WHERE ${where.join(' AND ')}
        GROUP BY p.id, p.sku, p.name
        ORDER BY revenue DESC
        LIMIT ?`,
      params,
    );

    const totalRevenue = rows.reduce((sum: number, row: any) => sum + Number(row.revenue ?? 0), 0);
    let cumulative = 0;
    const items = rows.map((row: any) => {
      const revenue = Number(row.revenue ?? 0);
      cumulative += revenue;
      const share = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
      const cumulativeShare = totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 0;
      const abcClass = cumulativeShare <= 80 ? 'A' : cumulativeShare <= 95 ? 'B' : 'C';
      return {
        ...row,
        revenue,
        revenue_share_percent: Number(share.toFixed(2)),
        cumulative_share_percent: Number(cumulativeShare.toFixed(2)),
        abc_class: abcClass,
      };
    });

    return {
      summary: { totalRevenue, itemCount: items.length },
      count: items.length,
      items,
    };
  }
}

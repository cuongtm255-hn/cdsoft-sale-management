import { Injectable } from '@nestjs/common';
import { ChatbotQueryContextService } from './chatbot-query-context.service';
import type { ChatbotAccessContext } from './chatbot-access.service';

@Injectable()
export class ChatbotOrdersReadService {
  constructor(private readonly queryCtx: ChatbotQueryContextService) {}

  async getInvoices({
    codeQuery,
    customerQuery,
    status,
    fromDate,
    toDate,
    limit = 20,
  }: {
    codeQuery?: string;
    customerQuery?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }, access?: ChatbotAccessContext) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = ['1=1'];
    const params: any[] = [];

    if (codeQuery) {
      where.push('i.code LIKE ?');
      params.push(this.queryCtx.like(codeQuery));
    }
    if (customerQuery) {
      where.push('(c.code LIKE ? OR c.name LIKE ?)');
      params.push(this.queryCtx.like(customerQuery), this.queryCtx.like(customerQuery));
    }
    if (status) {
      where.push('i.status = ?');
      params.push(status);
    }
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
    params.push(lim);

    const rows = await ds.query(
      `SELECT i.code, i.status, i.total_amount, i.paid_amount,
              (i.total_amount - i.paid_amount) AS balance_due,
              i.issued_at, i.due_date,
              c.code AS customer_code, c.name AS customer_name,
              o.code AS order_code
         FROM invoices i
         LEFT JOIN customers c ON c.id = i.customer_id
         LEFT JOIN orders o ON o.id = i.order_id
        WHERE ${where.join(' AND ')}
        ORDER BY i.issued_at DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }

  async getPurchaseInvoices({
    codeQuery,
    supplierQuery,
    status,
    fromDate,
    toDate,
    limit = 20,
  }: {
    codeQuery?: string;
    supplierQuery?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = ['1=1'];
    const params: any[] = [];

    if (codeQuery) {
      where.push('pi.code LIKE ?');
      params.push(this.queryCtx.like(codeQuery));
    }
    if (supplierQuery) {
      where.push('(s.code LIKE ? OR s.name LIKE ?)');
      params.push(this.queryCtx.like(supplierQuery), this.queryCtx.like(supplierQuery));
    }
    if (status) {
      where.push('pi.status = ?');
      params.push(status);
    }
    if (fromDate) {
      where.push('DATE(pi.issued_at) >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      where.push('DATE(pi.issued_at) <= ?');
      params.push(toDate);
    }
    params.push(lim);

    const rows = await ds.query(
      `SELECT pi.code, pi.status, pi.total_amount, pi.paid_amount,
              (pi.total_amount - pi.paid_amount) AS balance_due,
              pi.issued_at, pi.due_date,
              s.code AS supplier_code, s.name AS supplier_name
         FROM purchase_invoices pi
         LEFT JOIN suppliers s ON s.id = pi.supplier_id
        WHERE ${where.join(' AND ')}
        ORDER BY pi.issued_at DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }

  async getSalesOrders({
    codeQuery,
    customerQuery,
    status,
    fromDate,
    toDate,
    limit = 20,
  }: {
    codeQuery?: string;
    customerQuery?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }, access?: ChatbotAccessContext) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = [`o.type = 'SALES'`];
    const params: any[] = [];

    if (codeQuery) {
      where.push('o.code LIKE ?');
      params.push(this.queryCtx.like(codeQuery));
    }
    if (customerQuery) {
      where.push('(c.code LIKE ? OR c.name LIKE ?)');
      params.push(this.queryCtx.like(customerQuery), this.queryCtx.like(customerQuery));
    }
    if (status) {
      where.push('o.status = ?');
      params.push(status);
    }
    if (fromDate) {
      where.push('DATE(o.created_at) >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      where.push('DATE(o.created_at) <= ?');
      params.push(toDate);
    }
    if (access?.role === 'STAFF') {
      where.push('o.sales_rep_id = ?');
      params.push(access.userId);
    }
    params.push(lim);

    const rows = await ds.query(
      `SELECT o.code, o.status, o.total_amount, o.paid_amount, o.payment_method,
              o.confirmed_at, o.created_at,
              c.code AS customer_code, c.name AS customer_name,
              w.name AS warehouse_name,
              (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
         FROM orders o
         LEFT JOIN customers c ON c.id = o.customer_id
         LEFT JOIN warehouses w ON w.id = o.warehouse_id
        WHERE ${where.join(' AND ')}
        ORDER BY o.created_at DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }

  async getPurchaseOrders({
    codeQuery,
    supplierQuery,
    status,
    fromDate,
    toDate,
    limit = 20,
  }: {
    codeQuery?: string;
    supplierQuery?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = [`o.type = 'PURCHASE'`];
    const params: any[] = [];

    if (codeQuery) {
      where.push('o.code LIKE ?');
      params.push(this.queryCtx.like(codeQuery));
    }
    if (supplierQuery) {
      where.push('(s.code LIKE ? OR s.name LIKE ?)');
      params.push(this.queryCtx.like(supplierQuery), this.queryCtx.like(supplierQuery));
    }
    if (status) {
      where.push('o.status = ?');
      params.push(status);
    }
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
      `SELECT o.code, o.status, o.total_amount, o.paid_amount, o.payment_method,
              o.confirmed_at, o.created_at,
              s.code AS supplier_code, s.name AS supplier_name,
              w.name AS warehouse_name,
              (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
         FROM orders o
         LEFT JOIN suppliers s ON s.id = o.supplier_id
         LEFT JOIN warehouses w ON w.id = o.warehouse_id
        WHERE ${where.join(' AND ')}
        ORDER BY o.created_at DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }

  async getReturnOrders({
    codeQuery,
    customerQuery,
    status,
    fromDate,
    toDate,
    limit = 20,
  }: {
    codeQuery?: string;
    customerQuery?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }, access?: ChatbotAccessContext) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = ['1=1'];
    const params: any[] = [];

    if (codeQuery) {
      where.push('ro.code LIKE ?');
      params.push(this.queryCtx.like(codeQuery));
    }
    if (customerQuery) {
      where.push('(c.code LIKE ? OR c.name LIKE ?)');
      params.push(this.queryCtx.like(customerQuery), this.queryCtx.like(customerQuery));
    }
    if (status) {
      where.push('ro.status = ?');
      params.push(status);
    }
    if (fromDate) {
      where.push('DATE(ro.created_at) >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      where.push('DATE(ro.created_at) <= ?');
      params.push(toDate);
    }
    if (access?.role === 'STAFF') {
      where.push('o.sales_rep_id = ?');
      params.push(access.userId);
    }
    params.push(lim);

    const rows = await ds.query(
      `SELECT ro.code, ro.status, ro.refund_method, ro.refund_amount, ro.reason, ro.created_at,
              c.code AS customer_code, c.name AS customer_name,
              o.code AS original_order_code,
              (SELECT COUNT(*) FROM return_order_items roi WHERE roi.return_order_id = ro.id) AS item_count
         FROM return_orders ro
         LEFT JOIN customers c ON c.id = ro.customer_id
         LEFT JOIN orders o ON o.id = ro.original_order_id
        WHERE ${where.join(' AND ')}
        ORDER BY ro.created_at DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }
}

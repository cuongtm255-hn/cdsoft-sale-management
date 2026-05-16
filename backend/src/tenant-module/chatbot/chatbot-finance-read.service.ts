import { Injectable } from '@nestjs/common';
import { ChatbotQueryContextService } from './chatbot-query-context.service';
import type { ChatbotAccessContext } from './chatbot-access.service';

@Injectable()
export class ChatbotFinanceReadService {
  constructor(private readonly queryCtx: ChatbotQueryContextService) {}

  async getCashFunds({ includeInactive = false }: { includeInactive?: boolean }) {
    const ds = await this.queryCtx.getDs();
    const rows = await ds.query(
      `SELECT name, balance, currency, is_active
         FROM cash_funds
        WHERE ${includeInactive ? '1=1' : 'is_active = 1'}
        ORDER BY created_at DESC`,
    );
    return { count: rows.length, items: rows };
  }

  async getBankAccounts({ includeInactive = false }: { includeInactive?: boolean }) {
    const ds = await this.queryCtx.getDs();
    const rows = await ds.query(
      `SELECT bank_name, account_number, account_name, balance, currency, is_active
         FROM bank_accounts
        WHERE ${includeInactive ? '1=1' : 'is_active = 1'}
        ORDER BY created_at DESC`,
    );
    return { count: rows.length, items: rows };
  }

  async getCashReceipts({
    kind,
    status,
    customerQuery,
    supplierQuery,
    fromDate,
    toDate,
    limit = 20,
  }: {
    kind?: string;
    status?: string;
    customerQuery?: string;
    supplierQuery?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }, access?: ChatbotAccessContext) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = ['1=1'];
    const params: any[] = [];

    if (kind) {
      where.push('cr.kind = ?');
      params.push(kind);
    }
    if (status) {
      where.push('cr.status = ?');
      params.push(status);
    }
    if (customerQuery) {
      where.push('(c.code LIKE ? OR c.name LIKE ?)');
      params.push(this.queryCtx.like(customerQuery), this.queryCtx.like(customerQuery));
    }
    if (supplierQuery) {
      where.push('(s.code LIKE ? OR s.name LIKE ?)');
      params.push(this.queryCtx.like(supplierQuery), this.queryCtx.like(supplierQuery));
    }
    if (fromDate) {
      where.push('DATE(cr.created_at) >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      where.push('DATE(cr.created_at) <= ?');
      params.push(toDate);
    }
    if (access?.role === 'STAFF') {
      where.push('(cust.sales_rep_id = ? OR cust.sales_rep_id IS NULL)');
      params.push(access.userId);
    }
    params.push(lim);

    const rows = await ds.query(
      `SELECT cr.kind, cr.receipt_type, cr.amount, cr.method, cr.status, cr.description, cr.created_at,
              c.code AS customer_code, c.name AS customer_name,
              s.code AS supplier_code, s.name AS supplier_name,
              cf.name AS cash_fund_name,
              ba.bank_name, ba.account_number
         FROM cash_receipts cr
         LEFT JOIN customers c ON c.id = cr.customer_id
         LEFT JOIN customers cust ON cust.id = cr.customer_id
         LEFT JOIN suppliers s ON s.id = cr.supplier_id
         LEFT JOIN cash_funds cf ON cf.id = cr.cash_fund_id
         LEFT JOIN bank_accounts ba ON ba.id = cr.bank_account_id
        WHERE ${where.join(' AND ')}
        ORDER BY cr.created_at DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }

  async getDisbursements({
    status,
    supplierQuery,
    fromDate,
    toDate,
    limit = 20,
  }: {
    status?: string;
    supplierQuery?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = ['1=1'];
    const params: any[] = [];

    if (status) {
      where.push('d.status = ?');
      params.push(status);
    }
    if (supplierQuery) {
      where.push('(s.code LIKE ? OR s.name LIKE ?)');
      params.push(this.queryCtx.like(supplierQuery), this.queryCtx.like(supplierQuery));
    }
    if (fromDate) {
      where.push('DATE(d.created_at) >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      where.push('DATE(d.created_at) <= ?');
      params.push(toDate);
    }
    params.push(lim);

    const rows = await ds.query(
      `SELECT d.disbursement_type, d.amount, d.description, d.status, d.reject_reason, d.created_at,
              s.code AS supplier_code, s.name AS supplier_name,
              cf.name AS cash_fund_name,
              ba.bank_name, ba.account_number
         FROM disbursements d
         LEFT JOIN suppliers s ON s.id = d.supplier_id
         LEFT JOIN cash_funds cf ON cf.id = d.cash_fund_id
         LEFT JOIN bank_accounts ba ON ba.id = d.bank_account_id
        WHERE ${where.join(' AND ')}
        ORDER BY d.created_at DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }

  async getArAging({
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
    const where: string[] = ['c.deleted_at IS NULL'];
    const having: string[] = [];
    const params: any[] = [];

    if (customerQuery) {
      where.push('(c.code LIKE ? OR c.name LIKE ?)');
      params.push(this.queryCtx.like(customerQuery), this.queryCtx.like(customerQuery));
    }
    if (access?.role === 'STAFF') {
      where.push('c.sales_rep_id = ?');
      params.push(access.userId);
    }
    if (debtFilter === 'has_debt') having.push('open_balance > 0');
    if (debtFilter === 'no_debt') having.push('open_balance = 0');
    if (debtFilter === 'over_limit') having.push('open_balance > credit_limit');
    params.push(lim);

    const rows = await ds.query(
      `SELECT c.code, c.name, c.credit_limit, c.current_debt,
              COALESCE(SUM(CASE WHEN i.status IN ('UNPAID', 'PARTIALLY_PAID') THEN i.total_amount - i.paid_amount ELSE 0 END), 0) AS open_balance,
              COALESCE(SUM(CASE WHEN i.status IN ('UNPAID', 'PARTIALLY_PAID') AND i.due_date < CURDATE() THEN i.total_amount - i.paid_amount ELSE 0 END), 0) AS overdue_balance,
              SUM(CASE WHEN i.status IN ('UNPAID', 'PARTIALLY_PAID') THEN 1 ELSE 0 END) AS open_invoice_count
         FROM customers c
         LEFT JOIN invoices i ON i.customer_id = c.id
        WHERE ${where.join(' AND ')}
        GROUP BY c.id, c.code, c.name, c.credit_limit, c.current_debt
        ${having.length ? `HAVING ${having.join(' AND ')}` : ''}
        ORDER BY open_balance DESC, overdue_balance DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }

  async getApSchedule({
    supplierQuery,
    paymentFilter = 'all',
    limit = 20,
  }: {
    supplierQuery?: string;
    paymentFilter?: string;
    limit?: number;
  }) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = ['s.deleted_at IS NULL'];
    const having: string[] = [];
    const params: any[] = [];

    if (supplierQuery) {
      where.push('(s.code LIKE ? OR s.name LIKE ?)');
      params.push(this.queryCtx.like(supplierQuery), this.queryCtx.like(supplierQuery));
    }
    if (paymentFilter === 'paid') having.push('open_balance = 0');
    if (paymentFilter === 'partial') having.push('partially_paid_invoice_count > 0');
    if (paymentFilter === 'unpaid') having.push('unpaid_invoice_count > 0');
    params.push(lim);

    const rows = await ds.query(
      `SELECT s.code, s.name, s.current_debt,
              COALESCE(SUM(CASE WHEN pi.status IN ('UNPAID', 'PARTIALLY_PAID') THEN pi.total_amount - pi.paid_amount ELSE 0 END), 0) AS open_balance,
              COALESCE(SUM(CASE WHEN pi.status IN ('UNPAID', 'PARTIALLY_PAID') AND pi.due_date < CURDATE() THEN pi.total_amount - pi.paid_amount ELSE 0 END), 0) AS overdue_balance,
              SUM(CASE WHEN pi.status = 'PARTIALLY_PAID' THEN 1 ELSE 0 END) AS partially_paid_invoice_count,
              SUM(CASE WHEN pi.status = 'UNPAID' THEN 1 ELSE 0 END) AS unpaid_invoice_count
         FROM suppliers s
         LEFT JOIN purchase_invoices pi ON pi.supplier_id = s.id
        WHERE ${where.join(' AND ')}
        GROUP BY s.id, s.code, s.name, s.current_debt
        ${having.length ? `HAVING ${having.join(' AND ')}` : ''}
        ORDER BY open_balance DESC, overdue_balance DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }

  async getCustomerPaymentHistory({
    customerQuery,
    fromDate,
    toDate,
    limit = 20,
  }: {
    customerQuery?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }, access?: ChatbotAccessContext) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = ['1=1'];
    const params: any[] = [];

    if (customerQuery) {
      where.push('(c.code LIKE ? OR c.name LIKE ?)');
      params.push(this.queryCtx.like(customerQuery), this.queryCtx.like(customerQuery));
    }
    if (fromDate) {
      where.push('DATE(p.paid_at) >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      where.push('DATE(p.paid_at) <= ?');
      params.push(toDate);
    }
    if (access?.role === 'STAFF') {
      where.push('o.sales_rep_id = ?');
      params.push(access.userId);
    }
    params.push(lim);

    const rows = await ds.query(
      `SELECT p.amount, p.method, p.transaction_ref, p.paid_at, p.notes,
              c.code AS customer_code, c.name AS customer_name,
              i.code AS invoice_code
         FROM payments p
         JOIN customers c ON c.id = p.customer_id
         JOIN invoices i ON i.id = p.invoice_id
         LEFT JOIN orders o ON o.id = i.order_id
        WHERE ${where.join(' AND ')}
        ORDER BY p.paid_at DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }
}

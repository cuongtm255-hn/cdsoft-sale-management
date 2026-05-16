import { Injectable } from '@nestjs/common';
import { ChatbotQueryContextService } from './chatbot-query-context.service';
import type { ChatbotAccessContext } from './chatbot-access.service';

@Injectable()
export class ChatbotMasterDataReadService {
  constructor(private readonly queryCtx: ChatbotQueryContextService) {}

  async getProducts({ query, limit = 10, onlyActive = true }: { query?: string; limit?: number; onlyActive?: boolean }) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 10);
    const rows = await ds.query(
      `SELECT p.sku, p.name, p.barcode, p.cost_price, p.is_active, p.min_stock_level,
              c.name AS category_name,
              COALESCE((SELECT SUM(ib.quantity) FROM inventory_balances ib WHERE ib.product_id = p.id), 0) AS stock_quantity,
              (SELECT amount FROM product_prices pp WHERE pp.product_id = p.id AND pp.price_type = 'RETAIL' LIMIT 1) AS retail_price
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.deleted_at IS NULL
          ${onlyActive ? 'AND p.is_active = 1' : ''}
          ${query ? 'AND (p.sku LIKE ? OR p.name LIKE ? OR p.barcode LIKE ?)' : ''}
        ORDER BY p.created_at DESC
        LIMIT ?`,
      query ? [this.queryCtx.like(query), this.queryCtx.like(query), this.queryCtx.like(query), lim] : [lim],
    );
    return { count: rows.length, items: rows };
  }

  async getCustomers({ query, limit = 10 }: { query?: string; limit?: number }, access?: ChatbotAccessContext) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 10);
    const rows = await ds.query(
      `SELECT code, name, phone, email, customer_group, credit_limit, current_debt, loyalty_points, member_tier, is_active
         FROM customers
        WHERE deleted_at IS NULL
          ${access?.role === 'STAFF' ? 'AND sales_rep_id = ?' : ''}
          ${query ? 'AND (code LIKE ? OR name LIKE ? OR phone LIKE ? OR email LIKE ?)' : ''}
        ORDER BY created_at DESC
        LIMIT ?`,
      query
        ? [
            ...(access?.role === 'STAFF' ? [access.userId] : []),
            this.queryCtx.like(query),
            this.queryCtx.like(query),
            this.queryCtx.like(query),
            this.queryCtx.like(query),
            lim,
          ]
        : [...(access?.role === 'STAFF' ? [access.userId] : []), lim],
    );
    return { count: rows.length, items: rows };
  }

  async getSuppliers({ query, limit = 10 }: { query?: string; limit?: number }) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 10);
    const rows = await ds.query(
      `SELECT code, name, phone, email, contact_person, current_debt, is_active
         FROM suppliers
        WHERE deleted_at IS NULL
          ${query ? 'AND (code LIKE ? OR name LIKE ?)' : ''}
        ORDER BY created_at DESC
        LIMIT ?`,
      query ? [this.queryCtx.like(query), this.queryCtx.like(query), lim] : [lim],
    );
    return { count: rows.length, items: rows };
  }

  async calculateCustomerDebt({ customerQuery }: { customerQuery: string }, access?: ChatbotAccessContext) {
    const ds = await this.queryCtx.getDs();
    const customer = await ds.query(
      `SELECT id, code, name, current_debt, credit_limit
         FROM customers
        WHERE deleted_at IS NULL
          ${access?.role === 'STAFF' ? 'AND sales_rep_id = ?' : ''}
          AND (code LIKE ? OR name LIKE ?)
        ORDER BY created_at DESC
        LIMIT 1`,
      [
        ...(access?.role === 'STAFF' ? [access.userId] : []),
        this.queryCtx.like(customerQuery),
        this.queryCtx.like(customerQuery),
      ],
    );

    if (!customer.length) return { error: `Không tìm thấy khách hàng "${customerQuery}"` };

    const c = customer[0];
    const sum = await ds.query(
      `SELECT COALESCE(SUM(i.total_amount - i.paid_amount), 0) AS total_balance,
              COUNT(*) AS unpaid_invoice_count
         FROM invoices i
         LEFT JOIN orders o ON o.id = i.order_id
        WHERE i.customer_id = ?
          ${access?.role === 'STAFF' ? 'AND o.sales_rep_id = ?' : ''}
          AND i.status IN ('UNPAID', 'PARTIALLY_PAID')`,
      [c.id, ...(access?.role === 'STAFF' ? [access.userId] : [])],
    );

    return {
      customer_code: c.code,
      customer_name: c.name,
      current_debt_field: Number(c.current_debt ?? 0),
      credit_limit: Number(c.credit_limit ?? 0),
      total_unpaid_invoice_balance: Number(sum[0]?.total_balance ?? 0),
      unpaid_invoice_count: Number(sum[0]?.unpaid_invoice_count ?? 0),
    };
  }

  async calculateSupplierDebt({ supplierQuery }: { supplierQuery: string }) {
    const ds = await this.queryCtx.getDs();
    const supplier = await ds.query(
      `SELECT id, code, name, current_debt
         FROM suppliers
        WHERE deleted_at IS NULL
          AND (code LIKE ? OR name LIKE ?)
        ORDER BY created_at DESC
        LIMIT 1`,
      [this.queryCtx.like(supplierQuery), this.queryCtx.like(supplierQuery)],
    );

    if (!supplier.length) return { error: `Không tìm thấy nhà cung cấp "${supplierQuery}"` };

    const s = supplier[0];
    const sum = await ds.query(
      `SELECT COALESCE(SUM(total_amount - paid_amount), 0) AS total_balance,
              COUNT(*) AS unpaid_invoice_count
         FROM purchase_invoices
        WHERE supplier_id = ?
          AND status IN ('UNPAID', 'PARTIALLY_PAID')`,
      [s.id],
    );

    return {
      supplier_code: s.code,
      supplier_name: s.name,
      current_debt_field: Number(s.current_debt ?? 0),
      total_unpaid_invoice_balance: Number(sum[0]?.total_balance ?? 0),
      unpaid_invoice_count: Number(sum[0]?.unpaid_invoice_count ?? 0),
    };
  }
}

import { Injectable } from '@nestjs/common';
import { ChatbotQueryContextService } from './chatbot-query-context.service';

@Injectable()
export class ChatbotInventoryReadService {
  constructor(private readonly queryCtx: ChatbotQueryContextService) {}

  async getStock({ productQuery, warehouseQuery, limit = 20 }: { productQuery?: string; warehouseQuery?: string; limit?: number }) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = ['p.deleted_at IS NULL'];
    const params: any[] = [];

    if (productQuery) {
      where.push('(p.sku LIKE ? OR p.name LIKE ?)');
      params.push(this.queryCtx.like(productQuery), this.queryCtx.like(productQuery));
    }
    if (warehouseQuery) {
      where.push('w.name LIKE ?');
      params.push(this.queryCtx.like(warehouseQuery));
    }
    params.push(lim);

    const rows = await ds.query(
      `SELECT p.sku, p.name AS product_name, p.min_stock_level,
              w.name AS warehouse_name, ib.quantity
         FROM inventory_balances ib
         JOIN products p ON p.id = ib.product_id
         JOIN warehouses w ON w.id = ib.warehouse_id
        WHERE ${where.join(' AND ')}
        ORDER BY ib.quantity DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }

  async getInventoryTransactions({
    productQuery,
    warehouseQuery,
    transactionType,
    fromDate,
    toDate,
    limit = 20,
  }: {
    productQuery?: string;
    warehouseQuery?: string;
    transactionType?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = ['1=1'];
    const params: any[] = [];

    if (productQuery) {
      where.push('(p.sku LIKE ? OR p.name LIKE ?)');
      params.push(this.queryCtx.like(productQuery), this.queryCtx.like(productQuery));
    }
    if (warehouseQuery) {
      where.push('w.name LIKE ?');
      params.push(this.queryCtx.like(warehouseQuery));
    }
    if (transactionType) {
      where.push('it.transaction_type = ?');
      params.push(transactionType);
    }
    if (fromDate) {
      where.push('DATE(it.created_at) >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      where.push('DATE(it.created_at) <= ?');
      params.push(toDate);
    }
    params.push(lim);

    const rows = await ds.query(
      `SELECT it.transaction_type, it.quantity, it.unit_cost, it.ref_type, it.ref_id, it.notes, it.created_at,
              p.sku, p.name AS product_name,
              w.name AS warehouse_name
         FROM inventory_transactions it
         JOIN products p ON p.id = it.product_id
         JOIN warehouses w ON w.id = it.warehouse_id
        WHERE ${where.join(' AND ')}
        ORDER BY it.created_at DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }

  async getInventoryLots({
    productQuery,
    warehouseQuery,
    batchQuery,
    expiringWithinDays,
    limit = 20,
  }: {
    productQuery?: string;
    warehouseQuery?: string;
    batchQuery?: string;
    expiringWithinDays?: number;
    limit?: number;
  }) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = ['l.remaining_qty > 0'];
    const params: any[] = [];

    if (productQuery) {
      where.push('(p.sku LIKE ? OR p.name LIKE ?)');
      params.push(this.queryCtx.like(productQuery), this.queryCtx.like(productQuery));
    }
    if (warehouseQuery) {
      where.push('w.name LIKE ?');
      params.push(this.queryCtx.like(warehouseQuery));
    }
    if (batchQuery) {
      where.push('l.batch_number LIKE ?');
      params.push(this.queryCtx.like(batchQuery));
    }
    if (typeof expiringWithinDays === 'number' && expiringWithinDays >= 0) {
      where.push('l.expiry_date IS NOT NULL AND l.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)');
      params.push(expiringWithinDays);
    }
    params.push(lim);

    const rows = await ds.query(
      `SELECT p.sku, p.name AS product_name,
              w.name AS warehouse_name,
              l.batch_number, l.expiry_date, l.cost_per_unit, l.initial_qty, l.remaining_qty, l.received_at
         FROM inventory_lots l
         JOIN products p ON p.id = l.product_id
         JOIN warehouses w ON w.id = l.warehouse_id
        WHERE ${where.join(' AND ')}
        ORDER BY l.expiry_date IS NULL, l.expiry_date ASC, l.received_at ASC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }

  async getExpiryAlerts({
    days = 30,
    warehouseQuery,
    limit = 20,
  }: {
    days?: number;
    warehouseQuery?: string;
    limit?: number;
  }) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = [
      'l.remaining_qty > 0',
      'l.expiry_date IS NOT NULL',
      'l.expiry_date >= CURDATE()',
      'l.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)',
    ];
    const params: any[] = [Math.max(Number(days ?? 30), 0)];

    if (warehouseQuery) {
      where.push('w.name LIKE ?');
      params.push(this.queryCtx.like(warehouseQuery));
    }
    params.push(lim);

    const rows = await ds.query(
      `SELECT p.sku, p.name AS product_name,
              w.name AS warehouse_name,
              l.batch_number, l.expiry_date, l.remaining_qty,
              DATEDIFF(l.expiry_date, CURDATE()) AS days_to_expiry
         FROM inventory_lots l
         JOIN products p ON p.id = l.product_id
         JOIN warehouses w ON w.id = l.warehouse_id
        WHERE ${where.join(' AND ')}
        ORDER BY l.expiry_date ASC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows, threshold_days: Number(days ?? 30) };
  }

  async getStockReceipts({
    codeQuery,
    productQuery,
    warehouseQuery,
    status,
    fromDate,
    toDate,
    limit = 20,
  }: {
    codeQuery?: string;
    productQuery?: string;
    warehouseQuery?: string;
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
      where.push('sr.ref_code LIKE ?');
      params.push(this.queryCtx.like(codeQuery));
    }
    if (warehouseQuery) {
      where.push('w.name LIKE ?');
      params.push(this.queryCtx.like(warehouseQuery));
    }
    if (status) {
      where.push('sr.status = ?');
      params.push(status);
    }
    if (fromDate) {
      where.push('DATE(sr.created_at) >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      where.push('DATE(sr.created_at) <= ?');
      params.push(toDate);
    }
    if (productQuery) {
      where.push(`EXISTS (
        SELECT 1
          FROM stock_receipt_items sri
          JOIN products p2 ON p2.id = sri.product_id
         WHERE sri.receipt_id = sr.id
           AND (p2.sku LIKE ? OR p2.name LIKE ?)
      )`);
      params.push(this.queryCtx.like(productQuery), this.queryCtx.like(productQuery));
    }
    params.push(lim);

    const rows = await ds.query(
      `SELECT sr.id, sr.ref_code, sr.status, sr.expected_date, sr.confirmed_at, sr.total_amount, sr.created_at,
              w.name AS warehouse_name,
              s.code AS supplier_code, s.name AS supplier_name,
              (SELECT COUNT(*) FROM stock_receipt_items sri WHERE sri.receipt_id = sr.id) AS item_count
         FROM stock_receipts sr
         JOIN warehouses w ON w.id = sr.warehouse_id
         LEFT JOIN suppliers s ON s.id = sr.supplier_id
        WHERE ${where.join(' AND ')}
        ORDER BY sr.created_at DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }

  async getStockIssues({
    productQuery,
    warehouseQuery,
    status,
    issueType,
    fromDate,
    toDate,
    limit = 20,
  }: {
    productQuery?: string;
    warehouseQuery?: string;
    status?: string;
    issueType?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = ['1=1'];
    const params: any[] = [];

    if (warehouseQuery) {
      where.push('w.name LIKE ?');
      params.push(this.queryCtx.like(warehouseQuery));
    }
    if (status) {
      where.push('si.status = ?');
      params.push(status);
    }
    if (issueType) {
      where.push('si.issue_type = ?');
      params.push(issueType);
    }
    if (fromDate) {
      where.push('DATE(si.created_at) >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      where.push('DATE(si.created_at) <= ?');
      params.push(toDate);
    }
    if (productQuery) {
      where.push(`EXISTS (
        SELECT 1
          FROM stock_issue_items sii
          JOIN products p2 ON p2.id = sii.product_id
         WHERE sii.issue_id = si.id
           AND (p2.sku LIKE ? OR p2.name LIKE ?)
      )`);
      params.push(this.queryCtx.like(productQuery), this.queryCtx.like(productQuery));
    }
    params.push(lim);

    const rows = await ds.query(
      `SELECT si.id, si.issue_type, si.status, si.notes, si.confirmed_at, si.created_at,
              w.name AS warehouse_name,
              o.code AS order_code,
              (SELECT COUNT(*) FROM stock_issue_items sii WHERE sii.issue_id = si.id) AS item_count
         FROM stock_issues si
         JOIN warehouses w ON w.id = si.warehouse_id
         LEFT JOIN orders o ON o.id = si.order_id
        WHERE ${where.join(' AND ')}
        ORDER BY si.created_at DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }

  async getStockTransfers({
    productQuery,
    fromWarehouseQuery,
    toWarehouseQuery,
    status,
    limit = 20,
  }: {
    productQuery?: string;
    fromWarehouseQuery?: string;
    toWarehouseQuery?: string;
    status?: string;
    limit?: number;
  }) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = ['1=1'];
    const params: any[] = [];

    if (fromWarehouseQuery) {
      where.push('wf.name LIKE ?');
      params.push(this.queryCtx.like(fromWarehouseQuery));
    }
    if (toWarehouseQuery) {
      where.push('wt.name LIKE ?');
      params.push(this.queryCtx.like(toWarehouseQuery));
    }
    if (status) {
      where.push('st.status = ?');
      params.push(status);
    }
    if (productQuery) {
      where.push(`EXISTS (
        SELECT 1
          FROM stock_transfer_items sti
          JOIN products p2 ON p2.id = sti.product_id
         WHERE sti.transfer_id = st.id
           AND (p2.sku LIKE ? OR p2.name LIKE ?)
      )`);
      params.push(this.queryCtx.like(productQuery), this.queryCtx.like(productQuery));
    }
    params.push(lim);

    const rows = await ds.query(
      `SELECT st.id, st.status, st.expected_date, st.dispatched_at, st.received_at, st.created_at,
              wf.name AS from_warehouse_name,
              wt.name AS to_warehouse_name,
              (SELECT COUNT(*) FROM stock_transfer_items sti WHERE sti.transfer_id = st.id) AS item_count
         FROM stock_transfers st
         JOIN warehouses wf ON wf.id = st.from_warehouse_id
         JOIN warehouses wt ON wt.id = st.to_warehouse_id
        WHERE ${where.join(' AND ')}
        ORDER BY st.created_at DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }

  async getStocktakingSessions({
    warehouseQuery,
    status,
    limit = 20,
  }: {
    warehouseQuery?: string;
    status?: string;
    limit?: number;
  }) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = ['1=1'];
    const params: any[] = [];

    if (warehouseQuery) {
      where.push('w.name LIKE ?');
      params.push(this.queryCtx.like(warehouseQuery));
    }
    if (status) {
      where.push('ss.status = ?');
      params.push(status);
    }
    params.push(lim);

    const rows = await ds.query(
      `SELECT ss.id, ss.status, ss.notes, ss.created_at, ss.completed_at,
              w.name AS warehouse_name,
              (SELECT COUNT(*) FROM stocktaking_items sti WHERE sti.session_id = ss.id) AS item_count,
              (SELECT COUNT(*) FROM stocktaking_items sti WHERE sti.session_id = ss.id AND sti.adjust_qty IS NOT NULL AND sti.adjust_qty <> 0) AS adjusted_item_count
         FROM stocktaking_sessions ss
         JOIN warehouses w ON w.id = ss.warehouse_id
        WHERE ${where.join(' AND ')}
        ORDER BY ss.created_at DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }
}

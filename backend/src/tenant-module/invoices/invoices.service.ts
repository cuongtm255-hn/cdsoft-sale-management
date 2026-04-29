import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TenantDataSourceManager } from '../../tenant/tenant-datasource.manager';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Payment } from './entities/payment.entity';
import { AccountsPayable } from './entities/accounts-payable.entity';
import { CashFund } from './entities/cash-fund.entity';
import { BankAccount } from './entities/bank-account.entity';
import { CashReceipt, CashReceiptKind, CashReceiptStatus } from './entities/cash-receipt.entity';
import {
  InvoiceFilterDto, RecordPaymentDto, ArMatchDto,
  ApFilterDto, ArAgingFilterDto, CreateCashFundDto,
  CreateBankAccountDto, CreateManualReceiptDto,
} from './dto/invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly dsManager: TenantDataSourceManager,
    private readonly tenantCtx: TenantContextService,
  ) {}

  private async getDs(): Promise<DataSource> {
    return this.dsManager.getDataSource(this.tenantCtx.getTenantCode()!);
  }

  private async getRepo<T extends object>(entity: new (...args: any[]) => T): Promise<Repository<T>> {
    return (await this.getDs()).getRepository(entity) as Repository<T>;
  }

  // ─── Code generation ──────────────────────────────────────────────────────

  private async nextInvoiceCode(): Promise<string> {
    const ds = await this.getDs();
    const year = new Date().getFullYear();
    const result = await ds.query(
      `SELECT COUNT(*) as cnt FROM invoices WHERE code LIKE ?`,
      [`INV-${year}-%`],
    );
    const seq = String(Number(result[0]?.cnt ?? 0) + 1).padStart(4, '0');
    return `INV-${year}-${seq}`;
  }

  // ─── Generate invoice from order (called after order confirm) ────────────

  async generateInvoiceForOrder(orderId: string): Promise<Invoice> {
    const ds = await this.getDs();
    const invoiceRepo = await this.getRepo(Invoice);

    // Idempotent — skip if already exists
    const existing = await invoiceRepo.findOne({ where: { orderId } });
    if (existing) return existing;

    const orders = await ds.query(
      `SELECT o.*, c.name AS customer_name, c.tax_code, c.credit_limit, c.current_debt
       FROM orders o
       LEFT JOIN customers c ON c.id = o.customer_id
       WHERE o.id = ? AND o.deleted_at IS NULL`,
      [orderId],
    );
    if (!orders.length) throw new NotFoundException(`Order ${orderId} not found`);
    const order = orders[0];

    const orderItems = await ds.query(
      `SELECT oi.*, p.name AS product_name FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [orderId],
    );

    const code = await this.nextInvoiceCode();

    // Payment terms: due_date = today + payment_term_days (default 30)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const dueDateStr = dueDate.toISOString().slice(0, 10);

    const invoice = await invoiceRepo.save(invoiceRepo.create({
      code,
      orderId,
      customerId: order.customer_id,
      status: InvoiceStatus.UNPAID,
      subtotal: Number(order.subtotal),
      discountTotal: Number(order.discount_total ?? 0),
      totalAmount: Number(order.total_amount),
      paidAmount: 0,
      dueDate: dueDateStr,
      issuedAt: new Date(),
    }));

    const itemRepo = await this.getRepo(InvoiceItem);
    await itemRepo.save(
      orderItems.map((oi: any) =>
        itemRepo.create({
          invoiceId: invoice.id,
          productName: oi.product_name ?? oi.product_id,
          quantity: Number(oi.quantity),
          unitPrice: Number(oi.unit_price),
          discountPercent: Number(oi.discount_percent ?? 0),
          lineTotal: Number(oi.line_total),
        }),
      ),
    );

    return invoice;
  }

  // ─── List Invoices ────────────────────────────────────────────────────────

  async listInvoices(filter: InvoiceFilterDto) {
    const ds = await this.getDs();
    const page = Number(filter.page ?? 1);
    const limit = Number(filter.limit ?? 20);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['i.deleted_at IS NULL'];
    const params: any[] = [];

    if (filter.status) { conditions.push('i.status = ?'); params.push(filter.status); }
    if (filter.customerId) { conditions.push('i.customer_id = ?'); params.push(filter.customerId); }
    if (filter.from) { conditions.push('i.issued_at >= ?'); params.push(filter.from); }
    if (filter.to) { conditions.push('i.issued_at <= ?'); params.push(`${filter.to} 23:59:59`); }
    if (filter.search) { conditions.push('i.code LIKE ?'); params.push(`%${filter.search}%`); }

    const where = conditions.join(' AND ');
    const [rows, countResult] = await Promise.all([
      ds.query(
        `SELECT i.*, c.name AS customer_name, c.code AS customer_code
         FROM invoices i
         LEFT JOIN customers c ON c.id = i.customer_id AND c.deleted_at IS NULL
         WHERE ${where} ORDER BY i.issued_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      ),
      ds.query(`SELECT COUNT(*) AS total FROM invoices i WHERE ${where}`, params),
    ]);
    return { data: rows, meta: { total: Number(countResult[0]?.total ?? 0), page, limit } };
  }

  // ─── Get Invoice ──────────────────────────────────────────────────────────

  async getInvoice(id: string) {
    const repo = await this.getRepo(Invoice);
    const invoice = await repo.findOne({
      where: { id },
      relations: ['items', 'payments'],
    });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);

    const ds = await this.getDs();
    const [customers, orders, orderItems] = await Promise.all([
      ds.query(
        `SELECT id, name, code, tax_code, phone, email FROM customers WHERE id = ?`,
        [invoice.customerId],
      ),
      invoice.orderId
        ? ds.query(`SELECT id, code FROM orders WHERE id = ?`, [invoice.orderId])
        : Promise.resolve([]),
      invoice.orderId
        ? ds.query(
            `SELECT p.name AS productName, p.sku
             FROM order_items oi
             LEFT JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = ?`,
            [invoice.orderId],
          )
        : Promise.resolve([]),
    ]);

    // Build SKU map keyed by productName
    const skuByName: Record<string, string> = {};
    for (const row of orderItems) {
      if (row.sku && row.productName) skuByName[row.productName] = row.sku;
    }

    return {
      ...invoice,
      customer: customers[0] ?? null,
      orderCode: orders[0]?.code ?? null,
      items: (invoice.items ?? []).map((item) => ({
        ...item,
        productSku: skuByName[item.productName] ?? null,
      })),
    };
  }

  // ─── Record Payment ───────────────────────────────────────────────────────

  async recordPayment(dto: RecordPaymentDto, userId: string) {
    const invoiceRepo = await this.getRepo(Invoice);
    const invoice = await invoiceRepo.findOne({ where: { id: dto.invoiceId } });
    if (!invoice) throw new NotFoundException('INVOICE_NOT_FOUND');

    const remaining = Number(invoice.totalAmount) - Number(invoice.paidAmount);
    if (remaining <= 0) throw new BadRequestException('INVOICE_ALREADY_PAID');
    if (dto.amount > remaining + 0.01) {
      throw new BadRequestException({
        message: 'AMOUNT_EXCEEDS_REMAINING',
        remaining,
      });
    }

    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();

    // Create payment record
    const paymentRepo = await this.getRepo(Payment);
    const payment = await paymentRepo.save(paymentRepo.create({
      invoiceId: dto.invoiceId,
      customerId: invoice.customerId,
      amount: dto.amount,
      method: dto.method,
      bankAccountId: dto.bankAccountId,
      transactionRef: dto.transactionRef,
      paidAt,
      notes: dto.notes,
      createdBy: userId,
    }));

    // Update invoice paid amount and status
    const newPaid = Number(invoice.paidAmount) + dto.amount;
    const newStatus = newPaid >= Number(invoice.totalAmount) - 0.01
      ? InvoiceStatus.PAID
      : InvoiceStatus.PARTIALLY_PAID;

    await invoiceRepo.update(invoice.id, {
      paidAmount: newPaid,
      status: newStatus,
    });

    // Update customer debt
    const ds = await this.getDs();
    await ds.query(
      `UPDATE customers SET current_debt = GREATEST(0, current_debt - ?) WHERE id = ?`,
      [dto.amount, invoice.customerId],
    );

    // Auto-create cash receipt
    const receiptRepo = await this.getRepo(CashReceipt);
    await receiptRepo.save(receiptRepo.create({
      kind: CashReceiptKind.RECEIPT,
      receiptType: 'CUSTOMER_PAYMENT',
      refId: payment.id,
      refType: 'payment',
      amount: dto.amount,
      method: dto.method,
      bankAccountId: dto.bankAccountId,
      customerId: invoice.customerId,
      description: `Thu tiền hoá đơn ${invoice.code}`,
      status: CashReceiptStatus.APPROVED,
      createdBy: userId,
    }));

    return { ...payment, invoiceStatus: newStatus, fullyPaid: newStatus === InvoiceStatus.PAID };
  }

  // ─── Customer Payment History ─────────────────────────────────────────────

  async getCustomerPaymentHistory(customerId: string, filter: { from?: string; to?: string; page?: number; limit?: number }) {
    const ds = await this.getDs();
    const page = Number(filter.page ?? 1);
    const limit = Number(filter.limit ?? 20);

    let whereClause = 'p.customer_id = ?';
    const params: any[] = [customerId];

    if (filter.from) { whereClause += ' AND p.paid_at >= ?'; params.push(filter.from); }
    if (filter.to) { whereClause += ' AND p.paid_at <= ?'; params.push(`${filter.to} 23:59:59`); }

    const data = await ds.query(
      `SELECT p.id, p.amount, p.method, p.paid_at, p.transaction_ref, p.notes,
              i.code AS invoice_code
       FROM payments p
       LEFT JOIN invoices i ON i.id = p.invoice_id
       WHERE ${whereClause}
       ORDER BY p.paid_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit],
    );

    const summary = await ds.query(
      `SELECT SUM(p.amount) AS total_paid, c.current_debt
       FROM payments p
       JOIN customers c ON c.id = ?
       WHERE p.customer_id = ?`,
      [customerId, customerId],
    );

    return {
      data,
      summary: {
        totalPaid: Number(summary[0]?.total_paid ?? 0),
        currentDebt: Number(summary[0]?.current_debt ?? 0),
      },
    };
  }

  // ─── AR Aging Report ──────────────────────────────────────────────────────

  async getArAging(filter: ArAgingFilterDto) {
    const ds = await this.getDs();
    const asOf = filter.asOfDate ?? new Date().toISOString().slice(0, 10);

    let whereClause = `i.status != 'PAID' AND i.status != 'CANCELLED'
                       AND (i.total_amount - i.paid_amount) > 0`;
    const params: any[] = [asOf, asOf, asOf, asOf, asOf, asOf];

    if (filter.customerId) {
      whereClause += ` AND i.customer_id = '${filter.customerId}'`;
    }

    const rows = await ds.query(
      `SELECT
         c.id AS customer_id, c.name AS customer_name,
         SUM(CASE WHEN DATEDIFF(?, i.due_date) <= 0 THEN (i.total_amount - i.paid_amount) ELSE 0 END) AS current_amount,
         SUM(CASE WHEN DATEDIFF(?, i.due_date) BETWEEN 1 AND 30 THEN (i.total_amount - i.paid_amount) ELSE 0 END) AS days1_30,
         SUM(CASE WHEN DATEDIFF(?, i.due_date) BETWEEN 31 AND 60 THEN (i.total_amount - i.paid_amount) ELSE 0 END) AS days31_60,
         SUM(CASE WHEN DATEDIFF(?, i.due_date) BETWEEN 61 AND 90 THEN (i.total_amount - i.paid_amount) ELSE 0 END) AS days61_90,
         SUM(CASE WHEN DATEDIFF(?, i.due_date) > 90 THEN (i.total_amount - i.paid_amount) ELSE 0 END) AS over90,
         SUM(i.total_amount - i.paid_amount) AS total
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id AND c.deleted_at IS NULL
       WHERE ${whereClause}
       GROUP BY c.id, c.name
       HAVING total > 0
       ORDER BY total DESC`,
      params,
    );

    const totals = rows.reduce(
      (acc: any, r: any) => {
        acc.current += Number(r.current_amount ?? 0);
        acc.days1_30 += Number(r.days1_30 ?? 0);
        acc.days31_60 += Number(r.days31_60 ?? 0);
        acc.days61_90 += Number(r.days61_90 ?? 0);
        acc.over90 += Number(r.over90 ?? 0);
        acc.total += Number(r.total ?? 0);
        return acc;
      },
      { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0, total: 0 },
    );

    return { data: rows, totals };
  }

  // ─── AR Match ─────────────────────────────────────────────────────────────

  async matchPaymentToInvoices(dto: ArMatchDto) {
    const paymentRepo = await this.getRepo(Payment);
    const payment = await paymentRepo.findOne({ where: { id: dto.paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');

    const totalMatch = dto.matches.reduce((s, m) => s + m.amount, 0);
    if (Math.abs(totalMatch - Number(payment.amount)) > 0.01) {
      throw new BadRequestException('Match amounts must equal payment amount');
    }

    const invoiceRepo = await this.getRepo(Invoice);
    for (const match of dto.matches) {
      const inv = await invoiceRepo.findOne({ where: { id: match.invoiceId } });
      if (!inv) throw new NotFoundException(`Invoice ${match.invoiceId} not found`);
      const remaining = Number(inv.totalAmount) - Number(inv.paidAmount);
      if (match.amount > remaining + 0.01) {
        throw new BadRequestException(`Amount exceeds remaining for invoice ${inv.code}`);
      }
      const newPaid = Number(inv.paidAmount) + match.amount;
      await invoiceRepo.update(inv.id, {
        paidAmount: newPaid,
        status: newPaid >= Number(inv.totalAmount) - 0.01
          ? InvoiceStatus.PAID
          : InvoiceStatus.PARTIALLY_PAID,
      });
    }

    return { success: true };
  }

  // ─── AP Schedule ──────────────────────────────────────────────────────────

  async getApSchedule(filter: ApFilterDto) {
    const ds = await this.getDs();
    const daysAhead = Number(filter.daysAhead ?? 30);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const rows = await ds.query(
      `SELECT ap.*, s.name AS supplier_name,
              DATEDIFF(ap.due_date, CURDATE()) AS days_until_due
       FROM accounts_payable ap
       JOIN suppliers s ON s.id = ap.supplier_id AND s.deleted_at IS NULL
       WHERE ap.status != 'PAID'
         AND ap.due_date <= ?
         ${filter.supplierId ? `AND ap.supplier_id = '${filter.supplierId}'` : ''}
       ORDER BY ap.due_date ASC`,
      [cutoffStr],
    );

    return {
      data: rows.map((r: any) => ({
        ...r,
        isOverdue: Number(r.days_until_due) < 0,
      })),
    };
  }

  // ─── Cash Funds ───────────────────────────────────────────────────────────

  async listCashFunds() {
    const repo = await this.getRepo(CashFund);
    return repo.find({ where: { isActive: true }, order: { createdAt: 'ASC' } });
  }

  async createCashFund(dto: CreateCashFundDto) {
    const repo = await this.getRepo(CashFund);
    return repo.save(repo.create({ ...dto, balance: dto.balance ?? 0 }));
  }

  // ─── Bank Accounts ────────────────────────────────────────────────────────

  async listBankAccounts() {
    const repo = await this.getRepo(BankAccount);
    return repo.find({ where: { isActive: true }, order: { createdAt: 'ASC' } });
  }

  async createBankAccount(dto: CreateBankAccountDto) {
    const repo = await this.getRepo(BankAccount);
    return repo.save(repo.create({ ...dto, balance: dto.balance ?? 0 }));
  }

  // ─── Cash Receipts / Disbursements ───────────────────────────────────────

  async listCashReceipts(filter: { kind?: string; from?: string; to?: string; page?: number; limit?: number }) {
    const repo = await this.getRepo(CashReceipt);
    const qb = repo.createQueryBuilder('cr').where('1=1');

    if (filter.kind) qb.andWhere('cr.kind = :kind', { kind: filter.kind });
    if (filter.from) qb.andWhere('cr.createdAt >= :from', { from: filter.from });
    if (filter.to) qb.andWhere('cr.createdAt <= :to', { to: `${filter.to} 23:59:59` });

    const page = Number(filter.page ?? 1);
    const limit = Number(filter.limit ?? 20);
    qb.orderBy('cr.createdAt', 'DESC').skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { data: items, meta: { total, page, limit } };
  }

  async createManualReceipt(dto: CreateManualReceiptDto, userId: string) {
    const repo = await this.getRepo(CashReceipt);
    const status = dto.requiresApproval
      ? CashReceiptStatus.PENDING
      : CashReceiptStatus.APPROVED;

    const receipt = await repo.save(repo.create({
      kind: dto.kind as any,
      receiptType: dto.receiptType,
      amount: dto.amount,
      method: dto.method,
      cashFundId: dto.cashFundId,
      bankAccountId: dto.bankAccountId,
      customerId: dto.customerId,
      supplierId: dto.supplierId,
      description: dto.description,
      status,
      createdBy: userId,
    }));

    // Update fund balance if approved
    if (status === CashReceiptStatus.APPROVED && dto.cashFundId) {
      const ds = await this.getDs();
      const delta = dto.kind === CashReceiptKind.RECEIPT ? dto.amount : -dto.amount;
      await ds.query(
        `UPDATE cash_funds SET balance = balance + ? WHERE id = ?`,
        [delta, dto.cashFundId],
      );
    }

    return receipt;
  }
}

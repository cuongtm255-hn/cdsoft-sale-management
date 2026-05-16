import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TenantDataSourceManager } from '../../tenant/tenant-datasource.manager';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { Disbursement } from '../finance/entities/disbursement.entity';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Payment, PaymentMethod } from './entities/payment.entity';
import { PurchaseInvoice, PurchaseInvoiceStatus } from './entities/purchase-invoice.entity';
import { PurchaseInvoiceItem } from './entities/purchase-invoice-item.entity';
import { AccountsPayable } from './entities/accounts-payable.entity';
import { CashFund } from './entities/cash-fund.entity';
import { BankAccount } from './entities/bank-account.entity';
import { CashReceipt, CashReceiptKind, CashReceiptStatus } from './entities/cash-receipt.entity';
import {
  InvoiceFilterDto, PurchaseInvoiceFilterDto, RecordPaymentDto, RecordPayablePaymentDto, ArMatchDto,
  ApFilterDto, ArAgingFilterDto, CreateCashFundDto, UpdateCashFundDto,
  CreateBankAccountDto, UpdateBankAccountDto,
  CreateManualReceiptDto, UpdateManualReceiptDto,
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

  private async adjustCashFundBalance(ds: DataSource, cashFundId: string, delta: number) {
    const repo = ds.getRepository(CashFund);
    const fund = await repo.findOne({ where: { id: cashFundId } });
    if (!fund) throw new BadRequestException('CASH_FUND_NOT_FOUND');
    await repo.update(cashFundId, { balance: Number(fund.balance ?? 0) + delta });
  }

  private async adjustBankAccountBalance(ds: DataSource, bankAccountId: string, delta: number) {
    const repo = ds.getRepository(BankAccount);
    const account = await repo.findOne({ where: { id: bankAccountId } });
    if (!account) throw new BadRequestException('BANK_ACCOUNT_NOT_FOUND');
    await repo.update(bankAccountId, { balance: Number(account.balance ?? 0) + delta });
  }

  private async applyLedgerBalanceDelta(
    ds: DataSource,
    delta: number,
    target: { cashFundId?: string; bankAccountId?: string },
  ) {
    if (target.cashFundId) {
      await this.adjustCashFundBalance(ds, target.cashFundId, delta);
      return;
    }

    if (target.bankAccountId) {
      await this.adjustBankAccountBalance(ds, target.bankAccountId, delta);
    }
  }

  private validateLedgerSelection(
    method: PaymentMethod | string | undefined,
    target: { cashFundId?: string; bankAccountId?: string },
  ) {
    if (target.cashFundId && target.bankAccountId) {
      throw new BadRequestException('LEDGER_TARGET_AMBIGUOUS');
    }
    if (method === PaymentMethod.CASH && !target.cashFundId) {
      throw new BadRequestException('CASH_FUND_REQUIRED');
    }
    if (method && method !== PaymentMethod.CASH && !target.bankAccountId) {
      throw new BadRequestException('BANK_ACCOUNT_REQUIRED');
    }
  }

  private normalizePurchaseInvoiceStatus(totalAmount: number, paidAmount: number): PurchaseInvoiceStatus {
    if (paidAmount >= totalAmount - 0.01) return PurchaseInvoiceStatus.PAID;
    if (paidAmount > 0) return PurchaseInvoiceStatus.PARTIALLY_PAID;
    return PurchaseInvoiceStatus.UNPAID;
  }

  private normalizeApStatus(totalAmount: number, paidAmount: number) {
    if (paidAmount >= totalAmount - 0.01) return 'PAID';
    if (paidAmount > 0) return 'PARTIALLY_PAID';
    return 'PENDING';
  }

  private async nextPurchaseInvoiceCode(): Promise<string> {
    const ds = await this.getDs();
    const year = new Date().getFullYear();
    const result = await ds.query(
      `SELECT COUNT(*) as cnt FROM purchase_invoices WHERE code LIKE ?`,
      [`PINV-${year}-%`],
    );
    const seq = String(Number(result[0]?.cnt ?? 0) + 1).padStart(4, '0');
    return `PINV-${year}-${seq}`;
  }

  async resolveSupplierDueDate(supplierId?: string, baseDate = new Date()): Promise<string> {
    const ds = await this.getDs();
    const rows = supplierId
      ? await ds.query(`SELECT payment_term_days FROM suppliers WHERE id = ?`, [supplierId])
      : [];
    const paymentTermDays = Number(rows[0]?.payment_term_days ?? 0);
    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + paymentTermDays);
    return dueDate.toISOString().slice(0, 10);
  }

  async ensurePurchaseInvoice(input: {
    supplierId: string;
    purchaseOrderId?: string;
    stockReceiptId?: string;
    totalAmount: number;
    notes?: string;
    dueDate?: string;
    issuedAt?: Date;
    items: Array<{
      productId?: string;
      productName: string;
      unit?: string;
      quantity: number;
      unitPrice: number;
      discountPercent?: number;
      lineTotal: number;
    }>;
  }) {
    const ds = await this.getDs();
    const invoiceRepo = ds.getRepository(PurchaseInvoice);
    const itemRepo = ds.getRepository(PurchaseInvoiceItem);
    const apRepo = ds.getRepository(AccountsPayable);

    let existing: PurchaseInvoice | null = null;
    if (input.stockReceiptId) {
      existing = await invoiceRepo.findOne({ where: { stockReceiptId: input.stockReceiptId } });
    }
    if (!existing && input.purchaseOrderId) {
      existing = await invoiceRepo.findOne({ where: { purchaseOrderId: input.purchaseOrderId } });
    }
    if (existing) {
      if (input.stockReceiptId && !existing.stockReceiptId) {
        await invoiceRepo.update(existing.id, { stockReceiptId: input.stockReceiptId });
        await apRepo.update({ purchaseInvoiceId: existing.id }, { stockReceiptId: input.stockReceiptId });
        existing.stockReceiptId = input.stockReceiptId;
      }
      return existing;
    }

    const code = await this.nextPurchaseInvoiceCode();
    const purchaseInvoice = await invoiceRepo.save(invoiceRepo.create({
      code,
      purchaseOrderId: input.purchaseOrderId,
      stockReceiptId: input.stockReceiptId,
      supplierId: input.supplierId,
      status: PurchaseInvoiceStatus.UNPAID,
      subtotal: input.totalAmount,
      discountTotal: 0,
      totalAmount: input.totalAmount,
      paidAmount: 0,
      dueDate: input.dueDate,
      issuedAt: input.issuedAt ?? new Date(),
      notes: input.notes,
    }));

    await itemRepo.save(
      input.items.map((item) => itemRepo.create({
        purchaseInvoiceId: purchaseInvoice.id,
        productId: item.productId,
        productName: item.productName,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent ?? 0,
        lineTotal: item.lineTotal,
      })),
    );

    await apRepo.save(apRepo.create({
      supplierId: input.supplierId,
      purchaseInvoiceId: purchaseInvoice.id,
      orderId: input.purchaseOrderId,
      stockReceiptId: input.stockReceiptId,
      amount: input.totalAmount,
      paidAmount: 0,
      dueDate: input.dueDate ?? new Date().toISOString().slice(0, 10),
      status: this.normalizeApStatus(input.totalAmount, 0) as any,
      invoiceRef: purchaseInvoice.code,
      notes: input.notes,
    }));

    return purchaseInvoice;
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

  async listPurchaseInvoices(filter: PurchaseInvoiceFilterDto) {
    const ds = await this.getDs();
    const page = Number(filter.page ?? 1);
    const limit = Number(filter.limit ?? 20);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['pi.deleted_at IS NULL'];
    const params: any[] = [];

    if (filter.status) { conditions.push('pi.status = ?'); params.push(filter.status); }
    if (filter.supplierId) { conditions.push('pi.supplier_id = ?'); params.push(filter.supplierId); }
    if (filter.from) { conditions.push('pi.issued_at >= ?'); params.push(filter.from); }
    if (filter.to) { conditions.push('pi.issued_at <= ?'); params.push(`${filter.to} 23:59:59`); }
    if (filter.search) {
      conditions.push('(pi.code LIKE ? OR s.name LIKE ? OR po.code LIKE ? OR sr.ref_code LIKE ?)');
      params.push(`%${filter.search}%`, `%${filter.search}%`, `%${filter.search}%`, `%${filter.search}%`);
    }

    const where = conditions.join(' AND ');
    const [rows, countResult] = await Promise.all([
      ds.query(
        `SELECT
           pi.*,
           s.name AS supplier_name,
           s.code AS supplier_code,
           po.code AS purchase_order_code,
           sr.ref_code AS stock_receipt_code,
           ap.id AS ap_record_id,
           ap.due_date AS ap_due_date
         FROM purchase_invoices pi
         LEFT JOIN suppliers s
           ON s.id COLLATE utf8mb4_unicode_ci = pi.supplier_id COLLATE utf8mb4_unicode_ci
          AND s.deleted_at IS NULL
         LEFT JOIN orders po
           ON po.id COLLATE utf8mb4_unicode_ci = pi.purchase_order_id COLLATE utf8mb4_unicode_ci
         LEFT JOIN stock_receipts sr
           ON sr.id COLLATE utf8mb4_unicode_ci = pi.stock_receipt_id COLLATE utf8mb4_unicode_ci
         LEFT JOIN accounts_payable ap
           ON ap.purchase_invoice_id COLLATE utf8mb4_unicode_ci = pi.id COLLATE utf8mb4_unicode_ci
         WHERE ${where}
         ORDER BY pi.issued_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      ),
      ds.query(
        `SELECT COUNT(*) AS total
         FROM purchase_invoices pi
         LEFT JOIN suppliers s
           ON s.id COLLATE utf8mb4_unicode_ci = pi.supplier_id COLLATE utf8mb4_unicode_ci
          AND s.deleted_at IS NULL
         LEFT JOIN orders po
           ON po.id COLLATE utf8mb4_unicode_ci = pi.purchase_order_id COLLATE utf8mb4_unicode_ci
         LEFT JOIN stock_receipts sr
           ON sr.id COLLATE utf8mb4_unicode_ci = pi.stock_receipt_id COLLATE utf8mb4_unicode_ci
         WHERE ${where}`,
        params,
      ),
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
    this.validateLedgerSelection(dto.method, dto);

    const remaining = Number(invoice.totalAmount) - Number(invoice.paidAmount);
    if (remaining <= 0) throw new BadRequestException('INVOICE_ALREADY_PAID');
    if (dto.amount > remaining + 0.01) {
      throw new BadRequestException({
        message: 'AMOUNT_EXCEEDS_REMAINING',
        remaining,
      });
    }

    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    const ds = await this.getDs();

    // Create payment record
    const paymentRepo = await this.getRepo(Payment);
    const payment = await paymentRepo.save(paymentRepo.create({
      invoiceId: dto.invoiceId,
      customerId: invoice.customerId,
      amount: dto.amount,
      method: dto.method,
      cashFundId: dto.cashFundId,
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
      cashFundId: dto.cashFundId,
      bankAccountId: dto.bankAccountId,
      customerId: invoice.customerId,
      description: `Thu tiền hoá đơn ${invoice.code}`,
      status: CashReceiptStatus.APPROVED,
      createdBy: userId,
    }));

    await this.applyLedgerBalanceDelta(ds, dto.amount, dto);

    return { ...payment, invoiceStatus: newStatus, fullyPaid: newStatus === InvoiceStatus.PAID };
  }

  async recordPayablePayment(dto: RecordPayablePaymentDto, userId: string) {
    const ds = await this.getDs();
    const invoiceRepo = ds.getRepository(PurchaseInvoice);
    const apRepo = ds.getRepository(AccountsPayable);
    const disbursementRepo = ds.getRepository(Disbursement);
    const receiptRepo = ds.getRepository(CashReceipt);

    const purchaseInvoice = await invoiceRepo.findOne({ where: { id: dto.purchaseInvoiceId } });
    if (!purchaseInvoice) throw new NotFoundException('PURCHASE_INVOICE_NOT_FOUND');
    this.validateLedgerSelection(dto.method, dto);

    const remaining = Number(purchaseInvoice.totalAmount) - Number(purchaseInvoice.paidAmount);
    if (remaining <= 0) throw new BadRequestException('PURCHASE_INVOICE_ALREADY_PAID');
    if (dto.amount > remaining + 0.01) {
      throw new BadRequestException({
        message: 'AMOUNT_EXCEEDS_REMAINING',
        remaining,
      });
    }

    const apRecord = await apRepo.findOne({ where: { purchaseInvoiceId: purchaseInvoice.id } });
    const disbursement = await disbursementRepo.save(disbursementRepo.create({
      disbursementType: 'SUPPLIER_PAYMENT',
      supplierId: purchaseInvoice.supplierId,
      apRecordId: apRecord?.id,
      cashFundId: dto.cashFundId,
      bankAccountId: dto.bankAccountId,
      amount: dto.amount,
      description: dto.notes || `Thanh toán NCC cho ${purchaseInvoice.code}`,
      status: 'APPROVED',
      createdBy: userId,
      approvedBy: userId,
    }));

    const newPaid = Number(purchaseInvoice.paidAmount) + dto.amount;
    const newStatus = this.normalizePurchaseInvoiceStatus(Number(purchaseInvoice.totalAmount), newPaid);
    await invoiceRepo.update(purchaseInvoice.id, {
      paidAmount: newPaid,
      status: newStatus,
    });

    if (apRecord) {
      const newApPaid = Number(apRecord.paidAmount) + dto.amount;
      await apRepo.update(apRecord.id, {
        paidAmount: newApPaid,
        status: this.normalizeApStatus(Number(apRecord.amount), newApPaid) as any,
      });
    }

    if (purchaseInvoice.purchaseOrderId) {
      await ds.query(
        `UPDATE orders SET paid_amount = COALESCE(paid_amount, 0) + ? WHERE id = ?`,
        [dto.amount, purchaseInvoice.purchaseOrderId],
      );
    }

    await receiptRepo.save(receiptRepo.create({
      kind: CashReceiptKind.DISBURSEMENT,
      receiptType: 'SUPPLIER_PAYMENT',
      refId: disbursement.id,
      refType: 'purchase_invoice_payment',
      amount: dto.amount,
      method: dto.method,
      cashFundId: dto.cashFundId,
      bankAccountId: dto.bankAccountId,
      supplierId: purchaseInvoice.supplierId,
      description: dto.notes || `Chi tiền NCC cho ${purchaseInvoice.code}`,
      status: CashReceiptStatus.APPROVED,
      createdBy: userId,
    }));

    await this.applyLedgerBalanceDelta(ds, -dto.amount, dto);

    return { ...disbursement, purchaseInvoiceStatus: newStatus, fullyPaid: newStatus === PurchaseInvoiceStatus.PAID };
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

  async listCashFunds(includeInactive = false) {
    const repo = await this.getRepo(CashFund);
    return repo.find({
      ...(includeInactive ? {} : { where: { isActive: true } }),
      order: { name: 'ASC' },
    });
  }

  async createCashFund(dto: CreateCashFundDto) {
    const repo = await this.getRepo(CashFund);
    return repo.save(repo.create({ ...dto, balance: dto.balance ?? 0 }));
  }

  async updateCashFund(id: string, dto: UpdateCashFundDto) {
    const repo = await this.getRepo(CashFund);
    const entity = await repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Cash fund not found');
    await repo.update(id, dto);
    return repo.findOne({ where: { id } });
  }

  // ─── Bank Accounts ────────────────────────────────────────────────────────

  async listBankAccounts(includeInactive = false) {
    const repo = await this.getRepo(BankAccount);
    return repo.find({
      ...(includeInactive ? {} : { where: { isActive: true } }),
      order: { bankName: 'ASC' },
    });
  }

  async createBankAccount(dto: CreateBankAccountDto) {
    const repo = await this.getRepo(BankAccount);
    return repo.save(repo.create({ ...dto, balance: dto.balance ?? 0 }));
  }

  async updateBankAccount(id: string, dto: UpdateBankAccountDto) {
    const repo = await this.getRepo(BankAccount);
    const entity = await repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Bank account not found');
    await repo.update(id, dto);
    return repo.findOne({ where: { id } });
  }

  // ─── Cash Receipts / Disbursements ───────────────────────────────────────

  async listCashReceipts(filter: { kind?: string; from?: string; to?: string; page?: number; limit?: number }) {
    const repo = await this.getRepo(CashReceipt);
    const qb = repo.createQueryBuilder('cr').where('1=1');

    if (filter.kind) qb.andWhere('cr.kind = :kind', { kind: filter.kind });
    if (filter.from) qb.andWhere('cr.createdAt >= :from', { from: filter.from });
    if (filter.to) qb.andWhere('cr.createdAt <= :to', { to: `${filter.to} 23:59:59` });

    const page = Number(filter.page || 1);
    const limit = Number(filter.limit || 20);
    qb.orderBy('cr.createdAt', 'DESC').skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { data: items, meta: { total, page, limit } };
  }

  async updateCashReceipt(id: string, dto: UpdateManualReceiptDto) {
    const repo = await this.getRepo(CashReceipt);
    const entity = await repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Receipt not found');
    if (entity.status !== CashReceiptStatus.PENDING) {
      throw new BadRequestException('CANNOT_EDIT_NON_PENDING');
    }
    const method = (dto.method ?? entity.method) as string;
    const cashFundId = method === PaymentMethod.CASH
      ? (dto.cashFundId ?? entity.cashFundId)
      : null;
    const bankAccountId = method !== PaymentMethod.CASH
      ? (dto.bankAccountId ?? entity.bankAccountId)
      : null;
    this.validateLedgerSelection(method, { cashFundId: cashFundId ?? undefined, bankAccountId: bankAccountId ?? undefined });
    await repo.update(id, {
      ...(dto.receiptType !== undefined && { receiptType: dto.receiptType }),
      ...(dto.amount !== undefined && { amount: dto.amount }),
      ...(dto.method !== undefined && { method: dto.method }),
      ...(dto.description !== undefined && { description: dto.description }),
      cashFundId: cashFundId ?? undefined,
      bankAccountId: bankAccountId ?? undefined,
    });
    return repo.findOne({ where: { id } });
  }

  async approveCashReceipt(id: string) {
    const repo = await this.getRepo(CashReceipt);
    const entity = await repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Receipt not found');
    if (entity.status !== CashReceiptStatus.PENDING) {
      throw new BadRequestException('CANNOT_APPROVE_NON_PENDING');
    }
    await repo.update(id, { status: CashReceiptStatus.APPROVED });
    const ds = await this.getDs();
    const delta = entity.kind === CashReceiptKind.RECEIPT ? Number(entity.amount) : -Number(entity.amount);
    await this.applyLedgerBalanceDelta(ds, delta, entity);
    return repo.findOne({ where: { id } });
  }

  async createManualReceipt(dto: CreateManualReceiptDto, userId: string) {
    const repo = await this.getRepo(CashReceipt);
    this.validateLedgerSelection(dto.method as PaymentMethod | undefined, dto);
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

    // Update ledger balance if approved
    if (status === CashReceiptStatus.APPROVED) {
      const ds = await this.getDs();
      const delta = dto.kind === CashReceiptKind.RECEIPT ? dto.amount : -dto.amount;
      await this.applyLedgerBalanceDelta(ds, delta, dto);
    }

    return receipt;
  }
}

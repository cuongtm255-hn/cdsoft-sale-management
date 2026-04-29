import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TenantDataSourceManager } from '../../tenant/tenant-datasource.manager';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { Order, OrderStatus, OrderType } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { ReturnOrder } from './entities/return-order.entity';
import { ReturnOrderItem } from './entities/return-order-item.entity';
import { Voucher, VoucherType } from './entities/voucher.entity';
import { Promotion } from './entities/promotion.entity';
import { InventoryBalance } from '../inventory/entities/inventory-balance.entity';
import { InventoryTransaction, TxType } from '../inventory/entities/inventory-transaction.entity';
import { Invoice, InvoiceStatus } from '../invoices/entities/invoice.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';
import {
  OrderFilterDto, CreateSalesOrderDto, CreatePurchaseOrderDto,
  CancelOrderDto, ValidateVoucherDto, CreateVoucherDto,
  CreatePromotionDto, CreateReturnOrderDto,
} from './dto/order.dto';

@Injectable()
export class OrdersService {
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

  private async generateCode(prefix: 'SO' | 'PO' | 'RO'): Promise<string> {
    const repo = await this.getRepo(Order);
    const year = new Date().getFullYear();
    const like = `${prefix}-${year}-%`;
    const count = await repo.count({ where: { code: repo.manager.connection
      .createQueryBuilder()
      .select()
      .from(Order, 'o')
      .where(`o.code LIKE '${like}'`)
      .getQuery() as any } });
    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}-${year}-${seq}`;
  }

  private buildCode(prefix: string, year: number, seq: number): string {
    return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
  }

  private async nextCode(prefix: 'SO' | 'PO' | 'RO'): Promise<string> {
    const ds = await this.getDs();
    const year = new Date().getFullYear();
    const like = `${prefix}-${year}-%`;
    const result = await ds.query(
      `SELECT COUNT(*) as cnt FROM orders WHERE code LIKE ?`,
      [like],
    );
    const cnt = Number(result[0]?.cnt ?? 0);
    return this.buildCode(prefix, year, cnt + 1);
  }

  // ─── List Orders ──────────────────────────────────────────────────────────

  async listSalesOrders(filter: OrderFilterDto, userId: string) {
    const ds = await this.getDs();
    const page = Number(filter.page ?? 1);
    const limit = Number(filter.limit ?? 20);
    const offset = (page - 1) * limit;

    const conditions: string[] = ["o.type = 'SALES'", 'o.deleted_at IS NULL'];
    const params: any[] = [];

    if (filter.status) { conditions.push('o.status = ?'); params.push(filter.status); }
    if (filter.customerId) { conditions.push('o.customer_id = ?'); params.push(filter.customerId); }
    if (filter.salesRepId) { conditions.push('o.sales_rep_id = ?'); params.push(filter.salesRepId); }
    if (filter.from) { conditions.push('o.created_at >= ?'); params.push(filter.from); }
    if (filter.to) { conditions.push('o.created_at <= ?'); params.push(`${filter.to} 23:59:59`); }
    if (filter.search) { conditions.push('o.code LIKE ?'); params.push(`%${filter.search}%`); }

    const where = conditions.join(' AND ');

    const [rows, countResult] = await Promise.all([
      ds.query(
        `SELECT o.*, c.code as customer_code, c.name as customer_name,
                u.full_name as sales_rep_name
         FROM orders o
         LEFT JOIN customers c ON c.id = o.customer_id AND c.deleted_at IS NULL
         LEFT JOIN users u ON u.id = o.sales_rep_id AND u.deleted_at IS NULL
         WHERE ${where}
         ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      ),
      ds.query(`SELECT COUNT(*) as total FROM orders o WHERE ${where}`, params),
    ]);

    return { data: rows, meta: { total: Number(countResult[0]?.total ?? 0), page, limit } };
  }

  async listPurchaseOrders(filter: OrderFilterDto) {
    const ds = await this.getDs();
    const page = Number(filter.page ?? 1);
    const limit = Number(filter.limit ?? 20);
    const offset = (page - 1) * limit;

    const conditions: string[] = ["o.type = 'PURCHASE'", 'o.deleted_at IS NULL'];
    const params: any[] = [];

    if (filter.status) { conditions.push('o.status = ?'); params.push(filter.status); }
    if (filter.search) { conditions.push('o.code LIKE ?'); params.push(`%${filter.search}%`); }
    if (filter.from) { conditions.push('o.created_at >= ?'); params.push(filter.from); }
    if (filter.to) { conditions.push('o.created_at <= ?'); params.push(`${filter.to} 23:59:59`); }

    const where = conditions.join(' AND ');

    const [rows, countResult] = await Promise.all([
      ds.query(
        `SELECT o.*, s.code as supplier_code, s.name as supplier_name
         FROM orders o
         LEFT JOIN suppliers s ON s.id = o.supplier_id AND s.deleted_at IS NULL
         WHERE ${where}
         ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      ),
      ds.query(`SELECT COUNT(*) as total FROM orders o WHERE ${where}`, params),
    ]);

    return { data: rows, meta: { total: Number(countResult[0]?.total ?? 0), page, limit } };
  }

  // ─── Get One ──────────────────────────────────────────────────────────────

  async getOrder(id: string) {
    const ds = await this.getDs();
    const repo = ds.getRepository(Order);
    const order = await repo.findOne({ where: { id }, relations: ['items'] });
    if (!order) throw new NotFoundException(`Order ${id} not found`);

    // Enrich with display names
    const [customerRows, warehouseRows, salesRepRows] = await Promise.all([
      order.customerId
        ? ds.query(`SELECT id, name, code FROM customers WHERE id = ? AND deleted_at IS NULL`, [order.customerId])
        : Promise.resolve([]),
      order.warehouseId
        ? ds.query(`SELECT id, name FROM warehouses WHERE id = ? AND deleted_at IS NULL`, [order.warehouseId])
        : Promise.resolve([]),
      order.salesRepId
        ? ds.query(`SELECT id, full_name FROM users WHERE id = ? AND deleted_at IS NULL`, [order.salesRepId])
        : Promise.resolve([]),
    ]);

    const productIds = [...new Set((order.items ?? []).map((i) => i.productId))];
    const unitIds = [...new Set((order.items ?? []).map((i) => i.unitId).filter(Boolean))];

    const [products, units] = await Promise.all([
      productIds.length
        ? ds.query(
            `SELECT id, name, sku FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`,
            productIds,
          )
        : Promise.resolve([]),
      unitIds.length
        ? ds.query(
            `SELECT id, name FROM product_units WHERE id IN (${unitIds.map(() => '?').join(',')})`,
            unitIds,
          )
        : Promise.resolve([]),
    ]);

    const productMap: Record<string, any> = Object.fromEntries(products.map((p: any) => [p.id, p]));
    const unitMap: Record<string, any> = Object.fromEntries(units.map((u: any) => [u.id, u]));

    return {
      ...order,
      customer: customerRows[0] ?? null,
      warehouse: warehouseRows[0] ? { name: warehouseRows[0].name } : null,
      salesRep: salesRepRows[0] ? { name: salesRepRows[0].full_name } : null,
      items: (order.items ?? []).map((item) => ({
        ...item,
        productName: productMap[item.productId]?.name,
        productSku: productMap[item.productId]?.sku,
        unitName: unitMap[item.unitId ?? '']?.name,
      })),
    };
  }

  // ─── Create Sales Order ───────────────────────────────────────────────────

  async createSalesOrder(dto: CreateSalesOrderDto, userId: string) {
    const ds = await this.getDs();

    // Validate customer
    const customer = await ds.query(
      `SELECT id, name, code, customer_group, credit_limit, current_debt FROM customers WHERE id = ? AND deleted_at IS NULL`,
      [dto.customerId],
    );
    if (!customer.length) throw new NotFoundException('CUSTOMER_NOT_FOUND');

    const cust = customer[0];

    // Validate voucher if provided
    let voucher: Voucher | null = null;
    if (dto.voucherCode) {
      const vRepo = await this.getRepo(Voucher);
      voucher = await vRepo.findOne({ where: { code: dto.voucherCode, isActive: true } });
      if (!voucher) throw new BadRequestException('INVALID_VOUCHER');
      if (voucher.usageLimit > 0 && voucher.usedCount >= voucher.usageLimit) {
        throw new BadRequestException('VOUCHER_ALREADY_USED');
      }
    }

    // Build items and calculate totals
    let subtotal = 0;
    let discountTotal = 0;
    const orderItems: Partial<OrderItem>[] = [];

    for (const item of dto.items) {
      const products = await ds.query(
        `SELECT id, name FROM products WHERE id = ? AND deleted_at IS NULL`,
        [item.productId],
      );
      if (!products.length) throw new NotFoundException(`PRODUCT_NOT_FOUND: ${item.productId}`);

      const discPct = item.discountPercent ?? 0;
      const discAmt = item.discountAmount ?? 0;
      const lineDiscount = item.unitPrice * item.quantity * (discPct / 100) + discAmt;
      const lineTotal = item.unitPrice * item.quantity - lineDiscount;

      subtotal += item.unitPrice * item.quantity;
      discountTotal += lineDiscount;

      orderItems.push({
        productId: item.productId,
        unitId: item.unitId,
        quantity: item.quantity,
        qtyInBase: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: discPct,
        discountAmount: discAmt,
        lineTotal,
        issuedQty: 0,
      });
    }

    // Calculate voucher discount
    let voucherDiscount = 0;
    if (voucher) {
      if (voucher.type === VoucherType.PERCENT) {
        voucherDiscount = (subtotal - discountTotal) * (voucher.value / 100);
        if (voucher.maxDiscount && voucherDiscount > voucher.maxDiscount) {
          voucherDiscount = voucher.maxDiscount;
        }
      } else {
        voucherDiscount = voucher.value;
      }
    }

    const totalAmount = subtotal - discountTotal - voucherDiscount;

    // Credit warning check
    const creditLimit = Number(cust.credit_limit ?? 0);
    const currentDebt = Number(cust.current_debt ?? 0);
    const creditWarning = creditLimit > 0 && (currentDebt + totalAmount) > creditLimit;
    const creditWarningDetail = creditWarning ? {
      creditLimit, currentDebt, orderTotal: totalAmount,
      overflow: currentDebt + totalAmount - creditLimit,
    } : undefined;

    // Persist order
    const code = await this.nextCode('SO');
    const orderRepo = await this.getRepo(Order);
    const itemRepo = await this.getRepo(OrderItem);

    const order = orderRepo.create({
      code,
      type: OrderType.SALES,
      customerId: dto.customerId,
      warehouseId: dto.warehouseId,
      salesRepId: dto.salesRepId ?? userId,
      paymentMethod: dto.paymentMethod,
      shippingAddress: dto.shippingAddress,
      notes: dto.notes,
      voucherId: voucher?.id,
      subtotal,
      discountTotal,
      voucherDiscount,
      totalAmount,
      paidAmount: 0,
      status: OrderStatus.DRAFT,
    });

    const saved = await orderRepo.save(order);

    await itemRepo.save(
      orderItems.map((i) => itemRepo.create({ ...i, orderId: saved.id })),
    );

    return { ...saved, creditWarning, creditWarningDetail };
  }

  // ─── Create Purchase Order ────────────────────────────────────────────────

  async createPurchaseOrder(dto: CreatePurchaseOrderDto) {
    const ds = await this.getDs();

    let subtotal = 0;
    const orderItems: Partial<OrderItem>[] = [];

    for (const item of dto.items) {
      const products = await ds.query(
        `SELECT id FROM products WHERE id = ? AND deleted_at IS NULL`,
        [item.productId],
      );
      if (!products.length) throw new NotFoundException(`PRODUCT_NOT_FOUND: ${item.productId}`);

      const lineTotal = item.unitPrice * item.quantity;
      subtotal += lineTotal;

      orderItems.push({
        productId: item.productId,
        unitId: item.unitId,
        quantity: item.quantity,
        qtyInBase: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: 0,
        discountAmount: 0,
        lineTotal,
        issuedQty: 0,
      });
    }

    const code = await this.nextCode('PO');
    const orderRepo = await this.getRepo(Order);
    const itemRepo = await this.getRepo(OrderItem);

    const order = orderRepo.create({
      code,
      type: OrderType.PURCHASE,
      customerId: dto.supplierId ?? '',
      supplierId: dto.supplierId,
      warehouseId: dto.warehouseId,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes,
      subtotal,
      discountTotal: 0,
      voucherDiscount: 0,
      totalAmount: subtotal,
      paidAmount: 0,
      status: OrderStatus.DRAFT,
    });

    const saved = await orderRepo.save(order);
    await itemRepo.save(
      orderItems.map((i) => itemRepo.create({ ...i, orderId: saved.id })),
    );

    return saved;
  }

  // ─── Confirm Sales Order ──────────────────────────────────────────────────

  async confirmSalesOrder(id: string, userId: string) {
    const ds = await this.getDs();
    const order = await this.getOrder(id);

    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException('ORDER_NOT_DRAFT');
    }

    // Check stock for each item
    const balanceRepo = await this.getRepo(InventoryBalance);
    const insufficientItems: any[] = [];

    for (const item of order.items ?? []) {
      if (!order.warehouseId) continue;
      const balance = await balanceRepo.findOne({
        where: { productId: item.productId, warehouseId: order.warehouseId },
      });
      const available = balance ? Number(balance.quantity) - Number(balance.reservedQty ?? 0) : 0;
      if (available < item.quantity) {
        const product = await ds.query(
          `SELECT name FROM products WHERE id = ?`, [item.productId],
        );
        insufficientItems.push({
          productId: item.productId,
          productName: product[0]?.name ?? item.productId,
          needed: item.quantity,
          available,
        });
      }
    }

    if (insufficientItems.length > 0) {
      throw new BadRequestException({
        message: 'INSUFFICIENT_STOCK',
        items: insufficientItems,
      });
    }

    // Reserve stock
    for (const item of order.items ?? []) {
      if (!order.warehouseId) continue;
      await ds.query(
        `UPDATE inventory_balances SET reserved_qty = COALESCE(reserved_qty, 0) + ? WHERE product_id = ? AND warehouse_id = ?`,
        [item.quantity, item.productId, order.warehouseId],
      );
    }

    // Update order
    const orderRepo = await this.getRepo(Order);
    order.status = OrderStatus.CONFIRMED;
    order.confirmedAt = new Date();
    order.confirmedBy = userId;
    const saved = await orderRepo.save(order);

    // Auto-create invoice
    const year = new Date().getFullYear();
    const countResult = await ds.query(
      `SELECT COUNT(*) as cnt FROM invoices WHERE code LIKE ?`,
      [`INV-${year}-%`],
    );
    const seq = String(Number(countResult[0]?.cnt ?? 0) + 1).padStart(4, '0');
    const invoiceCode = `INV-${year}-${seq}`;

    const invoiceRepo = await this.getRepo(Invoice);
    const invoiceItemRepo = await this.getRepo(InvoiceItem);

    const invoice = await invoiceRepo.save(invoiceRepo.create({
      code: invoiceCode,
      orderId: saved.id,
      customerId: saved.customerId,
      status: InvoiceStatus.UNPAID,
      subtotal: saved.subtotal,
      discountTotal: saved.discountTotal,
      totalAmount: saved.totalAmount,
      paidAmount: 0,
      issuedAt: new Date(),
    }));

    const items = (order.items ?? []) as any[];
    await invoiceItemRepo.save(
      items.map((item) =>
        invoiceItemRepo.create({
          invoiceId: invoice.id,
          productName: item.productName ?? item.productId,
          unit: item.unitName ?? undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent ?? 0,
          lineTotal: item.lineTotal,
        }),
      ),
    );

    return saved;
  }

  // ─── Confirm Purchase Order ───────────────────────────────────────────────

  async confirmPurchaseOrder(id: string) {
    const order = await this.getOrder(id);
    if (order.status !== OrderStatus.DRAFT) throw new BadRequestException('ORDER_NOT_DRAFT');
    const repo = await this.getRepo(Order);
    order.status = OrderStatus.CONFIRMED;
    order.confirmedAt = new Date();
    return repo.save(order);
  }

  // ─── Ship / Complete (Sales) ──────────────────────────────────────────────

  async shipSalesOrder(id: string) {
    const order = await this.getOrder(id);
    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('ORDER_NOT_CONFIRMED');
    }
    const repo = await this.getRepo(Order);
    order.status = OrderStatus.DELIVERING;
    return repo.save(order);
  }

  async completeSalesOrder(id: string) {
    const order = await this.getOrder(id);
    if (order.status !== OrderStatus.DELIVERING) {
      throw new BadRequestException('ORDER_NOT_DELIVERING');
    }
    const repo = await this.getRepo(Order);
    order.status = OrderStatus.DELIVERED;
    return repo.save(order);
  }

  // ─── Receive Purchase Order ───────────────────────────────────────────────

  async receivePurchaseOrder(id: string) {
    const ds = await this.getDs();
    const order = await this.getOrder(id);
    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('ORDER_NOT_CONFIRMED');
    }

    if (order.warehouseId) {
      for (const item of order.items ?? []) {
        const balRepo = await this.getRepo(InventoryBalance);
        const existing = await balRepo.findOne({
          where: { productId: item.productId, warehouseId: order.warehouseId },
        });

        if (existing) {
          await ds.query(
            `UPDATE inventory_balances SET quantity = quantity + ? WHERE product_id = ? AND warehouse_id = ?`,
            [item.quantity, item.productId, order.warehouseId],
          );
        } else {
          await ds.query(
            `INSERT INTO inventory_balances (id, product_id, warehouse_id, quantity, reserved_qty, avg_cost)
             VALUES (UUID(), ?, ?, ?, 0, ?)`,
            [item.productId, order.warehouseId, item.quantity, item.unitPrice],
          );
        }

        // Record transaction
        const txRepo = await this.getRepo(InventoryTransaction);
        await txRepo.save(txRepo.create({
          productId: item.productId,
          warehouseId: order.warehouseId,
          type: TxType.STOCK_IN,
          quantity: item.quantity,
          unitCost: item.unitPrice,
          refType: 'PURCHASE_ORDER',
          refId: order.id,
        } as any));
      }
    }

    const repo = await this.getRepo(Order);
    order.status = OrderStatus.DELIVERED;
    return repo.save(order);
  }

  // ─── Cancel Order ─────────────────────────────────────────────────────────

  async cancelOrder(id: string, dto: CancelOrderDto) {
    const order = await this.getOrder(id);

    if (![OrderStatus.DRAFT, OrderStatus.CONFIRMED].includes(order.status)) {
      throw new BadRequestException('ORDER_CANNOT_CANCEL');
    }

    if (order.paidAmount > 0) {
      throw new BadRequestException({
        message: 'ORDER_HAS_PAYMENT',
        paidAmount: order.paidAmount,
      });
    }

    const ds = await this.getDs();

    // Release reserved stock
    if (order.status === OrderStatus.CONFIRMED && order.warehouseId) {
      for (const item of order.items ?? []) {
        await ds.query(
          `UPDATE inventory_balances SET reserved_qty = GREATEST(0, COALESCE(reserved_qty,0) - ?) WHERE product_id = ? AND warehouse_id = ?`,
          [item.quantity, item.productId, order.warehouseId],
        );
      }
    }

    // Invalidate voucher
    if (order.voucherId) {
      const vRepo = await this.getRepo(Voucher);
      await vRepo.decrement({ id: order.voucherId }, 'usedCount', 1);
    }

    const repo = await this.getRepo(Order);
    order.status = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();
    order.cancelReason = dto.reason;
    return repo.save(order);
  }

  // ─── Voucher ──────────────────────────────────────────────────────────────

  async validateVoucher(dto: ValidateVoucherDto) {
    const repo = await this.getRepo(Voucher);
    const voucher = await repo.findOne({ where: { code: dto.code, isActive: true } });

    if (!voucher) return { valid: false, reason: 'Voucher không tồn tại hoặc không hoạt động' };

    const today = new Date().toISOString().slice(0, 10);
    if (voucher.startDate && voucher.startDate > today) {
      return { valid: false, reason: 'Voucher chưa đến ngày áp dụng' };
    }
    if (voucher.endDate && voucher.endDate < today) {
      return { valid: false, reason: 'Voucher đã hết hạn' };
    }
    if (voucher.usageLimit > 0 && voucher.usedCount >= voucher.usageLimit) {
      return { valid: false, reason: 'Voucher đã hết lượt sử dụng' };
    }
    if (dto.orderTotal < voucher.minOrderAmount) {
      return { valid: false, reason: `Đơn hàng tối thiểu ${voucher.minOrderAmount.toLocaleString()}₫` };
    }

    let calculatedDiscount = 0;
    if (voucher.type === VoucherType.PERCENT) {
      calculatedDiscount = dto.orderTotal * (voucher.value / 100);
      if (voucher.maxDiscount && calculatedDiscount > voucher.maxDiscount) {
        calculatedDiscount = voucher.maxDiscount;
      }
    } else {
      calculatedDiscount = Math.min(voucher.value, dto.orderTotal);
    }

    return {
      valid: true,
      voucherType: voucher.type,
      discountValue: voucher.value,
      maxDiscount: voucher.maxDiscount,
      calculatedDiscount,
    };
  }

  async listVouchers() {
    const repo = await this.getRepo(Voucher);
    return repo.find({ order: { createdAt: 'DESC' } });
  }

  async createVoucher(dto: CreateVoucherDto) {
    const repo = await this.getRepo(Voucher);
    return repo.save(repo.create(dto as any));
  }

  // ─── Promotions ───────────────────────────────────────────────────────────

  async listPromotions(status?: string) {
    const repo = await this.getRepo(Promotion);
    const today = new Date().toISOString().slice(0, 10);

    const qb = repo.createQueryBuilder('p').where('p.isActive = 1');

    if (status === 'active') {
      qb.andWhere('(p.startDate IS NULL OR p.startDate <= :today)', { today })
        .andWhere('(p.endDate IS NULL OR p.endDate >= :today)', { today });
    } else if (status === 'upcoming') {
      qb.andWhere('p.startDate > :today', { today });
    } else if (status === 'ended') {
      qb.andWhere('p.endDate < :today', { today });
    }

    return qb.orderBy('p.priority', 'DESC').getMany();
  }

  async createPromotion(dto: CreatePromotionDto) {
    const repo = await this.getRepo(Promotion);
    return repo.save(repo.create(dto as any));
  }

  async updatePromotion(id: string, dto: Partial<CreatePromotionDto>) {
    const repo = await this.getRepo(Promotion);
    const promo = await repo.findOne({ where: { id } });
    if (!promo) throw new NotFoundException(`Promotion ${id} not found`);
    Object.assign(promo, dto);
    return repo.save(promo);
  }

  // ─── Return Order ─────────────────────────────────────────────────────────

  async createReturn(dto: CreateReturnOrderDto, userId: string) {
    const ds = await this.getDs();
    const order = await this.getOrder(dto.originalOrderId);

    if (order.status !== OrderStatus.DELIVERED
      && order.status !== OrderStatus.PARTIALLY_RETURNED) {
      throw new BadRequestException('ORDER_NOT_DELIVERED');
    }

    const itemRepo = await this.getRepo(OrderItem);
    let refundAmount = 0;
    const returnItems: Partial<ReturnOrderItem>[] = [];

    for (const ri of dto.items) {
      const oi = await itemRepo.findOne({ where: { id: ri.orderItemId, orderId: order.id } });
      if (!oi) throw new NotFoundException(`OrderItem ${ri.orderItemId} not found`);
      if (ri.returnQty > oi.quantity) {
        throw new BadRequestException(`Return qty exceeds original qty for item ${ri.orderItemId}`);
      }

      const effectivePrice = oi.unitPrice * (1 - oi.discountPercent / 100);
      const lineTotal = effectivePrice * ri.returnQty;
      refundAmount += lineTotal;

      returnItems.push({
        orderItemId: ri.orderItemId,
        productId: oi.productId,
        unitId: ri.returnUnitId ?? oi.unitId,
        returnQty: ri.returnQty,
        unitPrice: effectivePrice,
        lineTotal,
      });

      // Return stock to warehouse
      if (order.warehouseId) {
        await ds.query(
          `UPDATE inventory_balances SET quantity = quantity + ? WHERE product_id = ? AND warehouse_id = ?`,
          [ri.returnQty, oi.productId, order.warehouseId],
        );
      }
    }

    // Generate return code
    const year = new Date().getFullYear();
    const countResult = await ds.query(
      `SELECT COUNT(*) as cnt FROM return_orders WHERE code LIKE ?`,
      [`RO-${year}-%`],
    );
    const seq = String(Number(countResult[0]?.cnt ?? 0) + 1).padStart(4, '0');
    const code = `RO-${year}-${seq}`;

    const retRepo = await this.getRepo(ReturnOrder);
    const retItemRepo = await this.getRepo(ReturnOrderItem);

    const returnOrder = await retRepo.save(retRepo.create({
      code,
      originalOrderId: dto.originalOrderId,
      customerId: order.customerId,
      reason: dto.reason,
      refundMethod: dto.refundMethod,
      refundAmount,
      status: 'COMPLETED',
      createdBy: userId,
    }));

    await retItemRepo.save(
      returnItems.map((i) => retItemRepo.create({ ...i, returnOrderId: returnOrder.id })),
    );

    // Update order status
    const orderRepo = await this.getRepo(Order);
    const totalReturnedQty = dto.items.reduce((s, i) => s + i.returnQty, 0);
    const totalOriginalQty = (order.items ?? []).reduce((s, i) => s + Number(i.quantity), 0);
    order.status = totalReturnedQty >= totalOriginalQty
      ? OrderStatus.FULLY_RETURNED
      : OrderStatus.PARTIALLY_RETURNED;
    await orderRepo.save(order);

    return returnOrder;
  }
}

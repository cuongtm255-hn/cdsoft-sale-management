import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TenantDataSourceManager } from '../../tenant/tenant-datasource.manager';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { Warehouse } from './entities/warehouse.entity';
import { InventoryBalance } from './entities/inventory-balance.entity';
import { InventoryTransaction, TxType } from './entities/inventory-transaction.entity';
import { StockReceipt, ReceiptStatus } from './entities/stock-receipt.entity';
import { StockReceiptItem } from './entities/stock-receipt-item.entity';
import { StockTransfer, TransferStatus } from './entities/stock-transfer.entity';
import { StockTransferItem } from './entities/stock-transfer-item.entity';
import {
  CreateWarehouseDto, UpdateWarehouseDto,
  CreateStockReceiptDto, ConfirmStockReceiptDto,
  CreateStockOutDto, CreateAdjustmentDto,
  CreateTransferDto, ReceiveTransferDto,
  CreateStocktakingDto, CompleteStocktakingDto,
  InventoryFilterDto,
} from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly dsManager: TenantDataSourceManager,
    private readonly tenantCtx: TenantContextService,
  ) {}

  private async getDs(): Promise<DataSource> {
    return this.dsManager.getDataSource(this.tenantCtx.getTenantCode()!);
  }

  private async getRepo<T>(entity: new (...args: any[]) => T): Promise<Repository<T>> {
    return (await this.getDs()).getRepository(entity);
  }

  // ─── Warehouses ──────────────────────────────────────────────────────────

  async listWarehouses() {
    const repo = await this.getRepo(Warehouse);
    return repo.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  async createWarehouse(dto: CreateWarehouseDto) {
    const repo = await this.getRepo(Warehouse);
    return repo.save(repo.create(dto));
  }

  async updateWarehouse(id: string, dto: UpdateWarehouseDto) {
    const repo = await this.getRepo(Warehouse);
    const wh = await repo.findOne({ where: { id } });
    if (!wh) throw new NotFoundException(`Warehouse ${id} not found`);
    Object.assign(wh, dto);
    return repo.save(wh);
  }

  // ─── Inventory balance view ───────────────────────────────────────────────

  async getInventory(filter: InventoryFilterDto) {
    const ds = await this.getDs();
    const qb = ds.getRepository(InventoryBalance)
      .createQueryBuilder('ib')
      .innerJoin('products', 'p', 'p.id = ib.product_id AND p.deleted_at IS NULL')
      .innerJoin('warehouses', 'w', 'w.id = ib.warehouse_id')
      .select([
        'ib.product_id AS "productId"',
        'p.sku AS "sku"',
        'p.name AS "name"',
        'ib.warehouse_id AS "warehouseId"',
        'w.name AS "warehouseName"',
        'CAST(ib.quantity AS FLOAT) AS "quantity"',
        'CAST(ib.avg_cost AS FLOAT) AS "avgCost"',
        'CAST(ib.quantity * ib.avg_cost AS FLOAT) AS "totalValue"',
        'p.min_stock_level AS "minStockLevel"',
        '(p.min_stock_level > 0 AND ib.quantity <= p.min_stock_level) AS "isLowStock"',
      ]);

    if (filter.warehouseId) qb.andWhere('ib.warehouse_id = :wid', { wid: filter.warehouseId });
    if (filter.productId) qb.andWhere('ib.product_id = :pid', { pid: filter.productId });
    if (filter.lowStockOnly) {
      qb.andWhere('p.min_stock_level > 0 AND ib.quantity <= p.min_stock_level');
    }

    const total = await qb.getCount();
    const data = await qb.offset(filter.skip).limit(filter.limit).getRawMany();
    return { data, total, page: filter.page, limit: filter.limit };
  }

  // ─── Stock In ─────────────────────────────────────────────────────────────

  async createReceipt(dto: CreateStockReceiptDto, userId: string): Promise<StockReceipt> {
    const ds = await this.getDs();
    const repo = ds.getRepository(StockReceipt);
    const itemRepo = ds.getRepository(StockReceiptItem);

    // validate warehouse
    const wh = await ds.getRepository(Warehouse).findOne({ where: { id: dto.warehouseId } });
    if (!wh) throw new NotFoundException('WAREHOUSE_NOT_FOUND');

    // calculate total
    const totalAmount = dto.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

    const receipt = repo.create({
      supplierId: dto.supplierId,
      warehouseId: dto.warehouseId,
      refCode: dto.refCode,
      expectedDate: dto.expectedDate,
      notes: dto.notes,
      status: ReceiptStatus.DRAFT,
      totalAmount,
    });
    await repo.save(receipt);

    // save items (qtyInBase uses conversionRate — default 1 if unit not found)
    const productUnitIds = dto.items.filter((i) => i.unitId).map((i) => i.unitId!);
    let unitMap: Record<string, number> = {};
    if (productUnitIds.length) {
      const units = await ds.query(
        `SELECT id, conversion_rate FROM product_units WHERE id IN (${productUnitIds.map((_, i) => `$${i + 1}`).join(',')})`,
        productUnitIds,
      );
      unitMap = Object.fromEntries(units.map((u: any) => [u.id, parseFloat(u.conversion_rate)]));
    }

    const items = dto.items.map((i) => itemRepo.create({
      receiptId: receipt.id,
      productId: i.productId,
      unitId: i.unitId,
      quantity: i.quantity,
      qtyInBase: i.quantity * (unitMap[i.unitId!] ?? 1),
      unitCost: i.unitCost,
      batchNumber: i.batchNumber,
      expiryDate: i.expiryDate,
    }));
    await itemRepo.save(items);

    return this.getReceipt(receipt.id);
  }

  async getReceipts(warehouseId?: string) {
    const repo = await this.getRepo(StockReceipt);
    const qb = repo.createQueryBuilder('r')
      .leftJoinAndSelect('r.items', 'items')
      .orderBy('r.createdAt', 'DESC');
    if (warehouseId) qb.andWhere('r.warehouseId = :wid', { wid: warehouseId });
    return qb.getMany();
  }

  async getReceipt(id: string): Promise<StockReceipt> {
    const repo = await this.getRepo(StockReceipt);
    const receipt = await repo.createQueryBuilder('r')
      .leftJoinAndSelect('r.items', 'items')
      .where('r.id = :id', { id })
      .getOne();
    if (!receipt) throw new NotFoundException(`Receipt ${id} not found`);
    return receipt;
  }

  async confirmReceipt(id: string, dto: ConfirmStockReceiptDto, userId: string): Promise<StockReceipt> {
    const ds = await this.getDs();
    const receipt = await this.getReceipt(id);

    if (receipt.status !== ReceiptStatus.DRAFT) {
      throw new BadRequestException('RECEIPT_NOT_DRAFT');
    }

    // Apply item updates if provided
    if (dto.items?.length) {
      const itemRepo = ds.getRepository(StockReceiptItem);
      for (const update of dto.items) {
        const item = receipt.items?.find((i) => i.id === update.id);
        if (!item) continue;
        if (update.quantity !== undefined) item.quantity = update.quantity;
        if (update.unitCost !== undefined) item.unitCost = update.unitCost;
        await itemRepo.save(item);
      }
      // reload
      const refreshed = await this.getReceipt(id);
      receipt.items = refreshed.items;
    }

    const balanceRepo = ds.getRepository(InventoryBalance);
    const txRepo = ds.getRepository(InventoryTransaction);

    for (const item of receipt.items ?? []) {
      const qtyInBase = Number(item.qtyInBase);
      const cost = Number(item.unitCost);

      // Upsert inventory_balance using weighted average
      let balance = await balanceRepo.findOne({
        where: { productId: item.productId, warehouseId: receipt.warehouseId },
      });

      if (!balance) {
        balance = balanceRepo.create({
          productId: item.productId,
          warehouseId: receipt.warehouseId,
          quantity: qtyInBase,
          avgCost: cost,
        });
      } else {
        const currentQty = Number(balance.quantity);
        const currentCost = Number(balance.avgCost);
        const newAvgCost = (currentQty * currentCost + qtyInBase * cost) / (currentQty + qtyInBase);
        balance.quantity = currentQty + qtyInBase;
        balance.avgCost = newAvgCost;
      }
      await balanceRepo.save(balance);

      // Record inventory transaction
      await txRepo.save(txRepo.create({
        productId: item.productId,
        warehouseId: receipt.warehouseId,
        transactionType: TxType.STOCK_IN,
        quantity: qtyInBase,
        unitCost: cost,
        refId: receipt.id,
        refType: 'stock_receipt',
        createdBy: userId,
      }));
    }

    // Update receipt status
    const receiptRepo = ds.getRepository(StockReceipt);
    receipt.status = ReceiptStatus.CONFIRMED;
    receipt.confirmedAt = new Date();
    receipt.confirmedBy = userId;
    receipt.totalAmount = receipt.items?.reduce((s, i) => s + Number(i.quantity) * Number(i.unitCost), 0) ?? 0;
    await receiptRepo.save(receipt);

    // TODO: Module 8 — create AP record if supplier.paymentTermDays > 0

    return this.getReceipt(id);
  }

  async cancelReceipt(id: string): Promise<StockReceipt> {
    const ds = await this.getDs();
    const receipt = await this.getReceipt(id);
    if (receipt.status !== ReceiptStatus.DRAFT) throw new BadRequestException('RECEIPT_NOT_DRAFT');
    const repo = ds.getRepository(StockReceipt);
    receipt.status = ReceiptStatus.CANCELLED;
    return repo.save(receipt);
  }

  // ─── Stock Out ────────────────────────────────────────────────────────────

  async stockOut(dto: CreateStockOutDto, userId: string) {
    const ds = await this.getDs();
    const balanceRepo = ds.getRepository(InventoryBalance);
    const txRepo = ds.getRepository(InventoryTransaction);

    for (const item of dto.items) {
      const balance = await balanceRepo.findOne({
        where: { productId: item.productId, warehouseId: dto.warehouseId },
      });
      const available = Number(balance?.quantity ?? 0);
      if (available < item.quantity) {
        throw new BadRequestException({
          code: 'INSUFFICIENT_STOCK',
          productId: item.productId,
          available,
          requested: item.quantity,
        });
      }

      balance!.quantity = available - item.quantity;
      await balanceRepo.save(balance!);

      await txRepo.save(txRepo.create({
        productId: item.productId,
        warehouseId: dto.warehouseId,
        transactionType: TxType.STOCK_OUT,
        quantity: item.quantity,
        unitCost: Number(balance!.avgCost),
        refId: dto.orderId,
        refType: dto.orderId ? 'order' : undefined,
        notes: dto.notes,
        createdBy: userId,
      }));
    }

    return { success: true };
  }

  // ─── Adjustment ───────────────────────────────────────────────────────────

  async adjust(dto: CreateAdjustmentDto, userId: string) {
    const ds = await this.getDs();
    const balanceRepo = ds.getRepository(InventoryBalance);
    const txRepo = ds.getRepository(InventoryTransaction);
    const results: any[] = [];

    for (const item of dto.items) {
      const adjustQty = item.actualQty - item.systemQty;
      if (adjustQty === 0) continue;

      let balance = await balanceRepo.findOne({
        where: { productId: item.productId, warehouseId: dto.warehouseId },
      });

      if (!balance) {
        balance = balanceRepo.create({
          productId: item.productId,
          warehouseId: dto.warehouseId,
          quantity: 0,
          avgCost: 0,
        });
      }

      balance.quantity = Number(balance.quantity) + adjustQty;
      await balanceRepo.save(balance);

      await txRepo.save(txRepo.create({
        productId: item.productId,
        warehouseId: dto.warehouseId,
        transactionType: adjustQty > 0 ? TxType.ADJUSTMENT_IN : TxType.ADJUSTMENT_OUT,
        quantity: Math.abs(adjustQty),
        refType: 'adjustment',
        notes: dto.reason,
        createdBy: userId,
      }));

      results.push({ productId: item.productId, adjustQty, newQty: balance.quantity });
    }

    return { success: true, items: results };
  }

  // ─── Transfer ─────────────────────────────────────────────────────────────

  async createTransfer(dto: CreateTransferDto, userId: string) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('SAME_WAREHOUSE');
    }
    const ds = await this.getDs();
    const repo = ds.getRepository(StockTransfer);
    const itemRepo = ds.getRepository(StockTransferItem);

    const transfer = repo.create({
      fromWarehouseId: dto.fromWarehouseId,
      toWarehouseId: dto.toWarehouseId,
      expectedDate: dto.expectedDate,
      notes: dto.notes,
      createdBy: userId,
      status: TransferStatus.PENDING,
    });
    await repo.save(transfer);

    await itemRepo.save(dto.items.map((i) => itemRepo.create({
      transferId: transfer.id,
      productId: i.productId,
      unitId: i.unitId,
      quantity: i.quantity,
    })));

    return this.getTransfer(transfer.id);
  }

  async getTransfers() {
    const repo = await this.getRepo(StockTransfer);
    return repo.createQueryBuilder('t')
      .leftJoinAndSelect('t.items', 'items')
      .orderBy('t.createdAt', 'DESC')
      .getMany();
  }

  async getTransfer(id: string) {
    const repo = await this.getRepo(StockTransfer);
    const t = await repo.createQueryBuilder('t')
      .leftJoinAndSelect('t.items', 'items')
      .where('t.id = :id', { id })
      .getOne();
    if (!t) throw new NotFoundException(`Transfer ${id} not found`);
    return t;
  }

  async dispatchTransfer(id: string, userId: string) {
    const ds = await this.getDs();
    const transfer = await this.getTransfer(id);
    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException('TRANSFER_NOT_PENDING');
    }

    const balanceRepo = ds.getRepository(InventoryBalance);
    const txRepo = ds.getRepository(InventoryTransaction);

    for (const item of transfer.items ?? []) {
      const balance = await balanceRepo.findOne({
        where: { productId: item.productId, warehouseId: transfer.fromWarehouseId },
      });
      const available = Number(balance?.quantity ?? 0);
      if (available < Number(item.quantity)) {
        throw new BadRequestException({ code: 'INSUFFICIENT_STOCK', productId: item.productId, available });
      }
      balance!.quantity = available - Number(item.quantity);
      await balanceRepo.save(balance!);

      await txRepo.save(txRepo.create({
        productId: item.productId,
        warehouseId: transfer.fromWarehouseId,
        transactionType: TxType.TRANSFER_OUT,
        quantity: Number(item.quantity),
        refId: transfer.id,
        refType: 'stock_transfer',
        createdBy: userId,
      }));
    }

    const repo = ds.getRepository(StockTransfer);
    transfer.status = TransferStatus.IN_TRANSIT;
    transfer.dispatchedAt = new Date();
    return repo.save(transfer);
  }

  async receiveTransfer(id: string, dto: ReceiveTransferDto, userId: string) {
    const ds = await this.getDs();
    const transfer = await this.getTransfer(id);
    if (transfer.status !== TransferStatus.IN_TRANSIT) {
      throw new BadRequestException('TRANSFER_NOT_IN_TRANSIT');
    }

    const balanceRepo = ds.getRepository(InventoryBalance);
    const txRepo = ds.getRepository(InventoryTransaction);
    const itemRepo = ds.getRepository(StockTransferItem);

    for (const item of transfer.items ?? []) {
      const receivedEntry = dto.items?.find((r) => r.productId === item.productId);
      const receivedQty = receivedEntry ? receivedEntry.receivedQty : Number(item.quantity);

      let balance = await balanceRepo.findOne({
        where: { productId: item.productId, warehouseId: transfer.toWarehouseId },
      });
      if (!balance) {
        balance = balanceRepo.create({ productId: item.productId, warehouseId: transfer.toWarehouseId, quantity: 0, avgCost: 0 });
      }
      balance.quantity = Number(balance.quantity) + receivedQty;
      await balanceRepo.save(balance);

      await txRepo.save(txRepo.create({
        productId: item.productId,
        warehouseId: transfer.toWarehouseId,
        transactionType: TxType.TRANSFER_IN,
        quantity: receivedQty,
        refId: transfer.id,
        refType: 'stock_transfer',
        createdBy: userId,
      }));

      item.receivedQty = receivedQty;
      await itemRepo.save(item);
    }

    const repo = ds.getRepository(StockTransfer);
    transfer.status = TransferStatus.RECEIVED;
    transfer.receivedAt = new Date();
    return repo.save(transfer);
  }

  // ─── Stocktaking ──────────────────────────────────────────────────────────

  async createStocktaking(dto: CreateStocktakingDto, userId: string) {
    const ds = await this.getDs();
    const wh = await ds.getRepository(Warehouse).findOne({ where: { id: dto.warehouseId } });
    if (!wh) throw new NotFoundException('WAREHOUSE_NOT_FOUND');

    // Snapshot current balances
    const balances = await ds.getRepository(InventoryBalance).find({
      where: { warehouseId: dto.warehouseId },
    });

    // Store as JSON in a simple object (full stocktaking table is out of scope for now)
    return {
      id: `ST-${Date.now()}`,
      warehouseId: dto.warehouseId,
      warehouseName: wh.name,
      notes: dto.notes,
      status: 'IN_PROGRESS',
      createdBy: userId,
      snapshot: balances.map((b) => ({
        productId: b.productId,
        systemQty: Number(b.quantity),
        actualQty: null,
      })),
    };
  }

  // ─── Product stock lookup (for forms) ────────────────────────────────────

  async getProductStock(productId: string, warehouseId: string) {
    const repo = await this.getRepo(InventoryBalance);
    const balance = await repo.findOne({ where: { productId, warehouseId } });
    return { quantity: Number(balance?.quantity ?? 0), avgCost: Number(balance?.avgCost ?? 0) };
  }

  async getInventoryTransactions(productId: string, warehouseId?: string, limit = 50) {
    const repo = await this.getRepo(InventoryTransaction);
    const qb = repo.createQueryBuilder('tx')
      .where('tx.productId = :pid', { pid: productId })
      .orderBy('tx.createdAt', 'DESC')
      .take(limit);
    if (warehouseId) qb.andWhere('tx.warehouseId = :wid', { wid: warehouseId });
    return qb.getMany();
  }
}

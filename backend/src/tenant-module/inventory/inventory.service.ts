import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TenantDataSourceManager } from '../../tenant/tenant-datasource.manager';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { Warehouse } from './entities/warehouse.entity';
import { InventoryBalance } from './entities/inventory-balance.entity';
import { InventoryTransaction, TxType } from './entities/inventory-transaction.entity';
import { InventoryLot } from './entities/inventory-lot.entity';
import { StockReceipt, ReceiptStatus } from './entities/stock-receipt.entity';
import { StockReceiptItem } from './entities/stock-receipt-item.entity';
import { StockTransfer, TransferStatus } from './entities/stock-transfer.entity';
import { StockTransferItem } from './entities/stock-transfer-item.entity';
import { StocktakingSession, StocktakingStatus } from './entities/stocktaking-session.entity';
import { StocktakingItem } from './entities/stocktaking-item.entity';
import { StockIssue, IssueStatus, IssueType } from './entities/stock-issue.entity';
import { StockIssueItem } from './entities/stock-issue-item.entity';
import {
  CreateWarehouseDto, UpdateWarehouseDto,
  CreateStockReceiptDto, ConfirmStockReceiptDto, UpdateStockReceiptDto,
  CreateStockOutDto, CreateAdjustmentDto,
  CreateTransferDto, ReceiveTransferDto,
  CreateStocktakingDto, CompleteStocktakingDto,
  InventoryFilterDto, StockReceiptFilterDto, StockOutFilterDto,
  CreateStockIssueDto, UpdateStockIssueDto, StockIssueFilterDto,
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

  private async getRepo<T extends object>(entity: new (...args: any[]) => T): Promise<Repository<T>> {
    return (await this.getDs()).getRepository(entity) as Repository<T>;
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
        `SELECT id, conversion_rate FROM product_units WHERE id IN (${productUnitIds.map(() => '?').join(',')})`,
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

  async getReceipts(filter: StockReceiptFilterDto) {
    const repo = await this.getRepo(StockReceipt);
    const qb = repo.createQueryBuilder('r')
      .leftJoinAndSelect('r.items', 'items')
      .orderBy('r.createdAt', 'DESC');
    if (filter.warehouseId) qb.andWhere('r.warehouseId = :wid', { wid: filter.warehouseId });
    const [data, total] = await qb.skip(filter.skip).take(filter.limit).getManyAndCount();
    return { data, total, page: filter.page, limit: filter.limit };
  }

  private async loadReceiptEntity(id: string): Promise<StockReceipt> {
    const repo = await this.getRepo(StockReceipt);
    const receipt = await repo.createQueryBuilder('r')
      .leftJoinAndSelect('r.items', 'items')
      .where('r.id = :id', { id })
      .getOne();
    if (!receipt) throw new NotFoundException(`Receipt ${id} not found`);
    return receipt;
  }

  async getReceipt(id: string) {
    const receipt = await this.loadReceiptEntity(id);
    const ds = await this.getDs();

    const productIds = [...new Set((receipt.items ?? []).map((i) => i.productId))];
    const unitIds = [...new Set((receipt.items ?? []).filter((i) => i.unitId).map((i) => i.unitId!))];

    const [whRows, supplierRows, productRows, unitRows] = await Promise.all([
      ds.query('SELECT id, name FROM warehouses WHERE id = ?', [receipt.warehouseId]),
      receipt.supplierId
        ? ds.query('SELECT id, name, code FROM suppliers WHERE id = ?', [receipt.supplierId])
        : Promise.resolve([]),
      productIds.length
        ? ds.query(`SELECT id, name, sku FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`, productIds)
        : Promise.resolve([]),
      unitIds.length
        ? ds.query(`SELECT id, name FROM product_units WHERE id IN (${unitIds.map(() => '?').join(',')})`, unitIds)
        : Promise.resolve([]),
    ]);

    const productMap: Record<string, any> = Object.fromEntries(productRows.map((p: any) => [p.id, p]));
    const unitMap: Record<string, any> = Object.fromEntries(unitRows.map((u: any) => [u.id, u]));
    const supplier = supplierRows[0];

    return {
      ...receipt,
      warehouseName: whRows[0]?.name,
      supplierCode: supplier?.code,
      supplierName: supplier?.name,
      items: (receipt.items ?? []).map((item) => ({
        ...item,
        productSku: productMap[item.productId]?.sku,
        productName: productMap[item.productId]?.name,
        unitName: item.unitId ? unitMap[item.unitId]?.name : null,
      })),
    };
  }

  async confirmReceipt(id: string, dto: ConfirmStockReceiptDto, userId: string) {
    const ds = await this.getDs();
    const receipt = await this.loadReceiptEntity(id);

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
      const refreshed = await this.loadReceiptEntity(id);
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

  async cancelReceipt(id: string) {
    const ds = await this.getDs();
    const receipt = await this.loadReceiptEntity(id);
    if (receipt.status !== ReceiptStatus.DRAFT) throw new BadRequestException('RECEIPT_NOT_DRAFT');
    const repo = ds.getRepository(StockReceipt);
    receipt.status = ReceiptStatus.CANCELLED;
    await repo.save(receipt);
    return this.getReceipt(id);
  }

  async updateReceipt(id: string, dto: UpdateStockReceiptDto) {
    const ds = await this.getDs();
    const receipt = await this.loadReceiptEntity(id);
    if (receipt.status !== ReceiptStatus.DRAFT) throw new BadRequestException('RECEIPT_NOT_DRAFT');

    const receiptRepo = ds.getRepository(StockReceipt);
    const itemRepo = ds.getRepository(StockReceiptItem);

    if (dto.supplierId !== undefined) receipt.supplierId = dto.supplierId;
    if (dto.warehouseId !== undefined) receipt.warehouseId = dto.warehouseId;
    if (dto.refCode !== undefined) receipt.refCode = dto.refCode;
    if (dto.expectedDate !== undefined) receipt.expectedDate = dto.expectedDate;
    if (dto.notes !== undefined) receipt.notes = dto.notes;

    if (dto.items !== undefined) {
      receipt.totalAmount = dto.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
      const unitIds = dto.items.filter((i) => i.unitId).map((i) => i.unitId!);
      let unitMap: Record<string, number> = {};
      if (unitIds.length) {
        const rows = await ds.query(
          `SELECT id, conversion_rate FROM product_units WHERE id IN (${unitIds.map(() => '?').join(',')})`,
          unitIds,
        );
        unitMap = Object.fromEntries(rows.map((u: any) => [u.id, parseFloat(u.conversion_rate)]));
      }
      await itemRepo.delete({ receiptId: id });
      const newItems = dto.items.map((i) => itemRepo.create({
        receiptId: id, productId: i.productId, unitId: i.unitId,
        quantity: i.quantity, qtyInBase: i.quantity * (unitMap[i.unitId!] ?? 1),
        unitCost: i.unitCost, batchNumber: i.batchNumber, expiryDate: i.expiryDate,
      }));
      await itemRepo.save(newItems);
    }

    await receiptRepo.save(receipt);
    return this.getReceipt(id);
  }

  // ─── Stock Issues (DRAFT → CONFIRMED flow) ────────────────────────────────

  private async loadIssueEntity(id: string): Promise<StockIssue> {
    const repo = await this.getRepo(StockIssue);
    const issue = await repo.createQueryBuilder('i')
      .leftJoinAndSelect('i.items', 'items')
      .where('i.id = :id', { id })
      .getOne();
    if (!issue) throw new NotFoundException(`Issue ${id} not found`);
    return issue;
  }

  private async buildUnitMap(ds: DataSource, unitIds: string[]): Promise<Record<string, number>> {
    if (!unitIds.length) return {};
    const rows = await ds.query(
      `SELECT id, conversion_rate FROM product_units WHERE id IN (${unitIds.map(() => '?').join(',')})`,
      unitIds,
    );
    return Object.fromEntries(rows.map((u: any) => [u.id, parseFloat(u.conversion_rate)]));
  }

  async getIssues(filter: StockIssueFilterDto) {
    const repo = await this.getRepo(StockIssue);
    const qb = repo.createQueryBuilder('i').orderBy('i.createdAt', 'DESC');
    if (filter.warehouseId) qb.andWhere('i.warehouseId = :wid', { wid: filter.warehouseId });
    if (filter.status) qb.andWhere('i.status = :s', { s: filter.status });
    const [issues, total] = await qb.skip(filter.skip).take(filter.limit).getManyAndCount();

    const ds = await this.getDs();
    const whIds = [...new Set(issues.map((i) => i.warehouseId))];
    const whRows = whIds.length
      ? await ds.query(`SELECT id, name FROM warehouses WHERE id IN (${whIds.map(() => '?').join(',')})`, whIds)
      : [];
    const whMap: Record<string, string> = Object.fromEntries(whRows.map((w: any) => [w.id, w.name]));

    return { data: issues.map((i) => ({ ...i, warehouseName: whMap[i.warehouseId] })), total, page: filter.page, limit: filter.limit };
  }

  async getIssue(id: string) {
    const issue = await this.loadIssueEntity(id);
    const ds = await this.getDs();

    const productIds = [...new Set((issue.items ?? []).map((i) => i.productId))];
    const unitIds = [...new Set((issue.items ?? []).filter((i) => i.unitId).map((i) => i.unitId!))];

    const [whRows, productRows, unitRows] = await Promise.all([
      ds.query('SELECT id, name FROM warehouses WHERE id = ?', [issue.warehouseId]),
      productIds.length ? ds.query(`SELECT id, name, sku FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`, productIds) : Promise.resolve([]),
      unitIds.length ? ds.query(`SELECT id, name FROM product_units WHERE id IN (${unitIds.map(() => '?').join(',')})`, unitIds) : Promise.resolve([]),
    ]);

    const productMap: Record<string, any> = Object.fromEntries(productRows.map((p: any) => [p.id, p]));
    const unitMap: Record<string, any> = Object.fromEntries(unitRows.map((u: any) => [u.id, u]));

    return {
      ...issue,
      warehouseName: whRows[0]?.name,
      items: (issue.items ?? []).map((item) => ({
        ...item,
        productSku: productMap[item.productId]?.sku,
        productName: productMap[item.productId]?.name,
        unitName: item.unitId ? unitMap[item.unitId]?.name : null,
      })),
    };
  }

  async createIssueDraft(dto: CreateStockIssueDto, userId: string) {
    const ds = await this.getDs();
    const issueRepo = ds.getRepository(StockIssue);
    const itemRepo = ds.getRepository(StockIssueItem);

    const unitMap = await this.buildUnitMap(ds, dto.items.filter((i) => i.unitId).map((i) => i.unitId!));

    const issue = issueRepo.create({
      warehouseId: dto.warehouseId, issueType: dto.issueType as IssueType,
      orderId: dto.orderId, notes: dto.notes,
      status: IssueStatus.DRAFT, createdBy: userId,
    });
    await issueRepo.save(issue);

    await itemRepo.save(dto.items.map((i) => itemRepo.create({
      issueId: issue.id, productId: i.productId, unitId: i.unitId,
      quantity: i.quantity, qtyInBase: i.quantity * (unitMap[i.unitId!] ?? 1),
    })));

    return this.getIssue(issue.id);
  }

  async updateIssue(id: string, dto: UpdateStockIssueDto) {
    const ds = await this.getDs();
    const issue = await this.loadIssueEntity(id);
    if (issue.status !== IssueStatus.DRAFT) throw new BadRequestException('ISSUE_NOT_DRAFT');

    const issueRepo = ds.getRepository(StockIssue);
    const itemRepo = ds.getRepository(StockIssueItem);

    if (dto.warehouseId !== undefined) issue.warehouseId = dto.warehouseId;
    if (dto.issueType !== undefined) issue.issueType = dto.issueType as IssueType;
    if (dto.orderId !== undefined) issue.orderId = dto.orderId;
    if (dto.notes !== undefined) issue.notes = dto.notes;
    await issueRepo.save(issue);

    if (dto.items !== undefined) {
      const unitMap = await this.buildUnitMap(ds, dto.items.filter((i) => i.unitId).map((i) => i.unitId!));
      await itemRepo.delete({ issueId: id });
      await itemRepo.save(dto.items.map((i) => itemRepo.create({
        issueId: id, productId: i.productId, unitId: i.unitId,
        quantity: i.quantity, qtyInBase: i.quantity * (unitMap[i.unitId!] ?? 1),
      })));
    }

    return this.getIssue(id);
  }

  async confirmIssue(id: string, userId: string) {
    const ds = await this.getDs();
    const issue = await this.loadIssueEntity(id);
    if (issue.status !== IssueStatus.DRAFT) throw new BadRequestException('ISSUE_NOT_DRAFT');

    const balanceRepo = ds.getRepository(InventoryBalance);
    const txRepo = ds.getRepository(InventoryTransaction);
    const itemRepo = ds.getRepository(StockIssueItem);
    const issueRepo = ds.getRepository(StockIssue);

    for (const item of issue.items ?? []) {
      const available = Number((await balanceRepo.findOne({ where: { productId: item.productId, warehouseId: issue.warehouseId } }))?.quantity ?? 0);
      if (available < Number(item.qtyInBase)) {
        throw new BadRequestException({ code: 'INSUFFICIENT_STOCK', productId: item.productId, available, requested: Number(item.qtyInBase) });
      }
    }

    for (const item of issue.items ?? []) {
      const qtyInBase = Number(item.qtyInBase);
      const balance = await balanceRepo.findOne({ where: { productId: item.productId, warehouseId: issue.warehouseId } });
      const avgCost = Number(balance!.avgCost);
      balance!.quantity = Number(balance!.quantity) - qtyInBase;
      await balanceRepo.save(balance!);
      item.unitCost = avgCost;
      await itemRepo.save(item);
      await txRepo.save(txRepo.create({
        productId: item.productId, warehouseId: issue.warehouseId,
        transactionType: TxType.STOCK_OUT, quantity: qtyInBase, unitCost: avgCost,
        refId: issue.id, refType: issue.issueType, notes: issue.notes, createdBy: userId,
      }));
    }

    issue.status = IssueStatus.CONFIRMED;
    issue.confirmedAt = new Date();
    issue.confirmedBy = userId;
    await issueRepo.save(issue);
    return this.getIssue(id);
  }

  async cancelIssue(id: string, userId: string) {
    const ds = await this.getDs();
    const issue = await this.loadIssueEntity(id);
    if (issue.status === IssueStatus.CANCELLED) throw new BadRequestException('ISSUE_ALREADY_CANCELLED');

    if (issue.status === IssueStatus.CONFIRMED) {
      const balanceRepo = ds.getRepository(InventoryBalance);
      const txRepo = ds.getRepository(InventoryTransaction);
      for (const item of issue.items ?? []) {
        const qtyInBase = Number(item.qtyInBase);
        const balance = await balanceRepo.findOne({ where: { productId: item.productId, warehouseId: issue.warehouseId } });
        if (balance) { balance.quantity = Number(balance.quantity) + qtyInBase; await balanceRepo.save(balance); }
        await txRepo.save(txRepo.create({
          productId: item.productId, warehouseId: issue.warehouseId,
          transactionType: TxType.ADJUSTMENT_IN, quantity: qtyInBase,
          unitCost: Number(item.unitCost ?? 0), refId: issue.id, refType: 'cancel_issue', createdBy: userId,
        }));
      }
    }

    issue.status = IssueStatus.CANCELLED;
    await (await this.getRepo(StockIssue)).save(issue);
    return this.getIssue(id);
  }

  // ─── Stock Out (immediate, kept for backward compat) ──────────────────────

  async stockOut(dto: CreateStockOutDto, userId: string) {
    const ds = await this.getDs();
    const balanceRepo = ds.getRepository(InventoryBalance);
    const txRepo = ds.getRepository(InventoryTransaction);

    // Resolve unit conversion rates (same pattern as createReceipt)
    const productUnitIds = dto.items.filter((i) => i.unitId).map((i) => i.unitId!);
    let unitMap: Record<string, number> = {};
    if (productUnitIds.length) {
      const units = await ds.query(
        `SELECT id, conversion_rate FROM product_units WHERE id IN (${productUnitIds.map(() => '?').join(',')})`,
        productUnitIds,
      );
      unitMap = Object.fromEntries(units.map((u: any) => [u.id, parseFloat(u.conversion_rate)]));
    }

    for (const item of dto.items) {
      const convRate = unitMap[item.unitId!] ?? 1;
      const qtyInBase = item.quantity * convRate;

      const balance = await balanceRepo.findOne({
        where: { productId: item.productId, warehouseId: dto.warehouseId },
      });
      const available = Number(balance?.quantity ?? 0);
      if (available < qtyInBase) {
        throw new BadRequestException({
          code: 'INSUFFICIENT_STOCK',
          productId: item.productId,
          available,
          requested: qtyInBase,
        });
      }

      balance!.quantity = available - qtyInBase;
      await balanceRepo.save(balance!);

      await txRepo.save(txRepo.create({
        productId: item.productId,
        warehouseId: dto.warehouseId,
        transactionType: TxType.STOCK_OUT,
        quantity: qtyInBase,
        unitCost: Number(balance!.avgCost),
        refId: dto.orderId,
        refType: dto.issueType,
        notes: dto.notes,
        createdBy: userId,
      }));
    }

    return { success: true };
  }

  async getStockOuts(filter: StockOutFilterDto) {
    const ds = await this.getDs();
    const qb = ds.getRepository(InventoryTransaction)
      .createQueryBuilder('t')
      .innerJoin('products', 'p', 'p.id = t.product_id AND p.deleted_at IS NULL')
      .innerJoin('warehouses', 'w', 'w.id = t.warehouse_id')
      .select([
        't.id AS id',
        'p.sku AS sku',
        'p.name AS productName',
        'w.name AS warehouseName',
        'CAST(t.quantity AS FLOAT) AS quantity',
        'CAST(t.unit_cost AS FLOAT) AS unitCost',
        't.ref_id AS refId',
        't.ref_type AS issueType',
        't.notes AS notes',
        't.created_at AS createdAt',
      ])
      .where('t.transaction_type = :type', { type: TxType.STOCK_OUT })
      .orderBy('t.created_at', 'DESC');

    if (filter.warehouseId) qb.andWhere('t.warehouse_id = :wid', { wid: filter.warehouseId });

    const total = await qb.getCount();
    const data = await qb.offset(filter.skip).limit(filter.limit).getRawMany();
    return { data, total, page: filter.page, limit: filter.limit };
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

    // Snapshot current balances → persist to DB
    const balances = await ds.getRepository(InventoryBalance).find({
      where: { warehouseId: dto.warehouseId },
    });

    const sessionRepo = ds.getRepository(StocktakingSession);
    const itemRepo = ds.getRepository(StocktakingItem);

    const session = sessionRepo.create({
      warehouseId: dto.warehouseId,
      notes: dto.notes,
      status: StocktakingStatus.IN_PROGRESS,
      createdBy: userId,
    });
    await sessionRepo.save(session);

    // Snapshot balances as stocktaking items
    if (balances.length > 0) {
      const items = balances.map((b) => itemRepo.create({
        sessionId: session.id,
        productId: b.productId,
        systemQty: Number(b.quantity),
      }));
      await itemRepo.save(items);
      session.items = items;
    }

    return { ...session, warehouseName: wh.name };
  }

  async getStocktakings(warehouseId?: string) {
    const repo = await this.getRepo(StocktakingSession);
    const qb = repo.createQueryBuilder('s')
      .leftJoinAndSelect('s.items', 'items')
      .orderBy('s.createdAt', 'DESC');
    if (warehouseId) qb.andWhere('s.warehouseId = :wid', { wid: warehouseId });
    return qb.getMany();
  }

  async getStocktaking(id: string) {
    const repo = await this.getRepo(StocktakingSession);
    const session = await repo.createQueryBuilder('s')
      .leftJoinAndSelect('s.items', 'items')
      .where('s.id = :id', { id })
      .getOne();
    if (!session) throw new NotFoundException(`Stocktaking session ${id} not found`);
    return session;
  }

  async completeStocktaking(id: string, dto: CompleteStocktakingDto, userId: string) {
    const ds = await this.getDs();
    const session = await this.getStocktaking(id);

    if (session.status !== StocktakingStatus.IN_PROGRESS) {
      throw new BadRequestException('STOCKTAKING_NOT_IN_PROGRESS');
    }

    const itemRepo = ds.getRepository(StocktakingItem);
    const balanceRepo = ds.getRepository(InventoryBalance);
    const txRepo = ds.getRepository(InventoryTransaction);

    let adjustedCount = 0;

    for (const update of dto.items) {
      const item = session.items?.find((i) => i.productId === update.productId);
      if (!item) continue;

      const actualQty = Number(update.actualQty);
      const systemQty = Number(item.systemQty);
      const adjustQty = actualQty - systemQty;

      item.actualQty = actualQty;
      item.adjustQty = adjustQty;
      await itemRepo.save(item);

      if (adjustQty === 0) continue;
      adjustedCount++;

      // Apply balance adjustment
      let balance = await balanceRepo.findOne({
        where: { productId: item.productId, warehouseId: session.warehouseId },
      });
      if (!balance) {
        balance = balanceRepo.create({
          productId: item.productId,
          warehouseId: session.warehouseId,
          quantity: 0,
          avgCost: 0,
        });
      }
      balance.quantity = Number(balance.quantity) + adjustQty;
      await balanceRepo.save(balance);

      // Record inventory transaction
      await txRepo.save(txRepo.create({
        productId: item.productId,
        warehouseId: session.warehouseId,
        transactionType: adjustQty > 0 ? TxType.ADJUSTMENT_IN : TxType.ADJUSTMENT_OUT,
        quantity: Math.abs(adjustQty),
        refId: session.id,
        refType: 'stocktaking',
        notes: `Kiểm kê kho: ${session.notes ?? ''}`,
        createdBy: userId,
      }));
    }

    const sessionRepo = ds.getRepository(StocktakingSession);
    session.status = StocktakingStatus.COMPLETED;
    session.completedAt = new Date();
    await sessionRepo.save(session);

    return { ...session, adjustedCount };
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

  async getExpiryAlerts(daysAhead = 90, warehouseId?: string) {
    const ds       = await this.getDs();
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + daysAhead);

    const rows = await ds.query(`
      SELECT
        l.id, l.batch_number AS batchNumber,
        l.expiry_date AS expiryDate,
        l.remaining_qty AS remainingQty,
        l.cost_per_unit AS costPerUnit,
        l.received_at AS receivedAt,
        p.id AS productId, p.sku, p.name AS productName,
        w.id AS warehouseId, w.name AS warehouseName,
        DATEDIFF(l.expiry_date, NOW()) AS daysUntilExpiry
      FROM inventory_lots l
      JOIN products p   ON l.product_id   = p.id
      JOIN warehouses w ON l.warehouse_id = w.id
      WHERE l.remaining_qty > 0
        AND l.expiry_date IS NOT NULL
        AND l.expiry_date <= ?
        AND l.deleted_at IS NULL
        ${warehouseId ? `AND l.warehouse_id = '${warehouseId}'` : ''}
      ORDER BY l.expiry_date ASC
    `, [deadline]);

    return rows.map((r: any) => ({
      id:              r.id,
      batchNumber:     r.batchNumber,
      expiryDate:      r.expiryDate,
      remainingQty:    +Number(r.remainingQty).toFixed(4),
      costPerUnit:     +Number(r.costPerUnit).toFixed(2),
      daysUntilExpiry: Number(r.daysUntilExpiry),
      product:         { id: r.productId, sku: r.sku, name: r.productName },
      warehouse:       { id: r.warehouseId, name: r.warehouseName },
    }));
  }

  async getInventoryLotsByProduct(productId: string, warehouseId?: string) {
    const ds   = await this.getDs();
    const rows = await ds.query(`
      SELECT l.*, w.name AS warehouseName
      FROM inventory_lots l
      JOIN warehouses w ON l.warehouse_id = w.id
      WHERE l.product_id = ? AND l.deleted_at IS NULL
        ${warehouseId ? `AND l.warehouse_id = '${warehouseId}'` : ''}
      ORDER BY l.expiry_date ASC, l.received_at ASC
    `, [productId]);
    return rows;
  }
}

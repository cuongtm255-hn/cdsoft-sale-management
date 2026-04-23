# MODULE 12 — Extended Features: Backend Detail Design

> Ref: `srs-tenant-detail.md` Ch.9 | Feature list tasks #137–#145
> Stack: **NestJS 10 + TypeORM + MySQL** | Source: `backend/src/tenant-module/`

---

## Cấu trúc file đề xuất

```
backend/src/
└── tenant-module/
    ├── inventory/
    │   ├── entities/
    │   │   ├── inventory-lot.entity.ts     — Quản lý số lô / FEFO (Task #137–#138)
    │   │   └── stock-alert.entity.ts       — Cảnh báo hàng sắp hết hạn (Task #139)
    │   ├── jobs/
    │   │   └── expiry-alert.job.ts         — Scheduled job (Task #139)
    │   └── (extend existing stock services)
    ├── serial/
    │   ├── entities/
    │   │   └── serial-number.entity.ts     — Serial/IMEI tracking (Task #142)
    │   ├── dto/
    │   │   └── serial.dto.ts
    │   ├── serial.controller.ts
    │   ├── serial.service.ts
    │   └── serial.module.ts
    └── products/
        └── (extend product.entity.ts với flags)
```

---

## 12.1 Batch & Expiry Date Tracking

### Task #137 — Mở rộng model tồn kho

**Điều kiện bật:** Sản phẩm có `trackBatch = true` (thêm cột vào `products`).

**Mở rộng `product.entity.ts`:**
```typescript
// Thêm vào Product entity
@Column({ default: false })
trackBatch: boolean; // Bật theo dõi số lô/HSD

@Column({ default: false })
trackSerial: boolean; // Bật theo dõi Serial/IMEI
```

**Migration thêm cột:**
```typescript
await queryRunner.query(`
  ALTER TABLE products
  ADD COLUMN track_batch  TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN track_serial TINYINT(1) NOT NULL DEFAULT 0
`);
```

---

**`inventory-lot.entity.ts`**
```typescript
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from '../../products/entities/product.entity';
import { Warehouse } from '../../warehouses/entities/warehouse.entity';

@Entity('inventory_lots')
export class InventoryLot extends BaseEntity {
  @Column() productId: string;
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column() warehouseId: string;
  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ length: 100, nullable: true })
  batchNumber: string;        // Số lô (LOT-2026-04)

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;           // Hạn sử dụng

  @Column({ nullable: true })
  receiptItemId: string;      // FK → stock_receipt_items.id

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  costPerUnit: number;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  initialQty: number;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  remainingQty: number;

  @Column({ type: 'datetime' })
  receivedAt: Date;
}
```

**Migration:**
```typescript
await queryRunner.query(`
  CREATE TABLE inventory_lots (
    id              VARCHAR(36) PRIMARY KEY,
    product_id      VARCHAR(36) NOT NULL,
    warehouse_id    VARCHAR(36) NOT NULL,
    batch_number    VARCHAR(100) NULL,
    expiry_date     DATE NULL,
    receipt_item_id VARCHAR(36) NULL,
    cost_per_unit   DECIMAL(18,4) NOT NULL,
    initial_qty     DECIMAL(15,4) NOT NULL,
    remaining_qty   DECIMAL(15,4) NOT NULL,
    received_at     DATETIME NOT NULL,
    created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    deleted_at      DATETIME(6) NULL,
    INDEX idx_lot_product   (product_id),
    INDEX idx_lot_warehouse (warehouse_id),
    INDEX idx_lot_expiry    (expiry_date),
    FOREIGN KEY (product_id)  REFERENCES products(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
  )
`);
```

---

### Task #137 — Nhập kho có Batch

Trong `StockReceiptService.confirmReceipt()`, sau khi cộng `inventory_balances`:

```typescript
// Nếu sản phẩm có trackBatch = true
for (const item of receipt.items) {
  const product = await this.productRepo.findOneBy({ id: item.productId });
  if (product.trackBatch) {
    await this.inventoryLotRepo.save({
      productId:    item.productId,
      warehouseId:  receipt.warehouseId,
      batchNumber:  item.batchNumber,
      expiryDate:   item.expiryDate,
      receiptItemId: item.id,
      costPerUnit:  item.unitCost,
      initialQty:   item.qtyInBase,
      remainingQty: item.qtyInBase,
      receivedAt:   receipt.confirmedAt,
    });
  }
}
```

---

### Task #138 — FEFO Logic khi xuất kho

**FEFO:** First Expired, First Out — ưu tiên lô hàng có `expiryDate` gần nhất.

Trong `StockIssueService.issueStock()`, khi `product.trackBatch = true`:

```typescript
async deductWithFEFO(productId: string, warehouseId: string, requestedQty: number) {
  // Lấy lots theo FEFO: expiryDate ASC NULLS LAST, receivedAt ASC
  const lots = await this.lotRepo.find({
    where: { productId, warehouseId, remainingQty: MoreThan(0) },
    order: { expiryDate: 'ASC', receivedAt: 'ASC' },
  });

  let remaining = requestedQty;
  const consumed: Array<{ lotId: string; qty: number; costPerUnit: number }> = [];

  for (const lot of lots) {
    if (remaining <= 0) break;
    const take = Math.min(lot.remainingQty, remaining);
    consumed.push({ lotId: lot.id, qty: take, costPerUnit: lot.costPerUnit });
    lot.remainingQty -= take;
    remaining -= take;
    await this.lotRepo.save(lot);
  }

  if (remaining > 0) throw new BadRequestException('INSUFFICIENT_STOCK_IN_LOTS');

  // Tính giá vốn bình quân theo lot
  const totalCost = consumed.reduce((s, c) => s + c.qty * c.costPerUnit, 0);
  const avgCost = totalCost / requestedQty;

  return { consumed, avgCost };
}
```

---

### Task #139 — Scheduled Job: Expiry Alert

**File:** `backend/src/tenant-module/inventory/jobs/expiry-alert.job.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { InventoryLot } from '../entities/inventory-lot.entity';

@Injectable()
export class ExpiryAlertJob {
  private readonly logger = new Logger(ExpiryAlertJob.name);

  constructor(
    @InjectRepository(InventoryLot)
    private lotRepo: Repository<InventoryLot>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkExpiringLots() {
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    const expiringLots = await this.lotRepo.find({
      where: {
        expiryDate: LessThanOrEqual(threeMonthsFromNow),
        remainingQty: MoreThan(0),
      },
      relations: ['product', 'warehouse'],
    });

    if (expiringLots.length === 0) return;

    // Upsert vào stock_alerts
    for (const lot of expiringLots) {
      await this.stockAlertRepo.upsert({
        productId:   lot.productId,
        warehouseId: lot.warehouseId,
        alertType:   'EXPIRY_SOON',
        lotId:       lot.id,
        expiryDate:  lot.expiryDate,
        remainingQty: lot.remainingQty,
        triggeredAt: new Date(),
      }, ['productId', 'warehouseId', 'lotId']);
    }

    this.logger.log(`Expiry alert: ${expiringLots.length} lots expiring within 3 months`);
  }
}
```

**`GET /tenant/inventory/expiry-alerts`**

```typescript
@Get('expiry-alerts')
@RequirePermission('inventory:read')
async getExpiryAlerts(
  @Query('daysAhead') daysAhead: number = 90,
  @Query('warehouseId') warehouseId?: string,
) {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + daysAhead);

  const qb = this.lotRepo.createQueryBuilder('lot')
    .leftJoinAndSelect('lot.product', 'product')
    .leftJoinAndSelect('lot.warehouse', 'warehouse')
    .where('lot.expiry_date <= :deadline', { deadline })
    .andWhere('lot.remaining_qty > 0');

  if (warehouseId) qb.andWhere('lot.warehouse_id = :warehouseId', { warehouseId });

  return qb.orderBy('lot.expiry_date', 'ASC').getMany();
}
```

**Response shape:**
```json
[
  {
    "id": "uuid",
    "product": { "id": "uuid", "sku": "PROD-001", "name": "Thuốc ABC" },
    "warehouse": { "id": "uuid", "name": "Kho chính" },
    "batchNumber": "LOT-2026-01",
    "expiryDate": "2026-07-01",
    "daysUntilExpiry": 69,
    "remainingQty": 50,
    "costPerUnit": 35000
  }
]
```

---

## 12.2 Serial Number / IMEI Tracking

### Task #142 — `serial-number.entity.ts`

```typescript
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('serial_numbers')
export class SerialNumber extends BaseEntity {
  @Column() productId: string;
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ length: 100, unique: true })
  serialNumber: string;

  @Column({ length: 100, nullable: true })
  imei: string;

  @Column({ nullable: true })
  receiptItemId: string;  // nhập từ phiếu nào

  @Column({ nullable: true })
  orderItemId: string;    // xuất theo đơn nào (null = còn trong kho)

  @Column({ nullable: true })
  customerId: string;     // KH đang giữ máy (null = trong kho)

  @Column({ type: 'varchar', length: 20, default: 'IN_STOCK' })
  status: 'IN_STOCK' | 'SOLD' | 'RETURNED' | 'DEFECTIVE';

  @Column({ type: 'date', nullable: true })
  warrantyExpiry: Date;   // HSD bảo hành

  @Column({ type: 'date', nullable: true })
  purchasedAt: Date;      // Ngày bán cho KH
}
```

**Migration:**
```typescript
await queryRunner.query(`
  CREATE TABLE serial_numbers (
    id              VARCHAR(36) PRIMARY KEY,
    product_id      VARCHAR(36) NOT NULL,
    serial_number   VARCHAR(100) NOT NULL UNIQUE,
    imei            VARCHAR(100) NULL,
    receipt_item_id VARCHAR(36) NULL,
    order_item_id   VARCHAR(36) NULL,
    customer_id     VARCHAR(36) NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'IN_STOCK',
    warranty_expiry DATE NULL,
    purchased_at    DATE NULL,
    created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    deleted_at      DATETIME(6) NULL,
    INDEX idx_serial_product  (product_id),
    INDEX idx_serial_customer (customer_id),
    INDEX idx_serial_status   (status),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )
`);
```

---

### Task #142 — Nhập kho Serial

Trong `StockReceiptService.confirmReceipt()`:
```typescript
if (product.trackSerial) {
  if (!item.serialNumbers?.length) {
    throw new BadRequestException(`Product ${product.sku} requires serial numbers`);
  }
  if (item.serialNumbers.length !== item.qtyInBase) {
    throw new BadRequestException('Serial count must match quantity');
  }

  // Validate unique trước khi insert
  const existing = await this.serialRepo.findBy({ serialNumber: In(item.serialNumbers) });
  if (existing.length > 0) {
    throw new ConflictException(`Duplicate serials: ${existing.map(s => s.serialNumber).join(', ')}`);
  }

  await this.serialRepo.save(item.serialNumbers.map(sn => ({
    productId:     item.productId,
    serialNumber:  sn,
    receiptItemId: item.id,
    status:        'IN_STOCK',
  })));
}
```

---

### Task #142 — Xuất kho Serial

Khi `POST /stock-issues` với sản phẩm `trackSerial = true`:

**Request body thêm:**
```json
{
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "serialNumbers": ["SN-iPhone-001", "SN-iPhone-002"]
    }
  ]
}
```

**Service:**
```typescript
// Cập nhật status → SOLD, gán customerId, purchasedAt
await this.serialRepo.update(
  { serialNumber: In(item.serialNumbers) },
  {
    status:      'SOLD',
    orderItemId: orderItemId,
    customerId:  order.customerId,
    purchasedAt: new Date(),
  }
);
```

---

### Task #143 — `GET /tenant/serial/warranty-lookup`

**Auth:** `JwtAuthGuard` + `@RequirePermission('inventory:read')`

**Query:** `?serial=SN-iPhone-001`

```typescript
@Get('warranty-lookup')
async warrantyLookup(@Query('serial') serial: string) {
  const sn = await this.serialRepo.findOne({
    where: { serialNumber: serial },
    relations: ['product', 'customer'],
  });
  if (!sn) throw new NotFoundException('Serial number not found');

  // Lịch sử (nếu có service order system)
  const repairHistory = await this.repairRepo.findBy({ serialNumberId: sn.id });

  return {
    serialNumber: sn.serialNumber,
    imei: sn.imei,
    product: { id: sn.product.id, name: sn.product.name, sku: sn.product.sku },
    status: sn.status,
    customer: sn.customer ? { id: sn.customer.id, name: sn.customer.name } : null,
    purchasedAt: sn.purchasedAt,
    warrantyExpiry: sn.warrantyExpiry,
    warrantyDaysRemaining: sn.warrantyExpiry
      ? Math.max(0, Math.ceil((sn.warrantyExpiry.getTime() - Date.now()) / 86400000))
      : null,
    repairHistory,
  };
}
```

**Response:**
```json
{
  "serialNumber": "SN-iPhone-001",
  "imei": "355812345678901",
  "product": { "id": "uuid", "name": "iPhone 15 Pro 256GB", "sku": "IPH15P-256" },
  "status": "SOLD",
  "customer": { "id": "uuid", "name": "Nguyen Van A" },
  "purchasedAt": "2026-01-15",
  "warrantyExpiry": "2027-01-15",
  "warrantyDaysRemaining": 267,
  "repairHistory": []
}
```

---

## 12.3 Serial Controller

**`serial.controller.ts`**
```typescript
@ApiTags('Tenant / Serial Numbers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('tenant/serial')
export class SerialController {
  constructor(private readonly serialService: SerialService) {}

  @Get('warranty-lookup')
  @RequirePermission('inventory:read')
  warrantyLookup(@Query('serial') serial: string) {
    return this.serialService.warrantyLookup(serial);
  }

  @Get('in-stock')
  @RequirePermission('inventory:read')
  listInStock(@Query() dto: SerialQueryDto) {
    return this.serialService.listByStatus('IN_STOCK', dto);
  }

  @Get(':productId')
  @RequirePermission('inventory:read')
  listByProduct(@Param('productId') productId: string, @Query() dto: PaginationDto) {
    return this.serialService.listByProduct(productId, dto);
  }
}
```

---

## Tích hợp với các Module hiện tại

| Event | Action mở rộng |
|-------|---------------|
| `StockReceiptService.confirm()` | Nếu `trackBatch` → tạo `InventoryLot`; nếu `trackSerial` → tạo `SerialNumber` |
| `StockIssueService.issue()` | Nếu `trackBatch` → deduct FEFO lots; nếu `trackSerial` → update serial status |
| `OrderService.confirm()` | Gán serial vào order items nếu có |
| Cron daily | `ExpiryAlertJob.checkExpiringLots()` |

---

## Cấu hình NestJS Schedule

**`tenant-app.module.ts`** — thêm:
```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Thêm để dùng @Cron
    // ...
  ],
  providers: [ExpiryAlertJob],
})
export class TenantAppModule {}
```

**Package cần cài:**
```bash
npm install @nestjs/schedule
```

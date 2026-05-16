import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { StockReceipt } from './stock-receipt.entity';

@Entity('stock_receipt_items')
export class StockReceiptItem extends BaseEntity {
  @Column()
  receiptId: string;

  @ManyToOne(() => StockReceipt, (r) => r.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receipt_id' })
  receipt: StockReceipt;

  @Column()
  productId: string;

  @Column({ nullable: true })
  unitId?: string;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  qtyInBase: number;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  unitCost: number;

  @Column({ length: 100, nullable: true })
  batchNumber?: string;

  @Column({ type: 'date', nullable: true })
  expiryDate?: string;
}

import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { StockReceiptItem } from './stock-receipt-item.entity';

export enum ReceiptStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

@Entity('stock_receipts')
export class StockReceipt extends BaseEntity {
  @Column({ nullable: true })
  supplierId?: string;

  @Column({ nullable: true })
  purchaseOrderId?: string;

  @Column()
  warehouseId: string;

  @Column({ length: 100, nullable: true })
  refCode?: string;

  @Column({ type: 'enum', enum: ReceiptStatus, default: ReceiptStatus.DRAFT })
  status: ReceiptStatus;

  @Column({ type: 'date', nullable: true })
  expectedDate?: string;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  @Column({ nullable: true })
  confirmedBy?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  totalAmount?: number;

  @OneToMany(() => StockReceiptItem, (i) => i.receipt, { cascade: true, eager: false })
  items?: StockReceiptItem[];
}

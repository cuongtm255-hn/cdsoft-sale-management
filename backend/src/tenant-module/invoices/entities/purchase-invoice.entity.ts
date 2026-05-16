import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PurchaseInvoiceItem } from './purchase-invoice-item.entity';

export enum PurchaseInvoiceStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

@Entity('purchase_invoices')
export class PurchaseInvoice extends BaseEntity {
  @Column({ length: 50, unique: true })
  code: string;

  @Column({ nullable: true })
  purchaseOrderId?: string;

  @Column({ nullable: true })
  stockReceiptId?: string;

  @Column()
  supplierId: string;

  @Column({ type: 'enum', enum: PurchaseInvoiceStatus, default: PurchaseInvoiceStatus.UNPAID })
  status: PurchaseInvoiceStatus;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  discountTotal: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'date', nullable: true })
  dueDate?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  issuedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => PurchaseInvoiceItem, (item) => item.purchaseInvoice, { cascade: true, eager: false })
  items?: PurchaseInvoiceItem[];
}

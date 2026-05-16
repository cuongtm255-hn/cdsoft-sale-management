import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PurchaseInvoice } from './purchase-invoice.entity';

@Entity('purchase_invoice_items')
export class PurchaseInvoiceItem extends BaseEntity {
  @Column()
  purchaseInvoiceId: string;

  @ManyToOne(() => PurchaseInvoice, (invoice) => invoice.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_invoice_id' })
  purchaseInvoice?: PurchaseInvoice;

  @Column({ nullable: true })
  productId?: string;

  @Column({ length: 255 })
  productName: string;

  @Column({ length: 50, nullable: true })
  unit?: string;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  quantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercent: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  lineTotal: number;
}

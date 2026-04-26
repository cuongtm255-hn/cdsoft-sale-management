import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Invoice } from './invoice.entity';

@Entity('invoice_items')
export class InvoiceItem extends BaseEntity {
  @Column()
  invoiceId: string;

  @ManyToOne(() => Invoice, (i) => i.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice?: Invoice;

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

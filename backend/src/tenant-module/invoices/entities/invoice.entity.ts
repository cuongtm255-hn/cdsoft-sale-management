import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { InvoiceItem } from './invoice-item.entity';
import { Payment } from './payment.entity';

export enum InvoiceStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

@Entity('invoices')
export class Invoice extends BaseEntity {
  @Column({ length: 50, unique: true })
  code: string;

  @Column()
  orderId: string;

  @Column()
  customerId: string;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.UNPAID })
  status: InvoiceStatus;

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

  @OneToMany(() => InvoiceItem, (i) => i.invoice, { cascade: true, eager: false })
  items?: InvoiceItem[];

  @OneToMany(() => Payment, (p) => p.invoice, { eager: false })
  payments?: Payment[];
}

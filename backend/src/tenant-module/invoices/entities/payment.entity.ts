import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Invoice } from './invoice.entity';

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CARD = 'CARD',
  E_WALLET = 'E_WALLET',
}

@Entity('payments')
export class Payment extends BaseEntity {
  @Column()
  invoiceId: string;

  @ManyToOne(() => Invoice, (i) => i.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice?: Invoice;

  @Column()
  customerId: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ nullable: true })
  cashFundId?: string;

  @Column({ nullable: true })
  bankAccountId?: string;

  @Column({ length: 100, nullable: true })
  transactionRef?: string;

  @Column({ type: 'timestamp' })
  paidAt: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ nullable: true })
  createdBy?: string;
}

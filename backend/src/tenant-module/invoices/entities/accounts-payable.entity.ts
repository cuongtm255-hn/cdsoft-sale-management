import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum ApStatus {
  PENDING = 'PENDING',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

@Entity('accounts_payable')
export class AccountsPayable extends BaseEntity {
  @Column()
  supplierId: string;

  @Column({ nullable: true })
  stockReceiptId?: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'date' })
  dueDate: string;

  @Column({ type: 'enum', enum: ApStatus, default: ApStatus.PENDING })
  status: ApStatus;

  @Column({ length: 100, nullable: true })
  invoiceRef?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}

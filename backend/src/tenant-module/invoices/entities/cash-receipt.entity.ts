import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum ReceiptType {
  CUSTOMER_PAYMENT = 'CUSTOMER_PAYMENT',
  OTHER = 'OTHER',
}

export enum DisbursementType {
  SUPPLIER_PAYMENT = 'SUPPLIER_PAYMENT',
  EXPENSE = 'EXPENSE',
  OTHER = 'OTHER',
}

export enum CashReceiptKind {
  RECEIPT = 'RECEIPT',
  DISBURSEMENT = 'DISBURSEMENT',
}

export enum CashReceiptStatus {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
}

@Entity('cash_receipts')
export class CashReceipt extends BaseEntity {
  @Column({ type: 'enum', enum: CashReceiptKind })
  kind: CashReceiptKind;

  @Column({ length: 50 })
  receiptType: string;

  @Column({ nullable: true })
  refId?: string;

  @Column({ length: 50, nullable: true })
  refType?: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ length: 30, nullable: true })
  method?: string;

  @Column({ nullable: true })
  cashFundId?: string;

  @Column({ nullable: true })
  bankAccountId?: string;

  @Column({ nullable: true })
  customerId?: string;

  @Column({ nullable: true })
  supplierId?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: CashReceiptStatus, default: CashReceiptStatus.APPROVED })
  status: CashReceiptStatus;

  @Column({ nullable: true })
  createdBy?: string;
}

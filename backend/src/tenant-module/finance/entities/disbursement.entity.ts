import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

export type DisbursementStatus = 'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED';

@Entity('disbursements')
export class Disbursement extends BaseEntity {
  @Column({ length: 50 })
  disbursementType: string; // SUPPLIER_PAYMENT | SALARY | OVERHEAD | OTHER

  @Column({ nullable: true })
  supplierId: string;

  @Column({ nullable: true })
  apRecordId: string;

  @Column({ nullable: true })
  cashFundId: string;

  @Column({ nullable: true })
  bankAccountId: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 30, default: 'APPROVED' })
  status: DisbursementStatus;

  @Column({ nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  approvedBy: string;

  @Column({ type: 'text', nullable: true })
  rejectReason: string;
}

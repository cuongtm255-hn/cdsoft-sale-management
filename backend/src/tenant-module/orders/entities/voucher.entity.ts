import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum VoucherType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

@Entity('vouchers')
export class Voucher extends BaseEntity {
  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'enum', enum: VoucherType })
  type: VoucherType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  maxDiscount?: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  minOrderAmount: number;

  @Column({ default: 0 })
  usageLimit: number;

  @Column({ default: 0 })
  usedCount: number;

  @Column({ default: 1 })
  perCustomerLimit: number;

  @Column({ nullable: true, length: 20 })
  customerGroup?: string;

  @Column({ type: 'date', nullable: true })
  startDate?: string;

  @Column({ type: 'date', nullable: true })
  endDate?: string;

  @Column({ default: true })
  isActive: boolean;
}

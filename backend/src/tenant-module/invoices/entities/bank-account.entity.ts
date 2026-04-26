import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('bank_accounts')
export class BankAccount extends BaseEntity {
  @Column({ length: 100 })
  bankName: string;

  @Column({ length: 50 })
  accountNumber: string;

  @Column({ length: 255 })
  accountName: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  balance: number;

  @Column({ length: 10, default: 'VND' })
  currency: string;

  @Column({ default: true })
  isActive: boolean;
}

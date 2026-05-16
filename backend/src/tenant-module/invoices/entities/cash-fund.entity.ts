import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('cash_funds')
export class CashFund extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  balance: number;

  @Column({ length: 10, default: 'VND' })
  currency: string;

  @Column({ default: true })
  isActive: boolean;
}

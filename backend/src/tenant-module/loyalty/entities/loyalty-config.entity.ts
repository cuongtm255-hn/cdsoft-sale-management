import { Column, Entity, UpdateDateColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export interface LoyaltyTier {
  name: string;
  label: string;
  minPoints: number;
  discountPercent: number;
}

@Entity('loyalty_configs')
export class LoyaltyConfig extends BaseEntity {
  @Column({ default: false })
  isEnabled: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1000 })
  pointsPerAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1000 })
  amountPerPoint: number;

  @Column({ length: 10, default: 'VND' })
  currencyUnit: string;

  @Column({ default: 365 })
  tierEvaluationPeriodDays: number;

  @Column({ default: 730 })
  pointExpiryDays: number;

  @Column({ default: true })
  allowTierDowngrade: boolean;

  @Column({ type: 'json', nullable: true })
  tiers: LoyaltyTier[];

  @UpdateDateColumn()
  updatedAt: Date;
}

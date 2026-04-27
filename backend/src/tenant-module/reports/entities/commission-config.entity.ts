import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

export interface CommissionRule {
  minRevenue: number;
  rate: number;
}

@Entity('commission_configs')
export class CommissionConfigEntity extends BaseEntity {
  @Column({ default: 'REVENUE_PERCENT' })
  type: string;

  @Column({ type: 'json', default: '[]' })
  rules: CommissionRule[];
}

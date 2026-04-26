import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum PromotionType {
  ORDER_DISCOUNT = 'ORDER_DISCOUNT',
  BUY_X_GET_Y = 'BUY_X_GET_Y',
  BUNDLE = 'BUNDLE',
}

@Entity('promotions')
export class Promotion extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ type: 'enum', enum: PromotionType })
  type: PromotionType;

  @Column({ type: 'json', nullable: true })
  condition?: Record<string, unknown>;

  @Column({ type: 'json', nullable: true })
  discount?: Record<string, unknown>;

  @Column({ type: 'json', nullable: true })
  reward?: Record<string, unknown>;

  @Column({ type: 'json', nullable: true })
  items?: Record<string, unknown>[];

  @Column({ type: 'date', nullable: true })
  startDate?: string;

  @Column({ type: 'date', nullable: true })
  endDate?: string;

  @Column({ default: 0 })
  priority: number;

  @Column({ default: true })
  stackable: boolean;

  @Column({ default: 0 })
  usedCount: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ default: true })
  isActive: boolean;
}

import { Column, Entity, CreateDateColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('tier_change_logs')
export class TierChangeLog extends BaseEntity {
  @Column()
  customerId: string;

  @Column({ length: 20, nullable: true })
  oldTier?: string;

  @Column({ length: 20 })
  newTier: string;

  @Column({ length: 100, nullable: true })
  reason?: string;

  @CreateDateColumn()
  changedAt: Date;
}

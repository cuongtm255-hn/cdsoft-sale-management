import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { StocktakingItem } from './stocktaking-item.entity';

export enum StocktakingStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('stocktaking_sessions')
export class StocktakingSession extends BaseEntity {
  @Column()
  warehouseId: string;

  @Column({ type: 'enum', enum: StocktakingStatus, default: StocktakingStatus.IN_PROGRESS })
  status: StocktakingStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ nullable: true })
  createdBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @OneToMany(() => StocktakingItem, (i) => i.session, { cascade: true, eager: false })
  items?: StocktakingItem[];
}

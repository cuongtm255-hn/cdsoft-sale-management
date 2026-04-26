import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { StocktakingSession } from './stocktaking-session.entity';

@Entity('stocktaking_items')
export class StocktakingItem extends BaseEntity {
  @Column()
  sessionId: string;

  @ManyToOne(() => StocktakingSession, (s) => s.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session?: StocktakingSession;

  @Column()
  productId: string;

  /** SL sổ sách tại thời điểm bắt đầu kiểm kê */
  @Column({ type: 'decimal', precision: 15, scale: 4, default: 0 })
  systemQty: number;

  /** SL thực tế do người dùng nhập */
  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true })
  actualQty?: number;

  /** Chênh lệch = actualQty - systemQty */
  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true })
  adjustQty?: number;
}

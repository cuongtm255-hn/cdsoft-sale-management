import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { StockIssue } from './stock-issue.entity';

@Entity('stock_issue_items')
export class StockIssueItem extends BaseEntity {
  @Column()
  issueId: string;

  @ManyToOne(() => StockIssue, (r) => r.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'issue_id' })
  issue: StockIssue;

  @Column()
  productId: string;

  @Column({ nullable: true })
  unitId?: string;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  qtyInBase: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  unitCost?: number;
}

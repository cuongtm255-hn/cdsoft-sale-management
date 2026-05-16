import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { StockIssueItem } from './stock-issue-item.entity';

export enum IssueStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export enum IssueType {
  SALE = 'SALE',
  INTERNAL = 'INTERNAL',
  DAMAGED = 'DAMAGED',
}

@Entity('stock_issues')
export class StockIssue extends BaseEntity {
  @Column()
  warehouseId: string;

  @Column({ type: 'enum', enum: IssueType })
  issueType: IssueType;

  @Column({ type: 'enum', enum: IssueStatus, default: IssueStatus.DRAFT })
  status: IssueStatus;

  @Column({ nullable: true })
  orderId?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  @Column({ nullable: true })
  confirmedBy?: string;

  @Column({ nullable: true })
  createdBy?: string;

  @OneToMany(() => StockIssueItem, (i) => i.issue, { cascade: true, eager: false })
  items?: StockIssueItem[];
}

import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ReturnOrderItem } from './return-order-item.entity';

export enum RefundMethod {
  CASH = 'CASH',
  CREDIT = 'CREDIT',
  DEBT_OFFSET = 'DEBT_OFFSET',
}

@Entity('return_orders')
export class ReturnOrder extends BaseEntity {
  @Column({ length: 50, unique: true })
  code: string;

  @Column()
  originalOrderId: string;

  @Column()
  customerId: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'enum', enum: RefundMethod })
  refundMethod: RefundMethod;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  refundAmount: number;

  @Column({ length: 20, default: 'COMPLETED' })
  status: string;

  @Column({ nullable: true })
  createdBy?: string;

  @OneToMany(() => ReturnOrderItem, (i) => i.returnOrder, { cascade: true, eager: false })
  items?: ReturnOrderItem[];
}

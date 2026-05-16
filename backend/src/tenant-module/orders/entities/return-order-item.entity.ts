import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ReturnOrder } from './return-order.entity';

@Entity('return_order_items')
export class ReturnOrderItem extends BaseEntity {
  @Column()
  returnOrderId: string;

  @ManyToOne(() => ReturnOrder, (r) => r.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'return_order_id' })
  returnOrder?: ReturnOrder;

  @Column()
  orderItemId: string;

  @Column()
  productId: string;

  @Column({ nullable: true })
  unitId?: string;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  returnQty: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  lineTotal: number;
}

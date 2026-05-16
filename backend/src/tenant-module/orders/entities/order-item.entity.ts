import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem extends BaseEntity {
  @Column()
  orderId: string;

  @ManyToOne(() => Order, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order?: Order;

  @Column()
  productId: string;

  @Column({ nullable: true })
  unitId?: string;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, default: 0 })
  qtyInBase: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercent: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  lineTotal: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  costPrice?: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, default: 0 })
  issuedQty: number;
}

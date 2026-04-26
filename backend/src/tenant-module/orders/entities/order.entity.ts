import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  DELIVERING = 'DELIVERING',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  PARTIALLY_RETURNED = 'PARTIALLY_RETURNED',
  FULLY_RETURNED = 'FULLY_RETURNED',
}

export enum OrderType {
  SALES = 'SALES',
  PURCHASE = 'PURCHASE',
}

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT = 'CREDIT',
}

@Entity('orders')
export class Order extends BaseEntity {
  @Column({ length: 50, unique: true })
  code: string;

  @Column({ type: 'enum', enum: OrderType })
  type: OrderType;

  @Column()
  customerId: string;

  @Column({ nullable: true })
  supplierId?: string;

  @Column({ nullable: true })
  warehouseId?: string;

  @Column({ nullable: true })
  salesRepId?: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.DRAFT })
  status: OrderStatus;

  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  paymentMethod?: PaymentMethod;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  discountTotal: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  voucherDiscount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ nullable: true })
  voucherId?: string;

  @Column({ type: 'text', nullable: true })
  shippingAddress?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  @Column({ nullable: true })
  confirmedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ type: 'text', nullable: true })
  cancelReason?: string;

  @OneToMany(() => OrderItem, (i) => i.order, { cascade: true, eager: false })
  items?: OrderItem[];
}

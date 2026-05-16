import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from './product.entity';

export enum PriceType {
  COST = 'COST',
  RETAIL = 'RETAIL',
  WHOLESALE = 'WHOLESALE',
  AGENT = 'AGENT',
  VIP = 'VIP',
}

@Entity('product_prices')
export class ProductPrice extends BaseEntity {
  @Column()
  productId: string;

  @ManyToOne(() => Product, (p) => p.prices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ nullable: true })
  unitId?: string;

  @Column({ type: 'enum', enum: PriceType })
  priceType: PriceType;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ length: 10, default: 'VND' })
  currency: string;

  @Column({ type: 'date', nullable: true })
  effectiveFrom?: Date;

  @Column({ type: 'date', nullable: true })
  effectiveTo?: Date;
}

import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from './product.entity';

@Entity('product_units')
export class ProductUnit extends BaseEntity {
  @Column()
  productId: string;

  @ManyToOne(() => Product, (p) => p.units, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ length: 50 })
  name: string;

  @Column({ type: 'decimal', precision: 15, scale: 4, default: 1 })
  conversionRate: number;

  @Column({ length: 100, nullable: true })
  barcode?: string;

  @Column({ default: false })
  isBase: boolean;
}

import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('products')
export class Product extends BaseEntity {
  @Column({ length: 50, unique: true })
  sku: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  costPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  sellingPrice: number;

  @Column({ default: 0 })
  stockQuantity: number;

  @Column({ default: 0 })
  minStockLevel: number;

  @Column({ length: 20, nullable: true })
  unit?: string;

  @Column({ nullable: true })
  categoryId?: string;

  @Column({ default: true })
  isActive: boolean;
}

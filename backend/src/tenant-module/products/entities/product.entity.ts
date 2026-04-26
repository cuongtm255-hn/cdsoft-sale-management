import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Category } from '../../categories/entities/category.entity';
import { ProductUnit } from './product-unit.entity';
import { ProductPrice } from './product-price.entity';

@Entity('products')
export class Product extends BaseEntity {
  @Column({ length: 100, unique: true })
  sku: string;

  @Column({ length: 100, nullable: true })
  barcode?: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  categoryId?: string;

  @ManyToOne(() => Category, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @Column({ length: 100, nullable: true })
  brand?: string;

  @Column({ length: 50, default: 'Cái' })
  baseUnit: string;

  @Column({ nullable: true })
  defaultWarehouseId?: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  minStockLevel: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  maxStockLevel?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  stockQuantity: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => ProductUnit, (u) => u.product, { cascade: true, eager: false })
  units?: ProductUnit[];

  @OneToMany(() => ProductPrice, (p) => p.product, { cascade: true, eager: false })
  prices?: ProductPrice[];
}

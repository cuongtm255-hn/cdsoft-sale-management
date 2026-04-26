import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('inventory_balances')
@Index(['productId', 'warehouseId'], { unique: true })
export class InventoryBalance extends BaseEntity {
  @Column()
  productId: string;

  @Column()
  warehouseId: string;

  @Column({ type: 'decimal', precision: 15, scale: 4, default: 0 })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, default: 0 })
  reservedQty: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  avgCost: number;
}

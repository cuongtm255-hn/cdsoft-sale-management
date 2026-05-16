import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum TxType {
  STOCK_IN = 'STOCK_IN',
  STOCK_OUT = 'STOCK_OUT',
  ADJUSTMENT_IN = 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT = 'ADJUSTMENT_OUT',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
}

@Entity('inventory_transactions')
export class InventoryTransaction extends BaseEntity {
  @Column()
  productId: string;

  @Column()
  warehouseId: string;

  @Column({ type: 'enum', enum: TxType })
  transactionType: TxType;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  quantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  unitCost?: number;

  @Column({ nullable: true })
  refId?: string;

  @Column({ length: 30, nullable: true })
  refType?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ nullable: true })
  createdBy?: string;
}

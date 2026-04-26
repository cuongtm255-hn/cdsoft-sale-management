import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { StockTransferItem } from './stock-transfer-item.entity';

export enum TransferStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

@Entity('stock_transfers')
export class StockTransfer extends BaseEntity {
  @Column()
  fromWarehouseId: string;

  @Column()
  toWarehouseId: string;

  @Column({ type: 'enum', enum: TransferStatus, default: TransferStatus.PENDING })
  status: TransferStatus;

  @Column({ type: 'date', nullable: true })
  expectedDate?: string;

  @Column({ type: 'timestamp', nullable: true })
  dispatchedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  receivedAt?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ nullable: true })
  createdBy?: string;

  @OneToMany(() => StockTransferItem, (i) => i.transfer, { cascade: true, eager: false })
  items?: StockTransferItem[];
}

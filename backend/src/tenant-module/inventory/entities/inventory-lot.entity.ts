import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Lưu từng lô hàng nhập để phục vụ tính giá vốn theo FIFO.
 * Mỗi lần confirm stock receipt → tạo inventory_lot.
 * Khi xuất kho theo FIFO: lấy lot cũ nhất, giảm remaining_qty.
 */
@Entity('inventory_lots')
export class InventoryLot extends BaseEntity {
  @Column()
  productId: string;

  @Column()
  warehouseId: string;

  @Column({ nullable: true })
  receiptItemId?: string;

  @Column({ length: 100, nullable: true })
  batchNumber?: string;

  @Column({ type: 'date', nullable: true })
  expiryDate?: string;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  costPerUnit: number;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  initialQty: number;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  remainingQty: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  receivedAt: Date;
}

import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

export type SerialStatus = 'IN_STOCK' | 'SOLD' | 'RETURNED' | 'DEFECTIVE';

@Entity('serial_numbers')
export class SerialNumber extends BaseEntity {
  @Column()
  productId: string;

  @Column({ length: 100, unique: true })
  serialNumber: string;

  @Column({ length: 100, nullable: true })
  imei: string;

  @Column({ nullable: true })
  receiptItemId: string;

  @Column({ nullable: true })
  orderItemId: string;

  @Column({ nullable: true })
  customerId: string;

  @Column({ type: 'varchar', length: 20, default: 'IN_STOCK' })
  status: SerialStatus;

  @Column({ type: 'date', nullable: true })
  warrantyExpiry: string;

  @Column({ type: 'date', nullable: true })
  purchasedAt: string;
}

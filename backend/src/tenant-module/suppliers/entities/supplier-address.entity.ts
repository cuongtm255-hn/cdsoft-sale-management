import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Supplier } from './supplier.entity';

@Entity('supplier_addresses')
export class SupplierAddress extends BaseEntity {
  @Column()
  supplierId: string;

  @ManyToOne(() => Supplier, (s) => s.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ length: 255, nullable: true })
  street?: string;

  @Column({ length: 100, nullable: true })
  district?: string;

  @Column({ length: 100, nullable: true })
  city?: string;

  @Column({ default: false })
  isDefault: boolean;
}

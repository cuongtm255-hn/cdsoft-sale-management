import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Supplier } from './supplier.entity';

@Entity('supplier_bank_accounts')
export class SupplierBankAccount extends BaseEntity {
  @Column()
  supplierId: string;

  @ManyToOne(() => Supplier, (s) => s.bankAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ length: 100, nullable: true })
  bankName?: string;

  @Column({ length: 50, nullable: true })
  accountNumber?: string;

  @Column({ length: 255, nullable: true })
  accountName?: string;

  @Column({ length: 100, nullable: true })
  branch?: string;
}

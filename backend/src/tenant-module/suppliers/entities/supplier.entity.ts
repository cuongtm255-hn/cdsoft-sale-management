import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SupplierAddress } from './supplier-address.entity';
import { SupplierBankAccount } from './supplier-bank-account.entity';

@Entity('suppliers')
export class Supplier extends BaseEntity {
  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 20, nullable: true })
  taxCode?: string;

  @Column({ length: 20, nullable: true })
  phone?: string;

  @Column({ length: 255, nullable: true })
  email?: string;

  @Column({ length: 255, nullable: true })
  contactPerson?: string;

  @Column({ default: 0 })
  paymentTermDays: number;

  @Column({ type: 'text', nullable: true })
  discountTerms?: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  currentDebt: number;

  @Column({ default: false })
  isCustomer: boolean;

  @Column({ nullable: true })
  customerId?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => SupplierAddress, (a) => a.supplier, { cascade: true, eager: false })
  addresses?: SupplierAddress[];

  @OneToMany(() => SupplierBankAccount, (b) => b.supplier, { cascade: true, eager: false })
  bankAccounts?: SupplierBankAccount[];
}

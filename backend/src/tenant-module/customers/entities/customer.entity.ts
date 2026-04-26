import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CustomerAddress } from './customer-address.entity';

export enum CustomerGroup {
  RETAIL = 'RETAIL',
  WHOLESALE = 'WHOLESALE',
  AGENT = 'AGENT',
  VIP = 'VIP',
}

export enum MemberTier {
  NONE = 'NONE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  DIAMOND = 'DIAMOND',
}

@Entity('customers')
export class Customer extends BaseEntity {
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

  @Column({ type: 'enum', enum: CustomerGroup, default: CustomerGroup.RETAIL })
  customerGroup: CustomerGroup;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  creditLimit: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  currentDebt: number;

  @Column({ default: 0 })
  paymentTermDays: number;

  @Column({ nullable: true })
  salesRepId?: string;

  @Column({ default: 0 })
  loyaltyPoints: number;

  @Column({ type: 'enum', enum: MemberTier, default: MemberTier.NONE })
  memberTier: MemberTier;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => CustomerAddress, (a) => a.customer, { cascade: true, eager: false })
  addresses?: CustomerAddress[];
}

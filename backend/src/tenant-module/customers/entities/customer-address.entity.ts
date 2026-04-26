import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Customer } from './customer.entity';

@Entity('customer_addresses')
export class CustomerAddress extends BaseEntity {
  @Column()
  customerId: string;

  @ManyToOne(() => Customer, (c) => c.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ length: 50, default: 'default' })
  label: string;

  @Column({ length: 255, nullable: true })
  street?: string;

  @Column({ length: 100, nullable: true })
  district?: string;

  @Column({ length: 100, nullable: true })
  city?: string;

  @Column({ default: false })
  isDefault: boolean;
}

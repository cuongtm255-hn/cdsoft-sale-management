import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum LoyaltyTxType {
  EARN = 'EARN',
  REDEEM = 'REDEEM',
  EXPIRE = 'EXPIRE',
  ADJUST = 'ADJUST',
}

@Entity('loyalty_transactions')
export class LoyaltyTransaction extends BaseEntity {
  @Column()
  customerId: string;

  @Column({ type: 'enum', enum: LoyaltyTxType })
  type: LoyaltyTxType;

  @Column({ type: 'int' })
  points: number;

  @Column({ nullable: true })
  refId?: string;

  @Column({ length: 30, nullable: true })
  refType?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ nullable: true })
  createdBy?: string;
}

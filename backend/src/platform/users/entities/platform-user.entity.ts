import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Exclude } from 'class-transformer';

export enum PlatformRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PLATFORM_OPERATOR = 'PLATFORM_OPERATOR',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  LOCKED = 'LOCKED',
}

@Entity('platform_users')
export class PlatformUser extends BaseEntity {
  @Column({ length: 50, unique: true })
  username: string;

  @Column({ length: 150, unique: true })
  email: string;

  @Column({ select: false })
  @Exclude()
  passwordHash: string;

  @Column({ type: 'enum', enum: PlatformRole })
  role: PlatformRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ nullable: true })
  lastLoginAt?: Date;
}

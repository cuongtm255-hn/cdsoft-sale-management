import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { TenantMachine } from './tenant-machine.entity';

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum ProvisioningStatus {
  PENDING = 'PENDING',
  PROVISIONING = 'PROVISIONING',
  ACTIVE = 'ACTIVE',
  FAILED = 'FAILED',
  SUSPENDED = 'SUSPENDED',
}

@Entity('tenants')
export class Tenant extends BaseEntity {
  @Column({ unique: true, length: 50 })
  tenantCode: string;

  @Column({ length: 100 })
  tenantName: string;

  @Column({ length: 150 })
  companyName: string;

  @Column({ length: 100 })
  contactName: string;

  @Column({ length: 150, unique: true })
  contactEmail: string;

  @Column({ length: 20, nullable: true })
  contactPhone?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'enum', enum: TenantStatus, default: TenantStatus.INACTIVE })
  status: TenantStatus;

  @Column({ type: 'enum', enum: ProvisioningStatus, default: ProvisioningStatus.PENDING })
  provisioningStatus: ProvisioningStatus;

  @Column({ length: 100, nullable: true })
  dbHost?: string;

  @Column({ nullable: true })
  dbPort?: number;

  @Column({ length: 100, nullable: true })
  dbName?: string;

  @Column({ length: 100, nullable: true })
  dbUsername?: string;

  @Column({ length: 500, nullable: true, select: false })
  dbPasswordEncrypted?: string;

  @Column({ nullable: true })
  createdBy?: string;

  @Column({ default: false })
  isExternalProduct: boolean;

  @Column({ length: 150, nullable: true })
  externalProductName?: string;

  @OneToMany(() => TenantMachine, (machine) => machine.tenant)
  machines: TenantMachine[];
}

import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Tenant } from './tenant.entity';

@Entity('tenant_machines')
export class TenantMachine extends BaseEntity {
  @ManyToOne(() => Tenant, (tenant) => tenant.machines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column()
  tenantId: string;

  @Column({ length: 100 })
  machineName: string;

  @Column({ length: 255 })
  machineCode: string;

  @Column({ type: 'text', nullable: true })
  activeKey?: string;
}

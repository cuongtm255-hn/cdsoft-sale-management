import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { RolePermission } from './role-permission.entity';

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ length: 50, unique: true })
  name: string; // 'STAFF', 'WAREHOUSE', 'ACCOUNTANT', 'MANAGER', 'TENANT_ADMIN'

  @Column({ length: 100 })
  label: string;

  @Column({ default: false })
  isSystem: boolean;

  @OneToMany(() => RolePermission, (rp) => rp.role, { cascade: true })
  rolePermissions: RolePermission[];
}

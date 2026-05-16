import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from './role.entity';
import { Permission } from './permission.entity';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Role, (r) => r.rolePermissions, { onDelete: 'CASCADE' })
  role: Role;

  @Column()
  roleId: string;

  @ManyToOne(() => Permission, { eager: true, onDelete: 'CASCADE' })
  permission: Permission;

  @Column()
  permissionId: string;
}

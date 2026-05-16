import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  code: string; // 'products:read', 'orders:confirm', 'cost_price:read'

  @Column({ length: 50 })
  resource: string; // 'products', 'orders', 'inventory'

  @Column({ length: 30 })
  action: string; // 'read', 'write', 'delete', 'confirm'

  @Column({ length: 255, nullable: true })
  label: string;
}

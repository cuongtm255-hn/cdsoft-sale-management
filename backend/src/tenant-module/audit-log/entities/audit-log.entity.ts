import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ nullable: true })
  userId: string;

  @Column({ length: 255, nullable: true })
  userName: string;

  @Column({ length: 50, nullable: true })
  userRole: string;

  @Index()
  @Column({ length: 200 })
  action: string; // 'POST /tenant/orders'

  @Index()
  @Column({ length: 50 })
  resource: string; // 'orders'

  @Column({ nullable: true })
  resourceId: string;

  @Column({ type: 'json', nullable: true })
  beforeData: object;

  @Column({ type: 'json', nullable: true })
  afterData: object;

  @Column({ length: 45, nullable: true })
  ipAddress: string;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class InitPlatformSchema1700000000000 implements MigrationInterface {
  name = 'InitPlatformSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // -------------------------------------------------------
    // Bảng: platform_users
    // -------------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'platform_users',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: '(UUID())',
          },
          {
            name: 'username',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '150',
            isUnique: true,
          },
          {
            name: 'passwordHash',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['SUPER_ADMIN', 'PLATFORM_OPERATOR'],
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['ACTIVE', 'INACTIVE', 'LOCKED'],
            default: "'ACTIVE'",
          },
          {
            name: 'lastLoginAt',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'deletedAt',
            type: 'datetime',
            precision: 6,
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'platform_users',
      new TableIndex({
        name: 'IDX_platform_users_status',
        columnNames: ['status'],
      }),
    );

    // -------------------------------------------------------
    // Bảng: tenants
    // -------------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'tenants',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: '(UUID())',
          },
          {
            name: 'tenantCode',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'tenantName',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'companyName',
            type: 'varchar',
            length: '150',
          },
          {
            name: 'contactName',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'contactEmail',
            type: 'varchar',
            length: '150',
            isUnique: true,
          },
          {
            name: 'contactPhone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'address',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
            default: "'INACTIVE'",
          },
          {
            name: 'provisioningStatus',
            type: 'enum',
            enum: ['PENDING', 'PROVISIONING', 'ACTIVE', 'FAILED', 'SUSPENDED'],
            default: "'PENDING'",
          },
          {
            name: 'dbHost',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'dbPort',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'dbName',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'dbUsername',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'dbPasswordEncrypted',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'createdBy',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'deletedAt',
            type: 'datetime',
            precision: 6,
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'tenants',
      new TableIndex({
        name: 'IDX_tenants_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'tenants',
      new TableIndex({
        name: 'IDX_tenants_provisioningStatus',
        columnNames: ['provisioningStatus'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tenants', true);
    await queryRunner.dropTable('platform_users', true);
  }
}

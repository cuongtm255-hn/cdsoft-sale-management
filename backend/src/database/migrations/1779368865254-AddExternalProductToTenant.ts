import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExternalProductToTenant1779368865254 implements MigrationInterface {
    name = 'AddExternalProductToTenant1779368865254'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_platform_users_status\` ON \`platform_users\``);
        await queryRunner.query(`DROP INDEX \`IDX_06e11d5ca528baa2288ac10c6c\` ON \`tenants\``);
        await queryRunner.query(`DROP INDEX \`IDX_f99e4a3fc1c4e456a05beb7b33\` ON \`tenants\``);
        await queryRunner.query(`DROP INDEX \`IDX_tenants_provisioningStatus\` ON \`tenants\``);
        await queryRunner.query(`DROP INDEX \`IDX_tenants_status\` ON \`tenants\``);
        await queryRunner.query(`CREATE TABLE \`tenant_machines\` (\`id\` varchar(36) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`tenant_id\` varchar(255) NOT NULL, \`machine_name\` varchar(100) NOT NULL, \`machine_code\` varchar(255) NOT NULL, \`active_key\` text NULL, \`tenantId\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`tenants\` ADD \`is_external_product\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`tenants\` ADD \`external_product_name\` varchar(150) NULL`);
        await queryRunner.query(`ALTER TABLE \`tenants\` ADD UNIQUE INDEX \`IDX_c363668203c5dc09ce433fc7b5\` (\`tenant_code\`)`);
        await queryRunner.query(`ALTER TABLE \`tenants\` ADD UNIQUE INDEX \`IDX_e4f1984f930915e68761e79330\` (\`contact_email\`)`);
        await queryRunner.query(`ALTER TABLE \`tenant_machines\` ADD CONSTRAINT \`FK_aa1f15fd737a89b692a1d164e43\` FOREIGN KEY (\`tenantId\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tenant_machines\` DROP FOREIGN KEY \`FK_aa1f15fd737a89b692a1d164e43\``);
        await queryRunner.query(`ALTER TABLE \`tenants\` DROP INDEX \`IDX_e4f1984f930915e68761e79330\``);
        await queryRunner.query(`ALTER TABLE \`tenants\` DROP INDEX \`IDX_c363668203c5dc09ce433fc7b5\``);
        await queryRunner.query(`ALTER TABLE \`tenants\` DROP COLUMN \`external_product_name\``);
        await queryRunner.query(`ALTER TABLE \`tenants\` DROP COLUMN \`is_external_product\``);
        await queryRunner.query(`DROP TABLE \`tenant_machines\``);
        await queryRunner.query(`CREATE INDEX \`IDX_tenants_status\` ON \`tenants\` (\`status\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_tenants_provisioningStatus\` ON \`tenants\` (\`provisioning_status\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_f99e4a3fc1c4e456a05beb7b33\` ON \`tenants\` (\`tenant_code\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_06e11d5ca528baa2288ac10c6c\` ON \`tenants\` (\`contact_email\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_platform_users_status\` ON \`platform_users\` (\`status\`)`);
    }

}

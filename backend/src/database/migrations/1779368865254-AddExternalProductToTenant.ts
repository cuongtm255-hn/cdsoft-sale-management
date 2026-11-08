import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Idempotent: prod DB đã được áp tay (không đổi index), DB mới có thể có tên index khác nhau,
 * nên mọi bước đều kiểm tra tồn tại trước khi chạy.
 */
export class AddExternalProductToTenant1779368865254 implements MigrationInterface {
    name = 'AddExternalProductToTenant1779368865254'

    private async hasIndex(q: QueryRunner, table: string, index: string): Promise<boolean> {
        const r = await q.query(
            `SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1`,
            [table, index],
        );
        return r.length > 0;
    }

    private async hasColumn(q: QueryRunner, table: string, column: string): Promise<boolean> {
        const r = await q.query(
            `SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1`,
            [table, column],
        );
        return r.length > 0;
    }

    private async hasTable(q: QueryRunner, table: string): Promise<boolean> {
        const r = await q.query(
            `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
            [table],
        );
        return r.length > 0;
    }

    private async hasForeignKey(q: QueryRunner, table: string, fk: string): Promise<boolean> {
        const r = await q.query(
            `SELECT 1 FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = ? AND constraint_name = ? AND constraint_type = 'FOREIGN KEY' LIMIT 1`,
            [table, fk],
        );
        return r.length > 0;
    }

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Index cũ (bỏ qua nếu không tồn tại). Các unique index trên tenants được giữ nguyên dù tên khác.
        if (await this.hasIndex(queryRunner, 'platform_users', 'IDX_platform_users_status')) {
            await queryRunner.query(`DROP INDEX \`IDX_platform_users_status\` ON \`platform_users\``);
        }

        if (!(await this.hasTable(queryRunner, 'tenant_machines'))) {
            await queryRunner.query(`CREATE TABLE \`tenant_machines\` (\`id\` varchar(36) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`tenant_id\` varchar(255) NOT NULL, \`machine_name\` varchar(100) NOT NULL, \`machine_code\` varchar(255) NOT NULL, \`active_key\` text NULL, \`tenantId\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        }
        if (!(await this.hasColumn(queryRunner, 'tenants', 'is_external_product'))) {
            await queryRunner.query(`ALTER TABLE \`tenants\` ADD \`is_external_product\` tinyint NOT NULL DEFAULT 0`);
        }
        if (!(await this.hasColumn(queryRunner, 'tenants', 'external_product_name'))) {
            await queryRunner.query(`ALTER TABLE \`tenants\` ADD \`external_product_name\` varchar(150) NULL`);
        }
        if (!(await this.hasForeignKey(queryRunner, 'tenant_machines', 'FK_aa1f15fd737a89b692a1d164e43'))) {
            await queryRunner.query(`ALTER TABLE \`tenant_machines\` ADD CONSTRAINT \`FK_aa1f15fd737a89b692a1d164e43\` FOREIGN KEY (\`tenantId\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tenant_machines\` DROP FOREIGN KEY \`FK_aa1f15fd737a89b692a1d164e43\``);
        await queryRunner.query(`DROP TABLE \`tenant_machines\``);
        await queryRunner.query(`ALTER TABLE \`tenants\` DROP COLUMN \`external_product_name\``);
        await queryRunner.query(`ALTER TABLE \`tenants\` DROP COLUMN \`is_external_product\``);
        await queryRunner.query(`CREATE INDEX \`IDX_platform_users_status\` ON \`platform_users\` (\`status\`)`);
    }

}

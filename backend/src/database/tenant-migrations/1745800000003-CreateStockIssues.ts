import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStockIssues1745800000003 implements MigrationInterface {
  name = 'CreateStockIssues1745800000003';

  private async tableExists(qr: QueryRunner, table: string): Promise<boolean> {
    const [{ cnt }] = await qr.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
      [table],
    );
    return Number(cnt) > 0;
  }

  async up(qr: QueryRunner): Promise<void> {
    if (!await this.tableExists(qr, 'stock_issues')) {
      await qr.query(`
        CREATE TABLE \`stock_issues\` (
          \`id\`            VARCHAR(36)   NOT NULL PRIMARY KEY,
          \`created_at\`    DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\`    DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\`    DATETIME(6)   NULL,
          \`warehouse_id\`  VARCHAR(36)   NOT NULL,
          \`issue_type\`    ENUM('SALE','INTERNAL','DAMAGED') NOT NULL,
          \`status\`        ENUM('DRAFT','CONFIRMED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
          \`order_id\`      VARCHAR(36)   NULL,
          \`notes\`         TEXT          NULL,
          \`confirmed_at\`  TIMESTAMP     NULL,
          \`confirmed_by\`  VARCHAR(36)   NULL,
          \`created_by\`    VARCHAR(36)   NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    if (!await this.tableExists(qr, 'stock_issue_items')) {
      await qr.query(`
        CREATE TABLE \`stock_issue_items\` (
          \`id\`          VARCHAR(36)       NOT NULL PRIMARY KEY,
          \`created_at\`  DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\`  DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\`  DATETIME(6)       NULL,
          \`issue_id\`    VARCHAR(36)       NOT NULL,
          \`product_id\`  VARCHAR(36)       NOT NULL,
          \`unit_id\`     VARCHAR(36)       NULL,
          \`quantity\`    DECIMAL(15,4)     NOT NULL,
          \`qty_in_base\` DECIMAL(15,4)     NOT NULL,
          \`unit_cost\`   DECIMAL(18,4)     NULL,
          CONSTRAINT \`fk_issue_items_issue\` FOREIGN KEY (\`issue_id\`) REFERENCES \`stock_issues\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query('DROP TABLE IF EXISTS `stock_issue_items`');
    await qr.query('DROP TABLE IF EXISTS `stock_issues`');
  }
}

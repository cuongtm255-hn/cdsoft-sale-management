import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePurchaseInvoices1745800000005 implements MigrationInterface {
  name = 'CreatePurchaseInvoices1745800000005';

  private async tableExists(qr: QueryRunner, table: string): Promise<boolean> {
    const [{ cnt }] = await qr.query(
      `SELECT COUNT(*) AS cnt
       FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = ?`,
      [table],
    );
    return Number(cnt) > 0;
  }

  private async columnExists(qr: QueryRunner, table: string, column: string): Promise<boolean> {
    const [{ cnt }] = await qr.query(
      `SELECT COUNT(*) AS cnt
       FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
      [table, column],
    );
    return Number(cnt) > 0;
  }

  async up(qr: QueryRunner): Promise<void> {
    if (!await this.tableExists(qr, 'purchase_invoices')) {
      await qr.query(`
        CREATE TABLE \`purchase_invoices\` (
          \`id\`                 VARCHAR(36)     NOT NULL PRIMARY KEY,
          \`created_at\`         DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\`         DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\`         DATETIME(6)     NULL,
          \`code\`               VARCHAR(50)     NOT NULL UNIQUE,
          \`purchase_order_id\`  VARCHAR(36)     NULL,
          \`stock_receipt_id\`   VARCHAR(36)     NULL,
          \`supplier_id\`        VARCHAR(36)     NOT NULL,
          \`status\`             ENUM('UNPAID','PARTIALLY_PAID','PAID','CANCELLED') NOT NULL DEFAULT 'UNPAID',
          \`subtotal\`           DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`discount_total\`     DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`total_amount\`       DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`paid_amount\`        DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`due_date\`           DATE            NULL,
          \`issued_at\`          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`notes\`              TEXT            NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    if (!await this.tableExists(qr, 'purchase_invoice_items')) {
      await qr.query(`
        CREATE TABLE \`purchase_invoice_items\` (
          \`id\`                   VARCHAR(36)     NOT NULL PRIMARY KEY,
          \`created_at\`           DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\`           DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\`           DATETIME(6)     NULL,
          \`purchase_invoice_id\`  VARCHAR(36)     NOT NULL,
          \`product_id\`           VARCHAR(36)     NULL,
          \`product_name\`         VARCHAR(255)    NOT NULL,
          \`unit\`                 VARCHAR(50)     NULL,
          \`quantity\`             DECIMAL(15,4)   NOT NULL,
          \`unit_price\`           DECIMAL(18,2)   NOT NULL,
          \`discount_percent\`     DECIMAL(5,2)    NOT NULL DEFAULT 0,
          \`line_total\`           DECIMAL(18,2)   NOT NULL,
          CONSTRAINT \`fk_purchase_invoice_items_invoice\` FOREIGN KEY (\`purchase_invoice_id\`) REFERENCES \`purchase_invoices\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    if (!await this.columnExists(qr, 'accounts_payable', 'purchase_invoice_id')) {
      await qr.query('ALTER TABLE `accounts_payable` ADD COLUMN `purchase_invoice_id` VARCHAR(36) NULL AFTER `supplier_id`');
    }

    if (!await this.columnExists(qr, 'accounts_payable', 'order_id')) {
      await qr.query('ALTER TABLE `accounts_payable` ADD COLUMN `order_id` VARCHAR(36) NULL AFTER `purchase_invoice_id`');
    }
  }

  async down(qr: QueryRunner): Promise<void> {
    if (await this.columnExists(qr, 'accounts_payable', 'order_id')) {
      await qr.query('ALTER TABLE `accounts_payable` DROP COLUMN `order_id`');
    }
    if (await this.columnExists(qr, 'accounts_payable', 'purchase_invoice_id')) {
      await qr.query('ALTER TABLE `accounts_payable` DROP COLUMN `purchase_invoice_id`');
    }
    await qr.query('DROP TABLE IF EXISTS `purchase_invoice_items`');
    await qr.query('DROP TABLE IF EXISTS `purchase_invoices`');
  }
}

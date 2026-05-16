import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStockReceiptPurchaseOrderId1745800000006 implements MigrationInterface {
  name = 'AddStockReceiptPurchaseOrderId1745800000006';

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
    if (!await this.columnExists(qr, 'stock_receipts', 'purchase_order_id')) {
      await qr.query('ALTER TABLE `stock_receipts` ADD COLUMN `purchase_order_id` VARCHAR(36) NULL AFTER `supplier_id`');
    }
  }

  async down(qr: QueryRunner): Promise<void> {
    if (await this.columnExists(qr, 'stock_receipts', 'purchase_order_id')) {
      await qr.query('ALTER TABLE `stock_receipts` DROP COLUMN `purchase_order_id`');
    }
  }
}

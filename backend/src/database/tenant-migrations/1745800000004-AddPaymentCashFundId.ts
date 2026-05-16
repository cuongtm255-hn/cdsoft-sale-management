import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentCashFundId1745800000004 implements MigrationInterface {
  name = 'AddPaymentCashFundId1745800000004';

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
    if (!await this.columnExists(qr, 'payments', 'cash_fund_id')) {
      await qr.query('ALTER TABLE `payments` ADD COLUMN `cash_fund_id` VARCHAR(36) NULL AFTER `method`');
    }
  }

  async down(qr: QueryRunner): Promise<void> {
    if (await this.columnExists(qr, 'payments', 'cash_fund_id')) {
      await qr.query('ALTER TABLE `payments` DROP COLUMN `cash_fund_id`');
    }
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMissingTables1745800000002 implements MigrationInterface {
  name = 'CreateMissingTables1745800000002';

  private async tableExists(qr: QueryRunner, table: string): Promise<boolean> {
    const [{ cnt }] = await qr.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = ?`,
      [table],
    );
    return Number(cnt) > 0;
  }

  async up(qr: QueryRunner): Promise<void> {
    // orders
    if (!await this.tableExists(qr, 'orders')) {
      await qr.query(`
        CREATE TABLE \`orders\` (
          \`id\`               VARCHAR(36)     NOT NULL PRIMARY KEY,
          \`created_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\`       DATETIME(6)     NULL,
          \`code\`             VARCHAR(50)     NOT NULL UNIQUE,
          \`type\`             ENUM('PURCHASE','SALES','RETURN') NOT NULL,
          \`customer_id\`      VARCHAR(36)     NULL,
          \`supplier_id\`      VARCHAR(36)     NULL,
          \`warehouse_id\`     VARCHAR(36)     NULL,
          \`sales_rep_id\`     VARCHAR(36)     NULL,
          \`status\`           ENUM('DRAFT','CONFIRMED','DELIVERING','DELIVERED','CANCELLED','PARTIALLY_RETURNED','FULLY_RETURNED') NOT NULL DEFAULT 'DRAFT',
          \`payment_method\`   ENUM('CASH','BANK_TRANSFER','CARD','COD') NULL,
          \`subtotal\`         DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`discount_total\`   DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`voucher_discount\` DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`total_amount\`     DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`paid_amount\`      DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`voucher_id\`       VARCHAR(36)     NULL,
          \`shipping_address\` TEXT            NULL,
          \`notes\`            TEXT            NULL,
          \`confirmed_at\`     TIMESTAMP       NULL,
          \`confirmed_by\`     VARCHAR(36)     NULL,
          \`cancelled_at\`     TIMESTAMP       NULL,
          \`cancel_reason\`    TEXT            NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // order_items
    if (!await this.tableExists(qr, 'order_items')) {
      await qr.query(`
        CREATE TABLE \`order_items\` (
          \`id\`               VARCHAR(36)     NOT NULL PRIMARY KEY,
          \`created_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\`       DATETIME(6)     NULL,
          \`order_id\`         VARCHAR(36)     NOT NULL,
          \`product_id\`       VARCHAR(36)     NOT NULL,
          \`unit_id\`          VARCHAR(36)     NULL,
          \`quantity\`         DECIMAL(15,4)   NOT NULL DEFAULT 1,
          \`qty_in_base\`      DECIMAL(15,4)   NOT NULL DEFAULT 1,
          \`unit_price\`       DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`discount_percent\` DECIMAL(5,2)    NOT NULL DEFAULT 0,
          \`discount_amount\`  DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`line_total\`       DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`cost_price\`       DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`issued_qty\`       DECIMAL(15,4)   NOT NULL DEFAULT 0,
          CONSTRAINT \`fk_order_items_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // return_orders
    if (!await this.tableExists(qr, 'return_orders')) {
      await qr.query(`
        CREATE TABLE \`return_orders\` (
          \`id\`               VARCHAR(36)     NOT NULL PRIMARY KEY,
          \`created_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\`       DATETIME(6)     NULL,
          \`original_order_id\` VARCHAR(36)    NOT NULL,
          \`customer_id\`      VARCHAR(36)     NULL,
          \`reason\`           TEXT            NULL,
          \`refund_method\`    ENUM('CASH','BANK_TRANSFER','STORE_CREDIT') NULL,
          \`refund_amount\`    DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`created_by\`       VARCHAR(36)     NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // return_order_items
    if (!await this.tableExists(qr, 'return_order_items')) {
      await qr.query(`
        CREATE TABLE \`return_order_items\` (
          \`id\`               VARCHAR(36)     NOT NULL PRIMARY KEY,
          \`created_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\`       DATETIME(6)     NULL,
          \`return_order_id\`  VARCHAR(36)     NOT NULL,
          \`order_item_id\`    VARCHAR(36)     NULL,
          \`product_id\`       VARCHAR(36)     NOT NULL,
          \`unit_id\`          VARCHAR(36)     NULL,
          \`return_qty\`       DECIMAL(15,4)   NOT NULL DEFAULT 1,
          \`unit_price\`       DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`line_total\`       DECIMAL(18,2)   NOT NULL DEFAULT 0,
          CONSTRAINT \`fk_return_items_return\` FOREIGN KEY (\`return_order_id\`) REFERENCES \`return_orders\`(\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // promotions
    if (!await this.tableExists(qr, 'promotions')) {
      await qr.query(`
        CREATE TABLE \`promotions\` (
          \`id\`               VARCHAR(36)     NOT NULL PRIMARY KEY,
          \`created_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\`       DATETIME(6)     NULL,
          \`name\`             VARCHAR(255)    NOT NULL,
          \`type\`             VARCHAR(50)     NOT NULL,
          \`value\`            DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`min_order_amount\` DECIMAL(18,2)   NULL,
          \`start_date\`       DATE            NULL,
          \`end_date\`         DATE            NULL,
          \`used_count\`       INT             NOT NULL DEFAULT 0,
          \`usage_limit\`      INT             NULL,
          \`conditions\`       JSON            NULL,
          \`is_active\`        TINYINT(1)      NOT NULL DEFAULT 1
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // vouchers
    if (!await this.tableExists(qr, 'vouchers')) {
      await qr.query(`
        CREATE TABLE \`vouchers\` (
          \`id\`               VARCHAR(36)     NOT NULL PRIMARY KEY,
          \`created_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\`       DATETIME(6)     NULL,
          \`code\`             VARCHAR(50)     NOT NULL UNIQUE,
          \`type\`             VARCHAR(50)     NOT NULL,
          \`value\`            DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`max_discount\`     DECIMAL(18,2)   NULL,
          \`min_order_amount\` DECIMAL(18,2)   NULL,
          \`usage_limit\`      INT             NULL,
          \`used_count\`       INT             NOT NULL DEFAULT 0,
          \`per_customer_limit\` INT           NULL,
          \`customer_group\`   VARCHAR(50)     NULL,
          \`start_date\`       DATE            NULL,
          \`end_date\`         DATE            NULL,
          \`is_active\`        TINYINT(1)      NOT NULL DEFAULT 1
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // invoices
    if (!await this.tableExists(qr, 'invoices')) {
      await qr.query(`
        CREATE TABLE \`invoices\` (
          \`id\`               VARCHAR(36)     NOT NULL PRIMARY KEY,
          \`created_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\`       DATETIME(6)     NULL,
          \`code\`             VARCHAR(50)     NOT NULL UNIQUE,
          \`order_id\`         VARCHAR(36)     NULL,
          \`customer_id\`      VARCHAR(36)     NULL,
          \`status\`           ENUM('UNPAID','PARTIAL','PAID','OVERDUE','CANCELLED') NOT NULL DEFAULT 'UNPAID',
          \`subtotal\`         DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`discount_total\`   DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`total_amount\`     DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`paid_amount\`      DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`due_date\`         DATE            NULL,
          \`issued_at\`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // invoice_items
    if (!await this.tableExists(qr, 'invoice_items')) {
      await qr.query(`
        CREATE TABLE \`invoice_items\` (
          \`id\`               VARCHAR(36)     NOT NULL PRIMARY KEY,
          \`created_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\`       DATETIME(6)     NULL,
          \`invoice_id\`       VARCHAR(36)     NOT NULL,
          \`product_id\`       VARCHAR(36)     NULL,
          \`product_name\`     VARCHAR(255)    NOT NULL,
          \`quantity\`         DECIMAL(15,4)   NOT NULL DEFAULT 1,
          \`unit_price\`       DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`discount_percent\` DECIMAL(5,2)    NOT NULL DEFAULT 0,
          \`line_total\`       DECIMAL(18,2)   NOT NULL DEFAULT 0,
          CONSTRAINT \`fk_invoice_items_invoice\` FOREIGN KEY (\`invoice_id\`) REFERENCES \`invoices\`(\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // payments
    if (!await this.tableExists(qr, 'payments')) {
      await qr.query(`
        CREATE TABLE \`payments\` (
          \`id\`               VARCHAR(36)     NOT NULL PRIMARY KEY,
          \`created_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\`       DATETIME(6)     NULL,
          \`invoice_id\`       VARCHAR(36)     NOT NULL,
          \`customer_id\`      VARCHAR(36)     NULL,
          \`amount\`           DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`method\`           ENUM('CASH','BANK_TRANSFER','CARD','COD') NOT NULL,
          \`bank_account_id\`  VARCHAR(36)     NULL,
          \`transaction_ref\`  VARCHAR(255)    NULL,
          \`paid_at\`          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`notes\`            TEXT            NULL,
          \`created_by\`       VARCHAR(36)     NULL,
          CONSTRAINT \`fk_payments_invoice\` FOREIGN KEY (\`invoice_id\`) REFERENCES \`invoices\`(\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // accounts_payable
    if (!await this.tableExists(qr, 'accounts_payable')) {
      await qr.query(`
        CREATE TABLE \`accounts_payable\` (
          \`id\`               VARCHAR(36)     NOT NULL PRIMARY KEY,
          \`created_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\`       DATETIME(6)     NULL,
          \`supplier_id\`      VARCHAR(36)     NOT NULL,
          \`stock_receipt_id\` VARCHAR(36)     NULL,
          \`amount\`           DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`paid_amount\`      DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`due_date\`         DATE            NULL,
          \`status\`           ENUM('PENDING','PARTIAL','PAID','OVERDUE') NOT NULL DEFAULT 'PENDING',
          \`invoice_ref\`      VARCHAR(100)    NULL,
          \`notes\`            TEXT            NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // cash_funds
    if (!await this.tableExists(qr, 'cash_funds')) {
      await qr.query(`
        CREATE TABLE \`cash_funds\` (
          \`id\`               VARCHAR(36)     NOT NULL PRIMARY KEY,
          \`created_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\`       DATETIME(6)     NULL,
          \`name\`             VARCHAR(255)    NOT NULL,
          \`balance\`          DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`is_active\`        TINYINT(1)      NOT NULL DEFAULT 1
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // bank_accounts
    if (!await this.tableExists(qr, 'bank_accounts')) {
      await qr.query(`
        CREATE TABLE \`bank_accounts\` (
          \`id\`               VARCHAR(36)     NOT NULL PRIMARY KEY,
          \`created_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\`       DATETIME(6)     NULL,
          \`name\`             VARCHAR(255)    NOT NULL,
          \`bank_name\`        VARCHAR(255)    NOT NULL,
          \`account_number\`   VARCHAR(100)    NOT NULL,
          \`account_name\`     VARCHAR(255)    NOT NULL,
          \`balance\`          DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`is_active\`        TINYINT(1)      NOT NULL DEFAULT 1
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // cash_receipts
    if (!await this.tableExists(qr, 'cash_receipts')) {
      await qr.query(`
        CREATE TABLE \`cash_receipts\` (
          \`id\`               VARCHAR(36)     NOT NULL PRIMARY KEY,
          \`created_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\`       DATETIME(6)     NULL,
          \`receipt_type\`     ENUM('RECEIPT','PAYMENT') NOT NULL,
          \`ref_id\`           VARCHAR(36)     NULL,
          \`ref_type\`         VARCHAR(50)     NULL,
          \`amount\`           DECIMAL(18,2)   NOT NULL DEFAULT 0,
          \`cash_fund_id\`     VARCHAR(36)     NULL,
          \`bank_account_id\`  VARCHAR(36)     NULL,
          \`customer_id\`      VARCHAR(36)     NULL,
          \`supplier_id\`      VARCHAR(36)     NULL,
          \`description\`      TEXT            NULL,
          \`created_by\`       VARCHAR(36)     NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // loyalty_configs
    if (!await this.tableExists(qr, 'loyalty_configs')) {
      await qr.query(`
        CREATE TABLE \`loyalty_configs\` (
          \`id\`                          VARCHAR(36)   NOT NULL PRIMARY KEY,
          \`updated_at\`                  DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`is_enabled\`                  TINYINT(1)    NOT NULL DEFAULT 0,
          \`points_per_amount\`           DECIMAL(10,2) NOT NULL DEFAULT 10000,
          \`amount_per_point\`            DECIMAL(10,2) NOT NULL DEFAULT 100,
          \`currency_unit\`               VARCHAR(10)   NOT NULL DEFAULT 'VND',
          \`tier_evaluation_period_days\` INT           NOT NULL DEFAULT 365,
          \`point_expiry_days\`           INT           NOT NULL DEFAULT 365,
          \`allow_tier_downgrade\`        TINYINT(1)    NOT NULL DEFAULT 1,
          \`tiers\`                       JSON          NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // loyalty_transactions
    if (!await this.tableExists(qr, 'loyalty_transactions')) {
      await qr.query(`
        CREATE TABLE \`loyalty_transactions\` (
          \`id\`           VARCHAR(36)   NOT NULL PRIMARY KEY,
          \`created_at\`   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\`   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\`   DATETIME(6)   NULL,
          \`customer_id\`  VARCHAR(36)   NOT NULL,
          \`type\`         ENUM('EARN','REDEEM','EXPIRE','ADJUST') NOT NULL,
          \`points\`       INT           NOT NULL DEFAULT 0,
          \`ref_id\`       VARCHAR(36)   NULL,
          \`ref_type\`     VARCHAR(50)   NULL,
          \`description\`  TEXT          NULL,
          \`expires_at\`   TIMESTAMP     NULL,
          \`created_by\`   VARCHAR(36)   NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // tier_change_logs
    if (!await this.tableExists(qr, 'tier_change_logs')) {
      await qr.query(`
        CREATE TABLE \`tier_change_logs\` (
          \`id\`           VARCHAR(36)   NOT NULL PRIMARY KEY,
          \`created_at\`   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\`   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\`   DATETIME(6)   NULL,
          \`customer_id\`  VARCHAR(36)   NOT NULL,
          \`old_tier\`     VARCHAR(50)   NULL,
          \`new_tier\`     VARCHAR(50)   NOT NULL,
          \`changed_at\`   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // commission_configs
    if (!await this.tableExists(qr, 'commission_configs')) {
      await qr.query(`
        CREATE TABLE \`commission_configs\` (
          \`id\`         VARCHAR(36)   NOT NULL PRIMARY KEY,
          \`created_at\` DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\` DATETIME(6)   NULL,
          \`type\`       ENUM('REVENUE_PERCENT','PROFIT_PERCENT','PRODUCT_SPECIFIC') NOT NULL DEFAULT 'REVENUE_PERCENT',
          \`rules\`      JSON          NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // permissions
    if (!await this.tableExists(qr, 'permissions')) {
      await qr.query(`
        CREATE TABLE \`permissions\` (
          \`id\`       VARCHAR(36)   NOT NULL PRIMARY KEY,
          \`code\`     VARCHAR(100)  NOT NULL UNIQUE,
          \`resource\` VARCHAR(100)  NOT NULL,
          \`action\`   VARCHAR(50)   NOT NULL,
          \`label\`    VARCHAR(255)  NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // roles
    if (!await this.tableExists(qr, 'roles')) {
      await qr.query(`
        CREATE TABLE \`roles\` (
          \`id\`         VARCHAR(36)   NOT NULL PRIMARY KEY,
          \`created_at\` DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\` DATETIME(6)   NULL,
          \`name\`       VARCHAR(100)  NOT NULL UNIQUE,
          \`label\`      VARCHAR(255)  NOT NULL,
          \`is_system\`  TINYINT(1)    NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // role_permissions
    if (!await this.tableExists(qr, 'role_permissions')) {
      await qr.query(`
        CREATE TABLE \`role_permissions\` (
          \`id\`            VARCHAR(36)   NOT NULL PRIMARY KEY,
          \`role_id\`       VARCHAR(36)   NOT NULL,
          \`permission_id\` VARCHAR(36)   NOT NULL,
          CONSTRAINT \`fk_rp_role\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`fk_rp_perm\` FOREIGN KEY (\`permission_id\`) REFERENCES \`permissions\`(\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // disbursements
    if (!await this.tableExists(qr, 'disbursements')) {
      await qr.query(`
        CREATE TABLE \`disbursements\` (
          \`id\`                VARCHAR(36)    NOT NULL PRIMARY KEY,
          \`created_at\`        DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\`        DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\`        DATETIME(6)    NULL,
          \`disbursement_type\` VARCHAR(50)    NOT NULL,
          \`supplier_id\`       VARCHAR(36)    NULL,
          \`ap_record_id\`      VARCHAR(36)    NULL,
          \`cash_fund_id\`      VARCHAR(36)    NULL,
          \`bank_account_id\`   VARCHAR(36)    NULL,
          \`amount\`            DECIMAL(18,2)  NOT NULL DEFAULT 0,
          \`description\`       TEXT           NULL,
          \`status\`            ENUM('PENDING_APPROVAL','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING_APPROVAL',
          \`created_by\`        VARCHAR(36)    NULL,
          \`approved_by\`       VARCHAR(36)    NULL,
          \`reject_reason\`     TEXT           NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // serial_numbers
    if (!await this.tableExists(qr, 'serial_numbers')) {
      await qr.query(`
        CREATE TABLE \`serial_numbers\` (
          \`id\`               VARCHAR(36)   NOT NULL PRIMARY KEY,
          \`created_at\`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\`       DATETIME(6)   NULL,
          \`product_id\`       VARCHAR(36)   NOT NULL,
          \`serial_number\`    VARCHAR(100)  NOT NULL UNIQUE,
          \`imei\`             VARCHAR(100)  NULL,
          \`receipt_item_id\`  VARCHAR(36)   NULL,
          \`order_item_id\`    VARCHAR(36)   NULL,
          \`customer_id\`      VARCHAR(36)   NULL,
          \`status\`           ENUM('IN_STOCK','SOLD','RETURNED','DEFECTIVE') NOT NULL DEFAULT 'IN_STOCK',
          \`warranty_expiry\`  DATE          NULL,
          \`purchased_at\`     TIMESTAMP     NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // audit_logs
    if (!await this.tableExists(qr, 'audit_logs')) {
      await qr.query(`
        CREATE TABLE \`audit_logs\` (
          \`id\`           VARCHAR(36)   NOT NULL PRIMARY KEY,
          \`created_at\`   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`user_id\`      VARCHAR(36)   NULL,
          \`user_name\`    VARCHAR(255)  NULL,
          \`user_role\`    VARCHAR(100)  NULL,
          \`action\`       VARCHAR(50)   NOT NULL,
          \`resource\`     VARCHAR(100)  NOT NULL,
          \`resource_id\`  VARCHAR(36)   NULL,
          \`before_data\`  JSON          NULL,
          \`after_data\`   JSON          NULL,
          \`ip_address\`   VARCHAR(50)   NULL,
          INDEX \`idx_audit_resource\` (\`resource\`),
          INDEX \`idx_audit_created\`  (\`created_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // Add missing columns to existing tables (from later entity updates)
    const [{ hasCostPrice }] = await qr.query(
      `SELECT COUNT(*) AS hasCostPrice FROM information_schema.columns
       WHERE table_schema=DATABASE() AND table_name='products' AND column_name='cost_price'`
    );
    if (Number(hasCostPrice) === 0) {
      await qr.query(`ALTER TABLE \`products\` ADD COLUMN \`cost_price\` DECIMAL(15,2) NOT NULL DEFAULT 0`);
    }

    const [{ hasTrackBatch }] = await qr.query(
      `SELECT COUNT(*) AS hasTrackBatch FROM information_schema.columns
       WHERE table_schema=DATABASE() AND table_name='products' AND column_name='track_batch'`
    );
    if (Number(hasTrackBatch) === 0) {
      await qr.query(`ALTER TABLE \`products\` ADD COLUMN \`track_batch\` TINYINT(1) NOT NULL DEFAULT 0`);
      await qr.query(`ALTER TABLE \`products\` ADD COLUMN \`track_serial\` TINYINT(1) NOT NULL DEFAULT 0`);
    }

    const [{ hasReservedQty }] = await qr.query(
      `SELECT COUNT(*) AS hasReservedQty FROM information_schema.columns
       WHERE table_schema=DATABASE() AND table_name='inventory_balances' AND column_name='reserved_qty'`
    );
    if (Number(hasReservedQty) === 0) {
      await qr.query(`ALTER TABLE \`inventory_balances\` ADD COLUMN \`reserved_qty\` DECIMAL(15,4) NOT NULL DEFAULT 0`);
    }
  }

  async down(_qr: QueryRunner): Promise<void> {
    // Drop in reverse FK order
    for (const t of [
      'audit_logs','serial_numbers','disbursements','role_permissions','roles','permissions',
      'commission_configs','tier_change_logs','loyalty_transactions','loyalty_configs',
      'cash_receipts','bank_accounts','cash_funds','accounts_payable',
      'payments','invoice_items','invoices','vouchers','promotions',
      'return_order_items','return_orders','order_items','orders',
    ]) {
      await _qr.query(`DROP TABLE IF EXISTS \`${t}\``);
    }
  }
}

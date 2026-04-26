import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration for tenant DB: adds stocktaking_sessions, stocktaking_items, inventory_lots tables.
 *
 * NOTE: This migration targets the per-tenant DB (tenant_<code>), not the platform DB.
 * Run via: npm run migration:tenant:run (or apply manually per tenant DB).
 *
 * These tables complement the inventory module (Feature 06):
 *   - stocktaking_sessions: kiểm kê kho sessions
 *   - stocktaking_items: từng mặt hàng trong phiên kiểm kê
 *   - inventory_lots: tracking lô hàng cho FIFO
 */
export class AddStocktakingAndInventoryLots1745700000000 implements MigrationInterface {
  name = 'AddStocktakingAndInventoryLots1745700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── stocktaking_sessions ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`stocktaking_sessions\` (
        \`id\`           VARCHAR(36)  NOT NULL DEFAULT (UUID()),
        \`warehouse_id\` VARCHAR(36)  NOT NULL,
        \`status\`       ENUM('IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'IN_PROGRESS',
        \`notes\`        TEXT,
        \`created_by\`   VARCHAR(36),
        \`completed_at\` DATETIME(6),
        \`created_at\`   DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\`   DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\`   DATETIME(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── stocktaking_items ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`stocktaking_items\` (
        \`id\`          VARCHAR(36)     NOT NULL DEFAULT (UUID()),
        \`session_id\`  VARCHAR(36)     NOT NULL,
        \`product_id\`  VARCHAR(36)     NOT NULL,
        \`system_qty\`  DECIMAL(15,4)   NOT NULL DEFAULT 0,
        \`actual_qty\`  DECIMAL(15,4),
        \`adjust_qty\`  DECIMAL(15,4),
        \`created_at\`  DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\`  DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\`  DATETIME(6),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_stocktaking_item_session\`
          FOREIGN KEY (\`session_id\`) REFERENCES \`stocktaking_sessions\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── inventory_lots ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`inventory_lots\` (
        \`id\`               VARCHAR(36)   NOT NULL DEFAULT (UUID()),
        \`product_id\`       VARCHAR(36)   NOT NULL,
        \`warehouse_id\`     VARCHAR(36)   NOT NULL,
        \`receipt_item_id\`  VARCHAR(36),
        \`batch_number\`     VARCHAR(100),
        \`expiry_date\`      DATE,
        \`cost_per_unit\`    DECIMAL(18,4) NOT NULL,
        \`initial_qty\`      DECIMAL(15,4) NOT NULL,
        \`remaining_qty\`    DECIMAL(15,4) NOT NULL,
        \`received_at\`      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_at\`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\`       DATETIME(6),
        PRIMARY KEY (\`id\`),
        INDEX \`idx_lot_product_warehouse\` (\`product_id\`, \`warehouse_id\`),
        INDEX \`idx_lot_received_at\` (\`received_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `inventory_lots`');
    await queryRunner.query('DROP TABLE IF EXISTS `stocktaking_items`');
    await queryRunner.query('DROP TABLE IF EXISTS `stocktaking_sessions`');
  }
}

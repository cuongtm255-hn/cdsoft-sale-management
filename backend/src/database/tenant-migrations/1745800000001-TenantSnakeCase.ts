import { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantSnakeCase1745800000001 implements MigrationInterface {
  name = 'TenantSnakeCase1745800000001';

  /** Rename camelCase → snake_case only when camelCase exists AND snake_case does NOT exist */
  private async safeRename(qr: QueryRunner, table: string, from: string, to: string) {
    const [{ hasCamel }] = await qr.query(
      `SELECT COUNT(*) AS hasCamel FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
      [table, from],
    );
    if (Number(hasCamel) === 0) return; // already done or doesn't exist

    const [{ hasSnake }] = await qr.query(
      `SELECT COUNT(*) AS hasSnake FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
      [table, to],
    );
    if (Number(hasSnake) > 0) {
      // Both exist (duplicate) — copy data then drop the camelCase column
      await qr.query(
        `UPDATE \`${table}\` SET \`${to}\` = \`${from}\` WHERE \`${to}\` IS NULL AND \`${from}\` IS NOT NULL`,
      );
      await qr.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${from}\``);
    } else {
      await qr.query(`ALTER TABLE \`${table}\` RENAME COLUMN \`${from}\` TO \`${to}\``);
    }
  }

  async up(qr: QueryRunner): Promise<void> {
    // products
    await this.safeRename(qr, 'products', 'categoryId',          'category_id');
    await this.safeRename(qr, 'products', 'baseUnit',            'base_unit');
    await this.safeRename(qr, 'products', 'defaultWarehouseId',  'default_warehouse_id');
    await this.safeRename(qr, 'products', 'minStockLevel',       'min_stock_level');
    await this.safeRename(qr, 'products', 'maxStockLevel',       'max_stock_level');
    await this.safeRename(qr, 'products', 'stockQuantity',       'stock_quantity');
    await this.safeRename(qr, 'products', 'costPrice',           'cost_price');
    await this.safeRename(qr, 'products', 'trackBatch',          'track_batch');
    await this.safeRename(qr, 'products', 'trackSerial',         'track_serial');
    await this.safeRename(qr, 'products', 'isActive',            'is_active');
    await this.safeRename(qr, 'products', 'createdAt',           'created_at');
    await this.safeRename(qr, 'products', 'updatedAt',           'updated_at');
    await this.safeRename(qr, 'products', 'deletedAt',           'deleted_at');

    // product_units
    await this.safeRename(qr, 'product_units', 'productId',       'product_id');
    await this.safeRename(qr, 'product_units', 'conversionRate',  'conversion_rate');
    await this.safeRename(qr, 'product_units', 'isBase',          'is_base');
    await this.safeRename(qr, 'product_units', 'createdAt',       'created_at');
    await this.safeRename(qr, 'product_units', 'updatedAt',       'updated_at');
    await this.safeRename(qr, 'product_units', 'deletedAt',       'deleted_at');

    // product_prices
    await this.safeRename(qr, 'product_prices', 'productId',      'product_id');
    await this.safeRename(qr, 'product_prices', 'unitId',         'unit_id');
    await this.safeRename(qr, 'product_prices', 'priceType',      'price_type');
    await this.safeRename(qr, 'product_prices', 'effectiveFrom',  'effective_from');
    await this.safeRename(qr, 'product_prices', 'effectiveTo',    'effective_to');
    await this.safeRename(qr, 'product_prices', 'createdAt',      'created_at');
    await this.safeRename(qr, 'product_prices', 'updatedAt',      'updated_at');
    await this.safeRename(qr, 'product_prices', 'deletedAt',      'deleted_at');

    // categories
    await this.safeRename(qr, 'categories', 'parentId',   'parent_id');
    await this.safeRename(qr, 'categories', 'sortOrder',  'sort_order');
    await this.safeRename(qr, 'categories', 'createdAt',  'created_at');
    await this.safeRename(qr, 'categories', 'updatedAt',  'updated_at');
    await this.safeRename(qr, 'categories', 'deletedAt',  'deleted_at');

    // customers
    await this.safeRename(qr, 'customers', 'taxCode',          'tax_code');
    await this.safeRename(qr, 'customers', 'customerGroup',    'customer_group');
    await this.safeRename(qr, 'customers', 'creditLimit',      'credit_limit');
    await this.safeRename(qr, 'customers', 'currentDebt',      'current_debt');
    await this.safeRename(qr, 'customers', 'paymentTermDays',  'payment_term_days');
    await this.safeRename(qr, 'customers', 'salesRepId',       'sales_rep_id');
    await this.safeRename(qr, 'customers', 'loyaltyPoints',    'loyalty_points');
    await this.safeRename(qr, 'customers', 'memberTier',       'member_tier');
    await this.safeRename(qr, 'customers', 'isActive',         'is_active');
    await this.safeRename(qr, 'customers', 'createdAt',        'created_at');
    await this.safeRename(qr, 'customers', 'updatedAt',        'updated_at');
    await this.safeRename(qr, 'customers', 'deletedAt',        'deleted_at');

    // customer_addresses
    await this.safeRename(qr, 'customer_addresses', 'customerId',  'customer_id');
    await this.safeRename(qr, 'customer_addresses', 'isDefault',   'is_default');
    await this.safeRename(qr, 'customer_addresses', 'createdAt',   'created_at');
    await this.safeRename(qr, 'customer_addresses', 'updatedAt',   'updated_at');
    await this.safeRename(qr, 'customer_addresses', 'deletedAt',   'deleted_at');

    // suppliers
    await this.safeRename(qr, 'suppliers', 'taxCode',          'tax_code');
    await this.safeRename(qr, 'suppliers', 'contactPerson',    'contact_person');
    await this.safeRename(qr, 'suppliers', 'paymentTermDays',  'payment_term_days');
    await this.safeRename(qr, 'suppliers', 'discountTerms',    'discount_terms');
    await this.safeRename(qr, 'suppliers', 'currentDebt',      'current_debt');
    await this.safeRename(qr, 'suppliers', 'isCustomer',       'is_customer');
    await this.safeRename(qr, 'suppliers', 'customerId',       'customer_id');
    await this.safeRename(qr, 'suppliers', 'isActive',         'is_active');
    await this.safeRename(qr, 'suppliers', 'createdAt',        'created_at');
    await this.safeRename(qr, 'suppliers', 'updatedAt',        'updated_at');
    await this.safeRename(qr, 'suppliers', 'deletedAt',        'deleted_at');

    // supplier_addresses
    await this.safeRename(qr, 'supplier_addresses', 'supplierId',  'supplier_id');
    await this.safeRename(qr, 'supplier_addresses', 'isDefault',   'is_default');
    await this.safeRename(qr, 'supplier_addresses', 'createdAt',   'created_at');
    await this.safeRename(qr, 'supplier_addresses', 'updatedAt',   'updated_at');
    await this.safeRename(qr, 'supplier_addresses', 'deletedAt',   'deleted_at');

    // supplier_bank_accounts
    await this.safeRename(qr, 'supplier_bank_accounts', 'supplierId',     'supplier_id');
    await this.safeRename(qr, 'supplier_bank_accounts', 'bankName',       'bank_name');
    await this.safeRename(qr, 'supplier_bank_accounts', 'accountNumber',  'account_number');
    await this.safeRename(qr, 'supplier_bank_accounts', 'accountName',    'account_name');
    await this.safeRename(qr, 'supplier_bank_accounts', 'createdAt',      'created_at');
    await this.safeRename(qr, 'supplier_bank_accounts', 'updatedAt',      'updated_at');
    await this.safeRename(qr, 'supplier_bank_accounts', 'deletedAt',      'deleted_at');

    // users
    await this.safeRename(qr, 'users', 'fullName',      'full_name');
    await this.safeRename(qr, 'users', 'passwordHash',  'password_hash');
    await this.safeRename(qr, 'users', 'createdAt',     'created_at');
    await this.safeRename(qr, 'users', 'updatedAt',     'updated_at');
    await this.safeRename(qr, 'users', 'deletedAt',     'deleted_at');

    // warehouses
    await this.safeRename(qr, 'warehouses', 'isActive',   'is_active');
    await this.safeRename(qr, 'warehouses', 'createdAt',  'created_at');
    await this.safeRename(qr, 'warehouses', 'updatedAt',  'updated_at');
    await this.safeRename(qr, 'warehouses', 'deletedAt',  'deleted_at');

    // inventory_balances
    await this.safeRename(qr, 'inventory_balances', 'productId',    'product_id');
    await this.safeRename(qr, 'inventory_balances', 'warehouseId',  'warehouse_id');
    await this.safeRename(qr, 'inventory_balances', 'reservedQty',  'reserved_qty');
    await this.safeRename(qr, 'inventory_balances', 'avgCost',      'avg_cost');
    await this.safeRename(qr, 'inventory_balances', 'createdAt',    'created_at');
    await this.safeRename(qr, 'inventory_balances', 'updatedAt',    'updated_at');
    await this.safeRename(qr, 'inventory_balances', 'deletedAt',    'deleted_at');

    // inventory_transactions
    await this.safeRename(qr, 'inventory_transactions', 'productId',        'product_id');
    await this.safeRename(qr, 'inventory_transactions', 'warehouseId',      'warehouse_id');
    await this.safeRename(qr, 'inventory_transactions', 'transactionType',  'transaction_type');
    await this.safeRename(qr, 'inventory_transactions', 'unitCost',         'unit_cost');
    await this.safeRename(qr, 'inventory_transactions', 'refId',            'ref_id');
    await this.safeRename(qr, 'inventory_transactions', 'refType',          'ref_type');
    await this.safeRename(qr, 'inventory_transactions', 'createdBy',        'created_by');
    await this.safeRename(qr, 'inventory_transactions', 'createdAt',        'created_at');
    await this.safeRename(qr, 'inventory_transactions', 'updatedAt',        'updated_at');
    await this.safeRename(qr, 'inventory_transactions', 'deletedAt',        'deleted_at');

    // inventory_lots
    await this.safeRename(qr, 'inventory_lots', 'productId',      'product_id');
    await this.safeRename(qr, 'inventory_lots', 'warehouseId',    'warehouse_id');
    await this.safeRename(qr, 'inventory_lots', 'receiptItemId',  'receipt_item_id');
    await this.safeRename(qr, 'inventory_lots', 'batchNumber',    'batch_number');
    await this.safeRename(qr, 'inventory_lots', 'expiryDate',     'expiry_date');
    await this.safeRename(qr, 'inventory_lots', 'costPerUnit',    'cost_per_unit');
    await this.safeRename(qr, 'inventory_lots', 'initialQty',     'initial_qty');
    await this.safeRename(qr, 'inventory_lots', 'remainingQty',   'remaining_qty');
    await this.safeRename(qr, 'inventory_lots', 'receivedAt',     'received_at');
    await this.safeRename(qr, 'inventory_lots', 'createdAt',      'created_at');
    await this.safeRename(qr, 'inventory_lots', 'updatedAt',      'updated_at');
    await this.safeRename(qr, 'inventory_lots', 'deletedAt',      'deleted_at');

    // stock_receipts
    await this.safeRename(qr, 'stock_receipts', 'supplierId',    'supplier_id');
    await this.safeRename(qr, 'stock_receipts', 'warehouseId',   'warehouse_id');
    await this.safeRename(qr, 'stock_receipts', 'refCode',       'ref_code');
    await this.safeRename(qr, 'stock_receipts', 'expectedDate',  'expected_date');
    await this.safeRename(qr, 'stock_receipts', 'confirmedAt',   'confirmed_at');
    await this.safeRename(qr, 'stock_receipts', 'confirmedBy',   'confirmed_by');
    await this.safeRename(qr, 'stock_receipts', 'totalAmount',   'total_amount');
    await this.safeRename(qr, 'stock_receipts', 'createdAt',     'created_at');
    await this.safeRename(qr, 'stock_receipts', 'updatedAt',     'updated_at');
    await this.safeRename(qr, 'stock_receipts', 'deletedAt',     'deleted_at');

    // stock_receipt_items
    await this.safeRename(qr, 'stock_receipt_items', 'receiptId',    'receipt_id');
    await this.safeRename(qr, 'stock_receipt_items', 'productId',    'product_id');
    await this.safeRename(qr, 'stock_receipt_items', 'unitId',       'unit_id');
    await this.safeRename(qr, 'stock_receipt_items', 'qtyInBase',    'qty_in_base');
    await this.safeRename(qr, 'stock_receipt_items', 'unitCost',     'unit_cost');
    await this.safeRename(qr, 'stock_receipt_items', 'batchNumber',  'batch_number');
    await this.safeRename(qr, 'stock_receipt_items', 'expiryDate',   'expiry_date');
    await this.safeRename(qr, 'stock_receipt_items', 'createdAt',    'created_at');
    await this.safeRename(qr, 'stock_receipt_items', 'updatedAt',    'updated_at');
    await this.safeRename(qr, 'stock_receipt_items', 'deletedAt',    'deleted_at');

    // stock_transfers
    await this.safeRename(qr, 'stock_transfers', 'fromWarehouseId',  'from_warehouse_id');
    await this.safeRename(qr, 'stock_transfers', 'toWarehouseId',    'to_warehouse_id');
    await this.safeRename(qr, 'stock_transfers', 'expectedDate',     'expected_date');
    await this.safeRename(qr, 'stock_transfers', 'dispatchedAt',     'dispatched_at');
    await this.safeRename(qr, 'stock_transfers', 'receivedAt',       'received_at');
    await this.safeRename(qr, 'stock_transfers', 'createdBy',        'created_by');
    await this.safeRename(qr, 'stock_transfers', 'createdAt',        'created_at');
    await this.safeRename(qr, 'stock_transfers', 'updatedAt',        'updated_at');
    await this.safeRename(qr, 'stock_transfers', 'deletedAt',        'deleted_at');

    // stock_transfer_items
    await this.safeRename(qr, 'stock_transfer_items', 'transferId',   'transfer_id');
    await this.safeRename(qr, 'stock_transfer_items', 'productId',    'product_id');
    await this.safeRename(qr, 'stock_transfer_items', 'unitId',       'unit_id');
    await this.safeRename(qr, 'stock_transfer_items', 'receivedQty',  'received_qty');
    await this.safeRename(qr, 'stock_transfer_items', 'createdAt',    'created_at');
    await this.safeRename(qr, 'stock_transfer_items', 'updatedAt',    'updated_at');
    await this.safeRename(qr, 'stock_transfer_items', 'deletedAt',    'deleted_at');

    // stocktaking_sessions
    await this.safeRename(qr, 'stocktaking_sessions', 'warehouseId',  'warehouse_id');
    await this.safeRename(qr, 'stocktaking_sessions', 'createdBy',    'created_by');
    await this.safeRename(qr, 'stocktaking_sessions', 'completedAt',  'completed_at');
    await this.safeRename(qr, 'stocktaking_sessions', 'createdAt',    'created_at');
    await this.safeRename(qr, 'stocktaking_sessions', 'updatedAt',    'updated_at');
    await this.safeRename(qr, 'stocktaking_sessions', 'deletedAt',    'deleted_at');

    // stocktaking_items
    await this.safeRename(qr, 'stocktaking_items', 'sessionId',   'session_id');
    await this.safeRename(qr, 'stocktaking_items', 'productId',   'product_id');
    await this.safeRename(qr, 'stocktaking_items', 'systemQty',   'system_qty');
    await this.safeRename(qr, 'stocktaking_items', 'actualQty',   'actual_qty');
    await this.safeRename(qr, 'stocktaking_items', 'adjustQty',   'adjust_qty');
    await this.safeRename(qr, 'stocktaking_items', 'createdAt',   'created_at');
    await this.safeRename(qr, 'stocktaking_items', 'updatedAt',   'updated_at');
    await this.safeRename(qr, 'stocktaking_items', 'deletedAt',   'deleted_at');

    // orders
    await this.safeRename(qr, 'orders', 'customerId',       'customer_id');
    await this.safeRename(qr, 'orders', 'supplierId',       'supplier_id');
    await this.safeRename(qr, 'orders', 'warehouseId',      'warehouse_id');
    await this.safeRename(qr, 'orders', 'salesRepId',       'sales_rep_id');
    await this.safeRename(qr, 'orders', 'paymentMethod',    'payment_method');
    await this.safeRename(qr, 'orders', 'discountTotal',    'discount_total');
    await this.safeRename(qr, 'orders', 'voucherDiscount',  'voucher_discount');
    await this.safeRename(qr, 'orders', 'totalAmount',      'total_amount');
    await this.safeRename(qr, 'orders', 'paidAmount',       'paid_amount');
    await this.safeRename(qr, 'orders', 'voucherId',        'voucher_id');
    await this.safeRename(qr, 'orders', 'shippingAddress',  'shipping_address');
    await this.safeRename(qr, 'orders', 'confirmedAt',      'confirmed_at');
    await this.safeRename(qr, 'orders', 'confirmedBy',      'confirmed_by');
    await this.safeRename(qr, 'orders', 'cancelledAt',      'cancelled_at');
    await this.safeRename(qr, 'orders', 'cancelReason',     'cancel_reason');
    await this.safeRename(qr, 'orders', 'createdAt',        'created_at');
    await this.safeRename(qr, 'orders', 'updatedAt',        'updated_at');
    await this.safeRename(qr, 'orders', 'deletedAt',        'deleted_at');

    // order_items
    await this.safeRename(qr, 'order_items', 'orderId',          'order_id');
    await this.safeRename(qr, 'order_items', 'productId',        'product_id');
    await this.safeRename(qr, 'order_items', 'unitId',           'unit_id');
    await this.safeRename(qr, 'order_items', 'qtyInBase',        'qty_in_base');
    await this.safeRename(qr, 'order_items', 'unitPrice',        'unit_price');
    await this.safeRename(qr, 'order_items', 'discountPercent',  'discount_percent');
    await this.safeRename(qr, 'order_items', 'discountAmount',   'discount_amount');
    await this.safeRename(qr, 'order_items', 'lineTotal',        'line_total');
    await this.safeRename(qr, 'order_items', 'costPrice',        'cost_price');
    await this.safeRename(qr, 'order_items', 'issuedQty',        'issued_qty');
    await this.safeRename(qr, 'order_items', 'createdAt',        'created_at');
    await this.safeRename(qr, 'order_items', 'updatedAt',        'updated_at');
    await this.safeRename(qr, 'order_items', 'deletedAt',        'deleted_at');

    // return_orders
    await this.safeRename(qr, 'return_orders', 'originalOrderId',  'original_order_id');
    await this.safeRename(qr, 'return_orders', 'customerId',       'customer_id');
    await this.safeRename(qr, 'return_orders', 'refundMethod',     'refund_method');
    await this.safeRename(qr, 'return_orders', 'refundAmount',     'refund_amount');
    await this.safeRename(qr, 'return_orders', 'createdBy',        'created_by');
    await this.safeRename(qr, 'return_orders', 'createdAt',        'created_at');
    await this.safeRename(qr, 'return_orders', 'updatedAt',        'updated_at');
    await this.safeRename(qr, 'return_orders', 'deletedAt',        'deleted_at');

    // return_order_items
    await this.safeRename(qr, 'return_order_items', 'returnOrderId',  'return_order_id');
    await this.safeRename(qr, 'return_order_items', 'orderItemId',    'order_item_id');
    await this.safeRename(qr, 'return_order_items', 'productId',      'product_id');
    await this.safeRename(qr, 'return_order_items', 'unitId',         'unit_id');
    await this.safeRename(qr, 'return_order_items', 'returnQty',      'return_qty');
    await this.safeRename(qr, 'return_order_items', 'unitPrice',      'unit_price');
    await this.safeRename(qr, 'return_order_items', 'lineTotal',      'line_total');
    await this.safeRename(qr, 'return_order_items', 'createdAt',      'created_at');
    await this.safeRename(qr, 'return_order_items', 'updatedAt',      'updated_at');
    await this.safeRename(qr, 'return_order_items', 'deletedAt',      'deleted_at');

    // promotions
    await this.safeRename(qr, 'promotions', 'startDate',   'start_date');
    await this.safeRename(qr, 'promotions', 'endDate',     'end_date');
    await this.safeRename(qr, 'promotions', 'usedCount',   'used_count');
    await this.safeRename(qr, 'promotions', 'isActive',    'is_active');
    await this.safeRename(qr, 'promotions', 'createdAt',   'created_at');
    await this.safeRename(qr, 'promotions', 'updatedAt',   'updated_at');
    await this.safeRename(qr, 'promotions', 'deletedAt',   'deleted_at');

    // vouchers
    await this.safeRename(qr, 'vouchers', 'maxDiscount',       'max_discount');
    await this.safeRename(qr, 'vouchers', 'minOrderAmount',    'min_order_amount');
    await this.safeRename(qr, 'vouchers', 'usageLimit',        'usage_limit');
    await this.safeRename(qr, 'vouchers', 'usedCount',         'used_count');
    await this.safeRename(qr, 'vouchers', 'perCustomerLimit',  'per_customer_limit');
    await this.safeRename(qr, 'vouchers', 'customerGroup',     'customer_group');
    await this.safeRename(qr, 'vouchers', 'startDate',         'start_date');
    await this.safeRename(qr, 'vouchers', 'endDate',           'end_date');
    await this.safeRename(qr, 'vouchers', 'isActive',          'is_active');
    await this.safeRename(qr, 'vouchers', 'createdAt',         'created_at');
    await this.safeRename(qr, 'vouchers', 'updatedAt',         'updated_at');
    await this.safeRename(qr, 'vouchers', 'deletedAt',         'deleted_at');

    // invoices
    await this.safeRename(qr, 'invoices', 'orderId',        'order_id');
    await this.safeRename(qr, 'invoices', 'customerId',     'customer_id');
    await this.safeRename(qr, 'invoices', 'discountTotal',  'discount_total');
    await this.safeRename(qr, 'invoices', 'totalAmount',    'total_amount');
    await this.safeRename(qr, 'invoices', 'paidAmount',     'paid_amount');
    await this.safeRename(qr, 'invoices', 'dueDate',        'due_date');
    await this.safeRename(qr, 'invoices', 'issuedAt',       'issued_at');
    await this.safeRename(qr, 'invoices', 'createdAt',      'created_at');
    await this.safeRename(qr, 'invoices', 'updatedAt',      'updated_at');
    await this.safeRename(qr, 'invoices', 'deletedAt',      'deleted_at');

    // invoice_items
    await this.safeRename(qr, 'invoice_items', 'invoiceId',        'invoice_id');
    await this.safeRename(qr, 'invoice_items', 'productName',      'product_name');
    await this.safeRename(qr, 'invoice_items', 'unitPrice',        'unit_price');
    await this.safeRename(qr, 'invoice_items', 'discountPercent',  'discount_percent');
    await this.safeRename(qr, 'invoice_items', 'lineTotal',        'line_total');
    await this.safeRename(qr, 'invoice_items', 'createdAt',        'created_at');
    await this.safeRename(qr, 'invoice_items', 'updatedAt',        'updated_at');
    await this.safeRename(qr, 'invoice_items', 'deletedAt',        'deleted_at');

    // payments
    await this.safeRename(qr, 'payments', 'invoiceId',       'invoice_id');
    await this.safeRename(qr, 'payments', 'customerId',      'customer_id');
    await this.safeRename(qr, 'payments', 'bankAccountId',   'bank_account_id');
    await this.safeRename(qr, 'payments', 'transactionRef',  'transaction_ref');
    await this.safeRename(qr, 'payments', 'paidAt',          'paid_at');
    await this.safeRename(qr, 'payments', 'createdBy',       'created_by');
    await this.safeRename(qr, 'payments', 'createdAt',       'created_at');
    await this.safeRename(qr, 'payments', 'updatedAt',       'updated_at');
    await this.safeRename(qr, 'payments', 'deletedAt',       'deleted_at');

    // accounts_payable
    await this.safeRename(qr, 'accounts_payable', 'supplierId',      'supplier_id');
    await this.safeRename(qr, 'accounts_payable', 'stockReceiptId',  'stock_receipt_id');
    await this.safeRename(qr, 'accounts_payable', 'paidAmount',      'paid_amount');
    await this.safeRename(qr, 'accounts_payable', 'dueDate',         'due_date');
    await this.safeRename(qr, 'accounts_payable', 'invoiceRef',      'invoice_ref');
    await this.safeRename(qr, 'accounts_payable', 'createdAt',       'created_at');
    await this.safeRename(qr, 'accounts_payable', 'updatedAt',       'updated_at');
    await this.safeRename(qr, 'accounts_payable', 'deletedAt',       'deleted_at');

    // cash_funds
    await this.safeRename(qr, 'cash_funds', 'isActive',   'is_active');
    await this.safeRename(qr, 'cash_funds', 'createdAt',  'created_at');
    await this.safeRename(qr, 'cash_funds', 'updatedAt',  'updated_at');
    await this.safeRename(qr, 'cash_funds', 'deletedAt',  'deleted_at');

    // bank_accounts
    await this.safeRename(qr, 'bank_accounts', 'bankName',       'bank_name');
    await this.safeRename(qr, 'bank_accounts', 'accountNumber',  'account_number');
    await this.safeRename(qr, 'bank_accounts', 'accountName',    'account_name');
    await this.safeRename(qr, 'bank_accounts', 'isActive',       'is_active');
    await this.safeRename(qr, 'bank_accounts', 'createdAt',      'created_at');
    await this.safeRename(qr, 'bank_accounts', 'updatedAt',      'updated_at');
    await this.safeRename(qr, 'bank_accounts', 'deletedAt',      'deleted_at');

    // cash_receipts
    await this.safeRename(qr, 'cash_receipts', 'receiptType',    'receipt_type');
    await this.safeRename(qr, 'cash_receipts', 'refId',          'ref_id');
    await this.safeRename(qr, 'cash_receipts', 'refType',        'ref_type');
    await this.safeRename(qr, 'cash_receipts', 'cashFundId',     'cash_fund_id');
    await this.safeRename(qr, 'cash_receipts', 'bankAccountId',  'bank_account_id');
    await this.safeRename(qr, 'cash_receipts', 'customerId',     'customer_id');
    await this.safeRename(qr, 'cash_receipts', 'supplierId',     'supplier_id');
    await this.safeRename(qr, 'cash_receipts', 'createdBy',      'created_by');
    await this.safeRename(qr, 'cash_receipts', 'createdAt',      'created_at');
    await this.safeRename(qr, 'cash_receipts', 'updatedAt',      'updated_at');
    await this.safeRename(qr, 'cash_receipts', 'deletedAt',      'deleted_at');

    // loyalty_configs
    await this.safeRename(qr, 'loyalty_configs', 'isEnabled',                 'is_enabled');
    await this.safeRename(qr, 'loyalty_configs', 'pointsPerAmount',            'points_per_amount');
    await this.safeRename(qr, 'loyalty_configs', 'amountPerPoint',             'amount_per_point');
    await this.safeRename(qr, 'loyalty_configs', 'currencyUnit',               'currency_unit');
    await this.safeRename(qr, 'loyalty_configs', 'tierEvaluationPeriodDays',  'tier_evaluation_period_days');
    await this.safeRename(qr, 'loyalty_configs', 'pointExpiryDays',           'point_expiry_days');
    await this.safeRename(qr, 'loyalty_configs', 'allowTierDowngrade',        'allow_tier_downgrade');
    await this.safeRename(qr, 'loyalty_configs', 'updatedAt',                 'updated_at');

    // loyalty_transactions
    await this.safeRename(qr, 'loyalty_transactions', 'customerId',  'customer_id');
    await this.safeRename(qr, 'loyalty_transactions', 'refId',       'ref_id');
    await this.safeRename(qr, 'loyalty_transactions', 'refType',     'ref_type');
    await this.safeRename(qr, 'loyalty_transactions', 'expiresAt',   'expires_at');
    await this.safeRename(qr, 'loyalty_transactions', 'createdBy',   'created_by');
    await this.safeRename(qr, 'loyalty_transactions', 'createdAt',   'created_at');
    await this.safeRename(qr, 'loyalty_transactions', 'updatedAt',   'updated_at');
    await this.safeRename(qr, 'loyalty_transactions', 'deletedAt',   'deleted_at');

    // tier_change_logs
    await this.safeRename(qr, 'tier_change_logs', 'customerId',  'customer_id');
    await this.safeRename(qr, 'tier_change_logs', 'oldTier',     'old_tier');
    await this.safeRename(qr, 'tier_change_logs', 'newTier',     'new_tier');
    await this.safeRename(qr, 'tier_change_logs', 'changedAt',   'changed_at');
    await this.safeRename(qr, 'tier_change_logs', 'createdAt',   'created_at');
    await this.safeRename(qr, 'tier_change_logs', 'updatedAt',   'updated_at');
    await this.safeRename(qr, 'tier_change_logs', 'deletedAt',   'deleted_at');

    // commission_configs (base columns only)
    await this.safeRename(qr, 'commission_configs', 'createdAt',  'created_at');
    await this.safeRename(qr, 'commission_configs', 'updatedAt',  'updated_at');
    await this.safeRename(qr, 'commission_configs', 'deletedAt',  'deleted_at');

    // roles
    await this.safeRename(qr, 'roles', 'isSystem',   'is_system');
    await this.safeRename(qr, 'roles', 'createdAt',  'created_at');
    await this.safeRename(qr, 'roles', 'updatedAt',  'updated_at');
    await this.safeRename(qr, 'roles', 'deletedAt',  'deleted_at');

    // role_permissions
    await this.safeRename(qr, 'role_permissions', 'roleId',        'role_id');
    await this.safeRename(qr, 'role_permissions', 'permissionId',  'permission_id');

    // disbursements
    await this.safeRename(qr, 'disbursements', 'disbursementType',  'disbursement_type');
    await this.safeRename(qr, 'disbursements', 'supplierId',        'supplier_id');
    await this.safeRename(qr, 'disbursements', 'apRecordId',        'ap_record_id');
    await this.safeRename(qr, 'disbursements', 'cashFundId',        'cash_fund_id');
    await this.safeRename(qr, 'disbursements', 'bankAccountId',     'bank_account_id');
    await this.safeRename(qr, 'disbursements', 'createdBy',         'created_by');
    await this.safeRename(qr, 'disbursements', 'approvedBy',        'approved_by');
    await this.safeRename(qr, 'disbursements', 'rejectReason',      'reject_reason');
    await this.safeRename(qr, 'disbursements', 'createdAt',         'created_at');
    await this.safeRename(qr, 'disbursements', 'updatedAt',         'updated_at');
    await this.safeRename(qr, 'disbursements', 'deletedAt',         'deleted_at');

    // serial_numbers
    await this.safeRename(qr, 'serial_numbers', 'productId',       'product_id');
    await this.safeRename(qr, 'serial_numbers', 'serialNumber',    'serial_number');
    await this.safeRename(qr, 'serial_numbers', 'receiptItemId',   'receipt_item_id');
    await this.safeRename(qr, 'serial_numbers', 'orderItemId',     'order_item_id');
    await this.safeRename(qr, 'serial_numbers', 'customerId',      'customer_id');
    await this.safeRename(qr, 'serial_numbers', 'warrantyExpiry',  'warranty_expiry');
    await this.safeRename(qr, 'serial_numbers', 'purchasedAt',     'purchased_at');
    await this.safeRename(qr, 'serial_numbers', 'createdAt',       'created_at');
    await this.safeRename(qr, 'serial_numbers', 'updatedAt',       'updated_at');
    await this.safeRename(qr, 'serial_numbers', 'deletedAt',       'deleted_at');

    // audit_logs
    await this.safeRename(qr, 'audit_logs', 'userId',      'user_id');
    await this.safeRename(qr, 'audit_logs', 'userName',    'user_name');
    await this.safeRename(qr, 'audit_logs', 'userRole',    'user_role');
    await this.safeRename(qr, 'audit_logs', 'resourceId',  'resource_id');
    await this.safeRename(qr, 'audit_logs', 'beforeData',  'before_data');
    await this.safeRename(qr, 'audit_logs', 'afterData',   'after_data');
    await this.safeRename(qr, 'audit_logs', 'ipAddress',   'ip_address');
    await this.safeRename(qr, 'audit_logs', 'createdAt',   'created_at');
  }

  async down(_qr: QueryRunner): Promise<void> {
    // Down migration not implemented — restore from backup if needed
  }
}

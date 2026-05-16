import { AuditLog } from '../tenant-module/audit-log/entities/audit-log.entity';
import { Category } from '../tenant-module/categories/entities/category.entity';
import { CustomerAddress } from '../tenant-module/customers/entities/customer-address.entity';
import { Customer } from '../tenant-module/customers/entities/customer.entity';
import { Disbursement } from '../tenant-module/finance/entities/disbursement.entity';
import { InventoryBalance } from '../tenant-module/inventory/entities/inventory-balance.entity';
import { InventoryLot } from '../tenant-module/inventory/entities/inventory-lot.entity';
import { InventoryTransaction } from '../tenant-module/inventory/entities/inventory-transaction.entity';
import { StockIssueItem } from '../tenant-module/inventory/entities/stock-issue-item.entity';
import { StockIssue } from '../tenant-module/inventory/entities/stock-issue.entity';
import { StockReceiptItem } from '../tenant-module/inventory/entities/stock-receipt-item.entity';
import { StockReceipt } from '../tenant-module/inventory/entities/stock-receipt.entity';
import { StockTransferItem } from '../tenant-module/inventory/entities/stock-transfer-item.entity';
import { StockTransfer } from '../tenant-module/inventory/entities/stock-transfer.entity';
import { StocktakingItem } from '../tenant-module/inventory/entities/stocktaking-item.entity';
import { StocktakingSession } from '../tenant-module/inventory/entities/stocktaking-session.entity';
import { Warehouse } from '../tenant-module/inventory/entities/warehouse.entity';
import { AccountsPayable } from '../tenant-module/invoices/entities/accounts-payable.entity';
import { BankAccount } from '../tenant-module/invoices/entities/bank-account.entity';
import { CashFund } from '../tenant-module/invoices/entities/cash-fund.entity';
import { CashReceipt } from '../tenant-module/invoices/entities/cash-receipt.entity';
import { InvoiceItem } from '../tenant-module/invoices/entities/invoice-item.entity';
import { Invoice } from '../tenant-module/invoices/entities/invoice.entity';
import { Payment } from '../tenant-module/invoices/entities/payment.entity';
import { PurchaseInvoiceItem } from '../tenant-module/invoices/entities/purchase-invoice-item.entity';
import { PurchaseInvoice } from '../tenant-module/invoices/entities/purchase-invoice.entity';
import { LoyaltyConfig } from '../tenant-module/loyalty/entities/loyalty-config.entity';
import { LoyaltyTransaction } from '../tenant-module/loyalty/entities/loyalty-transaction.entity';
import { TierChangeLog } from '../tenant-module/loyalty/entities/tier-change-log.entity';
import { OrderItem } from '../tenant-module/orders/entities/order-item.entity';
import { Order } from '../tenant-module/orders/entities/order.entity';
import { Promotion } from '../tenant-module/orders/entities/promotion.entity';
import { ReturnOrderItem } from '../tenant-module/orders/entities/return-order-item.entity';
import { ReturnOrder } from '../tenant-module/orders/entities/return-order.entity';
import { Voucher } from '../tenant-module/orders/entities/voucher.entity';
import { ProductPrice } from '../tenant-module/products/entities/product-price.entity';
import { ProductUnit } from '../tenant-module/products/entities/product-unit.entity';
import { Product } from '../tenant-module/products/entities/product.entity';
import { CommissionConfigEntity } from '../tenant-module/reports/entities/commission-config.entity';
import { Permission } from '../tenant-module/roles/entities/permission.entity';
import { RolePermission } from '../tenant-module/roles/entities/role-permission.entity';
import { Role } from '../tenant-module/roles/entities/role.entity';
import { SerialNumber } from '../tenant-module/serial/entities/serial-number.entity';
import { SupplierAddress } from '../tenant-module/suppliers/entities/supplier-address.entity';
import { SupplierBankAccount } from '../tenant-module/suppliers/entities/supplier-bank-account.entity';
import { Supplier } from '../tenant-module/suppliers/entities/supplier.entity';
import { User } from '../tenant-module/users/entities/user.entity';

export const TENANT_ENTITIES = [
  AuditLog,
  Category,
  Customer,
  CustomerAddress,
  Disbursement,
  InventoryBalance,
  InventoryLot,
  InventoryTransaction,
  StockIssue,
  StockIssueItem,
  StockReceipt,
  StockReceiptItem,
  StockTransfer,
  StockTransferItem,
  StocktakingSession,
  StocktakingItem,
  Warehouse,
  AccountsPayable,
  BankAccount,
  CashFund,
  CashReceipt,
  Invoice,
  InvoiceItem,
  Payment,
  PurchaseInvoice,
  PurchaseInvoiceItem,
  LoyaltyConfig,
  LoyaltyTransaction,
  TierChangeLog,
  Order,
  OrderItem,
  Promotion,
  ReturnOrder,
  ReturnOrderItem,
  Voucher,
  Product,
  ProductPrice,
  ProductUnit,
  CommissionConfigEntity,
  Permission,
  Role,
  RolePermission,
  SerialNumber,
  Supplier,
  SupplierAddress,
  SupplierBankAccount,
  User,
] as const;

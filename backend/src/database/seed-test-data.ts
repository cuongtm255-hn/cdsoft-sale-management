import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { AppDataSource } from './data-source';
import { AddStocktakingAndInventoryLots1745700000000 } from './tenant-migrations/1745700000000-AddStocktakingAndInventoryLots';
import { TenantSnakeCase1745800000001 } from './tenant-migrations/1745800000001-TenantSnakeCase';
import { CreateMissingTables1745800000002 } from './tenant-migrations/1745800000002-CreateMissingTables';
import { CreateStockIssues1745800000003 } from './tenant-migrations/1745800000003-CreateStockIssues';
import { AddPaymentCashFundId1745800000004 } from './tenant-migrations/1745800000004-AddPaymentCashFundId';
import { CreatePurchaseInvoices1745800000005 } from './tenant-migrations/1745800000005-CreatePurchaseInvoices';
import { AddStockReceiptPurchaseOrderId1745800000006 } from './tenant-migrations/1745800000006-AddStockReceiptPurchaseOrderId';
import { PlatformRole, PlatformUser, UserStatus as PlatformUserStatus } from '../platform/users/entities/platform-user.entity';
import { ProvisioningStatus, Tenant, TenantStatus } from '../platform/tenants/entities/tenant.entity';
import { ensureTenantRbacSeeded } from '../tenant-module/roles/rbac-seed';
import { User, UserRole, UserStatus } from '../tenant-module/users/entities/user.entity';
import { Category } from '../tenant-module/categories/entities/category.entity';
import { Product } from '../tenant-module/products/entities/product.entity';
import { ProductUnit } from '../tenant-module/products/entities/product-unit.entity';
import { PriceType, ProductPrice } from '../tenant-module/products/entities/product-price.entity';
import { Customer, CustomerGroup, MemberTier } from '../tenant-module/customers/entities/customer.entity';
import { CustomerAddress } from '../tenant-module/customers/entities/customer-address.entity';
import { Supplier } from '../tenant-module/suppliers/entities/supplier.entity';
import { SupplierAddress } from '../tenant-module/suppliers/entities/supplier-address.entity';
import { SupplierBankAccount } from '../tenant-module/suppliers/entities/supplier-bank-account.entity';
import { Warehouse } from '../tenant-module/inventory/entities/warehouse.entity';
import { InventoryBalance } from '../tenant-module/inventory/entities/inventory-balance.entity';
import { InventoryLot } from '../tenant-module/inventory/entities/inventory-lot.entity';
import { InventoryTransaction, TxType } from '../tenant-module/inventory/entities/inventory-transaction.entity';
import { ReceiptStatus, StockReceipt } from '../tenant-module/inventory/entities/stock-receipt.entity';
import { StockReceiptItem } from '../tenant-module/inventory/entities/stock-receipt-item.entity';
import { StockTransfer, TransferStatus } from '../tenant-module/inventory/entities/stock-transfer.entity';
import { StockTransferItem } from '../tenant-module/inventory/entities/stock-transfer-item.entity';
import { StocktakingSession, StocktakingStatus } from '../tenant-module/inventory/entities/stocktaking-session.entity';
import { StocktakingItem } from '../tenant-module/inventory/entities/stocktaking-item.entity';
import { IssueStatus, IssueType, StockIssue } from '../tenant-module/inventory/entities/stock-issue.entity';
import { StockIssueItem } from '../tenant-module/inventory/entities/stock-issue-item.entity';
import { Promotion, PromotionType } from '../tenant-module/orders/entities/promotion.entity';
import { Voucher, VoucherType } from '../tenant-module/orders/entities/voucher.entity';
import { Order, OrderStatus, OrderType, PaymentMethod as OrderPaymentMethod } from '../tenant-module/orders/entities/order.entity';
import { OrderItem } from '../tenant-module/orders/entities/order-item.entity';
import { RefundMethod, ReturnOrder } from '../tenant-module/orders/entities/return-order.entity';
import { ReturnOrderItem } from '../tenant-module/orders/entities/return-order-item.entity';
import { Invoice, InvoiceStatus } from '../tenant-module/invoices/entities/invoice.entity';
import { InvoiceItem } from '../tenant-module/invoices/entities/invoice-item.entity';
import { Payment, PaymentMethod as InvoicePaymentMethod } from '../tenant-module/invoices/entities/payment.entity';
import { AccountsPayable, ApStatus } from '../tenant-module/invoices/entities/accounts-payable.entity';
import { PurchaseInvoice, PurchaseInvoiceStatus } from '../tenant-module/invoices/entities/purchase-invoice.entity';
import { PurchaseInvoiceItem } from '../tenant-module/invoices/entities/purchase-invoice-item.entity';
import { BankAccount } from '../tenant-module/invoices/entities/bank-account.entity';
import { CashFund } from '../tenant-module/invoices/entities/cash-fund.entity';
import { CashReceipt, CashReceiptKind, CashReceiptStatus } from '../tenant-module/invoices/entities/cash-receipt.entity';
import { LoyaltyConfig } from '../tenant-module/loyalty/entities/loyalty-config.entity';
import { LoyaltyTransaction, LoyaltyTxType } from '../tenant-module/loyalty/entities/loyalty-transaction.entity';
import { TierChangeLog } from '../tenant-module/loyalty/entities/tier-change-log.entity';
import { CommissionConfigEntity } from '../tenant-module/reports/entities/commission-config.entity';
import { SerialNumber } from '../tenant-module/serial/entities/serial-number.entity';
import { AuditLog } from '../tenant-module/audit-log/entities/audit-log.entity';
import { Disbursement } from '../tenant-module/finance/entities/disbursement.entity';
import { TENANT_ENTITIES } from '../tenant/tenant-entities';

interface SeedRuntimeConfig {
  tenantCode: string;
  tenantName: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  dbName: string;
  password: string;
  platformOperatorUsername: string;
  platformOperatorEmail: string;
  platformOperatorPassword: string;
  bcryptRounds: number;
}

interface PlatformSeedContext {
  tenant: Tenant;
  platformOperator: PlatformUser;
}

interface TenantSeedSummary {
  salesOrderCode: string;
  invoiceCode: string;
  counts: {
    users: number;
    categories: number;
    products: number;
    customers: number;
    suppliers: number;
    warehouses: number;
  };
}

function getSeedConfig(): SeedRuntimeConfig {
  const tenantCode = process.env.SEED_TEST_TENANT_CODE || 'seed_demo';
  const dbSuffix = tenantCode.replace(/[^a-zA-Z0-9_]/g, '_');

  return {
    tenantCode,
    tenantName: process.env.SEED_TEST_TENANT_NAME || 'Tenant Demo Toan Dien',
    companyName: process.env.SEED_TEST_COMPANY_NAME || 'CDSoft Seed Demo Co.',
    contactName: process.env.SEED_TEST_CONTACT_NAME || 'Demo Admin',
    contactEmail: process.env.SEED_TEST_CONTACT_EMAIL || 'seed.demo@platform.local',
    contactPhone: process.env.SEED_TEST_CONTACT_PHONE || '0901000200',
    address: process.env.SEED_TEST_ADDRESS || '123 Nguyen Hue, Quan 1, TP. HCM',
    dbName: process.env.SEED_TEST_DB_NAME || `tenant_${dbSuffix}`,
    password: process.env.SEED_TEST_PASSWORD || 'Test@12345',
    platformOperatorUsername: process.env.SEED_TEST_PLATFORM_OPERATOR_USERNAME || 'seed_operator',
    platformOperatorEmail: process.env.SEED_TEST_PLATFORM_OPERATOR_EMAIL || 'seed.operator@platform.local',
    platformOperatorPassword: process.env.SEED_TEST_PLATFORM_OPERATOR_PASSWORD || process.env.SEED_TEST_PASSWORD || 'Test@12345',
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS || process.env.APP_BCRYPT_ROUNDS || 12),
  };
}

function getSslOption(): false | { rejectUnauthorized: false } {
  return process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;
}

function getTenantDataSourceOptions(database: string): DataSourceOptions {
  return {
    type: 'mysql',
    host: process.env.TENANT_DB_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.TENANT_DB_PORT || process.env.DB_PORT || '3306', 10),
    username: process.env.TENANT_DB_USERNAME || process.env.DB_USERNAME || 'root',
    password: process.env.TENANT_DB_PASSWORD || process.env.DB_PASSWORD || '',
    database,
    ssl: getSslOption(),
    entities: [...TENANT_ENTITIES],
    migrations: [
      AddStocktakingAndInventoryLots1745700000000,
      TenantSnakeCase1745800000001,
      CreateMissingTables1745800000002,
      CreateStockIssues1745800000003,
      AddPaymentCashFundId1745800000004,
      CreatePurchaseInvoices1745800000005,
      AddStockReceiptPurchaseOrderId1745800000006,
    ],
    migrationsTableName: 'typeorm_migrations',
    synchronize: true,
    logging: false,
    namingStrategy: new SnakeNamingStrategy(),
  };
}

async function ensurePlatformOperator(platformDs: DataSource, config: SeedRuntimeConfig): Promise<PlatformUser> {
  const repo = platformDs.getRepository(PlatformUser);
  const passwordHash = await bcrypt.hash(config.platformOperatorPassword, config.bcryptRounds);
  let operator = await repo.findOne({ where: { username: config.platformOperatorUsername } });

  if (!operator) {
    operator = repo.create({
      username: config.platformOperatorUsername,
      email: config.platformOperatorEmail,
      passwordHash,
      role: PlatformRole.PLATFORM_OPERATOR,
      status: PlatformUserStatus.ACTIVE,
    });
  } else {
    operator.email = config.platformOperatorEmail;
    operator.passwordHash = passwordHash;
    operator.role = PlatformRole.PLATFORM_OPERATOR;
    operator.status = PlatformUserStatus.ACTIVE;
  }

  return repo.save(operator);
}

async function ensureSeedTenant(platformDs: DataSource, config: SeedRuntimeConfig): Promise<Tenant> {
  const repo = platformDs.getRepository(Tenant);
  let tenant = await repo.findOne({ where: { tenantCode: config.tenantCode } });

  if (!tenant) {
    tenant = repo.create({
      tenantCode: config.tenantCode,
      tenantName: config.tenantName,
      companyName: config.companyName,
      contactName: config.contactName,
      contactEmail: config.contactEmail,
      contactPhone: config.contactPhone,
      address: config.address,
      dbHost: process.env.TENANT_DB_HOST || process.env.DB_HOST || 'localhost',
      dbPort: parseInt(process.env.TENANT_DB_PORT || process.env.DB_PORT || '3306', 10),
      dbName: config.dbName,
      dbUsername: process.env.TENANT_DB_USERNAME || process.env.DB_USERNAME || 'root',
      createdBy: 'seed-script',
      status: TenantStatus.ACTIVE,
      provisioningStatus: ProvisioningStatus.ACTIVE,
    });
  } else {
    tenant.tenantName = config.tenantName;
    tenant.companyName = config.companyName;
    tenant.contactName = config.contactName;
    tenant.contactEmail = config.contactEmail;
    tenant.contactPhone = config.contactPhone;
    tenant.address = config.address;
    tenant.dbHost = process.env.TENANT_DB_HOST || process.env.DB_HOST || 'localhost';
    tenant.dbPort = parseInt(process.env.TENANT_DB_PORT || process.env.DB_PORT || '3306', 10);
    tenant.dbName = config.dbName;
    tenant.dbUsername = process.env.TENANT_DB_USERNAME || process.env.DB_USERNAME || 'root';
    tenant.createdBy = tenant.createdBy || 'seed-script';
    tenant.status = TenantStatus.ACTIVE;
    tenant.provisioningStatus = ProvisioningStatus.ACTIVE;
  }

  return repo.save(tenant);
}

async function seedPlatformData(platformDs: DataSource, config: SeedRuntimeConfig): Promise<PlatformSeedContext> {
  const platformOperator = await ensurePlatformOperator(platformDs, config);
  const tenant = await ensureSeedTenant(platformDs, config);
  return { tenant, platformOperator };
}

async function recreateTenantDatabase(platformDs: DataSource, config: SeedRuntimeConfig): Promise<void> {
  await platformDs.query(`DROP DATABASE IF EXISTS \`${config.dbName}\``);
  await platformDs.query(
    `CREATE DATABASE \`${config.dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
}

async function initializeTenantDataSource(config: SeedRuntimeConfig): Promise<DataSource> {
  const tenantDs = new DataSource(getTenantDataSourceOptions(config.dbName));
  await tenantDs.initialize();
  await tenantDs.runMigrations();
  return tenantDs;
}

async function createTenantUsers(ds: DataSource, config: SeedRuntimeConfig): Promise<Record<string, User>> {
  const repo = ds.getRepository(User);
  const passwordHash = await bcrypt.hash(config.password, config.bcryptRounds);
  const definitions: Array<{ key: string; payload: Partial<User> }> = [
    {
      key: 'admin',
      payload: {
        fullName: 'Demo Tenant Admin',
        email: `admin@${config.tenantCode}.local`,
        phone: '0901000001',
        passwordHash,
        role: UserRole.TENANT_ADMIN,
        status: UserStatus.ACTIVE,
      },
    },
    {
      key: 'manager',
      payload: {
        fullName: 'Nguyen Thi Quan Ly',
        email: `manager@${config.tenantCode}.local`,
        phone: '0901000002',
        passwordHash,
        role: UserRole.MANAGER,
        status: UserStatus.ACTIVE,
      },
    },
    {
      key: 'accountant',
      payload: {
        fullName: 'Tran Van Ke Toan',
        email: `accountant@${config.tenantCode}.local`,
        phone: '0901000003',
        passwordHash,
        role: UserRole.ACCOUNTANT,
        status: UserStatus.ACTIVE,
      },
    },
    {
      key: 'warehouse',
      payload: {
        fullName: 'Le Thi Thu Kho',
        email: `warehouse@${config.tenantCode}.local`,
        phone: '0901000004',
        passwordHash,
        role: UserRole.WAREHOUSE,
        status: UserStatus.ACTIVE,
      },
    },
    {
      key: 'staff',
      payload: {
        fullName: 'Pham Van Sales',
        email: `staff@${config.tenantCode}.local`,
        phone: '0901000005',
        passwordHash,
        role: UserRole.STAFF,
        status: UserStatus.ACTIVE,
      },
    },
  ];

  const users: Record<string, User> = {};
  for (const definition of definitions) {
    users[definition.key] = await repo.save(repo.create(definition.payload));
  }
  return users;
}

async function createCategories(ds: DataSource): Promise<Record<string, Category>> {
  const repo = ds.getRepository(Category);
  const electronics = await repo.save(
    repo.create({ name: 'Điện tử', slug: 'dien-tu', description: 'Danh mục điện tử', sortOrder: 1 }),
  );
  const accessories = await repo.save(
    repo.create({ name: 'Phụ kiện', slug: 'phu-kien', description: 'Phụ kiện và tiêu hao', sortOrder: 2 }),
  );
  const foods = await repo.save(
    repo.create({ name: 'Tiêu dùng nhanh', slug: 'tieu-dung-nhanh', description: 'Hàng tiêu dùng nhanh', sortOrder: 3 }),
  );
  const phones = await repo.save(
    repo.create({ name: 'Điện thoại', slug: 'dien-thoai', parentId: electronics.id, sortOrder: 11 }),
  );
  const laptops = await repo.save(
    repo.create({ name: 'Laptop', slug: 'laptop', parentId: electronics.id, sortOrder: 12 }),
  );
  const networking = await repo.save(
    repo.create({ name: 'Thiết bị mạng', slug: 'thiet-bi-mang', parentId: electronics.id, sortOrder: 13 }),
  );
  const beverages = await repo.save(
    repo.create({ name: 'Đồ uống', slug: 'do-uong', parentId: foods.id, sortOrder: 31 }),
  );

  return { electronics, accessories, foods, phones, laptops, networking, beverages };
}

async function createWarehouses(ds: DataSource): Promise<Record<string, Warehouse>> {
  const repo = ds.getRepository(Warehouse);
  const main = await repo.save(repo.create({ name: 'Kho trung tâm', address: 'Quận 7, TP. HCM', isActive: true }));
  const branch = await repo.save(repo.create({ name: 'Kho chi nhánh Hà Nội', address: 'Cầu Giấy, Hà Nội', isActive: true }));
  const transit = await repo.save(repo.create({ name: 'Kho trung chuyển', address: 'Long Biên, Hà Nội', isActive: true }));
  return { main, branch, transit };
}

async function createCustomers(ds: DataSource, users: Record<string, User>): Promise<Record<string, Customer>> {
  const repo = ds.getRepository(Customer);
  const addressRepo = ds.getRepository(CustomerAddress);
  const definitions = [
    {
      key: 'retail',
      code: 'KH-LE-001',
      name: 'Nguyen Minh Retail',
      phone: '0911000001',
      email: 'retail.customer@demo.local',
      customerGroup: CustomerGroup.RETAIL,
      memberTier: MemberTier.NONE,
      loyaltyPoints: 80,
      creditLimit: 20000000,
      currentDebt: 0,
      paymentTermDays: 0,
    },
    {
      key: 'wholesale',
      code: 'KH-SI-001',
      name: 'Cong ty Phan Phoi Minh Phat',
      phone: '0911000002',
      email: 'wholesale.customer@demo.local',
      customerGroup: CustomerGroup.WHOLESALE,
      memberTier: MemberTier.GOLD,
      loyaltyPoints: 1450,
      creditLimit: 100000000,
      currentDebt: 12500000,
      paymentTermDays: 30,
    },
    {
      key: 'agent',
      code: 'KH-DL-001',
      name: 'Dai ly Gia Bao',
      phone: '0911000003',
      email: 'agent.customer@demo.local',
      customerGroup: CustomerGroup.AGENT,
      memberTier: MemberTier.SILVER,
      loyaltyPoints: 640,
      creditLimit: 50000000,
      currentDebt: 3250000,
      paymentTermDays: 15,
    },
    {
      key: 'vip',
      code: 'KH-VIP-001',
      name: 'Pham Gia Linh',
      phone: '0911000004',
      email: 'vip.customer@demo.local',
      customerGroup: CustomerGroup.VIP,
      memberTier: MemberTier.DIAMOND,
      loyaltyPoints: 4200,
      creditLimit: 80000000,
      currentDebt: 0,
      paymentTermDays: 0,
    },
  ] as const;

  const customers: Record<string, Customer> = {};
  for (const definition of definitions) {
    const customer = await repo.save(
      repo.create({
        code: definition.code,
        name: definition.name,
        phone: definition.phone,
        email: definition.email,
        customerGroup: definition.customerGroup,
        creditLimit: definition.creditLimit,
        currentDebt: definition.currentDebt,
        paymentTermDays: definition.paymentTermDays,
        salesRepId: users.staff.id,
        loyaltyPoints: definition.loyaltyPoints,
        memberTier: definition.memberTier,
        notes: `Khách hàng seed nhóm ${definition.customerGroup}`,
        isActive: true,
      }),
    );

    await addressRepo.save(
      addressRepo.create({
        customerId: customer.id,
        label: 'Mặc định',
        street: '45 Le Loi',
        district: definition.key === 'vip' ? 'Quan 1' : 'Quan 3',
        city: 'TP. HCM',
        isDefault: true,
      }),
    );

    customers[definition.key] = customer;
  }

  return customers;
}

async function createSuppliers(ds: DataSource, customers: Record<string, Customer>): Promise<Record<string, Supplier>> {
  const repo = ds.getRepository(Supplier);
  const addressRepo = ds.getRepository(SupplierAddress);
  const bankRepo = ds.getRepository(SupplierBankAccount);
  const definitions: Array<{
    key: string;
    code: string;
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    taxCode: string;
    paymentTermDays: number;
    discountTerms: string;
    currentDebt: number;
    isCustomer: boolean;
    customerId?: string;
  }> = [
    {
      key: 'tech',
      code: 'NCC-TECH-001',
      name: 'Cong ty Thiet Bi TechSource',
      contactPerson: 'Vo Quoc Anh',
      email: 'techsource@demo.local',
      phone: '0922000001',
      taxCode: '0310000001',
      paymentTermDays: 30,
      discountTerms: '2/10 net 30',
      currentDebt: 48500000,
      isCustomer: false,
    },
    {
      key: 'fmcg',
      code: 'NCC-FMCG-001',
      name: 'Cong ty Tieu Dung Minh Tam',
      contactPerson: 'Nguyen Thu Tra',
      email: 'fmcg@demo.local',
      phone: '0922000002',
      taxCode: '0310000002',
      paymentTermDays: 15,
      discountTerms: 'Net 15',
      currentDebt: 5200000,
      isCustomer: true,
      customerId: customers.wholesale.id,
    },
    {
      key: 'logistics',
      code: 'NCC-LOG-001',
      name: 'Logistics North Hub',
      contactPerson: 'Tran Duc Long',
      email: 'logistics@demo.local',
      phone: '0922000003',
      taxCode: '0310000003',
      paymentTermDays: 7,
      discountTerms: 'Thanh toán cuối tuần',
      currentDebt: 1800000,
      isCustomer: false,
    },
  ] as const;

  const suppliers: Record<string, Supplier> = {};
  for (const definition of definitions) {
    const supplier = await repo.save(
      repo.create({
        code: definition.code,
        name: definition.name,
        taxCode: definition.taxCode,
        phone: definition.phone,
        email: definition.email,
        contactPerson: definition.contactPerson,
        paymentTermDays: definition.paymentTermDays,
        discountTerms: definition.discountTerms,
        currentDebt: definition.currentDebt,
        isCustomer: definition.isCustomer,
        customerId: definition.customerId,
        notes: 'Nha cung cap seed cho du lieu kiem thu',
        isActive: true,
      }),
    );

    await addressRepo.save(
      addressRepo.create({
        supplierId: supplier.id,
        street: '88 Pasteur',
        district: 'Quan 3',
        city: 'TP. HCM',
        isDefault: true,
      }),
    );

    await bankRepo.save(
      bankRepo.create({
        supplierId: supplier.id,
        bankName: definition.key === 'tech' ? 'Vietcombank' : 'ACB',
        accountNumber: definition.key === 'tech' ? '0071000123456' : '9704231122334455',
        accountName: definition.name,
        branch: 'Ho Chi Minh',
      }),
    );

    suppliers[definition.key] = supplier;
  }

  return suppliers;
}

async function createProductWithCatalog(
  ds: DataSource,
  payload: {
    sku: string;
    barcode?: string;
    name: string;
    description: string;
    categoryId?: string;
    brand?: string;
    baseUnit: string;
    defaultWarehouseId: string;
    minStockLevel: number;
    maxStockLevel?: number;
    stockQuantity: number;
    costPrice: number;
    trackBatch: boolean;
    trackSerial: boolean;
    units: Array<{ key: string; name: string; conversionRate: number; barcode?: string; isBase: boolean }>;
    prices: Array<{ unitKey?: string; priceType: PriceType; amount: number }>;
  },
): Promise<{ product: Product; units: Record<string, ProductUnit> }> {
  const productRepo = ds.getRepository(Product);
  const unitRepo = ds.getRepository(ProductUnit);
  const priceRepo = ds.getRepository(ProductPrice);

  const product = await productRepo.save(
    productRepo.create({
      sku: payload.sku,
      barcode: payload.barcode,
      name: payload.name,
      description: payload.description,
      categoryId: payload.categoryId,
      brand: payload.brand,
      baseUnit: payload.baseUnit,
      defaultWarehouseId: payload.defaultWarehouseId,
      minStockLevel: payload.minStockLevel,
      maxStockLevel: payload.maxStockLevel,
      stockQuantity: payload.stockQuantity,
      costPrice: payload.costPrice,
      trackBatch: payload.trackBatch,
      trackSerial: payload.trackSerial,
      isActive: true,
    }),
  );

  const units: Record<string, ProductUnit> = {};
  for (const unit of payload.units) {
    units[unit.key] = await unitRepo.save(
      unitRepo.create({
        productId: product.id,
        name: unit.name,
        conversionRate: unit.conversionRate,
        barcode: unit.barcode,
        isBase: unit.isBase,
      }),
    );
  }

  for (const price of payload.prices) {
    await priceRepo.save(
      priceRepo.create({
        productId: product.id,
        unitId: price.unitKey ? units[price.unitKey].id : undefined,
        priceType: price.priceType,
        amount: price.amount,
        currency: 'VND',
      }),
    );
  }

  return { product, units };
}

async function createProducts(
  ds: DataSource,
  categories: Record<string, Category>,
  warehouses: Record<string, Warehouse>,
): Promise<{ products: Record<string, Product>; units: Record<string, ProductUnit> }> {
  const entries = await Promise.all([
    createProductWithCatalog(ds, {
      sku: 'IP15PRO-256-BLK',
      barcode: '893850000001',
      name: 'iPhone 15 Pro 256GB',
      description: 'Dien thoai flagship de test serial va ban le.',
      categoryId: categories.phones.id,
      brand: 'Apple',
      baseUnit: 'Cai',
      defaultWarehouseId: warehouses.main.id,
      minStockLevel: 2,
      maxStockLevel: 20,
      stockQuantity: 3,
      costPrice: 24500000,
      trackBatch: false,
      trackSerial: true,
      units: [{ key: 'piece', name: 'Cai', conversionRate: 1, isBase: true }],
      prices: [
        { unitKey: 'piece', priceType: PriceType.COST, amount: 24500000 },
        { unitKey: 'piece', priceType: PriceType.RETAIL, amount: 28990000 },
        { unitKey: 'piece', priceType: PriceType.VIP, amount: 28490000 },
      ],
    }),
    createProductWithCatalog(ds, {
      sku: 'MBA14-M2-16-512',
      barcode: '893850000002',
      name: 'Laptop AirBook 14 M2',
      description: 'Laptop mau cho nhom laptop.',
      categoryId: categories.laptops.id,
      brand: 'CDSoft Tech',
      baseUnit: 'Cai',
      defaultWarehouseId: warehouses.main.id,
      minStockLevel: 1,
      maxStockLevel: 10,
      stockQuantity: 3,
      costPrice: 18500000,
      trackBatch: false,
      trackSerial: false,
      units: [{ key: 'piece', name: 'Cai', conversionRate: 1, isBase: true }],
      prices: [
        { unitKey: 'piece', priceType: PriceType.COST, amount: 18500000 },
        { unitKey: 'piece', priceType: PriceType.RETAIL, amount: 22990000 },
        { unitKey: 'piece', priceType: PriceType.WHOLESALE, amount: 21990000 },
      ],
    }),
    createProductWithCatalog(ds, {
      sku: 'ROUTER-AX3000',
      barcode: '893850000003',
      name: 'Router WiFi AX3000',
      description: 'Thiet bi mang de test chuyen kho va ton kho.',
      categoryId: categories.networking.id,
      brand: 'NetCore',
      baseUnit: 'Cai',
      defaultWarehouseId: warehouses.main.id,
      minStockLevel: 5,
      maxStockLevel: 50,
      stockQuantity: 18,
      costPrice: 1200000,
      trackBatch: false,
      trackSerial: false,
      units: [
        { key: 'piece', name: 'Cai', conversionRate: 1, isBase: true },
        { key: 'box', name: 'Thung 5 cai', conversionRate: 5, isBase: false },
      ],
      prices: [
        { unitKey: 'piece', priceType: PriceType.COST, amount: 1200000 },
        { unitKey: 'piece', priceType: PriceType.RETAIL, amount: 1490000 },
        { unitKey: 'piece', priceType: PriceType.WHOLESALE, amount: 1390000 },
      ],
    }),
    createProductWithCatalog(ds, {
      sku: 'COFFEE-ARABICA-500',
      barcode: '893850000004',
      name: 'Ca phe Arabica 500g',
      description: 'San pham theo doi batch/expiry de test lo hang.',
      categoryId: categories.foods.id,
      brand: 'Highland Bean',
      baseUnit: 'Goi',
      defaultWarehouseId: warehouses.main.id,
      minStockLevel: 20,
      maxStockLevel: 300,
      stockQuantity: 118,
      costPrice: 92000,
      trackBatch: true,
      trackSerial: false,
      units: [
        { key: 'pack', name: 'Goi', conversionRate: 1, isBase: true },
        { key: 'carton', name: 'Thung 12 goi', conversionRate: 12, isBase: false },
      ],
      prices: [
        { unitKey: 'pack', priceType: PriceType.COST, amount: 92000 },
        { unitKey: 'pack', priceType: PriceType.RETAIL, amount: 135000 },
        { unitKey: 'pack', priceType: PriceType.WHOLESALE, amount: 118000 },
        { unitKey: 'pack', priceType: PriceType.AGENT, amount: 110000 },
      ],
    }),
    createProductWithCatalog(ds, {
      sku: 'WATER-19L',
      barcode: '893850000005',
      name: 'Nuoc tinh khiet binh 19L',
      description: 'San pham ban nhanh de test don giao va hoan tra.',
      categoryId: categories.beverages.id,
      brand: 'Blue Water',
      baseUnit: 'Binh',
      defaultWarehouseId: warehouses.main.id,
      minStockLevel: 15,
      maxStockLevel: 200,
      stockQuantity: 63,
      costPrice: 24000,
      trackBatch: false,
      trackSerial: false,
      units: [{ key: 'bottle', name: 'Binh', conversionRate: 1, isBase: true }],
      prices: [
        { unitKey: 'bottle', priceType: PriceType.COST, amount: 24000 },
        { unitKey: 'bottle', priceType: PriceType.RETAIL, amount: 42000 },
        { unitKey: 'bottle', priceType: PriceType.AGENT, amount: 36000 },
      ],
    }),
    createProductWithCatalog(ds, {
      sku: 'KEYBOARD-MECH-RGB',
      barcode: '893850000006',
      name: 'Ban phim co RGB',
      description: 'Phu kien de test khuyen mai bundle.',
      categoryId: categories.accessories.id,
      brand: 'TypeFast',
      baseUnit: 'Cai',
      defaultWarehouseId: warehouses.main.id,
      minStockLevel: 5,
      maxStockLevel: 80,
      stockQuantity: 21,
      costPrice: 650000,
      trackBatch: false,
      trackSerial: false,
      units: [{ key: 'piece', name: 'Cai', conversionRate: 1, isBase: true }],
      prices: [
        { unitKey: 'piece', priceType: PriceType.COST, amount: 650000 },
        { unitKey: 'piece', priceType: PriceType.RETAIL, amount: 890000 },
        { unitKey: 'piece', priceType: PriceType.VIP, amount: 820000 },
      ],
    }),
  ]);

  const products: Record<string, Product> = {};
  const units: Record<string, ProductUnit> = {};
  for (const entry of entries) {
    products[entry.product.sku] = entry.product;
    for (const [key, unit] of Object.entries(entry.units)) {
      units[`${entry.product.sku}:${key}`] = unit;
    }
  }

  return { products, units };
}

async function createCommercialMasterData(ds: DataSource): Promise<{
  bankAccount: BankAccount;
  cashFund: CashFund;
  promotion: Promotion;
  voucher: Voucher;
}> {
  const bankRepo = ds.getRepository(BankAccount);
  const cashRepo = ds.getRepository(CashFund);
  const promotionRepo = ds.getRepository(Promotion);
  const voucherRepo = ds.getRepository(Voucher);

  const bankAccount = await bankRepo.save(
    bankRepo.create({
      bankName: 'Vietcombank',
      accountNumber: '0071000009999',
      accountName: 'CDSoft Demo Seed',
      balance: 250000000,
      currency: 'VND',
      isActive: true,
    }),
  );

  const cashFund = await cashRepo.save(
    cashRepo.create({
      name: 'Quy tien mat showroom',
      balance: 35000000,
      currency: 'VND',
      isActive: true,
    }),
  );

  const promotion = await promotionRepo.save(
    promotionRepo.create({
      name: 'Giam 10% phu kien cuoi tuan',
      type: PromotionType.ORDER_DISCOUNT,
      condition: { minOrderAmount: 1000000, categorySlugs: ['phu-kien'] },
      discount: { percent: 10, maxAmount: 200000 },
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      priority: 10,
      stackable: true,
      usedCount: 12,
      notes: 'Promotion seed cho module khuyen mai',
      isActive: true,
    }),
  );

  const voucher = await voucherRepo.save(
    voucherRepo.create({
      code: 'WELCOME50',
      name: 'Voucher chao mung khach moi',
      type: VoucherType.FIXED,
      value: 50000,
      maxDiscount: 50000,
      minOrderAmount: 500000,
      usageLimit: 500,
      usedCount: 23,
      perCustomerLimit: 1,
      customerGroup: 'RETAIL',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      isActive: true,
    }),
  );

  return { bankAccount, cashFund, promotion, voucher };
}

async function seedOperationalData(
  ds: DataSource,
  users: Record<string, User>,
  categories: Record<string, Category>,
  customers: Record<string, Customer>,
  suppliers: Record<string, Supplier>,
  warehouses: Record<string, Warehouse>,
  products: Record<string, Product>,
  units: Record<string, ProductUnit>,
  bankAccount: BankAccount,
  cashFund: CashFund,
  voucher: Voucher,
): Promise<{ salesOrderCode: string; invoiceCode: string }> {
  const balanceRepo = ds.getRepository(InventoryBalance);
  const txRepo = ds.getRepository(InventoryTransaction);
  const lotRepo = ds.getRepository(InventoryLot);
  const receiptRepo = ds.getRepository(StockReceipt);
  const receiptItemRepo = ds.getRepository(StockReceiptItem);
  const transferRepo = ds.getRepository(StockTransfer);
  const transferItemRepo = ds.getRepository(StockTransferItem);
  const issueRepo = ds.getRepository(StockIssue);
  const issueItemRepo = ds.getRepository(StockIssueItem);
  const stocktakingRepo = ds.getRepository(StocktakingSession);
  const stocktakingItemRepo = ds.getRepository(StocktakingItem);
  const orderRepo = ds.getRepository(Order);
  const orderItemRepo = ds.getRepository(OrderItem);
  const returnRepo = ds.getRepository(ReturnOrder);
  const returnItemRepo = ds.getRepository(ReturnOrderItem);
  const invoiceRepo = ds.getRepository(Invoice);
  const invoiceItemRepo = ds.getRepository(InvoiceItem);
  const paymentRepo = ds.getRepository(Payment);
  const purchaseInvoiceRepo = ds.getRepository(PurchaseInvoice);
  const purchaseInvoiceItemRepo = ds.getRepository(PurchaseInvoiceItem);
  const apRepo = ds.getRepository(AccountsPayable);
  const cashReceiptRepo = ds.getRepository(CashReceipt);
  const disbursementRepo = ds.getRepository(Disbursement);
  const loyaltyConfigRepo = ds.getRepository(LoyaltyConfig);
  const loyaltyTxRepo = ds.getRepository(LoyaltyTransaction);
  const tierChangeRepo = ds.getRepository(TierChangeLog);
  const commissionRepo = ds.getRepository(CommissionConfigEntity);
  const serialRepo = ds.getRepository(SerialNumber);
  const auditRepo = ds.getRepository(AuditLog);

  await balanceRepo.save([
    balanceRepo.create({
      productId: products['IP15PRO-256-BLK'].id,
      warehouseId: warehouses.main.id,
      quantity: 3,
      reservedQty: 0,
      avgCost: 24500000,
    }),
    balanceRepo.create({
      productId: products['MBA14-M2-16-512'].id,
      warehouseId: warehouses.main.id,
      quantity: 3,
      reservedQty: 0,
      avgCost: 18500000,
    }),
    balanceRepo.create({
      productId: products['ROUTER-AX3000'].id,
      warehouseId: warehouses.main.id,
      quantity: 12,
      reservedQty: 2,
      avgCost: 1200000,
    }),
    balanceRepo.create({
      productId: products['ROUTER-AX3000'].id,
      warehouseId: warehouses.branch.id,
      quantity: 6,
      reservedQty: 1,
      avgCost: 1200000,
    }),
    balanceRepo.create({
      productId: products['COFFEE-ARABICA-500'].id,
      warehouseId: warehouses.main.id,
      quantity: 118,
      reservedQty: 10,
      avgCost: 92000,
    }),
    balanceRepo.create({
      productId: products['WATER-19L'].id,
      warehouseId: warehouses.main.id,
      quantity: 63,
      reservedQty: 3,
      avgCost: 24000,
    }),
    balanceRepo.create({
      productId: products['KEYBOARD-MECH-RGB'].id,
      warehouseId: warehouses.main.id,
      quantity: 21,
      reservedQty: 2,
      avgCost: 650000,
    }),
  ]);

  const stockReceipt = await receiptRepo.save(
    receiptRepo.create({
      supplierId: suppliers.tech.id,
      warehouseId: warehouses.main.id,
      refCode: 'PO-SEED-001',
      status: ReceiptStatus.CONFIRMED,
      expectedDate: '2026-05-10',
      confirmedAt: new Date('2026-05-10T09:00:00Z'),
      confirmedBy: users.warehouse.id,
      notes: 'Phieu nhap seed cho toan bo phan he kho',
      totalAmount: 123340000,
    }),
  );

  const stockReceiptItems = {
    iphone: await receiptItemRepo.save(
      receiptItemRepo.create({
        receiptId: stockReceipt.id,
        productId: products['IP15PRO-256-BLK'].id,
        unitId: units['IP15PRO-256-BLK:piece'].id,
        quantity: 4,
        qtyInBase: 4,
        unitCost: 24500000,
      }),
    ),
    coffee: await receiptItemRepo.save(
      receiptItemRepo.create({
        receiptId: stockReceipt.id,
        productId: products['COFFEE-ARABICA-500'].id,
        unitId: units['COFFEE-ARABICA-500:pack'].id,
        quantity: 120,
        qtyInBase: 120,
        unitCost: 92000,
        batchNumber: 'BATCH-ARABICA-0526',
        expiryDate: '2026-12-31',
      }),
    ),
    keyboard: await receiptItemRepo.save(
      receiptItemRepo.create({
        receiptId: stockReceipt.id,
        productId: products['KEYBOARD-MECH-RGB'].id,
        unitId: units['KEYBOARD-MECH-RGB:piece'].id,
        quantity: 22,
        qtyInBase: 22,
        unitCost: 650000,
      }),
    ),
  };

  await lotRepo.save(
    lotRepo.create({
      productId: products['COFFEE-ARABICA-500'].id,
      warehouseId: warehouses.main.id,
      receiptItemId: stockReceiptItems.coffee.id,
      batchNumber: 'BATCH-ARABICA-0526',
      expiryDate: '2026-12-31',
      costPerUnit: 92000,
      initialQty: 120,
      remainingQty: 118,
      receivedAt: new Date('2026-05-10T09:00:00Z'),
    }),
  );

  const stockTransfer = await transferRepo.save(
    transferRepo.create({
      fromWarehouseId: warehouses.main.id,
      toWarehouseId: warehouses.branch.id,
      status: TransferStatus.RECEIVED,
      expectedDate: '2026-05-09',
      dispatchedAt: new Date('2026-05-09T01:00:00Z'),
      receivedAt: new Date('2026-05-09T07:00:00Z'),
      notes: 'Chuyen router tu kho trung tam ra chi nhanh',
      createdBy: users.warehouse.id,
    }),
  );

  await transferItemRepo.save(
    transferItemRepo.create({
      transferId: stockTransfer.id,
      productId: products['ROUTER-AX3000'].id,
      unitId: units['ROUTER-AX3000:piece'].id,
      quantity: 6,
      receivedQty: 6,
    }),
  );

  const salesOrder = await orderRepo.save(
    orderRepo.create({
      code: 'SO-SEED-001',
      type: OrderType.SALES,
      customerId: customers.vip.id,
      warehouseId: warehouses.main.id,
      salesRepId: users.staff.id,
      status: OrderStatus.DELIVERED,
      paymentMethod: OrderPaymentMethod.BANK_TRANSFER,
      subtotal: 29884000,
      discountTotal: 139400,
      voucherDiscount: 50000,
      totalAmount: 29694600,
      paidAmount: 29694600,
      voucherId: voucher.id,
      shippingAddress: '128 Nguyen Huu Canh, Binh Thanh, TP. HCM',
      notes: 'Don ban seed da giao va thanh toan',
      confirmedAt: new Date('2026-05-11T03:00:00Z'),
      confirmedBy: users.manager.id,
    }),
  );

  const salesOrderItems = {
    iphone: await orderItemRepo.save(
      orderItemRepo.create({
        orderId: salesOrder.id,
        productId: products['IP15PRO-256-BLK'].id,
        unitId: units['IP15PRO-256-BLK:piece'].id,
        quantity: 1,
        qtyInBase: 1,
        unitPrice: 28490000,
        discountPercent: 0,
        discountAmount: 0,
        lineTotal: 28490000,
        costPrice: 24500000,
        issuedQty: 1,
      }),
    ),
    water: await orderItemRepo.save(
      orderItemRepo.create({
        orderId: salesOrder.id,
        productId: products['WATER-19L'].id,
        unitId: units['WATER-19L:bottle'].id,
        quantity: 12,
        qtyInBase: 12,
        unitPrice: 42000,
        discountPercent: 10,
        discountAmount: 50400,
        lineTotal: 453600,
        costPrice: 24000,
        issuedQty: 12,
      }),
    ),
    keyboard: await orderItemRepo.save(
      orderItemRepo.create({
        orderId: salesOrder.id,
        productId: products['KEYBOARD-MECH-RGB'].id,
        unitId: units['KEYBOARD-MECH-RGB:piece'].id,
        quantity: 1,
        qtyInBase: 1,
        unitPrice: 890000,
        discountPercent: 10,
        discountAmount: 89000,
        lineTotal: 801000,
        costPrice: 650000,
        issuedQty: 1,
      }),
    ),
  };

  const stockIssue = await issueRepo.save(
    issueRepo.create({
      warehouseId: warehouses.main.id,
      issueType: IssueType.SALE,
      status: IssueStatus.CONFIRMED,
      orderId: salesOrder.id,
      notes: 'Xuat kho cho don ban seed',
      confirmedAt: new Date('2026-05-11T03:15:00Z'),
      confirmedBy: users.warehouse.id,
      createdBy: users.staff.id,
    }),
  );

  await issueItemRepo.save([
    issueItemRepo.create({
      issueId: stockIssue.id,
      productId: products['IP15PRO-256-BLK'].id,
      unitId: units['IP15PRO-256-BLK:piece'].id,
      quantity: 1,
      qtyInBase: 1,
      unitCost: 24500000,
    }),
    issueItemRepo.create({
      issueId: stockIssue.id,
      productId: products['WATER-19L'].id,
      unitId: units['WATER-19L:bottle'].id,
      quantity: 12,
      qtyInBase: 12,
      unitCost: 24000,
    }),
    issueItemRepo.create({
      issueId: stockIssue.id,
      productId: products['KEYBOARD-MECH-RGB'].id,
      unitId: units['KEYBOARD-MECH-RGB:piece'].id,
      quantity: 1,
      qtyInBase: 1,
      unitCost: 650000,
    }),
  ]);

  const stocktakingSession = await stocktakingRepo.save(
    stocktakingRepo.create({
      warehouseId: warehouses.main.id,
      status: StocktakingStatus.COMPLETED,
      notes: 'Phien kiem ke seed kho trung tam',
      createdBy: users.warehouse.id,
      completedAt: new Date('2026-05-12T10:00:00Z'),
    }),
  );

  await stocktakingItemRepo.save([
    stocktakingItemRepo.create({
      sessionId: stocktakingSession.id,
      productId: products['COFFEE-ARABICA-500'].id,
      systemQty: 120,
      actualQty: 118,
      adjustQty: -2,
    }),
    stocktakingItemRepo.create({
      sessionId: stocktakingSession.id,
      productId: products['KEYBOARD-MECH-RGB'].id,
      systemQty: 21,
      actualQty: 21,
      adjustQty: 0,
    }),
  ]);

  const returnOrder = await returnRepo.save(
    returnRepo.create({
      code: 'RO-SEED-001',
      originalOrderId: salesOrder.id,
      customerId: customers.vip.id,
      reason: 'Khach doi tra 2 binh nuoc bi mop',
      refundMethod: RefundMethod.CREDIT,
      refundAmount: 84000,
      status: 'COMPLETED',
      createdBy: users.staff.id,
    }),
  );

  await returnItemRepo.save(
    returnItemRepo.create({
      returnOrderId: returnOrder.id,
      orderItemId: salesOrderItems.water.id,
      productId: products['WATER-19L'].id,
      unitId: units['WATER-19L:bottle'].id,
      returnQty: 2,
      unitPrice: 42000,
      lineTotal: 84000,
    }),
  );

  const invoice = await invoiceRepo.save(
    invoiceRepo.create({
      code: 'INV-SEED-001',
      orderId: salesOrder.id,
      customerId: customers.vip.id,
      status: InvoiceStatus.PAID,
      subtotal: 29884000,
      discountTotal: 189400,
      totalAmount: 29694600,
      paidAmount: 29694600,
      dueDate: '2026-05-18',
      issuedAt: new Date('2026-05-11T03:30:00Z'),
    }),
  );

  await invoiceItemRepo.save([
    invoiceItemRepo.create({
      invoiceId: invoice.id,
      productName: products['IP15PRO-256-BLK'].name,
      unit: 'Cai',
      quantity: 1,
      unitPrice: 28490000,
      discountPercent: 0,
      lineTotal: 28490000,
    }),
    invoiceItemRepo.create({
      invoiceId: invoice.id,
      productName: products['WATER-19L'].name,
      unit: 'Binh',
      quantity: 12,
      unitPrice: 42000,
      discountPercent: 10,
      lineTotal: 453600,
    }),
    invoiceItemRepo.create({
      invoiceId: invoice.id,
      productName: products['KEYBOARD-MECH-RGB'].name,
      unit: 'Cai',
      quantity: 1,
      unitPrice: 890000,
      discountPercent: 10,
      lineTotal: 801000,
    }),
  ]);

  const payment = await paymentRepo.save(
    paymentRepo.create({
      invoiceId: invoice.id,
      customerId: customers.vip.id,
      amount: 29694600,
      method: InvoicePaymentMethod.BANK_TRANSFER,
      bankAccountId: bankAccount.id,
      transactionRef: 'SEED-PAY-29694600',
      paidAt: new Date('2026-05-11T04:00:00Z'),
      notes: 'Khach thanh toan du invoice seed',
      createdBy: users.accountant.id,
    }),
  );

  const purchaseInvoice = await purchaseInvoiceRepo.save(
    purchaseInvoiceRepo.create({
      code: 'PINV-SEED-001',
      stockReceiptId: stockReceipt.id,
      supplierId: suppliers.tech.id,
      status: PurchaseInvoiceStatus.PARTIALLY_PAID,
      subtotal: 123340000,
      discountTotal: 0,
      totalAmount: 123340000,
      paidAmount: 45000000,
      dueDate: '2026-06-09',
      issuedAt: new Date('2026-05-10T09:30:00Z'),
      notes: 'Hoa don mua hang seed cho phieu nhap kho',
    }),
  );

  await purchaseInvoiceItemRepo.save([
    purchaseInvoiceItemRepo.create({
      purchaseInvoiceId: purchaseInvoice.id,
      productId: products['IP15PRO-256-BLK'].id,
      productName: products['IP15PRO-256-BLK'].name,
      unit: 'Cai',
      quantity: 4,
      unitPrice: 24500000,
      discountPercent: 0,
      lineTotal: 98000000,
    }),
    purchaseInvoiceItemRepo.create({
      purchaseInvoiceId: purchaseInvoice.id,
      productId: products['COFFEE-ARABICA-500'].id,
      productName: products['COFFEE-ARABICA-500'].name,
      unit: 'Goi',
      quantity: 120,
      unitPrice: 92000,
      discountPercent: 0,
      lineTotal: 11040000,
    }),
    purchaseInvoiceItemRepo.create({
      purchaseInvoiceId: purchaseInvoice.id,
      productId: products['KEYBOARD-MECH-RGB'].id,
      productName: products['KEYBOARD-MECH-RGB'].name,
      unit: 'Cai',
      quantity: 22,
      unitPrice: 650000,
      discountPercent: 0,
      lineTotal: 14300000,
    }),
  ]);

  const accountsPayable = await apRepo.save(
    apRepo.create({
      supplierId: suppliers.tech.id,
      purchaseInvoiceId: purchaseInvoice.id,
      stockReceiptId: stockReceipt.id,
      amount: 123340000,
      paidAmount: 45000000,
      dueDate: '2026-06-09',
      status: ApStatus.PARTIALLY_PAID,
      invoiceRef: purchaseInvoice.code,
      notes: 'Cong no phai tra seed cho phieu nhap',
    }),
  );

  await cashReceiptRepo.save([
    cashReceiptRepo.create({
      kind: CashReceiptKind.RECEIPT,
      receiptType: 'CUSTOMER_PAYMENT',
      refId: payment.id,
      refType: 'payment',
      amount: payment.amount,
      method: 'BANK_TRANSFER',
      bankAccountId: bankAccount.id,
      customerId: customers.vip.id,
      description: 'Thu tien khach hang cho invoice seed',
      status: CashReceiptStatus.APPROVED,
      createdBy: users.accountant.id,
    }),
    cashReceiptRepo.create({
      kind: CashReceiptKind.DISBURSEMENT,
      receiptType: 'SUPPLIER_PAYMENT',
      refId: accountsPayable.id,
      refType: 'accounts_payable',
      amount: 45000000,
      method: 'BANK_TRANSFER',
      bankAccountId: bankAccount.id,
      supplierId: suppliers.tech.id,
      description: 'Chi tra mot phan cong no NCC seed',
      status: CashReceiptStatus.APPROVED,
      createdBy: users.accountant.id,
    }),
    cashReceiptRepo.create({
      kind: CashReceiptKind.DISBURSEMENT,
      receiptType: 'OTHER',
      amount: 1200000,
      method: 'CASH',
      cashFundId: cashFund.id,
      description: 'Chi phi van chuyen seed',
      status: CashReceiptStatus.APPROVED,
      createdBy: users.accountant.id,
    }),
  ]);

  await disbursementRepo.save([
    disbursementRepo.create({
      disbursementType: 'SUPPLIER_PAYMENT',
      supplierId: suppliers.tech.id,
      apRecordId: accountsPayable.id,
      bankAccountId: bankAccount.id,
      amount: 45000000,
      description: 'Giai ngan cho cong no NCC seed',
      status: 'APPROVED',
      createdBy: users.accountant.id,
      approvedBy: users.manager.id,
    }),
    disbursementRepo.create({
      disbursementType: 'OVERHEAD',
      cashFundId: cashFund.id,
      amount: 1200000,
      description: 'Chi phi logistic seed',
      status: 'APPROVED',
      createdBy: users.accountant.id,
      approvedBy: users.manager.id,
    }),
  ]);

  await loyaltyConfigRepo.save(
    loyaltyConfigRepo.create({
      isEnabled: true,
      pointsPerAmount: 10000,
      amountPerPoint: 1000,
      currencyUnit: 'VND',
      tierEvaluationPeriodDays: 365,
      pointExpiryDays: 730,
      allowTierDowngrade: true,
      tiers: [
        { name: 'SILVER', label: 'Bac', minPoints: 500, discountPercent: 3 },
        { name: 'GOLD', label: 'Vang', minPoints: 1200, discountPercent: 5 },
        { name: 'DIAMOND', label: 'Kim cuong', minPoints: 3000, discountPercent: 8 },
      ],
    }),
  );

  await loyaltyTxRepo.save([
    loyaltyTxRepo.create({
      customerId: customers.vip.id,
      type: LoyaltyTxType.EARN,
      points: 2800,
      refId: invoice.id,
      refType: 'invoice',
      description: 'Tich diem tu don mua seed',
      createdBy: users.staff.id,
    }),
    loyaltyTxRepo.create({
      customerId: customers.vip.id,
      type: LoyaltyTxType.REDEEM,
      points: -50,
      refId: salesOrder.id,
      refType: 'order',
      description: 'Dung diem cho don mua seed',
      createdBy: users.staff.id,
    }),
    loyaltyTxRepo.create({
      customerId: customers.agent.id,
      type: LoyaltyTxType.ADJUST,
      points: 120,
      description: 'Dieu chinh seed cho dai ly',
      createdBy: users.manager.id,
    }),
  ]);

  await tierChangeRepo.save(
    tierChangeRepo.create({
      customerId: customers.vip.id,
      oldTier: MemberTier.GOLD,
      newTier: MemberTier.DIAMOND,
      reason: 'Doanh so 12 thang dat nguong Diamond',
    }),
  );

  await commissionRepo.save(
    commissionRepo.create({
      type: 'REVENUE_PERCENT',
      rules: [
        { minRevenue: 10000000, rate: 1 },
        { minRevenue: 50000000, rate: 1.5 },
        { minRevenue: 100000000, rate: 2 },
      ],
    }),
  );

  await serialRepo.save([
    serialRepo.create({
      productId: products['IP15PRO-256-BLK'].id,
      serialNumber: 'IP15P-SEED-0001',
      imei: '358240051111111',
      receiptItemId: stockReceiptItems.iphone.id,
      orderItemId: salesOrderItems.iphone.id,
      customerId: customers.vip.id,
      status: 'SOLD',
      warrantyExpiry: '2027-05-11',
      purchasedAt: '2026-05-11',
    }),
    serialRepo.create({
      productId: products['IP15PRO-256-BLK'].id,
      serialNumber: 'IP15P-SEED-0002',
      imei: '358240052222222',
      receiptItemId: stockReceiptItems.iphone.id,
      status: 'IN_STOCK',
    }),
    serialRepo.create({
      productId: products['IP15PRO-256-BLK'].id,
      serialNumber: 'IP15P-SEED-0003',
      imei: '358240053333333',
      receiptItemId: stockReceiptItems.iphone.id,
      status: 'IN_STOCK',
    }),
    serialRepo.create({
      productId: products['IP15PRO-256-BLK'].id,
      serialNumber: 'IP15P-SEED-0004',
      imei: '358240054444444',
      receiptItemId: stockReceiptItems.iphone.id,
      status: 'DEFECTIVE',
    }),
  ]);

  await txRepo.save([
    txRepo.create({
      productId: products['COFFEE-ARABICA-500'].id,
      warehouseId: warehouses.main.id,
      transactionType: TxType.STOCK_IN,
      quantity: 120,
      unitCost: 92000,
      refId: stockReceipt.id,
      refType: 'stock_receipt',
      notes: 'Nhap kho seed ca phe',
      createdBy: users.warehouse.id,
    }),
    txRepo.create({
      productId: products['ROUTER-AX3000'].id,
      warehouseId: warehouses.main.id,
      transactionType: TxType.TRANSFER_OUT,
      quantity: 6,
      unitCost: 1200000,
      refId: stockTransfer.id,
      refType: 'stock_transfer',
      notes: 'Chuyen ra kho chi nhanh',
      createdBy: users.warehouse.id,
    }),
    txRepo.create({
      productId: products['ROUTER-AX3000'].id,
      warehouseId: warehouses.branch.id,
      transactionType: TxType.TRANSFER_IN,
      quantity: 6,
      unitCost: 1200000,
      refId: stockTransfer.id,
      refType: 'stock_transfer',
      notes: 'Nhan hang tu kho trung tam',
      createdBy: users.warehouse.id,
    }),
    txRepo.create({
      productId: products['IP15PRO-256-BLK'].id,
      warehouseId: warehouses.main.id,
      transactionType: TxType.STOCK_OUT,
      quantity: 1,
      unitCost: 24500000,
      refId: stockIssue.id,
      refType: 'stock_issue',
      notes: 'Xuat ban iPhone seed',
      createdBy: users.warehouse.id,
    }),
    txRepo.create({
      productId: products['WATER-19L'].id,
      warehouseId: warehouses.main.id,
      transactionType: TxType.STOCK_OUT,
      quantity: 12,
      unitCost: 24000,
      refId: stockIssue.id,
      refType: 'stock_issue',
      notes: 'Xuat ban nuoc seed',
      createdBy: users.warehouse.id,
    }),
    txRepo.create({
      productId: products['COFFEE-ARABICA-500'].id,
      warehouseId: warehouses.main.id,
      transactionType: TxType.ADJUSTMENT_OUT,
      quantity: 2,
      unitCost: 92000,
      refId: stocktakingSession.id,
      refType: 'stocktaking',
      notes: 'Dieu chinh chenh lech kiem ke',
      createdBy: users.warehouse.id,
    }),
  ]);

  await auditRepo.save([
    auditRepo.create({
      userId: users.staff.id,
      userName: users.staff.fullName,
      userRole: users.staff.role,
      action: 'POST /tenant/orders',
      resource: 'orders',
      resourceId: salesOrder.id,
      afterData: { code: salesOrder.code, status: salesOrder.status },
      ipAddress: '127.0.0.1',
    }),
    auditRepo.create({
      userId: users.accountant.id,
      userName: users.accountant.fullName,
      userRole: users.accountant.role,
      action: 'POST /tenant/payments',
      resource: 'payments',
      resourceId: payment.id,
      afterData: { amount: payment.amount, method: payment.method },
      ipAddress: '127.0.0.1',
    }),
    auditRepo.create({
      userId: users.warehouse.id,
      userName: users.warehouse.fullName,
      userRole: users.warehouse.role,
      action: 'POST /tenant/inventory/stocktaking/complete',
      resource: 'stocktaking_sessions',
      resourceId: stocktakingSession.id,
      beforeData: { status: StocktakingStatus.IN_PROGRESS },
      afterData: { status: StocktakingStatus.COMPLETED },
      ipAddress: '127.0.0.1',
    }),
  ]);

  return { salesOrderCode: salesOrder.code, invoiceCode: invoice.code };
}

async function seedTenantData(ds: DataSource, config: SeedRuntimeConfig): Promise<TenantSeedSummary> {
  await ensureTenantRbacSeeded(ds);
  const users = await createTenantUsers(ds, config);
  const categories = await createCategories(ds);
  const warehouses = await createWarehouses(ds);
  const customers = await createCustomers(ds, users);
  const suppliers = await createSuppliers(ds, customers);
  const { products, units } = await createProducts(ds, categories, warehouses);
  const { bankAccount, cashFund, voucher } = await createCommercialMasterData(ds);
  const { salesOrderCode, invoiceCode } = await seedOperationalData(
    ds,
    users,
    categories,
    customers,
    suppliers,
    warehouses,
    products,
    units,
    bankAccount,
    cashFund,
    voucher,
  );

  return {
    salesOrderCode,
    invoiceCode,
    counts: {
      users: Object.keys(users).length,
      categories: Object.keys(categories).length,
      products: Object.keys(products).length,
      customers: Object.keys(customers).length,
      suppliers: Object.keys(suppliers).length,
      warehouses: Object.keys(warehouses).length,
    },
  };
}

async function main() {
  const config = getSeedConfig();

  try {
    await AppDataSource.initialize();
    await AppDataSource.runMigrations();

    const platformContext = await seedPlatformData(AppDataSource, config);
    await recreateTenantDatabase(AppDataSource, config);

    const tenantDs = await initializeTenantDataSource(config);
    try {
      const summary = await seedTenantData(tenantDs, config);
      console.log(`Seeded tenant "${config.tenantCode}" successfully.`);
      console.log(`- Users: ${summary.counts.users}`);
      console.log(`- Categories: ${summary.counts.categories}`);
      console.log(`- Products: ${summary.counts.products}`);
      console.log(`- Customers: ${summary.counts.customers}`);
      console.log(`- Suppliers: ${summary.counts.suppliers}`);
      console.log(`- Warehouses: ${summary.counts.warehouses}`);
      console.log(`- Sales order: ${summary.salesOrderCode}`);
      console.log(`- Invoice: ${summary.invoiceCode}`);
    } finally {
      await tenantDs.destroy();
    }

    console.log('Platform seed completed:');
    console.log(`- Tenant code: ${platformContext.tenant.tenantCode}`);
    console.log(`- Tenant DB: ${platformContext.tenant.dbName}`);
    console.log(`- Platform operator: ${platformContext.platformOperator.username}`);
    console.log('Default credentials:');
    console.log(`- Platform operator: ${config.platformOperatorEmail} / ${config.platformOperatorPassword}`);
    console.log(`- Tenant users: admin|manager|accountant|warehouse|staff@${config.tenantCode}.local / ${config.password}`);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

main().catch((error) => {
  console.error('Failed to seed test data', error);
  process.exit(1);
});

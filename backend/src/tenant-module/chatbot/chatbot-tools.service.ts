import { Injectable, Logger } from '@nestjs/common';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { OpenAiService } from './openai.service';
import { OpenSearchService } from './opensearch.service';
import { ChatbotMasterDataReadService } from './chatbot-master-data-read.service';
import { ChatbotOrdersReadService } from './chatbot-orders-read.service';
import { ChatbotInventoryReadService } from './chatbot-inventory-read.service';
import { ChatbotFinanceReadService } from './chatbot-finance-read.service';
import { ChatbotReportsReadService } from './chatbot-reports-read.service';
import { ChatbotLoyaltyReadService } from './chatbot-loyalty-read.service';
import {
  ChatbotAccessService,
  type ChatbotAccessContext,
} from './chatbot-access.service';

export type ToolName =
  | 'getProducts'
  | 'getCustomers'
  | 'getSuppliers'
  | 'getInvoices'
  | 'getPurchaseInvoices'
  | 'getStock'
  | 'calculateCustomerDebt'
  | 'calculateSupplierDebt'
  | 'getSalesOrders'
  | 'getPurchaseOrders'
  | 'getReturnOrders'
  | 'getInventoryTransactions'
  | 'getInventoryLots'
  | 'getExpiryAlerts'
  | 'getStockReceipts'
  | 'getStockIssues'
  | 'getStockTransfers'
  | 'getStocktakingSessions'
  | 'getCashFunds'
  | 'getBankAccounts'
  | 'getCashReceipts'
  | 'getDisbursements'
  | 'getArAging'
  | 'getApSchedule'
  | 'getCustomerPaymentHistory'
  | 'getDashboardStats'
  | 'getSalesReport'
  | 'getProfitByProduct'
  | 'getCashflowReport'
  | 'getKpiReport'
  | 'getDebtByCustomer'
  | 'getDebtBySupplier'
  | 'getSalesByProduct'
  | 'getSalesByCustomer'
  | 'getPurchaseBySupplier'
  | 'getDeadstockReport'
  | 'getAbcAnalysis'
  | 'getCustomerLoyalty'
  | 'getLoyaltyTransactions'
  | 'getLoyaltyConfig'
  | 'ragSearch';

const ALL_TOOL_NAMES: ToolName[] = [
  'getProducts',
  'getCustomers',
  'getSuppliers',
  'getInvoices',
  'getPurchaseInvoices',
  'getStock',
  'calculateCustomerDebt',
  'calculateSupplierDebt',
  'getSalesOrders',
  'getPurchaseOrders',
  'getReturnOrders',
  'getInventoryTransactions',
  'getInventoryLots',
  'getExpiryAlerts',
  'getStockReceipts',
  'getStockIssues',
  'getStockTransfers',
  'getStocktakingSessions',
  'getCashFunds',
  'getBankAccounts',
  'getCashReceipts',
  'getDisbursements',
  'getArAging',
  'getApSchedule',
  'getCustomerPaymentHistory',
  'getDashboardStats',
  'getSalesReport',
  'getProfitByProduct',
  'getCashflowReport',
  'getKpiReport',
  'getDebtByCustomer',
  'getDebtBySupplier',
  'getSalesByProduct',
  'getSalesByCustomer',
  'getPurchaseBySupplier',
  'getDeadstockReport',
  'getAbcAnalysis',
  'getCustomerLoyalty',
  'getLoyaltyTransactions',
  'getLoyaltyConfig',
  'ragSearch',
];

@Injectable()
export class ChatbotToolsService {
  private readonly logger = new Logger(ChatbotToolsService.name);

  constructor(
    private readonly tenantCtx: TenantContextService,
    private readonly openai: OpenAiService,
    private readonly opensearch: OpenSearchService,
    private readonly masterDataRead: ChatbotMasterDataReadService,
    private readonly ordersRead: ChatbotOrdersReadService,
    private readonly inventoryRead: ChatbotInventoryReadService,
    private readonly financeRead: ChatbotFinanceReadService,
    private readonly reportsRead: ChatbotReportsReadService,
    private readonly loyaltyRead: ChatbotLoyaltyReadService,
    private readonly accessService: ChatbotAccessService,
  ) {}

  private buildTool(
    name: ToolName,
    description: string,
    properties: Record<string, any>,
    required: string[] = [],
  ): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name,
        description,
        parameters: {
          type: 'object',
          properties,
          ...(required.length ? { required } : {}),
        },
      },
    };
  }

  private buildAllToolSchemas(): ChatCompletionTool[] {
    return [
      this.buildTool(
        'getProducts',
        'Tim kiem san pham theo SKU, ten hoac barcode. Tra ve gia ban, gia von va ton kho hien tai.',
        {
          query: { type: 'string', description: 'Tu khoa SKU, ten hoac barcode.' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
          onlyActive: {
            type: 'boolean',
            default: true,
            description: 'Chi lay san pham dang kinh doanh.',
          },
        },
      ),
      this.buildTool(
        'getCustomers',
        'Tra cuu khach hang theo ma, ten, dien thoai hoac email. Tra ve cong no, diem loyalty va hang thanh vien.',
        {
          query: { type: 'string', description: 'Tu khoa tim kiem khach hang.' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
        },
      ),
      this.buildTool(
        'getSuppliers',
        'Tra cuu nha cung cap theo ma hoac ten.',
        {
          query: { type: 'string', description: 'Tu khoa tim kiem nha cung cap.' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
        },
      ),
      this.buildTool(
        'getInvoices',
        'Lay danh sach hoa don ban hang, co the loc theo khach hang, trang thai va khoang ngay.',
        {
          codeQuery: { type: 'string', description: 'Ma hoa don can tra cuu nhanh.' },
          customerQuery: { type: 'string', description: 'Ma hoac ten khach hang.' },
          status: {
            type: 'string',
            enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'],
          },
          fromDate: { type: 'string', description: 'YYYY-MM-DD' },
          toDate: { type: 'string', description: 'YYYY-MM-DD' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getPurchaseInvoices',
        'Lay danh sach hoa don mua hang, co the loc theo nha cung cap, trang thai va khoang ngay.',
        {
          codeQuery: { type: 'string', description: 'Ma hoa don mua can tra cuu nhanh.' },
          supplierQuery: { type: 'string', description: 'Ma hoac ten nha cung cap.' },
          status: {
            type: 'string',
            enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'],
          },
          fromDate: { type: 'string', description: 'YYYY-MM-DD' },
          toDate: { type: 'string', description: 'YYYY-MM-DD' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getStock',
        'Xem ton kho hien tai theo san pham va kho.',
        {
          productQuery: { type: 'string', description: 'SKU hoac ten san pham.' },
          warehouseQuery: { type: 'string', description: 'Ten kho.' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'calculateCustomerDebt',
        'Tinh tong cong no phai thu cua mot khach hang.',
        {
          customerQuery: { type: 'string', description: 'Ma hoac ten khach hang.' },
        },
        ['customerQuery'],
      ),
      this.buildTool(
        'calculateSupplierDebt',
        'Tinh tong cong no phai tra cua mot nha cung cap.',
        {
          supplierQuery: { type: 'string', description: 'Ma hoac ten nha cung cap.' },
        },
        ['supplierQuery'],
      ),
      this.buildTool(
        'getSalesOrders',
        'Lay danh sach don ban hang, loc theo khach hang, trang thai hoac khoang ngay.',
        {
          codeQuery: { type: 'string', description: 'Ma don ban can tra cuu nhanh.' },
          customerQuery: { type: 'string', description: 'Ma hoac ten khach hang.' },
          status: {
            type: 'string',
            enum: [
              'DRAFT',
              'CONFIRMED',
              'DELIVERING',
              'DELIVERED',
              'CANCELLED',
              'PARTIALLY_RETURNED',
              'FULLY_RETURNED',
            ],
          },
          fromDate: { type: 'string', description: 'YYYY-MM-DD' },
          toDate: { type: 'string', description: 'YYYY-MM-DD' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getPurchaseOrders',
        'Lay danh sach don mua hang, loc theo nha cung cap, trang thai hoac khoang ngay.',
        {
          codeQuery: { type: 'string', description: 'Ma don mua can tra cuu nhanh.' },
          supplierQuery: { type: 'string', description: 'Ma hoac ten nha cung cap.' },
          status: {
            type: 'string',
            enum: [
              'DRAFT',
              'CONFIRMED',
              'DELIVERING',
              'DELIVERED',
              'CANCELLED',
              'PARTIALLY_RETURNED',
              'FULLY_RETURNED',
            ],
          },
          fromDate: { type: 'string', description: 'YYYY-MM-DD' },
          toDate: { type: 'string', description: 'YYYY-MM-DD' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getReturnOrders',
        'Lay danh sach don tra hang cua khach.',
        {
          codeQuery: { type: 'string', description: 'Ma don tra hang can tra cuu nhanh.' },
          customerQuery: { type: 'string', description: 'Ma hoac ten khach hang.' },
          status: { type: 'string', description: 'Vi du COMPLETED.' },
          fromDate: { type: 'string', description: 'YYYY-MM-DD' },
          toDate: { type: 'string', description: 'YYYY-MM-DD' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getInventoryTransactions',
        'Lich su nhap xuat kho theo san pham, kho, loai giao dich hoac khoang ngay.',
        {
          productQuery: { type: 'string', description: 'SKU hoac ten san pham.' },
          warehouseQuery: { type: 'string', description: 'Ten kho.' },
          transactionType: {
            type: 'string',
            enum: [
              'STOCK_IN',
              'STOCK_OUT',
              'ADJUSTMENT_IN',
              'ADJUSTMENT_OUT',
              'TRANSFER_IN',
              'TRANSFER_OUT',
            ],
          },
          fromDate: { type: 'string', description: 'YYYY-MM-DD' },
          toDate: { type: 'string', description: 'YYYY-MM-DD' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getInventoryLots',
        'Tra cuu lo hang theo san pham, kho, batch hoac han dung.',
        {
          productQuery: { type: 'string', description: 'SKU hoac ten san pham.' },
          warehouseQuery: { type: 'string', description: 'Ten kho.' },
          batchQuery: { type: 'string', description: 'Ma batch/lo hang.' },
          expiringWithinDays: {
            type: 'integer',
            minimum: 0,
            description: 'Loc cac lo het han trong N ngay toi.',
          },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getExpiryAlerts',
        'Lay danh sach hang sap het han theo kho.',
        {
          days: {
            type: 'integer',
            minimum: 0,
            default: 30,
            description: 'So ngay toi han.',
          },
          warehouseQuery: { type: 'string', description: 'Ten kho.' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getStockReceipts',
        'Lay danh sach phieu nhap kho.',
        {
          codeQuery: { type: 'string', description: 'Ma phieu nhap can tra cuu nhanh.' },
          productQuery: { type: 'string', description: 'SKU hoac ten san pham.' },
          warehouseQuery: { type: 'string', description: 'Ten kho.' },
          status: { type: 'string', enum: ['DRAFT', 'CONFIRMED', 'CANCELLED'] },
          fromDate: { type: 'string', description: 'YYYY-MM-DD' },
          toDate: { type: 'string', description: 'YYYY-MM-DD' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getStockIssues',
        'Lay danh sach phieu xuat kho.',
        {
          productQuery: { type: 'string', description: 'SKU hoac ten san pham.' },
          warehouseQuery: { type: 'string', description: 'Ten kho.' },
          status: { type: 'string', enum: ['DRAFT', 'CONFIRMED', 'CANCELLED'] },
          issueType: { type: 'string', enum: ['SALE', 'INTERNAL', 'DAMAGED'] },
          fromDate: { type: 'string', description: 'YYYY-MM-DD' },
          toDate: { type: 'string', description: 'YYYY-MM-DD' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getStockTransfers',
        'Lay danh sach phieu chuyen kho.',
        {
          productQuery: { type: 'string', description: 'SKU hoac ten san pham.' },
          fromWarehouseQuery: { type: 'string', description: 'Ten kho xuat.' },
          toWarehouseQuery: { type: 'string', description: 'Ten kho nhan.' },
          status: {
            type: 'string',
            enum: ['PENDING', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'],
          },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getStocktakingSessions',
        'Lay danh sach phien kiem ke kho.',
        {
          warehouseQuery: { type: 'string', description: 'Ten kho.' },
          status: { type: 'string', enum: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getCashFunds',
        'Lay danh sach quy tien mat va so du hien tai.',
        {
          includeInactive: { type: 'boolean', default: false },
        },
      ),
      this.buildTool(
        'getBankAccounts',
        'Lay danh sach tai khoan ngan hang va so du hien tai.',
        {
          includeInactive: { type: 'boolean', default: false },
        },
      ),
      this.buildTool(
        'getCashReceipts',
        'Lay danh sach phieu thu hoac phieu chi.',
        {
          kind: { type: 'string', enum: ['RECEIPT', 'DISBURSEMENT'] },
          status: { type: 'string', enum: ['APPROVED', 'PENDING', 'REJECTED'] },
          customerQuery: { type: 'string', description: 'Ma hoac ten khach hang.' },
          supplierQuery: { type: 'string', description: 'Ma hoac ten nha cung cap.' },
          fromDate: { type: 'string', description: 'YYYY-MM-DD' },
          toDate: { type: 'string', description: 'YYYY-MM-DD' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getDisbursements',
        'Lay danh sach cac khoan chi/disbursement.',
        {
          status: {
            type: 'string',
            enum: ['APPROVED', 'PENDING_APPROVAL', 'REJECTED'],
          },
          supplierQuery: { type: 'string', description: 'Ma hoac ten nha cung cap.' },
          fromDate: { type: 'string', description: 'YYYY-MM-DD' },
          toDate: { type: 'string', description: 'YYYY-MM-DD' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getArAging',
        'Bao cao phai thu theo khach hang, co the loc con no, khong no hoac vuot han muc.',
        {
          customerQuery: { type: 'string', description: 'Ma hoac ten khach hang.' },
          debtFilter: {
            type: 'string',
            enum: ['all', 'has_debt', 'no_debt', 'over_limit'],
            default: 'all',
          },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getApSchedule',
        'Bao cao phai tra theo nha cung cap, co the loc unpaid/partial/paid.',
        {
          supplierQuery: { type: 'string', description: 'Ma hoac ten nha cung cap.' },
          paymentFilter: {
            type: 'string',
            enum: ['all', 'paid', 'partial', 'unpaid'],
            default: 'all',
          },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getCustomerPaymentHistory',
        'Lich su thanh toan cua khach hang.',
        {
          customerQuery: { type: 'string', description: 'Ma hoac ten khach hang.' },
          fromDate: { type: 'string', description: 'YYYY-MM-DD' },
          toDate: { type: 'string', description: 'YYYY-MM-DD' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getDashboardStats',
        'So lieu tong quan dashboard: so san pham, khach hang, doanh thu thang, don cho xu ly, canh bao ton thap.',
        {},
      ),
      this.buildTool(
        'getSalesReport',
        'Bao cao doanh thu ban hang theo ngay, tuan, thang hoac nam.',
        {
          fromDate: { type: 'string', description: 'YYYY-MM-DD' },
          toDate: { type: 'string', description: 'YYYY-MM-DD' },
          groupBy: { type: 'string', enum: ['day', 'week', 'month', 'year'], default: 'day' },
        },
      ),
      this.buildTool(
        'getProfitByProduct',
        'Bao cao loi nhuan gop theo san pham.',
        {
          fromDate: { type: 'string', description: 'YYYY-MM-DD' },
          toDate: { type: 'string', description: 'YYYY-MM-DD' },
          productQuery: { type: 'string', description: 'SKU hoac ten san pham.' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getCashflowReport',
        'Bao cao dong tien vao/ra theo phieu thu chi da duyet.',
        {
          fromDate: { type: 'string', description: 'YYYY-MM-DD' },
          toDate: { type: 'string', description: 'YYYY-MM-DD' },
        },
      ),
      this.buildTool(
        'getKpiReport',
        'Bao cao KPI tong quan: so hoa don, doanh thu, gia tri hoa don trung binh, so don hang.',
        {
          fromDate: { type: 'string', description: 'YYYY-MM-DD' },
          toDate: { type: 'string', description: 'YYYY-MM-DD' },
        },
      ),
      this.buildTool(
        'getDebtByCustomer',
        'Danh sach cong no khach hang, co the loc con no, khong no hoac vuot han muc.',
        {
          customerQuery: { type: 'string', description: 'Ma hoac ten khach hang.' },
          debtFilter: {
            type: 'string',
            enum: ['all', 'has_debt', 'no_debt', 'over_limit'],
            default: 'all',
          },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getDebtBySupplier',
        'Danh sach cong no nha cung cap.',
        {
          supplierQuery: { type: 'string', description: 'Ma hoac ten nha cung cap.' },
          debtFilter: {
            type: 'string',
            enum: ['all', 'has_debt', 'no_debt'],
            default: 'all',
          },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getSalesByProduct',
        'Top san pham ban chay theo doanh thu hoac so luong.',
        {
          fromDate: { type: 'string', description: 'YYYY-MM-DD' },
          toDate: { type: 'string', description: 'YYYY-MM-DD' },
          productQuery: { type: 'string', description: 'SKU hoac ten san pham.' },
          sortBy: {
            type: 'string',
            enum: ['net_revenue', 'quantity_sold', 'product_code'],
            default: 'net_revenue',
          },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getSalesByCustomer',
        'Top khach hang mua nhieu theo doanh thu.',
        {
          fromDate: { type: 'string', description: 'YYYY-MM-DD' },
          toDate: { type: 'string', description: 'YYYY-MM-DD' },
          customerQuery: { type: 'string', description: 'Ma hoac ten khach hang.' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getPurchaseBySupplier',
        'Tong mua hang theo nha cung cap.',
        {
          fromDate: { type: 'string', description: 'YYYY-MM-DD' },
          toDate: { type: 'string', description: 'YYYY-MM-DD' },
          supplierQuery: { type: 'string', description: 'Ma hoac ten nha cung cap.' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getDeadstockReport',
        'Bao cao hang ton lau chua ban.',
        {
          warehouseQuery: { type: 'string', description: 'Ten kho.' },
          daysSinceLastSale: { type: 'integer', minimum: 0, default: 30 },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getAbcAnalysis',
        'Phan tich ABC theo doanh thu san pham.',
        {
          fromDate: { type: 'string', description: 'YYYY-MM-DD' },
          toDate: { type: 'string', description: 'YYYY-MM-DD' },
          limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
        },
      ),
      this.buildTool(
        'getCustomerLoyalty',
        'Tra cuu diem loyalty va hang thanh vien cua mot khach hang.',
        {
          customerQuery: { type: 'string', description: 'Ma hoac ten khach hang.' },
        },
        ['customerQuery'],
      ),
      this.buildTool(
        'getLoyaltyTransactions',
        'Lich su cong, tru, doi hoac het han diem loyalty.',
        {
          customerQuery: { type: 'string', description: 'Ma hoac ten khach hang.' },
          type: { type: 'string', enum: ['EARN', 'REDEEM', 'EXPIRE', 'ADJUST'] },
          fromDate: { type: 'string', description: 'YYYY-MM-DD' },
          toDate: { type: 'string', description: 'YYYY-MM-DD' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ),
      this.buildTool(
        'getLoyaltyConfig',
        'Lay cau hinh tich diem va cac hang thanh vien loyalty hien tai.',
        {},
      ),
      this.buildTool(
        'ragSearch',
        'Tim tai lieu huong dan su dung phan mem de tra loi cau hoi how-to. Khong dung cho so lieu nghiep vu.',
        {
          query: { type: 'string', description: 'Cau hoi how-to da duoc dien dat ro rang.' },
        },
        ['query'],
      ),
    ];
  }

  getToolSchemas(
    access?: ChatbotAccessContext,
    requestedToolNames?: ToolName[],
  ): ChatCompletionTool[] {
    const tools = this.buildAllToolSchemas();
    const requestedTools = requestedToolNames?.length
      ? new Set(requestedToolNames)
      : null;
    if (!access) {
      return requestedTools
        ? tools.filter((tool) => requestedTools.has((tool as any).function.name as ToolName))
        : tools;
    }

    const allowedTools = new Set(
      this.accessService.getAllowedTools(access, ALL_TOOL_NAMES),
    );
    return tools.filter((tool) => {
      const toolName = (tool as any).function.name as ToolName;
      return allowedTools.has(toolName) && (!requestedTools || requestedTools.has(toolName));
    });
  }

  async runTool(
    name: ToolName,
    args: any,
    access?: ChatbotAccessContext,
  ): Promise<any> {
    try {
      if (access) {
        this.accessService.assertToolAccess(name, access);
      }

      let result: any;
      switch (name) {
        case 'getProducts':
          result = await this.masterDataRead.getProducts(args);
          break;
        case 'getCustomers':
          result = await this.masterDataRead.getCustomers(args, access);
          break;
        case 'getSuppliers':
          result = await this.masterDataRead.getSuppliers(args);
          break;
        case 'getInvoices':
          result = await this.ordersRead.getInvoices(args, access);
          break;
        case 'getPurchaseInvoices':
          result = await this.ordersRead.getPurchaseInvoices(args);
          break;
        case 'getStock':
          result = await this.inventoryRead.getStock(args);
          break;
        case 'calculateCustomerDebt':
          result = await this.masterDataRead.calculateCustomerDebt(args, access);
          break;
        case 'calculateSupplierDebt':
          result = await this.masterDataRead.calculateSupplierDebt(args);
          break;
        case 'getSalesOrders':
          result = await this.ordersRead.getSalesOrders(args, access);
          break;
        case 'getPurchaseOrders':
          result = await this.ordersRead.getPurchaseOrders(args);
          break;
        case 'getReturnOrders':
          result = await this.ordersRead.getReturnOrders(args, access);
          break;
        case 'getInventoryTransactions':
          result = await this.inventoryRead.getInventoryTransactions(args);
          break;
        case 'getInventoryLots':
          result = await this.inventoryRead.getInventoryLots(args);
          break;
        case 'getExpiryAlerts':
          result = await this.inventoryRead.getExpiryAlerts(args);
          break;
        case 'getStockReceipts':
          result = await this.inventoryRead.getStockReceipts(args);
          break;
        case 'getStockIssues':
          result = await this.inventoryRead.getStockIssues(args);
          break;
        case 'getStockTransfers':
          result = await this.inventoryRead.getStockTransfers(args);
          break;
        case 'getStocktakingSessions':
          result = await this.inventoryRead.getStocktakingSessions(args);
          break;
        case 'getCashFunds':
          result = await this.financeRead.getCashFunds(args);
          break;
        case 'getBankAccounts':
          result = await this.financeRead.getBankAccounts(args);
          break;
        case 'getCashReceipts':
          result = await this.financeRead.getCashReceipts(args, access);
          break;
        case 'getDisbursements':
          result = await this.financeRead.getDisbursements(args);
          break;
        case 'getArAging':
          result = await this.financeRead.getArAging(args, access);
          break;
        case 'getApSchedule':
          result = await this.financeRead.getApSchedule(args);
          break;
        case 'getCustomerPaymentHistory':
          result = await this.financeRead.getCustomerPaymentHistory(args, access);
          break;
        case 'getDashboardStats':
          result = await this.reportsRead.getDashboardStats(access);
          break;
        case 'getSalesReport':
          result = await this.reportsRead.getSalesReport(args, access);
          break;
        case 'getProfitByProduct':
          result = await this.reportsRead.getProfitByProduct(args, access);
          break;
        case 'getCashflowReport':
          result = await this.reportsRead.getCashflowReport(args, access);
          break;
        case 'getKpiReport':
          result = await this.reportsRead.getKpiReport(args, access);
          break;
        case 'getDebtByCustomer':
          result = await this.reportsRead.getDebtByCustomer(args, access);
          break;
        case 'getDebtBySupplier':
          result = await this.reportsRead.getDebtBySupplier(args, access);
          break;
        case 'getSalesByProduct':
          result = await this.reportsRead.getSalesByProduct(args, access);
          break;
        case 'getSalesByCustomer':
          result = await this.reportsRead.getSalesByCustomer(args, access);
          break;
        case 'getPurchaseBySupplier':
          result = await this.reportsRead.getPurchaseBySupplier(args, access);
          break;
        case 'getDeadstockReport':
          result = await this.reportsRead.getDeadstockReport(args, access);
          break;
        case 'getAbcAnalysis':
          result = await this.reportsRead.getAbcAnalysis(args, access);
          break;
        case 'getCustomerLoyalty':
          result = await this.loyaltyRead.getCustomerLoyalty(args, access);
          break;
        case 'getLoyaltyTransactions':
          result = await this.loyaltyRead.getLoyaltyTransactions(args, access);
          break;
        case 'getLoyaltyConfig':
          result = await this.loyaltyRead.getLoyaltyConfig();
          break;
        case 'ragSearch':
          result = await this.ragSearch(args, access);
          break;
        default:
          return { error: `Unknown tool: ${name}` };
      }

      return access
        ? this.accessService.sanitizeToolResult(name, result, access)
        : result;
    } catch (e: any) {
      this.logger.warn(`Tool ${name} failed: ${e.message}`);
      if (
        typeof e.message === 'string'
        && e.message.startsWith('CHATBOT_TOOL_FORBIDDEN:')
      ) {
        return { error: 'Bạn không có quyền truy cập chức năng hoặc dữ liệu này.' };
      }
      return { error: e.message ?? 'Tool execution failed' };
    }
  }

  private async ragSearch(
    { query }: { query: string },
    access?: ChatbotAccessContext,
  ) {
    if (!this.opensearch.isReady() || !this.openai.isReady()) {
      return { context: '', notice: 'RAG knowledge base chưa được cấu hình.' };
    }
    const vec = await this.openai.createEmbedding(query);
    const hits = await this.opensearch.knnSearch(
      vec,
      this.tenantCtx.getTenantCode()!,
      access?.permissions ?? [],
    );
    return {
      hits: hits.map((h) => ({
        content: h.content,
      })),
    };
  }
}

import { ForbiddenException, Injectable } from '@nestjs/common';
import { RolesService } from '../roles/roles.service';
import type { ToolName } from './chatbot-tools.service';

export interface ChatbotAccessContext {
  userId: string;
  role: string;
  permissions: string[];
}

interface ToolPolicy {
  requiredAny?: string[];
}

const TOOL_POLICIES: Partial<Record<ToolName, ToolPolicy>> = {
  getProducts: { requiredAny: ['products:read'] },
  getCustomers: { requiredAny: ['customers:read'] },
  getSuppliers: { requiredAny: ['orders:read', 'payments:read'] },
  calculateCustomerDebt: { requiredAny: ['payments:read'] },
  calculateSupplierDebt: { requiredAny: ['payments:read', 'reports.finance:read'] },
  getInvoices: { requiredAny: ['orders:read', 'payments:read'] },
  getPurchaseInvoices: { requiredAny: ['payments:read', 'orders:read'] },
  getSalesOrders: { requiredAny: ['orders:read'] },
  getPurchaseOrders: { requiredAny: ['orders:read'] },
  getReturnOrders: { requiredAny: ['orders:read'] },
  getStock: { requiredAny: ['inventory:read', 'products:read'] },
  getInventoryTransactions: { requiredAny: ['inventory:read'] },
  getInventoryLots: { requiredAny: ['inventory:read'] },
  getExpiryAlerts: { requiredAny: ['inventory:read'] },
  getStockReceipts: { requiredAny: ['inventory:read'] },
  getStockIssues: { requiredAny: ['inventory:read'] },
  getStockTransfers: { requiredAny: ['inventory:read'] },
  getStocktakingSessions: { requiredAny: ['inventory:read'] },
  getCashFunds: { requiredAny: ['payments:read', 'reports.finance:read'] },
  getBankAccounts: { requiredAny: ['payments:read', 'reports.finance:read'] },
  getCashReceipts: { requiredAny: ['payments:read'] },
  getDisbursements: { requiredAny: ['payments:read', 'reports.finance:read'] },
  getArAging: { requiredAny: ['payments:read', 'reports.finance:read'] },
  getApSchedule: { requiredAny: ['payments:read', 'reports.finance:read'] },
  getCustomerPaymentHistory: { requiredAny: ['payments:read'] },
  getDashboardStats: { requiredAny: ['reports:read'] },
  getSalesReport: { requiredAny: ['reports:read'] },
  getProfitByProduct: { requiredAny: ['reports.finance:read'] },
  getCashflowReport: { requiredAny: ['reports.finance:read'] },
  getKpiReport: { requiredAny: ['reports:read'] },
  getDebtByCustomer: { requiredAny: ['reports.finance:read'] },
  getDebtBySupplier: { requiredAny: ['reports.finance:read'] },
  getSalesByProduct: { requiredAny: ['reports:read'] },
  getSalesByCustomer: { requiredAny: ['reports:read'] },
  getPurchaseBySupplier: { requiredAny: ['reports.finance:read'] },
  getDeadstockReport: { requiredAny: ['reports:read', 'inventory:read'] },
  getAbcAnalysis: { requiredAny: ['reports:read'] },
  getCustomerLoyalty: { requiredAny: ['customers:read'] },
  getLoyaltyTransactions: { requiredAny: ['customers:read'] },
  getLoyaltyConfig: { requiredAny: ['customers:read'] },
  ragSearch: { requiredAny: [] },
};

@Injectable()
export class ChatbotAccessService {
  constructor(private readonly rolesService: RolesService) {}

  async buildAccessContext(userId: string, role: string): Promise<ChatbotAccessContext> {
    const permissions = role ? await this.rolesService.getPermissionsForRole(role) : [];
    return { userId, role, permissions };
  }

  hasPermission(access: ChatbotAccessContext, permission: string) {
    return access.permissions.includes(permission);
  }

  hasAnyPermission(access: ChatbotAccessContext, permissions: string[]) {
    return permissions.some((permission) => this.hasPermission(access, permission));
  }

  assertToolAccess(toolName: ToolName, access: ChatbotAccessContext) {
    const policy = TOOL_POLICIES[toolName];
    if (!policy?.requiredAny?.length) return;

    if (!this.hasAnyPermission(access, policy.requiredAny)) {
      throw new ForbiddenException(`CHATBOT_TOOL_FORBIDDEN:${toolName}`);
    }
  }

  isOwnSalesScope(access: ChatbotAccessContext) {
    return access.role === 'STAFF';
  }

  sanitizeToolResult(toolName: ToolName, result: any, access: ChatbotAccessContext) {
    if (!result || result.error) return result;

    if (toolName === 'getProducts' && !this.hasPermission(access, 'cost_price:read')) {
      return {
        ...result,
        items: (result.items ?? []).map((item: any) => {
          const { cost_price, ...rest } = item;
          return rest;
        }),
      };
    }

    return result;
  }

  getAllowedTools(access: ChatbotAccessContext, allTools: ToolName[]) {
    return allTools.filter((toolName) => {
      const policy = TOOL_POLICIES[toolName];
      if (!policy?.requiredAny?.length) return true;
      return this.hasAnyPermission(access, policy.requiredAny);
    });
  }
}

import type { ToolName } from './chatbot-tools.service';

export type ChatRouteIntent =
  | 'QUERY_DB'
  | 'RAG_GUIDE'
  | 'API_ACTION'
  | 'UNCERTAIN';

export type ChatRouteConfidence = 'high' | 'medium' | 'low';

export interface DirectToolCallPlan {
  toolName: ToolName;
  args: Record<string, any>;
}

export interface ChatRoutePlan {
  intent: ChatRouteIntent;
  confidence: ChatRouteConfidence;
  toolNames: ToolName[];
  directToolCall?: DirectToolCallPlan;
  shouldBypassLlm: boolean;
  requiresComplexModel: boolean;
  userText: string;
}

const QUERY_DB_KEYWORDS = [
  'tra cứu',
  'tra cuu',
  'tìm',
  'tim',
  'xem',
  'kiểm tra trạng thái',
  'kiem tra trang thai',
  'trạng thái',
  'trang thai',
  'bao nhiêu',
  'bao nhieu',
  'liệt kê',
  'liet ke',
  'danh sách',
  'danh sach',
];

const GUIDE_KEYWORDS = [
  'làm sao',
  'lam sao',
  'hướng dẫn',
  'huong dan',
  'cách',
  'cach',
  'ở đâu',
  'o dau',
  'quy trình',
  'quy trinh',
];

const ACTION_KEYWORDS = [
  'tạo',
  'tao',
  'cập nhật',
  'cap nhat',
  'xóa',
  'xoa',
  'duyệt',
  'duyet',
  'gửi',
  'gui',
  'sửa',
  'sua',
];

const COMPLEX_KEYWORDS = [
  'giải thích',
  'giai thich',
  'phân tích',
  'phan tich',
  'so sánh',
  'so sanh',
  'chi tiết',
  'chi tiet',
  'tóm tắt',
  'tom tat',
  'tại sao',
  'tai sao',
];

const DOCUMENT_TOOLS: ToolName[] = [
  'getInvoices',
  'getPurchaseInvoices',
  'getSalesOrders',
  'getPurchaseOrders',
  'getReturnOrders',
  'getCashReceipts',
  'getCustomerPaymentHistory',
];

const INVENTORY_TOOLS: ToolName[] = [
  'getStock',
  'getInventoryTransactions',
  'getInventoryLots',
  'getExpiryAlerts',
  'getStockReceipts',
  'getStockIssues',
  'getStockTransfers',
  'getStocktakingSessions',
];

const MASTER_TOOLS: ToolName[] = [
  'getProducts',
  'getCustomers',
  'getSuppliers',
  'calculateCustomerDebt',
  'calculateSupplierDebt',
  'getCustomerLoyalty',
  'getLoyaltyTransactions',
  'getLoyaltyConfig',
];

const FINANCE_TOOLS: ToolName[] = [
  'getCashFunds',
  'getBankAccounts',
  'getCashReceipts',
  'getDisbursements',
  'getArAging',
  'getApSchedule',
  'getCustomerPaymentHistory',
  'calculateCustomerDebt',
  'calculateSupplierDebt',
];

const REPORT_TOOLS: ToolName[] = [
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
];

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function hasAnyKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function isGuideIntent(text: string) {
  return hasAnyKeyword(text, GUIDE_KEYWORDS);
}

function isActionIntent(text: string) {
  if (!hasAnyKeyword(text, ACTION_KEYWORDS)) {
    return false;
  }

  if (isGuideIntent(text)) {
    return false;
  }

  return true;
}

function looksComplex(text: string) {
  return text.length >= 220 || hasAnyKeyword(text, COMPLEX_KEYWORDS);
}

function extractReferenceCode(text: string) {
  const explicit =
    text.match(
      /\b(?:ma|mã|code|so|số)\s*(?:hoa don|hoa đơn|don hang|đơn hàng|phieu|phiếu|khach hang|khách hàng|nha cung cap|nhà cung cấp|san pham|sản phẩm|sku)?\s*[:#]?\s*([a-z0-9][a-z0-9._/-]{2,})\b/i,
    )?.[1]
    ?? null;

  if (explicit) return explicit.toUpperCase();

  const tokenMatches = text.match(/\b[a-z]{1,6}[-_/]?\d{2,}[a-z0-9-_/]*\b/gi) ?? [];
  const candidate = tokenMatches.find((token) => /[a-z]/i.test(token) && /\d/.test(token));
  return candidate ? candidate.toUpperCase() : null;
}

function inferDirectToolCall(normalized: string): DirectToolCallPlan | undefined {
  const code = extractReferenceCode(normalized);
  if (!code) return undefined;

  if (normalized.includes('hoa don mua')) {
    return { toolName: 'getPurchaseInvoices', args: { codeQuery: code, limit: 5 } };
  }
  if (normalized.includes('hoa don') || normalized.includes('invoice')) {
    return { toolName: 'getInvoices', args: { codeQuery: code, limit: 5 } };
  }
  if (normalized.includes('don mua')) {
    return { toolName: 'getPurchaseOrders', args: { codeQuery: code, limit: 5 } };
  }
  if (
    normalized.includes('don ban')
    || normalized.includes('don hang')
    || normalized.includes('order')
  ) {
    return { toolName: 'getSalesOrders', args: { codeQuery: code, limit: 5 } };
  }
  if (normalized.includes('tra hang') || normalized.includes('return')) {
    return { toolName: 'getReturnOrders', args: { codeQuery: code, limit: 5 } };
  }
  if (normalized.includes('phieu nhap')) {
    return { toolName: 'getStockReceipts', args: { codeQuery: code, limit: 5 } };
  }
  if (normalized.includes('khach hang')) {
    return { toolName: 'getCustomers', args: { query: code, limit: 5 } };
  }
  if (normalized.includes('nha cung cap')) {
    return { toolName: 'getSuppliers', args: { query: code, limit: 5 } };
  }
  if (normalized.includes('san pham') || normalized.includes('sku')) {
    return { toolName: 'getProducts', args: { query: code, limit: 5 } };
  }

  return undefined;
}

function inferToolSubset(normalized: string): ToolName[] {
  if (
    normalized.includes('bao cao')
    || normalized.includes('top ')
    || normalized.includes('kpi')
    || normalized.includes('doanh thu')
    || normalized.includes('abc')
    || normalized.includes('deadstock')
  ) {
    return REPORT_TOOLS;
  }

  if (
    normalized.includes('ton kho')
    || normalized.includes('kho')
    || normalized.includes('lo hang')
    || normalized.includes('lo ')
    || normalized.includes('han dung')
    || normalized.includes('phieu nhap')
    || normalized.includes('phieu xuat')
    || normalized.includes('chuyen kho')
    || normalized.includes('kiem ke')
  ) {
    return INVENTORY_TOOLS;
  }

  if (
    normalized.includes('cong no')
    || normalized.includes('phai thu')
    || normalized.includes('phai tra')
    || normalized.includes('thanh toan')
    || normalized.includes('phieu thu')
    || normalized.includes('phieu chi')
    || normalized.includes('quy tien')
    || normalized.includes('ngan hang')
    || normalized.includes('dong tien')
  ) {
    return [...FINANCE_TOOLS, ...DOCUMENT_TOOLS];
  }

  if (
    normalized.includes('hoa don')
    || normalized.includes('don hang')
    || normalized.includes('don ban')
    || normalized.includes('don mua')
    || normalized.includes('tra hang')
    || normalized.includes('chung tu')
  ) {
    return DOCUMENT_TOOLS;
  }

  if (
    normalized.includes('khach hang')
    || normalized.includes('nha cung cap')
    || normalized.includes('san pham')
    || normalized.includes('sku')
    || normalized.includes('loyalty')
    || normalized.includes('diem')
  ) {
    return MASTER_TOOLS;
  }

  return [
    ...MASTER_TOOLS,
    ...DOCUMENT_TOOLS,
    ...INVENTORY_TOOLS,
    ...FINANCE_TOOLS,
    ...REPORT_TOOLS,
  ];
}

export function planChatRoute(userText: string): ChatRoutePlan {
  const normalized = normalize(userText);
  const directToolCall = inferDirectToolCall(normalized);
  const requiresComplexModel = looksComplex(normalized);

  if (isGuideIntent(normalized)) {
    return {
      intent: 'RAG_GUIDE',
      confidence: 'high',
      toolNames: ['ragSearch'],
      shouldBypassLlm: false,
      requiresComplexModel,
      userText,
    };
  }

  if (isActionIntent(normalized)) {
    return {
      intent: 'API_ACTION',
      confidence: 'high',
      toolNames: [],
      shouldBypassLlm: true,
      requiresComplexModel,
      userText,
    };
  }

  if (directToolCall) {
    return {
      intent: 'QUERY_DB',
      confidence: 'high',
      toolNames: [directToolCall.toolName],
      directToolCall,
      shouldBypassLlm: true,
      requiresComplexModel: false,
      userText,
    };
  }

  if (hasAnyKeyword(normalized, QUERY_DB_KEYWORDS)) {
    return {
      intent: 'QUERY_DB',
      confidence: 'high',
      toolNames: inferToolSubset(normalized),
      shouldBypassLlm: false,
      requiresComplexModel,
      userText,
    };
  }

  return {
    intent: 'UNCERTAIN',
    confidence: 'low',
    toolNames: inferToolSubset(normalized),
    shouldBypassLlm: false,
    requiresComplexModel: true,
    userText,
  };
}

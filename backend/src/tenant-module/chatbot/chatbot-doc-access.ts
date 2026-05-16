export function normalizeVietnamese(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function inferRequiredPermissionsForDoc(source: string, content: string): string[] {
  const src = normalizeVietnamese(source.replace(/\\/g, '/'));
  const body = normalizeVietnamese(content);
  const perms = new Set<string>();

  const add = (...items: string[]) => items.forEach((item) => perms.add(item));
  const hasAny = (patterns: RegExp[]) => patterns.some((pattern) => pattern.test(body) || pattern.test(src));

  if (
    hasAny([
      /11-rbac-system/,
      /phan he:\s*phan quyen/,
      /##\s*11\.\s*phan quyen/,
      /ma tran quyen/,
      /\brole_permissions\b/,
      /\broles:read\b/,
    ])
  ) {
    add('roles:read');
  }

  if (
    hasAny([
      /cach quan ly tai khoan nguoi dung/,
      /tao moi nguoi dung/,
      /thay doi vai tro/,
      /vo hieu hoa tai khoan/,
      /phan he:\s*quan ly nguoi dung/,
      /02-auth-user-management/,
      /\busers:read\b/,
    ])
  ) {
    add('users:read');
  }

  if (
    hasAny([
      /nhat ky he thong/,
      /audit[\s-]?log/,
      /\baudit_logs:read\b/,
    ])
  ) {
    add('audit_logs:read');
  }

  if (
    hasAny([
      /10-reporting-bi/,
      /\/reports\//,
      /\bbao cao\b/,
    ])
  ) {
    add('reports:read');
  }

  if (
    hasAny([
      /dong tien/,
      /lai lo/,
      /cong no/,
      /phai thu/,
      /phai tra/,
      /debt-by-/,
      /cashflow/,
      /reports\.finance:read/,
    ])
  ) {
    add('reports.finance:read');
  }

  if (
    hasAny([
      /06-inventory-management/,
      /ton kho/,
      /kiem ke/,
      /phieu nhap kho/,
      /phieu xuat kho/,
      /chuyen kho/,
      /\binventory:read\b/,
    ])
  ) {
    add('inventory:read');
  }

  if (
    hasAny([
      /07-order-management/,
      /don hang ban/,
      /don mua hang/,
      /voucher/,
      /promotion/,
      /\borders:read\b/,
    ])
  ) {
    add('orders:read');
  }

  if (
    hasAny([
      /08-invoice-payment/,
      /hoa don/,
      /thanh toan/,
      /phieu thu/,
      /phieu chi/,
      /\bpayments:read\b/,
    ])
  ) {
    add('payments:read');
  }

  if (
    hasAny([
      /03-product-master-data/,
      /san pham/,
      /\bproducts:read\b/,
    ])
  ) {
    add('products:read');
  }

  if (
    hasAny([
      /gia von/,
      /gross profit/,
      /\bcost_price:read\b/,
    ])
  ) {
    add('cost_price:read');
  }

  if (
    hasAny([
      /04-customer-master-data/,
      /khach hang/,
      /tich diem/,
      /\bcustomers:read\b/,
    ])
  ) {
    add('customers:read');
  }

  return [...perms];
}

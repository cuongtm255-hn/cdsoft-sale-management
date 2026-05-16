import type { ToolName } from './chatbot-tools.service';

function formatCurrency(value: any) {
  const amount = Number(value ?? 0);
  return `${amount.toLocaleString('vi-VN')} VND`;
}

function formatDate(value: any) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('vi-VN');
}

function renderKeyValue(lines: Array<[string, any]>) {
  return lines
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value]) => `- ${label}: ${value}`)
    .join('\n');
}

function renderFirstItems(
  title: string,
  rows: any[],
  renderRow: (row: any) => string,
  totalCount?: number,
) {
  const lines = rows.map(renderRow);
  const summary = totalCount && totalCount > rows.length
    ? `\n- Con ${totalCount - rows.length} ket qua khac. Ban co the them dieu kien loc neu muon xem chinh xac hon.`
    : '';
  return `${title}\n${lines.join('\n')}${summary}`.trim();
}

export function buildActionUnsupportedMessage() {
  return 'Hien tai toi moi ho tro tra cuu va huong dan su dung. Neu ban muon tao, cap nhat, xoa hoac duyet chung tu, vui long thao tac truc tiep trong man hinh chuc nang tuong ung.';
}

export function formatDirectToolResult(
  toolName: ToolName,
  result: any,
  userText: string,
) {
  if (!result || result.error) {
    return result?.error || 'Xin loi, toi chua lay duoc du lieu theo yeu cau nay.';
  }

  const items = Array.isArray(result.items) ? result.items : [];
  if (!items.length) {
    return `Toi chua tim thay du lieu phu hop voi yeu cau "${userText}". Ban co the thu nhap them ma chung tu, khoang thoi gian hoac ten doi tuong can tra cuu.`;
  }

  if (toolName === 'getInvoices') {
    if (items.length === 1) {
      const item = items[0];
      return [
        `Toi da tim thay hoa don ${item.code}.`,
        renderKeyValue([
          ['Trang thai', item.status],
          ['Khach hang', item.customer_name],
          ['Don hang', item.order_code],
          ['Tong tien', formatCurrency(item.total_amount)],
          ['Da thanh toan', formatCurrency(item.paid_amount)],
          ['Con phai thu', formatCurrency(item.balance_due)],
          ['Ngay xuat', formatDate(item.issued_at)],
          ['Han thanh toan', formatDate(item.due_date)],
        ]),
      ].join('\n');
    }
    return renderFirstItems(
      'Toi tim thay nhieu hoa don phu hop:',
      items.slice(0, 5),
      (item) =>
        `- ${item.code}: ${item.status}, khach hang ${item.customer_name}, con phai thu ${formatCurrency(item.balance_due)}`,
      result.count,
    );
  }

  if (toolName === 'getSalesOrders' || toolName === 'getPurchaseOrders') {
    const label = toolName === 'getSalesOrders' ? 'don ban' : 'don mua';
    const counterpartField =
      toolName === 'getSalesOrders' ? 'customer_name' : 'supplier_name';
    if (items.length === 1) {
      const item = items[0];
      return [
        `Toi da tim thay ${label} ${item.code}.`,
        renderKeyValue([
          ['Trang thai', item.status],
          ['Doi tuong', item[counterpartField]],
          ['Kho', item.warehouse_name],
          ['Tong tien', formatCurrency(item.total_amount)],
          ['Da thanh toan', formatCurrency(item.paid_amount)],
          ['Phuong thuc thanh toan', item.payment_method],
          ['So dong hang', item.item_count],
          ['Ngay tao', formatDate(item.created_at)],
          ['Ngay xac nhan', formatDate(item.confirmed_at)],
        ]),
      ].join('\n');
    }
    return renderFirstItems(
      `Toi tim thay nhieu ${label} phu hop:`,
      items.slice(0, 5),
      (item) => `- ${item.code}: ${item.status}, tong tien ${formatCurrency(item.total_amount)}`,
      result.count,
    );
  }

  if (toolName === 'getPurchaseInvoices') {
    if (items.length === 1) {
      const item = items[0];
      return [
        `Toi da tim thay hoa don mua ${item.code}.`,
        renderKeyValue([
          ['Trang thai', item.status],
          ['Nha cung cap', item.supplier_name],
          ['Tong tien', formatCurrency(item.total_amount)],
          ['Da thanh toan', formatCurrency(item.paid_amount)],
          ['Con phai tra', formatCurrency(item.balance_due)],
          ['Ngay xuat', formatDate(item.issued_at)],
          ['Han thanh toan', formatDate(item.due_date)],
        ]),
      ].join('\n');
    }
  }

  if (toolName === 'getReturnOrders') {
    const item = items[0];
    return [
      `Toi da tim thay don tra hang ${item.code}.`,
      renderKeyValue([
        ['Trang thai', item.status],
        ['Khach hang', item.customer_name],
        ['Don goc', item.original_order_code],
        ['Tien hoan', formatCurrency(item.refund_amount)],
        ['Hinh thuc hoan', item.refund_method],
        ['Ly do', item.reason],
        ['Ngay tao', formatDate(item.created_at)],
      ]),
    ].join('\n');
  }

  if (toolName === 'getStockReceipts') {
    const item = items[0];
    return [
      `Toi da tim thay phieu nhap ${item.ref_code}.`,
      renderKeyValue([
        ['Trang thai', item.status],
        ['Kho', item.warehouse_name],
        ['Nha cung cap', item.supplier_name],
        ['Tong tien', formatCurrency(item.total_amount)],
        ['So dong hang', item.item_count],
        ['Ngay tao', formatDate(item.created_at)],
        ['Ngay du kien', formatDate(item.expected_date)],
        ['Ngay xac nhan', formatDate(item.confirmed_at)],
      ]),
    ].join('\n');
  }

  if (toolName === 'getProducts') {
    const item = items[0];
    return [
      `Toi da tim thay san pham ${item.sku}.`,
      renderKeyValue([
        ['Ten san pham', item.name],
        ['Barcode', item.barcode],
        ['Danh muc', item.category_name],
        ['Gia ban le', item.retail_price ? formatCurrency(item.retail_price) : '-'],
        ['Gia von', item.cost_price !== undefined ? formatCurrency(item.cost_price) : '(ban khong co quyen xem)'],
        ['Ton kho', item.stock_quantity],
        ['Trang thai', item.is_active ? 'Dang kinh doanh' : 'Ngung kinh doanh'],
      ]),
    ].join('\n');
  }

  if (toolName === 'getCustomers' || toolName === 'getSuppliers') {
    const item = items[0];
    const label = toolName === 'getCustomers' ? 'khach hang' : 'nha cung cap';
    return [
      `Toi da tim thay ${label} ${item.code}.`,
      renderKeyValue([
        ['Ten', item.name],
        ['Dien thoai', item.phone],
        ['Email', item.email],
        ['Cong no hien tai', item.current_debt !== undefined ? formatCurrency(item.current_debt) : undefined],
        ['Diem loyalty', item.loyalty_points],
        ['Hang thanh vien', item.member_tier],
        ['Trang thai', item.is_active === undefined ? undefined : item.is_active ? 'Dang hoat dong' : 'Ngung hoat dong'],
      ]),
    ].join('\n');
  }

  return renderFirstItems(
    'Toi da tim thay mot so du lieu phu hop:',
    items.slice(0, 5),
    (item) => `- ${JSON.stringify(item)}`,
    result.count,
  );
}

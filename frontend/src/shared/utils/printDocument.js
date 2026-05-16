import dayjs from 'dayjs';

const fmtVND = (v) => Number(v ?? 0).toLocaleString('vi-VN') + ' ₫';
const fmtNum = (v) => Number(v ?? 0).toLocaleString('vi-VN');
const fmtDate = (v) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—';

const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; font-size: 13px; color: #111; padding: 24px 32px; }
  .header { text-align: center; margin-bottom: 20px; }
  .company-name { font-size: 15px; font-weight: bold; text-transform: uppercase; }
  .doc-title { font-size: 20px; font-weight: bold; text-transform: uppercase; margin: 12px 0 4px; }
  .doc-code { font-size: 13px; color: #444; margin-bottom: 4px; }
  .doc-date { font-size: 12px; color: #666; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 32px; margin: 16px 0; border: 1px solid #ccc; padding: 10px 14px; border-radius: 4px; }
  .info-row { display: flex; gap: 6px; padding: 2px 0; }
  .info-label { font-weight: bold; min-width: 130px; white-space: nowrap; }
  .info-value { flex: 1; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0; }
  th { background: #f0f0f0; font-weight: bold; text-align: center; padding: 7px 8px; border: 1px solid #bbb; font-size: 12px; }
  td { padding: 6px 8px; border: 1px solid #ccc; font-size: 12px; vertical-align: top; }
  .num { text-align: right; }
  .center { text-align: center; }
  .total-row td { font-weight: bold; background: #f8f8f8; font-size: 13px; }
  .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 32px; text-align: center; }
  .sig-box { padding: 8px; }
  .sig-title { font-weight: bold; font-size: 12px; margin-bottom: 4px; }
  .sig-note { font-size: 11px; color: #666; margin-bottom: 60px; font-style: italic; }
  .sig-line { border-top: 1px solid #999; margin-top: 4px; padding-top: 4px; font-size: 11px; color: #888; }
  .divider { border: none; border-top: 1px solid #ddd; margin: 12px 0; }
  .notes-section { margin-top: 10px; font-size: 12px; color: #444; }
  @media print {
    body { padding: 0; }
    @page { margin: 20mm 15mm; }
  }
`;

function openPrint(html) {
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

// ─── Report helpers ──────────────────────────────────────────────────────────

const REPORT_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 20px 28px; }
  h3 { text-align: center; font-size: 15px; text-transform: uppercase; margin-bottom: 4px; }
  .period { text-align: center; font-size: 11px; color: #555; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th { background: #f0f0f0; font-weight: bold; text-align: center; padding: 6px 7px; border: 1px solid #bbb; font-size: 11px; }
  td { padding: 5px 7px; border: 1px solid #ccc; font-size: 11px; vertical-align: middle; }
  .num { text-align: right; }
  .ctr { text-align: center; }
  .total-row td { font-weight: bold; background: #f8f8f8; }
  .section-title { font-weight: bold; font-size: 12px; margin: 14px 0 6px; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
  .sigs { display: flex; justify-content: space-around; margin-top: 40px; text-align: center; }
  .sig { width: 200px; }
  .sig-title { font-weight: bold; font-size: 12px; }
  .sig-note { font-size: 11px; color: #666; font-style: italic; margin: 2px 0 52px; }
  .sig-line { border-top: 1px solid #999; padding-top: 4px; font-size: 11px; color: #888; }
  @media print { @page { margin: 15mm; } body { padding: 0; } }
`;

const REPORT_SIGS = `
  <div class="sigs">
    <div class="sig">
      <div class="sig-title">KẾ TOÁN VIÊN</div>
      <div class="sig-note">(Ký, ghi rõ họ tên)</div>
      <div class="sig-line">................................</div>
    </div>
    <div class="sig">
      <div class="sig-title">KẾ TOÁN TRƯỞNG</div>
      <div class="sig-note">(Ký, ghi rõ họ tên)</div>
      <div class="sig-line">................................</div>
    </div>
  </div>
`;

function openReportPrint(title, period, bodyHtml) {
  const win = window.open('', '_blank', 'width=960,height=700');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${REPORT_CSS}</style></head><body><h3>${title}</h3><p class="period">${period}</p>${bodyHtml}${REPORT_SIGS}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

const fmtR = (v) => Number(v ?? 0).toLocaleString('vi-VN');

export function printReportSales({ from, to, summary = {}, topProducts = [], topCustomers = [] }) {
  const productRows = topProducts.map((r, i) => `
    <tr>
      <td class="ctr">${i + 1}</td><td>${r.name ?? ''}</td>
      <td class="num">${fmtR(r.qty)}</td><td class="num">${fmtR(r.revenue)}₫</td>
    </tr>`).join('');

  const customerRows = topCustomers.map((r, i) => `
    <tr>
      <td class="ctr">${i + 1}</td><td>${r.name ?? ''}</td>
      <td class="num">${fmtR(r.orders)}</td><td class="num">${fmtR(r.revenue)}₫</td>
    </tr>`).join('');

  openReportPrint('BÁO CÁO DOANH SỐ', `Từ ngày: ${from} — Đến ngày: ${to}`, `
    <div style="display:flex;gap:12px;margin-bottom:10px">
      <div style="flex:1;border:1px solid #eee;padding:8px 10px;border-radius:3px">
        <div style="font-size:10px;color:#666">Doanh thu</div>
        <div style="font-size:15px;font-weight:bold">${fmtR(summary.totalRevenue)}₫</div>
      </div>
      <div style="flex:1;border:1px solid #eee;padding:8px 10px;border-radius:3px">
        <div style="font-size:10px;color:#666">Số đơn hàng</div>
        <div style="font-size:15px;font-weight:bold">${summary.totalOrders ?? 0}</div>
      </div>
      <div style="flex:1;border:1px solid #eee;padding:8px 10px;border-radius:3px">
        <div style="font-size:10px;color:#666">Giá trị TB / đơn</div>
        <div style="font-size:15px;font-weight:bold">${fmtR(summary.averageOrderValue)}₫</div>
      </div>
    </div>
    <div class="section-title">Top sản phẩm</div>
    <table>
      <thead><tr><th>STT</th><th>Sản phẩm</th><th>Số lượng</th><th>Doanh thu</th></tr></thead>
      <tbody>${productRows || '<tr><td colspan="4" class="ctr">Chưa có dữ liệu</td></tr>'}</tbody>
    </table>
    <div class="section-title">Top khách hàng</div>
    <table>
      <thead><tr><th>STT</th><th>Khách hàng</th><th>Số đơn</th><th>Doanh thu</th></tr></thead>
      <tbody>${customerRows || '<tr><td colspan="4" class="ctr">Chưa có dữ liệu</td></tr>'}</tbody>
    </table>
  `);
}

export function printReportInventoryMovement({ from, to, summary = {}, data = [] }) {
  const rows = data.map((r, i) => `
    <tr>
      <td class="ctr">${i + 1}</td>
      <td>${r.sku ?? ''}</td>
      <td>${r.name ?? ''}</td>
      <td class="ctr">${r.categoryName ?? '—'}</td>
      <td class="ctr">${r.unit ?? ''}</td>
      <td class="num">${fmtR(r.openingQty)}</td>
      <td class="num">${fmtR(r.stockIn)}</td>
      <td class="num">${fmtR(r.stockOut)}</td>
      <td class="num">${fmtR(r.closingQty)}</td>
      <td class="num">${fmtR(r.costPrice)}₫</td>
      <td class="num">${fmtR(r.closingValue)}₫</td>
    </tr>`).join('');

  openReportPrint('BÁO CÁO NHẬP-XUẤT-TỒN KHO', `Từ ngày: ${from} — Đến ngày: ${to}`, `
    <table>
      <thead><tr>
        <th>STT</th><th>SKU</th><th>Tên SP</th><th>Danh mục</th><th>ĐVT</th>
        <th>Đầu kỳ</th><th>Nhập kỳ</th><th>Xuất kỳ</th><th>Cuối kỳ</th>
        <th>Giá vốn</th><th>Giá trị tồn</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="11" class="ctr">Chưa có dữ liệu</td></tr>'}</tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="5" class="num">Tổng cộng:</td>
          <td class="num">${fmtR(summary.total_opening_qty)}</td>
          <td class="num">${fmtR(summary.total_stock_in)}</td>
          <td class="num">${fmtR(summary.total_stock_out)}</td>
          <td class="num">${fmtR(summary.total_closing_qty)}</td>
          <td></td>
          <td class="num">${fmtR(summary.total_closing_value)}₫</td>
        </tr>
      </tfoot>
    </table>
  `);
}

export function printReportFinance({ from, to, pnl, cashflow }) {
  const v = (val) => `${fmtR(val)}₫`;

  const pnlHtml = !pnl ? '' : `
    <div class="section-title">KẾT QUẢ KINH DOANH (P&amp;L)</div>
    <table>
      <tbody>
        <tr><td>I. Doanh thu bán hàng</td><td class="num">${v(pnl.revenue?.grossSales)}</td></tr>
        <tr><td style="padding-left:16px">Trừ: Hàng trả lại</td><td class="num">(${v(pnl.revenue?.returns)})</td></tr>
        <tr><td style="padding-left:16px">Trừ: Chiết khấu TM</td><td class="num">(${v(pnl.revenue?.discounts)})</td></tr>
        <tr class="total-row"><td>= Doanh thu thuần</td><td class="num">${v(pnl.revenue?.netRevenue)}</td></tr>
        <tr><td>II. Giá vốn hàng bán</td><td class="num">(${v(pnl.cogs)})</td></tr>
        <tr class="total-row"><td>III. Lợi nhuận gộp (biên: ${pnl.grossMarginPercent}%)</td><td class="num">${v(pnl.grossProfit)}</td></tr>
        <tr><td>IV. Chi phí hoạt động</td><td class="num">(${v(pnl.operatingExpenses?.total)})</td></tr>
        <tr class="total-row"><td>V. Lợi nhuận ròng (biên: ${pnl.netProfitMarginPercent}%)</td><td class="num">${v(pnl.netProfit)}</td></tr>
      </tbody>
    </table>`;

  const cfHtml = !cashflow ? '' : `
    <div class="section-title">LƯU CHUYỂN TIỀN TỆ</div>
    <table>
      <tbody>
        <tr class="total-row"><td>Số dư đầu kỳ</td><td class="num">${v(cashflow.openingBalance)}</td></tr>
        ${(cashflow.inflows ?? []).map((r) => `<tr><td style="padding-left:14px">+ ${r.category}</td><td class="num">${v(r.amount)}</td></tr>`).join('')}
        ${(cashflow.outflows ?? []).map((r) => `<tr><td style="padding-left:14px">− ${r.category}</td><td class="num">(${v(r.amount)})</td></tr>`).join('')}
        <tr><td>Tổng thu</td><td class="num">${v(cashflow.totalInflow)}</td></tr>
        <tr><td>Tổng chi</td><td class="num">(${v(cashflow.totalOutflow)})</td></tr>
        <tr class="total-row"><td>Số dư cuối kỳ</td><td class="num">${v(cashflow.closingBalance)}</td></tr>
      </tbody>
    </table>`;

  openReportPrint('BÁO CÁO TÀI CHÍNH', `Từ ngày: ${from} — Đến ngày: ${to}`, pnlHtml + cfHtml);
}

export function printReportKPI({ from, to, data = [] }) {
  const rows = data.map((r, i) => `
    <tr>
      <td class="ctr">${i + 1}</td><td>${r.userName ?? ''}</td>
      <td class="num">${fmtR(r.achieved)}₫</td>
      <td class="num">${r.target > 0 ? fmtR(r.target) + '₫' : '—'}</td>
      <td class="ctr">${r.target > 0 ? Math.round((r.achieved / r.target) * 100) + '%' : '—'}</td>
      <td class="num">${r.newCustomers ?? 0}</td>
      <td class="num">${r.totalOrders ?? 0}</td>
    </tr>`).join('');

  openReportPrint('BÁO CÁO KPI NHÂN VIÊN', `Từ ngày: ${from} — Đến ngày: ${to}`, `
    <table>
      <thead><tr>
        <th>STT</th><th>Nhân viên</th><th>Doanh số đạt</th><th>Chỉ tiêu</th>
        <th>% Hoàn thành</th><th>KH mới</th><th>Số đơn</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="7" class="ctr">Chưa có dữ liệu</td></tr>'}</tbody>
    </table>
  `);
}

export function printReportCommissions({ from, to, data = [] }) {
  const rows = data.map((r, i) => `
    <tr>
      <td class="ctr">${i + 1}</td><td>${r.userName ?? ''}</td>
      <td class="num">${fmtR(r.totalRevenue)}₫</td>
      <td class="num">${r.totalOrders ?? 0}</td>
      <td class="ctr">${r.commissionRate ?? 0}%</td>
      <td class="num">${fmtR(r.commissionAmount)}₫</td>
    </tr>`).join('');

  const total = data.reduce((s, r) => s + Number(r.commissionAmount ?? 0), 0);

  openReportPrint('BẢNG HOA HỒNG NHÂN VIÊN', `Từ ngày: ${from} — Đến ngày: ${to}`, `
    <table>
      <thead><tr>
        <th>STT</th><th>Nhân viên</th><th>Doanh thu</th><th>Số đơn</th><th>Tỷ lệ HH</th><th>Hoa hồng</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="6" class="ctr">Chưa có dữ liệu</td></tr>'}</tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="5" class="num">Tổng cộng:</td>
          <td class="num">${fmtR(total)}₫</td>
        </tr>
      </tfoot>
    </table>
  `);
}

export function printReportPurchaseBySupplier({ from, to, summary = {}, data = [] }) {
  const rows = data.map((r, i) => `
    <tr>
      <td class="ctr">${i + 1}</td>
      <td class="ctr">${r.supplier_code ?? ''}</td>
      <td>${r.supplier_name ?? ''}</td>
      <td>${r.address ?? ''}</td>
      <td class="ctr">${r.order_count ?? 0}</td>
      <td class="num">${fmtR(r.subtotal)}</td>
      <td class="num">${fmtR(r.total_discount)}</td>
      <td class="num">${fmtR(r.total_tax)}</td>
      <td class="num">${fmtR(r.total_payable)}</td>
      <td class="num">${fmtR(r.total_paid)}</td>
      <td class="num${r.remaining > 0 ? '" style="color:#fa8c16' : ''}">${fmtR(r.remaining)}</td>
    </tr>`).join('');

  openReportPrint('BÁO CÁO MUA HÀNG THEO NHÀ CUNG CẤP', `Từ ngày: ${from} — Đến ngày: ${to}`, `
    <table>
      <thead><tr>
        <th>STT</th><th>Mã NCC</th><th>Tên nhà cung cấp</th><th>Địa chỉ</th><th>Số đơn</th>
        <th>Tiền hàng</th><th>Chiết khấu</th><th>Thuế</th>
        <th>Phải trả</th><th>Đã trả</th><th>Còn lại</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="11" class="ctr">Chưa có dữ liệu</td></tr>'}</tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="4" class="num">Tổng cộng:</td>
          <td class="ctr">${summary.total_order_count ?? 0}</td>
          <td class="num">${fmtR(summary.total_subtotal)}</td>
          <td class="num">${fmtR(summary.total_discount)}</td>
          <td class="num">${fmtR(summary.total_tax)}</td>
          <td class="num">${fmtR(summary.total_payable)}</td>
          <td class="num">${fmtR(summary.total_paid)}</td>
          <td class="num">${fmtR(summary.total_remaining)}</td>
        </tr>
      </tfoot>
    </table>
  `);
}

export function printReportDebtSupplier({ from, to, summary = {}, data = [] }) {
  const rows = data.map((r, i) => `
    <tr>
      <td class="ctr">${i + 1}</td>
      <td class="ctr">${r.supplier_code ?? ''}</td>
      <td>${r.supplier_name ?? ''}</td>
      <td class="ctr">${r.phone ?? ''}</td>
      <td class="num">${fmtR(r.opening_debt)}</td>
      <td class="num">${fmtR(r.debit_amount)}</td>
      <td class="num">${fmtR(r.credit_amount)}</td>
      <td class="num${r.closing_debt < 0 ? '" style="color:red' : ''}">${fmtR(r.closing_debt)}</td>
    </tr>`).join('');

  openReportPrint('BÁO CÁO CÔNG NỢ PHẢI TRẢ THEO NHÀ CUNG CẤP', `Từ ngày: ${from} — Đến ngày: ${to}`, `
    <table>
      <thead><tr>
        <th>STT</th><th>Mã NCC</th><th>Tên nhà cung cấp</th><th>Điện thoại</th>
        <th>Nợ đầu kỳ</th><th>Phát sinh tăng</th><th>Phát sinh giảm</th><th>Nợ cuối kỳ</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="8" class="ctr">Chưa có dữ liệu</td></tr>'}</tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="4" class="num">Tổng cộng:</td>
          <td class="num">${fmtR(summary.total_opening_debt)}</td>
          <td class="num">${fmtR(summary.total_debit)}</td>
          <td class="num">${fmtR(summary.total_credit)}</td>
          <td class="num">${fmtR(summary.total_closing_debt)}</td>
        </tr>
      </tfoot>
    </table>
  `);
}

// ─── Phiếu nhập kho ─────────────────────────────────────────────────────────

export function printStockReceipt(receipt) {
  const items = receipt.items ?? [];
  const total = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitCost ?? 0), 0);

  const rows = items.map((i, idx) => `
    <tr>
      <td class="center">${idx + 1}</td>
      <td>${i.productSku ? `[${i.productSku}] ` : ''}${i.productName ?? i.productId}</td>
      <td class="center">${i.unitName ?? '—'}</td>
      <td class="num">${fmtNum(i.quantity)}</td>
      <td class="num">${fmtVND(i.unitCost)}</td>
      <td class="num">${fmtVND(Number(i.quantity) * Number(i.unitCost ?? 0))}</td>
      <td class="center">${i.batchNumber || '—'}</td>
      <td class="center">${i.expiryDate ? dayjs(i.expiryDate).format('DD/MM/YYYY') : '—'}</td>
    </tr>`).join('');

  openPrint(`
    <div class="header">
      <div class="company-name">— Phần mềm quản lý bán hàng —</div>
      <div class="doc-title">Phiếu nhập kho</div>
      <div class="doc-code">Mã tham chiếu: ${receipt.refCode || '—'}</div>
      <div class="doc-date">Ngày in: ${fmtDate(new Date())}</div>
    </div>

    <div class="info-grid">
      <div class="info-row"><span class="info-label">Nhà cung cấp:</span><span class="info-value">${receipt.supplierName ? `${receipt.supplierCode} — ${receipt.supplierName}` : (receipt.supplierCode || '—')}</span></div>
      <div class="info-row"><span class="info-label">Kho nhập:</span><span class="info-value">${receipt.warehouseName ?? receipt.warehouseId ?? '—'}</span></div>
      <div class="info-row"><span class="info-label">Ngày dự kiến:</span><span class="info-value">${receipt.expectedDate ? dayjs(receipt.expectedDate).format('DD/MM/YYYY') : '—'}</span></div>
      <div class="info-row"><span class="info-label">Ngày xác nhận:</span><span class="info-value">${receipt.confirmedAt ? fmtDate(receipt.confirmedAt) : '—'}</span></div>
      <div class="info-row"><span class="info-label">Trạng thái:</span><span class="info-value">${{ DRAFT: 'Nháp', CONFIRMED: 'Đã xác nhận', CANCELLED: 'Đã hủy' }[receipt.status] ?? receipt.status}</span></div>
      <div class="info-row"><span class="info-label">Ghi chú:</span><span class="info-value">${receipt.notes || '—'}</span></div>
    </div>

    <table>
      <thead><tr>
        <th style="width:36px">STT</th><th>Sản phẩm</th><th>ĐVT</th>
        <th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th>
        <th>Số lô</th><th>HSD</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr class="total-row">
        <td colspan="5" class="num">Tổng cộng:</td>
        <td class="num">${fmtVND(total)}</td>
        <td colspan="2"></td>
      </tr></tfoot>
    </table>

    <div class="signatures">
      <div class="sig-box"><div class="sig-title">Người lập phiếu</div><div class="sig-note">(Ký, ghi rõ họ tên)</div><div class="sig-line">&nbsp;</div></div>
      <div class="sig-box"><div class="sig-title">Thủ kho</div><div class="sig-note">(Ký, ghi rõ họ tên)</div><div class="sig-line">&nbsp;</div></div>
      <div class="sig-box"><div class="sig-title">Kế toán / Giám đốc</div><div class="sig-note">(Ký, ghi rõ họ tên)</div><div class="sig-line">&nbsp;</div></div>
    </div>
  `);
}

// ─── Phiếu xuất kho ─────────────────────────────────────────────────────────

export function printStockIssue(issue) {
  const items = issue.items ?? [];
  const ISSUE_LABELS = { SALE: 'Xuất bán', INTERNAL: 'Xuất nội bộ', DAMAGED: 'Hỏng / Hủy' };

  const rows = items.map((i, idx) => `
    <tr>
      <td class="center">${idx + 1}</td>
      <td>${i.productSku ? `[${i.productSku}] ` : ''}${i.productName ?? i.productId}</td>
      <td class="center">${i.unitName ?? '—'}</td>
      <td class="num">${fmtNum(i.quantity)}</td>
      <td class="num">${fmtNum(i.qtyInBase)}</td>
      <td class="num">${i.unitCost ? fmtVND(i.unitCost) : '—'}</td>
    </tr>`).join('');

  openPrint(`
    <div class="header">
      <div class="company-name">— Phần mềm quản lý bán hàng —</div>
      <div class="doc-title">Phiếu xuất kho</div>
      <div class="doc-date">Ngày in: ${fmtDate(new Date())}</div>
    </div>

    <div class="info-grid">
      <div class="info-row"><span class="info-label">Kho xuất:</span><span class="info-value">${issue.warehouseName ?? issue.warehouseId ?? '—'}</span></div>
      <div class="info-row"><span class="info-label">Loại xuất:</span><span class="info-value">${ISSUE_LABELS[issue.issueType] ?? issue.issueType}</span></div>
      <div class="info-row"><span class="info-label">Mã đơn hàng:</span><span class="info-value">${issue.orderId || '—'}</span></div>
      <div class="info-row"><span class="info-label">Ngày xác nhận:</span><span class="info-value">${issue.confirmedAt ? fmtDate(issue.confirmedAt) : '—'}</span></div>
      <div class="info-row"><span class="info-label">Trạng thái:</span><span class="info-value">${{ DRAFT: 'Nháp', CONFIRMED: 'Đã xác nhận', CANCELLED: 'Đã hủy' }[issue.status] ?? issue.status}</span></div>
      <div class="info-row"><span class="info-label">Ghi chú:</span><span class="info-value">${issue.notes || '—'}</span></div>
    </div>

    <table>
      <thead><tr>
        <th style="width:36px">STT</th><th>Sản phẩm</th><th>ĐVT</th>
        <th>Số lượng</th><th>SL cơ bản</th><th>Đơn giá TB</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="signatures">
      <div class="sig-box"><div class="sig-title">Người lập phiếu</div><div class="sig-note">(Ký, ghi rõ họ tên)</div><div class="sig-line">&nbsp;</div></div>
      <div class="sig-box"><div class="sig-title">Thủ kho</div><div class="sig-note">(Ký, ghi rõ họ tên)</div><div class="sig-line">&nbsp;</div></div>
      <div class="sig-box"><div class="sig-title">Kế toán / Giám đốc</div><div class="sig-note">(Ký, ghi rõ họ tên)</div><div class="sig-line">&nbsp;</div></div>
    </div>
  `);
}

// ─── Đơn bán hàng ────────────────────────────────────────────────────────────

export function printSalesOrder(order) {
  const items = order.items ?? [];
  const PAYMENT_LABELS = { CASH: 'Tiền mặt', BANK_TRANSFER: 'Chuyển khoản', CREDIT: 'Công nợ' };
  const STATUS_LABELS = { DRAFT: 'Nháp', CONFIRMED: 'Đã xác nhận', DELIVERING: 'Đang giao', DELIVERED: 'Đã giao', CANCELLED: 'Đã hủy' };

  const rows = items.map((i, idx) => {
    const lineTotal = Number(i.lineTotal ?? (Number(i.unitPrice) * Number(i.quantity)));
    return `
    <tr>
      <td class="center">${idx + 1}</td>
      <td>${i.productName ?? i.productId}</td>
      <td class="center">${i.unitId ?? '—'}</td>
      <td class="num">${fmtNum(i.quantity)}</td>
      <td class="num">${fmtVND(i.unitPrice)}</td>
      <td class="num">${i.discountPercent > 0 ? i.discountPercent + '%' : (i.discountAmount > 0 ? fmtVND(i.discountAmount) : '—')}</td>
      <td class="num">${fmtVND(lineTotal)}</td>
    </tr>`;
  }).join('');

  openPrint(`
    <div class="header">
      <div class="company-name">— Phần mềm quản lý bán hàng —</div>
      <div class="doc-title">Đơn bán hàng</div>
      <div class="doc-code">Mã đơn: ${order.code}</div>
      <div class="doc-date">Ngày in: ${fmtDate(new Date())}</div>
    </div>

    <div class="info-grid">
      <div class="info-row"><span class="info-label">Khách hàng:</span><span class="info-value">${order.customer?.name ?? order.customer_name ?? order.customerId ?? '—'}</span></div>
      <div class="info-row"><span class="info-label">Ngày tạo:</span><span class="info-value">${fmtDate(order.createdAt ?? order.created_at)}</span></div>
      <div class="info-row"><span class="info-label">NV phụ trách:</span><span class="info-value">${order.salesRep?.name ?? order.sales_rep_name ?? '—'}</span></div>
      <div class="info-row"><span class="info-label">Kho xuất:</span><span class="info-value">${order.warehouseId ?? '—'}</span></div>
      <div class="info-row"><span class="info-label">Hình thức TT:</span><span class="info-value">${PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod ?? '—'}</span></div>
      <div class="info-row"><span class="info-label">Địa chỉ giao:</span><span class="info-value">${order.shippingAddress ?? '—'}</span></div>
      <div class="info-row"><span class="info-label">Trạng thái:</span><span class="info-value">${STATUS_LABELS[order.status] ?? order.status}</span></div>
      <div class="info-row"><span class="info-label">Ghi chú:</span><span class="info-value">${order.notes || '—'}</span></div>
    </div>

    <table>
      <thead><tr>
        <th style="width:36px">STT</th><th>Sản phẩm</th><th>ĐVT</th>
        <th>Số lượng</th><th>Đơn giá</th><th>Chiết khấu</th><th>Thành tiền</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td colspan="6" class="num">Tổng tiền hàng:</td><td class="num">${fmtVND(order.subtotal)}</td></tr>
        ${Number(order.discountTotal) > 0 ? `<tr><td colspan="6" class="num">Chiết khấu:</td><td class="num">- ${fmtVND(order.discountTotal)}</td></tr>` : ''}
        ${Number(order.voucherDiscount) > 0 ? `<tr><td colspan="6" class="num">Giảm voucher:</td><td class="num">- ${fmtVND(order.voucherDiscount)}</td></tr>` : ''}
        <tr class="total-row"><td colspan="6" class="num">Tổng thanh toán:</td><td class="num">${fmtVND(order.totalAmount ?? order.total_amount)}</td></tr>
        ${Number(order.paidAmount) > 0 ? `<tr><td colspan="6" class="num">Đã thanh toán:</td><td class="num">${fmtVND(order.paidAmount)}</td></tr>` : ''}
        ${Number(order.paidAmount) > 0 ? `<tr><td colspan="6" class="num">Còn nợ:</td><td class="num">${fmtVND(Number(order.totalAmount ?? order.total_amount) - Number(order.paidAmount))}</td></tr>` : ''}
      </tfoot>
    </table>

    <div class="signatures">
      <div class="sig-box"><div class="sig-title">Khách hàng</div><div class="sig-note">(Ký, ghi rõ họ tên)</div><div class="sig-line">&nbsp;</div></div>
      <div class="sig-box"><div class="sig-title">Nhân viên bán hàng</div><div class="sig-note">(Ký, ghi rõ họ tên)</div><div class="sig-line">&nbsp;</div></div>
      <div class="sig-box"><div class="sig-title">Giám đốc</div><div class="sig-note">(Ký, ghi rõ họ tên)</div><div class="sig-line">&nbsp;</div></div>
    </div>
  `);
}

// ─── Đơn mua hàng ────────────────────────────────────────────────────────────

export function printPurchaseOrder(order) {
  const items = order.items ?? [];
  const PAYMENT_LABELS = { CASH: 'Tiền mặt', BANK_TRANSFER: 'Chuyển khoản', CREDIT: 'Công nợ' };
  const STATUS_LABELS = { DRAFT: 'Nháp', CONFIRMED: 'Đã xác nhận', DELIVERED: 'Đã nhập hàng', CANCELLED: 'Đã hủy' };

  const rows = items.map((i, idx) => {
    const lineTotal = Number(i.lineTotal ?? Number(i.unit_price ?? i.unitPrice) * Number(i.quantity));
    return `
    <tr>
      <td class="center">${idx + 1}</td>
      <td>${i.productName ?? i.productId}</td>
      <td class="num">${fmtNum(i.quantity)}</td>
      <td class="num">${fmtVND(i.unit_price ?? i.unitPrice)}</td>
      <td class="num">${fmtVND(lineTotal)}</td>
    </tr>`;
  }).join('');

  openPrint(`
    <div class="header">
      <div class="company-name">— Phần mềm quản lý bán hàng —</div>
      <div class="doc-title">Đơn mua hàng</div>
      <div class="doc-code">Mã đơn: ${order.code}</div>
      <div class="doc-date">Ngày in: ${fmtDate(new Date())}</div>
    </div>

    <div class="info-grid">
      <div class="info-row"><span class="info-label">Nhà cung cấp:</span><span class="info-value">${order.supplier_name ?? order.supplier?.name ?? order.supplierId ?? '—'}</span></div>
      <div class="info-row"><span class="info-label">Ngày tạo:</span><span class="info-value">${fmtDate(order.createdAt ?? order.created_at)}</span></div>
      <div class="info-row"><span class="info-label">Kho nhập:</span><span class="info-value">${order.warehouseId ?? '—'}</span></div>
      <div class="info-row"><span class="info-label">Hình thức TT:</span><span class="info-value">${PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod ?? '—'}</span></div>
      <div class="info-row"><span class="info-label">Trạng thái:</span><span class="info-value">${STATUS_LABELS[order.status] ?? order.status}</span></div>
      <div class="info-row"><span class="info-label">Ghi chú:</span><span class="info-value">${order.notes || '—'}</span></div>
    </div>

    <table>
      <thead><tr>
        <th style="width:36px">STT</th><th>Sản phẩm</th>
        <th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr class="total-row"><td colspan="4" class="num">Tổng cộng:</td><td class="num">${fmtVND(order.totalAmount ?? order.total_amount)}</td></tr>
      </tfoot>
    </table>

    <div class="signatures">
      <div class="sig-box"><div class="sig-title">Nhà cung cấp</div><div class="sig-note">(Ký, ghi rõ họ tên)</div><div class="sig-line">&nbsp;</div></div>
      <div class="sig-box"><div class="sig-title">Người lập đơn</div><div class="sig-note">(Ký, ghi rõ họ tên)</div><div class="sig-line">&nbsp;</div></div>
      <div class="sig-box"><div class="sig-title">Giám đốc</div><div class="sig-note">(Ký, ghi rõ họ tên)</div><div class="sig-line">&nbsp;</div></div>
    </div>
  `);
}

// ─── Lệnh điều chuyển kho ───────────────────────────────────────────────────

export function printStockTransfer(transfer) {
  const items = transfer.items ?? [];
  const STATUS_LABELS = {
    PENDING: 'Chờ xuất kho', IN_TRANSIT: 'Đang vận chuyển',
    RECEIVED: 'Đã nhận', CANCELLED: 'Đã hủy',
  };

  const rows = items.map((i, idx) => `
    <tr>
      <td class="center">${idx + 1}</td>
      <td>${i.productName ?? i.productSku ?? i.productId}</td>
      <td class="center">${i.unitName ?? i.unitId ?? '—'}</td>
      <td class="num">${fmtNum(i.quantity)}</td>
      <td class="num">${i.receivedQty != null ? fmtNum(i.receivedQty) : '—'}</td>
    </tr>`).join('');

  openPrint(`
    <div class="header">
      <div class="company-name">— Phần mềm quản lý bán hàng —</div>
      <div class="doc-title">Lệnh điều chuyển kho</div>
      <div class="doc-date">Ngày in: ${fmtDate(new Date())}</div>
    </div>

    <div class="info-grid">
      <div class="info-row"><span class="info-label">Kho đi:</span><span class="info-value">${transfer.fromWarehouseName ?? transfer.fromWarehouseId ?? '—'}</span></div>
      <div class="info-row"><span class="info-label">Kho đến:</span><span class="info-value">${transfer.toWarehouseName ?? transfer.toWarehouseId ?? '—'}</span></div>
      <div class="info-row"><span class="info-label">Ngày dự kiến:</span><span class="info-value">${transfer.expectedDate ? dayjs(transfer.expectedDate).format('DD/MM/YYYY') : '—'}</span></div>
      <div class="info-row"><span class="info-label">Xuất kho lúc:</span><span class="info-value">${transfer.dispatchedAt ? fmtDate(transfer.dispatchedAt) : '—'}</span></div>
      <div class="info-row"><span class="info-label">Nhận hàng lúc:</span><span class="info-value">${transfer.receivedAt ? fmtDate(transfer.receivedAt) : '—'}</span></div>
      <div class="info-row"><span class="info-label">Trạng thái:</span><span class="info-value">${STATUS_LABELS[transfer.status] ?? transfer.status}</span></div>
      <div class="info-row"><span class="info-label">Ghi chú:</span><span class="info-value">${transfer.notes || '—'}</span></div>
    </div>

    <table>
      <thead><tr>
        <th style="width:36px">STT</th><th>Sản phẩm</th><th>ĐVT</th>
        <th>SL điều chuyển</th><th>SL thực nhận</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="signatures">
      <div class="sig-box"><div class="sig-title">Thủ kho xuất</div><div class="sig-note">(Ký, ghi rõ họ tên)</div><div class="sig-line">&nbsp;</div></div>
      <div class="sig-box"><div class="sig-title">Người vận chuyển</div><div class="sig-note">(Ký, ghi rõ họ tên)</div><div class="sig-line">&nbsp;</div></div>
      <div class="sig-box"><div class="sig-title">Thủ kho nhận</div><div class="sig-note">(Ký, ghi rõ họ tên)</div><div class="sig-line">&nbsp;</div></div>
    </div>
  `);
}

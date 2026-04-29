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

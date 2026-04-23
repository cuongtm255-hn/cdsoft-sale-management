# MODULE 8 — Invoice & Payment: Frontend Detail Design

> Ref: `usecase.md` UC-23 → UC-25 | `srs-tenant-detail.md` Ch.5 | Feature list tasks #92, #95, #97, #100–#101, #104, #135–#136

---

## 8.1 Invoice View Screen

### Task: #92

**Route:** `/invoices/:id`  
**Access:** All roles (STAFF chỉ xem invoice của đơn mình tạo)

### Layout
```
[← Quay lại]  INV-2026-0001  [Status: ĐÃ THANH TOÁN 🟢]   [In PDF] [Xuất PDF]
─────────────────────────────────────────────────────────────────
Người mua:                          Người bán:
ABC Corp                            [Tên tenant]
MST: 0123456789                     [Địa chỉ tenant]
123 Nguyen Hue, Q1, HCM
─────────────────────────────────────────────────────────────────
| # | Tên sản phẩm   | ĐVT  | SL | Đơn giá    | CK  | Thành tiền  |
|---|----------------|------|----|------------|-----|-------------|
| 1 | Aquafina 500ml | Chai | 10 | 9,500₫     | 5%  | 90,250₫     |
─────────────────────────────────────────────────────────────────
                        Tạm tính:       95,000₫
                        Chiết khấu:      4,750₫
                        Tổng tiền:      90,250₫
                        Đã thanh toán:  90,250₫
                        Còn lại:             0₫
─────────────────────────────────────────────────────────────────
Lịch sử thanh toán:
  22/04 14:30 — Chuyển khoản VCB — 50,000₫
  23/04 09:00 — Tiền mặt — 40,250₫
─────────────────────────────────────────────────────────────────
[Thu tiền]  (hiện nếu status ≠ PAID)
```

### Status Badges
| Status | Color | Label |
|--------|-------|-------|
| UNPAID | red | Chưa thanh toán |
| PARTIALLY_PAID | orange | Thanh toán 1 phần |
| PAID | green | Đã thanh toán |

### Print / Export
- "In PDF": mở print dialog (hoặc `window.print()` với CSS print styles)
- "Xuất PDF": `GET /invoices/:id/pdf` → download file

---

## 8.2 Record Payment Modal

### Task: #95

**Trigger:** Nút "Thu tiền" trên Invoice Detail hoặc Order Detail

### Layout (Modal)
```
[Header: "Ghi nhận thanh toán — INV-2026-0001"]
──────────────────────────────────────────────
Tổng tiền:        90,250₫
Đã thanh toán:    50,000₫
Còn lại:          40,250₫  ← auto-fill vào Số tiền
──────────────────────────────────────────────
Số tiền: [40,250     ]₫    (default = remainingAmount)
Phương thức: [Tiền mặt ▼]
  Nếu Chuyển khoản: [Tài khoản ngân hàng ▼]  [Mã GD: _______]
Ngày thanh toán: [22/04/2026] (default: hôm nay)
Ghi chú: [..................................]
──────────────────────────────────────────────
[Hủy]  [Xác nhận thu tiền]
```

### Form Fields
| Field | Required | Validation |
|-------|----------|------------|
| Số tiền | ✅ | > 0, ≤ remainingAmount |
| Phương thức | ✅ | Dropdown: Tiền mặt/Chuyển khoản/Thẻ/Ví điện tử |
| Tài khoản NH | Conditional | Bắt buộc nếu Chuyển khoản |
| Mã giao dịch | ❌ | Chỉ hiện khi Chuyển khoản |
| Ngày TT | ✅ | Không chọn ngày tương lai |

### Flow
1. Modal mở → pre-fill `remainingAmount` vào số tiền
2. Submit → `POST /payments { invoiceId, amount, method, ... }`
3. Success: đóng modal, cập nhật status badge + lịch sử TT trên invoice
4. Nếu `paidAmount = totalAmount` → toast "Hoá đơn đã được thanh toán đầy đủ ✅"

---

## 8.3 Payment History Screen

### Task: #97

**Route:** `/customers/:id` → Tab "Lịch sử thanh toán"

```
[Filter: Từ ngày] [Đến ngày]
─────────────────────────────────────────
| Ngày       | Mã HĐ        | Số tiền    | Phương thức | Mã GD     |
|------------|--------------|------------|-------------|-----------|
| 22/04/2026 | INV-2026-0001| 50,000₫    | CK VCB      | FT-123456 |
| 23/04/2026 | INV-2026-0001| 40,250₫    | Tiền mặt    | —         |
─────────────────────────────────────────
Summary: Tổng đã thu: 90,250₫ | Nợ hiện tại: 12,500,000₫
```

---

## 8.4 Accounts Receivable Screen

### Task: #100, #101

**Route:** `/finance/ar`  
**Access:** `ACCOUNTANT`, `MANAGER`, `TENANT_ADMIN`

### Layout
```
[Header: "Công nợ phải thu"]
[Ngày báo cáo: 22/04/2026]  [Tìm khách hàng]  [Xuất Excel]
────────────────────────────────────────────────────────────────────────────
| Khách hàng | Hiện tại     | 1-30 ngày    | 31-60 ngày | 61-90 ngày | >90 | Tổng |
|------------|--------------|--------------|------------|------------|-----|------|
| ABC Corp   | 5,000,000₫   | 3,000,000₫  | 2,000,000₫ | 1,000,000₫ | 0₫  | 11M₫ |
| Nguyễn B   | 0₫           | 500,000₫    | 0₫         | 0₫         | 0₫  | 500K₫|
────────────────────────────────────────────────────────────────────────────
TỔNG:        | 5,000,000₫   | 3,500,000₫  | ...
```

- Click row → mở chi tiết công nợ KH đó (danh sách invoice chưa thanh toán)
- Cột `>90` highlight đỏ nếu > 0 (nợ khó đòi)

### Debt Matching (Đối trừ chứng từ) — Task #101

**Trigger:** Nút "Đối trừ" trên hàng KH có `>1 invoice unpaid`

```
[Modal: "Đối trừ chứng từ — ABC Corp"]
Khoản thanh toán nhận được: [Chọn payment ▼]  (50,000,000₫ chưa phân bổ)
───────────────────────────────────────────────
Phân bổ vào hoá đơn:
| ☑ INV-2026-0001 | Còn lại: 40,250₫  | Phân bổ: [40,250₫] |
| ☑ INV-2026-0002 | Còn lại: 9,750₫   | Phân bổ: [9,750₫ ] |
───────────────────────────────────────────────
Tổng phân bổ: 50,000₫ / 50,000₫ ← must match
[Xác nhận đối trừ]
```

---

## 8.5 Accounts Payable Screen

### Task: #104

**Route:** `/finance/ap`  
**Access:** `ACCOUNTANT`, `MANAGER`, `TENANT_ADMIN`

### Layout
```
[Header: "Công nợ phải trả"]
[Lịch TT dự kiến ▼: 30 ngày tới]  [Tìm NCC]
────────────────────────────────────────────────────
| NCC             | Mã phiếu  | Số tiền     | Đến hạn    | Còn (ngày) |
|-----------------|-----------|-------------|------------|------------|
| XYZ Corp        | NK-0001   | 12,000,000₫ | 01/05/2026 | 9 ngày     |
| Minh Tài        | NK-0002   | 3,500,000₫  | 28/04/2026 | 6 ngày     |
| Quá hạn NCC ABC | NK-0003   | 8,000,000₫  | 15/04/2026 | -7 ngày 🔴 |
────────────────────────────────────────────────────
[Thanh toán] button → PaymentDisbursementModal
```

- Hàng đã quá hạn: highlight đỏ + số ngày âm
- Nút "Thanh toán" → Modal phiếu chi

---

## 8.6 Cash & Bank Management Screen

### Task: #135, #136

**Route:** `/finance/cash`  
**Access:** `ACCOUNTANT`, `MANAGER`, `TENANT_ADMIN`

### Layout
```
Tabs: [Quỹ tiền mặt] [Tài khoản ngân hàng] [Phiếu thu/chi]
```

**Quỹ tiền mặt tab:**
```
┌────────────────────────────────┐
│ Quỹ chính         [+ Phiếu thu] [+ Phiếu chi]
│ Số dư: 25,000,000₫
└────────────────────────────────┘
```

**Phiếu thu/chi tab:**
Danh sách phiếu thu + phiếu chi, filter theo loại/ngày/người tạo

**Manual Receipt/Disbursement Form (Task #136):**
```
Loại: [Phiếu thu ▼ / Phiếu chi ▼]
Số tiền: [___________₫]
Quỹ/TK: [Quỹ chính ▼]
Đối tượng: [KH/NCC/Nội bộ ▼]
Mô tả: [_________________]
[Lưu]
```

---

## Navigation Flow

```
/orders/:id (Order Detail)
  └─ "Thu tiền" → PaymentModal (overlay)

/invoices/:id (Invoice Detail)
  └─ "Thu tiền" → PaymentModal
  └─ "In PDF" → print
  └─ "Xuất PDF" → download

/finance/ar (AR Screen)
  └─ Click KH row → AR detail with invoice list
  └─ "Đối trừ" → MatchingModal

/finance/ap (AP Screen)
  └─ "Thanh toán" → DisbursementModal

/finance/cash → Manual receipts/disbursements
```

---

## Shared Components

| Component | Mô tả |
|-----------|-------|
| `<InvoiceStatusBadge status />` | Badge theo invoice status |
| `<PaymentModal invoiceId onPaid />` | Modal ghi thanh toán |
| `<InvoicePrintTemplate invoice />` | Template in/export PDF |
| `<AgingTable data />` | Bảng tuổi nợ với highlight |
| `<DebtMatchingModal payment invoices />` | Đối trừ chứng từ |
| `<DisbursementModal ap onPaid />` | Phiếu chi thanh toán NCC |

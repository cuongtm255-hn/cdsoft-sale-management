# MODULE 4 — Customer Master Data: Frontend Detail Design

> Ref: `usecase.md` UC-12 → UC-14 | `srs-tenant-detail.md` Ch.2.2 | Feature list tasks #39, #43, #45

---

## Architecture Notes

- Tenant pages: `src/tenant/pages/`
- Imports: `@shared/components/PageHeader`, `@shared/components/DataTable`, `@shared/hooks/useApi`, `@api/tenant.api`
- API: `customersApi` from `@api/tenant.api` → `GET /tenant/customers`, `POST /tenant/customers`, `PUT /tenant/customers/:id`
- Hook pattern:
  ```jsx
  const { fetch, loading, data, pagination, onTableChange } = usePagination(customersApi.list);
  const { execute: createCustomer } = useApi(customersApi.create, { successMessage: 'Customer created', onSuccess: () => fetch() });
  ```

---

## 4.1 Customer List Screen

### Task: #39

**Route:** `/tenant/customers`
**Access:** All authenticated tenant users

### Layout
```
[Header: "Khách hàng"]                               [+ Thêm khách hàng]
[Search: Mã/Tên/SĐT/Email]  [Nhóm KH filter]  [NV phụ trách filter]
──────────────────────────────────────────────────────────────────
| Mã KH    | Tên               | Nhóm     | Nợ hiện tại | Điểm   | Actions |
|----------|-------------------|----------|-------------|--------|---------|
| KH-0001  | Công ty ABC       | Buôn sỉ  | 12,500,000₫ | 🥇1200 | Edit ⋮  |
| KH-0002  | Nguyễn Thị B      | Lẻ       | 0₫          | 🥈 200 | Edit ⋮  |
──────────────────────────────────────────────────────────────────
[Pagination]
```

### Components
- **CustomerTable:** Cột: Mã, Tên, Nhóm badge, Nợ hiện tại (đỏ nếu > 0), Điểm tích lũy + tier icon, Actions
- **GroupBadge:** Màu: RETAIL=gray, WHOLESALE=blue, AGENT=purple, VIP=gold
- **MemberTierIcon:** 🥇=DIAMOND, 🥇=GOLD, 🥈=SILVER, —=NONE
- **DebtCell:** Màu đỏ nếu `currentDebt > 0`; "Không nợ" nếu = 0
- **SalesRepFilter:** Dropdown chọn NV phụ trách (chỉ hiện cho MANAGER, ADMIN)

### States
- Cột nợ: nếu `currentDebt >= creditLimit` → highlight đỏ + tooltip "Đã đạt hạn mức tín dụng"
- Empty state: "Chưa có khách hàng. Thêm khách hàng đầu tiên."

---

## 4.2 Create / Edit Customer Form

### Task: #43

**Route:** `/customers/new` · `/customers/:id/edit`

### Form Fields
| Field | Type | Required | Visible to STAFF | Validation |
|-------|------|----------|-----------------|------------|
| Mã khách hàng | Text | ❌ (auto) | ✅ | Auto-gen nếu bỏ trống |
| Tên KH/Công ty | Text | ✅ | ✅ | Min 2 ký tự |
| Mã số thuế | Text | ❌ | ✅ | 10 hoặc 13 chữ số |
| Số điện thoại | Tel | ❌ | ✅ | Format VN |
| Email | Email | ❌ | ✅ | Valid email |
| Nhóm khách hàng | Select | ✅ | ✅ | RETAIL/WHOLESALE/AGENT/VIP |
| Hạn mức tín dụng | Number (₫) | ❌ | ❌ (ẩn) | Min 0 |
| Thời hạn nợ (ngày) | Number | ❌ | ❌ (ẩn) | Min 0 |
| NV phụ trách | Select | ❌ | ✅ | List users có role STAFF/MANAGER |
| Địa chỉ | Composite | ❌ | ✅ | Street, Quận, Tỉnh/TP |
| Ghi chú | Textarea | ❌ | ✅ | — |

**Permission handling:**
- STAFF không thấy field "Hạn mức tín dụng" và "Thời hạn nợ"
- Nhóm khách hàng: STAFF chỉ được chọn RETAIL; MANAGER+ có thể chọn tất cả

### Flow
1. Fill form → "Lưu"
2. `customersApi.create(values)` hoặc `customersApi.update(id, values)`
3. Success: redirect đến `/customers/:id` (detail)
4. Lỗi 409: "Mã khách hàng đã tồn tại"

---

## 4.3 Customer Detail Screen

**Route:** `/tenant/customers/:id`

### Layout
```
[← Quay lại]  "Công ty TNHH ABC"  [KH-0001]  [WHOLESALE 🏷]  [Edit]
──────────────────────────────────────────────────────────────
Stats Bar:
  Tổng mua: 120,000,000₫  |  Nợ hiện tại: 12,500,000₫  |  Điểm: 1,200 (GOLD)
──────────────────────────────────────────────────────────────
Tabs: [Thông tin] [Lịch sử giao dịch] [Lịch sử thanh toán]
```

**Thông tin tab:** Hiển thị đầy đủ thông tin KH dạng read-only (không edit inline)

---

## 4.4 Customer Transaction History

### Task: #45

**Location:** Tab "Lịch sử giao dịch" trong Customer Detail

### Layout
```
[Filter: Loại (ALL/Đơn hàng/Thanh toán/Trả hàng)]  [Từ ngày] [Đến ngày]
──────────────────────────────────────────────────────
| Ngày       | Loại        | Mã chứng từ | Số tiền     | Số dư nợ  |
|------------|-------------|-------------|-------------|-----------|
| 01/04/2026 | 📦 Đơn hàng | SO-0001     | +5,000,000₫ | -5,000,000₫ |
| 05/04/2026 | 💰 Thanh toán | PT-0012   | -3,000,000₫ | -2,000,000₫ |
──────────────────────────────────────────────────────
```

### Components
- **TransactionTypeIcon:** 📦 Order · 💰 Payment · 🔄 Return
- **AmountCell:** Đơn hàng = màu đỏ (nợ phát sinh); Thanh toán = màu xanh (giảm nợ)
- Click row → navigate đến trang chi tiết chứng từ tương ứng

### API Integration
- `GET /tenant/customers/:id/transactions?type=&from=&to=&page=&limit=`
- Re-fetch khi filter thay đổi

---

## Navigation Flow

```
/customers (List)
  └─ "+ Thêm KH" → /customers/new
  └─ Click row → /customers/:id (Detail)
       ├─ "Edit" → /customers/:id/edit
       ├─ Tab "Lịch sử GD" → transaction list (lazy load)
       └─ Tab "Lịch sử TT" → payment list (Module 8)
```

---

## Shared Components

| Component | Mô tả |
|-----------|-------|
| `<CustomerGroupBadge group />` | Badge màu theo nhóm KH |
| `<MemberTierBadge tier points />` | Badge hạng thành viên |
| `<DebtSummaryBar creditLimit currentDebt />` | Progress bar hiển thị tỷ lệ nợ/hạn mức |
| `<TransactionTimeline data />` | Timeline lịch sử giao dịch |
| `<SalesRepSelect value onChange />` | Dropdown NV phụ trách (filtered by role) |

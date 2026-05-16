# MODULE 5 — Supplier Master Data: Frontend Detail Design

> Ref: `srs-tenant-detail.md` Ch.2.3 | Feature list tasks #48

---

## Architecture Notes

- Tenant pages: `src/tenant/pages/`
- Imports: `@shared/components/PageHeader`, `@shared/components/DataTable`, `@shared/hooks/useApi`, `@api/tenant.api`
- API: `suppliersApi` from `@api/tenant.api` → `GET /tenant/suppliers`, `POST /tenant/suppliers`
- Hook pattern:
  ```jsx
  const { fetch, loading, data, pagination, onTableChange } = usePagination(suppliersApi.list);
  const { execute: createSupplier } = useApi(suppliersApi.create, { successMessage: 'Supplier created', onSuccess: () => fetch() });
  ```

---

## 5.1 Supplier List Screen

**Route:** `/tenant/suppliers`
**Access:** Authenticated tenant users (role-based visibility in UI)

### Layout
```
[Header: "Nhà cung cấp"]                            [+ Thêm NCC]
[Search: Mã/Tên/MST/SĐT]  [Trạng thái filter]
───────────────────────────────────────────────────────────────
| Mã NCC   | Tên NCC               | MST        | Nợ phải trả | Hạn TT | Actions |
|----------|-----------------------|------------|-------------|--------|---------|
| NCC-0001 | Cty CP Phân phối XYZ  | 0987654321 | 25,000,000₫ | 30 ngày| Edit ⋮ |
| NCC-0002 | Hộ KD Minh Tài        | —          | 0₫          | 0 ngày | Edit ⋮ |
───────────────────────────────────────────────────────────────
[Pagination]
```

### Components
- **SupplierTable:** Cột Mã, Tên, MST, Nợ phải trả (đỏ nếu > 0), Hạn thanh toán, Actions
- **DualRoleBadge:** Hiển thị icon 🔄 nếu NCC này vừa là khách hàng (`isCustomer = true`)
- **ActionsMenu:** Edit, Xem lịch sử nhập, Deactivate (nếu đủ điều kiện)

---

## 5.2 Create / Edit Supplier Form

**Route:** `/tenant/suppliers/new` · `/tenant/suppliers/:id/edit`
**Access:** `TENANT_ADMIN`, `MANAGER`

### Layout (tabs)
```
Tabs: [Thông tin chung] [Tài khoản ngân hàng] [Cài đặt nợ]
```

### Tab 1: Thông tin chung

| Field | Required | Validation |
|-------|----------|------------|
| Mã NCC | ❌ (auto) | Auto-gen `NCC-XXXX` |
| Tên NCC | ✅ | Min 2 ký tự |
| Mã số thuế | ❌ | 10 hoặc 13 số |
| Số điện thoại | ❌ | Format VN |
| Email | ❌ | Valid email |
| Người liên hệ | ❌ | — |
| Địa chỉ | ❌ | Street, Quận, TP |
| Vừa là khách hàng? | Toggle | Nếu bật → hiện field "Chọn khách hàng" |
| Khách hàng liên kết | Select | Chỉ hiện khi toggle trên bật; search KH existing |
| Ghi chú | Textarea | ❌ |

**"Vừa là khách hàng" toggle:**
Khi bật → hiển thị dropdown tìm kiếm khách hàng existing (search by name/code). Mục đích: cấn trừ công nợ 2 chiều (SRS 2.3).

### Tab 2: Tài khoản ngân hàng

Dynamic list — thêm/xóa tài khoản:
```
[+ Thêm tài khoản ngân hàng]
┌────────────────────────────────────────────┐
│ Ngân hàng: [Vietcombank    ]               │
│ Số TK:     [1234567890     ]               │
│ Tên TK:    [CONG TY CP XYZ]               │
│ Chi nhánh: [TP HCM         ]      [🗑]     │
└────────────────────────────────────────────┘
```

### Tab 3: Cài đặt nợ

| Field | Type | Description |
|-------|------|-------------|
| Thời hạn thanh toán | Number (ngày) | 0 = thanh toán ngay |
| Điều khoản chiết khấu | Textarea | VD: "2% nếu thanh toán trong 10 ngày" |

---

## 5.3 Supplier Detail Screen

**Route:** `/tenant/suppliers/:id`

### Layout
```
[← Quay lại]  "Cty CP Phân phối XYZ"  [NCC-0001]  [Edit]
──────────────────────────────────────────
Stats: Nợ phải trả: 25,000,000₫  |  Tổng đã nhập: 150,000,000₫
──────────────────────────────────────────
Tabs: [Thông tin] [Lịch sử nhập hàng] [Lịch sử thanh toán]
```

**Lịch sử nhập hàng tab:**
```
| Ngày       | Mã phiếu  | Sản phẩm (tóm tắt) | Giá trị     | Trạng thái |
|------------|-----------|--------------------|-------------|-----------|
| 01/04/2026 | NK-0001   | 3 mặt hàng         | 12,000,000₫ | Đã nhập   |
```

---

## Navigation Flow

```
/suppliers (List)
  └─ "+ Thêm NCC" → /suppliers/new
  └─ "Edit" row / click row → /suppliers/:id/edit hoặc /suppliers/:id
  └─ "Deactivate" → ConfirmDialog → inline update

/suppliers/:id (Detail)
  └─ Tab "Lịch sử nhập" → link sang /inventory/receipts?supplierId=xxx
```

---

## Shared Components

| Component | Mô tả |
|-----------|-------|
| `<BankAccountEditor accounts onChange />` | Dynamic list ngân hàng |
| `<DualRoleBadge />` | Icon NCC vừa là KH |
| `<CustomerLinkSelect value onChange />` | Search + select KH liên kết |

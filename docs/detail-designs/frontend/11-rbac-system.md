# MODULE 11 — RBAC, Audit Log & System: Frontend Detail Design

> Ref: `usecase.md` UC-29, UC-30 | `srs-tenant-detail.md` Ch.8 | Feature list tasks #128, #131, #135–#136

---

## 11.1 Role & Permission Management Screen

### Task: #128

**Route:** `/settings/roles`  
**Access:** `TENANT_ADMIN`

### Layout
```
[Header: "Phân quyền vai trò"]                [+ Tạo vai trò mới]
──────────────────────────────────────────────────────────────
Tabs: [STAFF] [WAREHOUSE] [ACCOUNTANT] [MANAGER] [ADMIN] [+ Tùy chỉnh]
──────────────────────────────────────────────────────────────
Tab: STAFF (Nhân viên bán hàng)  [isSystem badge]
5 người dùng đang dùng vai trò này
──────────────────────────────────────────────────────────────
MA TRẬN QUYỀN:
              | Xem | Thêm/Sửa | Xóa |
Sản phẩm      |  ✅  |    ✅    |  ❌  |
Khách hàng    |  ✅  |    ✅    |  ❌  |
Đơn hàng      |  ✅  |    ✅    |  ❌  |
Xác nhận đơn  |  ✅  |    —     |  —  |
Kho/Tồn kho   |  ✅  |    ❌    |  ❌  |
Thanh toán    |  ✅  |    ✅    |  ❌  |
Giá vốn       |  ❌  |    —     |  —  |
Báo cáo       |  ❌  |    —     |  —  |
Báo cáo TC    |  ❌  |    —     |  —  |
Quản lý Users |  ❌  |    ❌    |  ❌  |
──────────────────────────────────────────────────────────────
[Lưu thay đổi]  (disabled cho system roles)
```

### System Role Behavior
- System roles (STAFF, WAREHOUSE, ACCOUNTANT, MANAGER, ADMIN): Checkbox disabled + tooltip "System role — không thể sửa"
- Custom roles: Checkbox enabled, có thể sửa tự do

### Create Custom Role
```
[Modal: "Tạo vai trò mới"]
Tên vai trò (label): [____________]
Mã vai trò: [____________] (uppercase, no spaces)
[Tiếp theo → chọn permissions]
```

Sau bước 1: hiển thị permission matrix với tất cả unchecked, user tick tùy chọn.

---

## 11.2 Audit Log Screen

### Task: #131

**Route:** `/settings/audit-logs`  
**Access:** `MANAGER`, `TENANT_ADMIN`

### Layout
```
[Header: "Nhật ký hoạt động"]
[Người dùng ▼] [Đối tượng ▼: Tất cả] [Hành động ▼] [Từ ngày] [Đến ngày]
──────────────────────────────────────────────────────────────────────────
| Thời gian        | Người dùng   | Hành động         | Đối tượng    |
|------------------|--------------|-------------------|--------------|
| 22/04 14:30:05   | Nguyen Van A | Xác nhận đơn hàng | SO-2026-0001 |
| 22/04 14:28:00   | Tran Thi B   | Sửa sản phẩm      | Aquafina 500 |
| 22/04 14:00:00   | Nguyen Van A | Xóa khách hàng    | KH-0045      |
──────────────────────────────────────────────────────────────────────────
[Pagination — load more hoặc pages]
```

### Log Detail (click vào row)
```
[Expanded row / Drawer]
Action: PUT:/orders/:id/confirm
Thời gian: 22/04/2026 14:30:05
IP: 192.168.1.10 | Role: STAFF
─────────────────────────────────────
Trước:  { "status": "DRAFT" }
Sau:    { "status": "CONFIRMED", "confirmedAt": "..." }
```

### Filter Options
- **Người dùng:** Dropdown tất cả users trong tenant
- **Đối tượng:** orders, products, customers, users, inventory, payments, settings
- **Hành động:** Tạo mới, Cập nhật, Xóa, Đăng nhập, Thay đổi trạng thái
- **Khoảng thời gian:** Date range picker

---

## 11.3 Cash & Bank Management

### Task: #135, #136

**Route:** `/settings/cash`  
**Access:** `ACCOUNTANT`, `MANAGER`, `TENANT_ADMIN`

### Layout
```
Tabs: [Quỹ tiền mặt] [Tài khoản ngân hàng] [Kho hàng] [Phiếu thu/chi chờ duyệt]
```

**Quỹ tiền mặt tab:**
```
[+ Thêm quỹ]
┌──────────────────────────────────────────────────────┐
│ Quỹ chính                                [Edit] [🗑]  │
│ Số dư hiện tại: 25,000,000₫                          │
│ [+ Phiếu thu thủ công]  [+ Phiếu chi thủ công]       │
└──────────────────────────────────────────────────────┘
```

**Tài khoản ngân hàng tab:**
```
[+ Thêm tài khoản NH]
┌──────────────────────────────────────────────────────┐
│ Vietcombank — 1234567890              [Edit] [Đối soát NH]  │
│ Số dư: 80,000,000₫                                   │
└──────────────────────────────────────────────────────┘
```

**Kho hàng tab:**
```
[+ Thêm kho]
┌──────────────────────────────────────────┐
│ Kho chính — 123 Warehouse St   [Edit] [🗑]│
│ Kho chi nhánh 1 — 456 Branch   [Edit] [🗑]│
└──────────────────────────────────────────┘
```

### Manual Receipt/Disbursement Form — Task #136

```
[Modal: "Phiếu thu thủ công"]
Loại phiếu: [Phiếu thu ▼]
Quỹ/TK: [Quỹ chính ▼]
Số tiền: [___________₫]
Đối tượng: [Khách hàng ▼] → [Search KH]
Mô tả: [_________________]
☐ Yêu cầu duyệt trước khi thực hiện
[Lưu phiếu]
```

**Approval Tab (Phiếu chờ duyệt):**
```
| Loại    | Số tiền     | Người tạo    | Mô tả          | Actions          |
|---------|-------------|--------------|----------------|------------------|
| Chi     | 15,000,000₫ | Nguyen Van A | Trả NCC XYZ    | [Duyệt] [Từ chối]|
```

---

## 11.4 Permission Guard (FE-side)

**Approach:** FE nhận danh sách permissions từ login response → store vào context

```typescript
// Permission hook
const { hasPermission } = usePermissions()

// Usage
{hasPermission('products:write') && <EditButton />}
{hasPermission('cost_price:read') && <CostPriceColumn />}
```

**Note:** FE-side permission chỉ để ẩn/hiện UI. Backend luôn phải re-validate — FE không thể bypass.

---

## Navigation Flow

```
/settings/roles
  └─ Click tab → permission matrix cho role đó
  └─ "+ Tạo vai trò" → CreateRoleModal

/settings/audit-logs
  └─ Click row → expand chi tiết before/after

/settings/cash
  └─ Tab quỹ/NH/kho: CRUD inline
  └─ "Phiếu thu/chi thủ công" → Modal form
  └─ "Chờ duyệt" tab → approve/reject flow
```

---

## Shared Components

| Component | Mô tả |
|-----------|-------|
| `<PermissionMatrix role permissions onChange />` | Grid checkbox phân quyền |
| `<AuditLogRow log expanded />` | Row với expandable before/after diff |
| `<CashFundCard fund onReceipt onDisbursement />` | Card quỹ tiền mặt |
| `<ApprovalQueue items onApprove onReject />` | Danh sách phiếu chờ duyệt |
| `<usePermissions />` | Hook check permission FE-side |

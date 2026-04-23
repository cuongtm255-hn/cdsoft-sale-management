# MODULE 1 — Platform Management: Frontend Detail Design

> Ref: `usecase.md` UC-01 → UC-05 | Feature list tasks #5–#7, #9, #11, #13

---

## 1.1 Tenant List Screen

### Tasks: #5, #6, #7

**Route:** `/admin/tenants`  
**Access:** SUPER_ADMIN only

### Layout
```
[Header: "Tenant Management"]
[Search bar]  [Status filter dropdown]  [+ Create Tenant button]
─────────────────────────────────────────────────────
| Name     | Slug       | Domain       | Status    | Actions |
|----------|------------|--------------|-----------|---------|
| Acme Corp| acme-corp  | acme.app.com | ● ACTIVE  | Edit    |
| BizCo    | bizco      | —            | ⏳ PENDING| —      |
─────────────────────────────────────────────────────
[Pagination]
```

### Components
- **TenantTable:** Bảng danh sách với các cột: Name, Slug, Domain, Status, Created At, Actions
- **StatusBadge:** Badge màu theo status: ACTIVE=green · PENDING=yellow · SUSPENDED=red · FAILED=gray
- **SearchInput:** Debounce 300ms, gọi `GET /tenants?search=...`
- **StatusFilterSelect:** Dropdown chọn filter status, value `ALL` + 4 statuses
- **CreateTenantButton:** Mở `CreateTenantModal`

### States
- **Loading:** Skeleton rows trong bảng
- **Empty:** "No tenants found. Create your first tenant."
- **Error:** Toast error + retry button

### API Integration
- `GET /tenants?search=&status=&page=&limit=` → populate bảng
- Re-fetch khi search/filter thay đổi (debounced)

---

## 1.2 Create Tenant Modal

### Task: #6, #7

**Trigger:** Click "+ Create Tenant" button

### Form Fields
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Tenant Name | Text | ✅ | Min 2, max 255 ký tự |
| Slug | Text | ✅ | Pattern `[a-z0-9-]+`, min 3, max 100; auto-generate từ name |
| Domain | Text | ❌ | Format domain hợp lệ nếu nhập |
| Admin Email | Email | ✅ | Valid email format |
| Admin Name | Text | ✅ | Min 2 ký tự |
| Max Users | Number | ❌ | Min 1, default 50 |
| Features | Multi-select | ❌ | Checkbox list: loyalty, serial_tracking, batch_tracking |

**Auto-slug:** Khi user gõ Tenant Name, tự động generate slug (lowercase, replace space bằng `-`, remove ký tự đặc biệt). User có thể sửa thủ công.

### Flow
1. User click "Create Tenant" → mở modal
2. Điền form → click "Create"
3. API `POST /tenants` gọi → loading state trên button
4. Success: đóng modal, show toast "Tenant created. Provisioning in progress.", thêm row mới vào bảng với badge PENDING
5. Error 409: hiển thị inline error "Slug already exists" / "Domain already exists"
6. Polling provision status: mỗi 5 giây `GET /tenants/:id` nếu status là PENDING, cập nhật badge khi thành ACTIVE/FAILED

### States
- Button "Create": loading spinner khi đang submit
- Slug field: async validation "Checking availability..." với debounce
- Provision polling: badge PENDING + spinner icon, tự dừng khi status thay đổi

---

## 1.3 Tenant Detail / Edit Screen

### Task: #9

**Route:** `/admin/tenants/:id`

### Layout
```
[← Back]  "Acme Corp"  [Status: ACTIVE]  [Suspend] [Reset Admin]
─────────────────────────
Tabs: [General Info] [Configuration] [Provision Log]
─────────────────────────
General Info tab:
  Name: [input]
  Domain: [input]
  Admin Email: (read-only, shown for reference)
  Created At: (read-only)
  [Save Changes]
```

### Form Fields (editable)
| Field | Editable | Validation |
|-------|----------|------------|
| Name | ✅ | Min 2 ký tự |
| Domain | ✅ | Valid domain format |
| Max Users (config) | ✅ | Number, min 1 |
| Features enabled | ✅ | Multi-select checkboxes |
| Slug | ❌ | Display only |
| Admin Email | ❌ | Display only |

### Configuration Tab
Checkbox grid các features có thể bật/tắt cho tenant:
- `loyalty` — Chương trình tích điểm
- `batch_tracking` — Quản lý số lô/HSD
- `serial_tracking` — Quản lý Serial/IMEI
- `consignment` — Nghiệp vụ ký gửi

### API Integration
- Load: `GET /tenants/:id`
- Save: `PUT /tenants/:id` với changed fields
- Optimistic UI: không áp dụng — chờ API confirm trước khi cập nhật

---

## 1.4 Suspend / Activate Button

### Task: #11

**Location:** Tenant Detail page — header area

**Suspend flow:**
1. User click "Suspend" → mở Confirm Dialog
2. Dialog: "Are you sure? All active sessions will be terminated."
3. Textarea nhập `reason` (required)
4. Confirm → `PATCH /tenants/:id/status { status: "SUSPENDED", reason }`
5. Success: Badge đổi sang SUSPENDED, button đổi thành "Activate"

**Activate flow:**
1. User click "Activate" → Confirm Dialog (không cần reason)
2. Confirm → `PATCH /tenants/:id/status { status: "ACTIVE" }`
3. Success: Badge đổi sang ACTIVE

### Edge Cases
- Đang PENDING hoặc FAILED: ẩn cả 2 nút Suspend/Activate
- Loading state: disable button khi đang gọi API

---

## 1.5 Reset Admin Password Button

### Task: #13

**Location:** Tenant Detail page — header area

**Flow:**
1. User click "Reset Admin Password"
2. Confirm Dialog: "This will reset the admin password and send a new one via email."
3. Confirm → `POST /tenants/:id/reset-admin`
4. Success: Toast "Password reset email sent to admin@acme.com"

---

## Navigation Flow

```
/admin/tenants (List)
  └─ Click "Create" → CreateTenantModal (trong cùng trang)
  └─ Click row → /admin/tenants/:id (Detail)
       ├─ Edit info → Save → Stay on page
       ├─ Suspend/Activate → Inline state change
       └─ Reset Admin → Toast notification
```

---

## Shared Components

| Component | Mô tả |
|-----------|-------|
| `<TenantStatusBadge status />` | Badge màu theo status enum |
| `<ConfirmDialog title message onConfirm />` | Dialog xác nhận tái sử dụng |
| `<ProvisionProgress tenantId />` | Polling component hiển thị tiến trình provision |
| `<FeatureCheckboxGroup value onChange />` | Multi-select features configuration |

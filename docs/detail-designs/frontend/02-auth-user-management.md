# MODULE 2 — Auth & User Management: Frontend Detail Design

> Ref: `usecase.md` UC-06, UC-07 | `srs-tenant-detail.md` Ch.8.1 | Feature list tasks #17–#24

---

## 2.1 Login Screen

### Task: #17

**Route:** `/login`  
**Access:** Public (redirect đến dashboard nếu đã có valid token)

### Layout
```
─────────────────────────
      [App Logo]
   "Sales Management"
─────────────────────────
  Workspace (Tenant Slug)
  Email
  Password          [👁]
  [Login Button]
  "Forgot Password?"
─────────────────────────
```

### Form Fields
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Workspace | Text | ✅ | Chỉ `a-z0-9-`, min 3 ký tự; lưu vào localStorage sau login thành công |
| Email | Email | ✅ | Valid email format |
| Password | Password | ✅ | Min 8 ký tự |

### Flow
1. User điền form → click "Login"
2. `POST /auth/login { email, password, tenantSlug }`
3. **Nếu success (không cần 2FA):** Lưu `accessToken` vào memory (không localStorage), `refreshToken` vào httpOnly cookie → redirect đến dashboard
4. **Nếu `requiresTwoFactor = true`:** Lưu `twoFactorToken` tạm → chuyển sang màn hình 2FA
5. **Nếu lỗi:** Hiển thị inline error dưới form

### Error Messages
| Backend Code | User-facing message |
|---|---|
| `INVALID_CREDENTIALS` | "Email hoặc mật khẩu không đúng." |
| `TENANT_SUSPENDED` | "Workspace tạm ngưng hoạt động. Liên hệ quản trị viên." |
| `USER_INACTIVE` | "Tài khoản đã bị vô hiệu hóa." |
| `ACCOUNT_LOCKED` | "Tài khoản bị khóa tạm thời. Thử lại sau 15 phút." |
| `TENANT_NOT_FOUND` | "Workspace không tồn tại." |

### States
- Submit button: spinner + disabled khi đang gọi API
- Password field: toggle show/hide

---

## 2.2 Two-Factor Authentication Screen

### Task: #18

**Route:** `/login/2fa` (hoặc modal overlay trên màn login)  
**Access:** Chỉ accessible sau khi login step 1 thành công và `requiresTwoFactor = true`

### Layout
```
─────────────────────────
  "Two-Factor Verification"
  "Enter the 6-digit code sent to your email"
  [_ _ _ _ _ _]  OTP input
  [Verify]
  "Resend code" (enabled sau 60s)
─────────────────────────
```

### Flow
1. Auto-navigate tới màn này khi login trả `requiresTwoFactor`
2. User nhập OTP 6 chữ số
3. `POST /auth/verify-2fa { twoFactorToken, otp }`
4. Success → lưu tokens → redirect dashboard
5. Sai OTP → "Mã xác thực không đúng" (đếm số lần, sau 3 lần redirect về login)

### UX Details
- OTP input: auto-advance khi gõ đủ 1 ô (6 ô riêng biệt hoặc 1 ô style OTP)
- Countdown 60s cho nút "Resend code"
- Resend → `POST /auth/login` lại để gửi OTP mới

---

## 2.3 User List Screen

### Task: #22

**Route:** `/settings/users`  
**Access:** `TENANT_ADMIN`

### Layout
```
[Header: "User Management"]
[Search input]  [Role filter]  [Status filter]  [+ Add User]
──────────────────────────────────────────────────────────
| Name       | Email          | Role     | Status   | Actions  |
|------------|----------------|----------|----------|----------|
| Jane Staff | jane@acme.com  | STAFF    | ● Active | Edit     |
| Bob Ware.  | bob@acme.com   | WAREHOUSE| ● Active | Edit     |
──────────────────────────────────────────────────────────
[Pagination]
```

### Components
- **UserTable:** Cột Name, Email, Role badge, Status badge, Actions dropdown (Edit, Deactivate/Activate)
- **RoleBadge:** Màu theo role — ADMIN=purple, MANAGER=blue, STAFF=gray, WAREHOUSE=orange, ACCOUNTANT=green
- **AddUserButton:** Mở `UserFormModal`

### States
- Empty state: "No users yet. Add your first user."
- Filter combination: search + role + status filter cộng dồn

### API Integration
- `GET /users?search=&role=&isActive=&page=&limit=` → populate table
- Filter/search thay đổi → re-fetch (debounce 300ms cho search)

---

## 2.4 Create / Edit User Form

### Task: #23

**Trigger:** "+ Add User" hoặc "Edit" trên hàng

### Form Fields
| Field | Create | Edit | Validation |
|-------|--------|------|------------|
| Full Name | ✅ | ✅ | Min 2 ký tự |
| Email | ✅ | ❌ (read-only) | Valid email |
| Role | ✅ | ✅ | Select từ danh sách |
| Phone | ✅ | ✅ | Optional, format VN |
| Password | ✅ | ❌ | Min 8, uppercase+number |
| Send welcome email | ✅ | ❌ | Checkbox, default ON |

**Edit mode:** Email hiển thị dạng text (không input), không có field Password

### Role Dropdown Options
- Staff (Nhân viên bán hàng)
- Warehouse (Thủ kho)
- Accountant (Kế toán)
- Manager (Quản lý)
- Admin (Quản trị viên)

### Flow
1. Fill form → click "Save"
2. Create: `POST /users` · Edit: `PUT /users/:id`
3. Success: đóng modal, refresh list, toast "User saved"
4. Lỗi 409 (email exists): inline error "Email này đã được sử dụng"

---

## 2.5 Deactivate / Activate User

### Task: #24

**Location:** Actions dropdown trong User Table

**Deactivate flow:**
1. Click "Deactivate" → Confirm Dialog "User will lose access immediately."
2. `PATCH /users/:id/deactivate`
3. Success: status badge → Inactive, action đổi thành "Activate"

**Activate flow:**
1. Click "Activate" → `PATCH /users/:id/activate` (không cần confirm)
2. Success: status badge → Active

### Edge Cases
- Không hiển thị option Deactivate cho chính user đang login
- Nếu chỉ còn 1 TENANT_ADMIN, ẩn/disable Deactivate của admin đó

---

## 2.6 Assign Role (inline in Edit form)

### Task: Task #23 (role field trong form)

Role assignment được thực hiện thông qua field "Role" trong Edit User form — không có màn hình riêng.

Khi save form với role mới khác role cũ: hiển thị confirm "Changing role from STAFF to MANAGER. Continue?"

---

## Navigation Flow

```
/login
  └─ Success → /dashboard
  └─ 2FA required → /login/2fa → /dashboard

/settings/users (User List)
  └─ "+ Add User" → UserFormModal (create)
  └─ "Edit" row → UserFormModal (edit)
  └─ "Deactivate" row → ConfirmDialog → inline update
```

---

## Shared Components

| Component | Mô tả |
|-----------|-------|
| `<RoleBadge role />` | Badge màu theo role |
| `<OTPInput length={6} onChange />` | 6-digit OTP input |
| `<UserFormModal userId? onSave />` | Modal dùng chung create/edit |
| `<PasswordStrengthMeter value />` | Meter hiển thị độ mạnh password khi tạo |

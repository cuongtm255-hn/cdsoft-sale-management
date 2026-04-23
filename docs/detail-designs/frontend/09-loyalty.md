# MODULE 9 — Loyalty & Membership: Frontend Detail Design

> Ref: `srs-tenant-detail.md` Ch.4.3 | Feature list tasks #109–#110

---

## 9.1 Loyalty Configuration Screen

### Task: #109

**Route:** `/settings/loyalty`  
**Access:** `TENANT_ADMIN`

### Layout
```
[Header: "Cài đặt chương trình tích điểm"]
──────────────────────────────────────────────────
Bật/tắt chương trình: [Toggle ON/OFF]

Quy tắc tích điểm:
  Cứ mỗi [1,000] ₫ thanh toán thực tế → cộng [1] điểm

Quy tắc tiêu điểm:
  [1] điểm = [1,000] ₫

Thời hạn điểm: điểm hết hạn sau [730] ngày kể từ khi tích

Chu kỳ xét hạng: dựa trên điểm tích trong [365] ngày gần nhất
──────────────────────────────────────────────────
Hạng thành viên:
[+ Thêm hạng]
┌──────────────────────────────────────────────────┐
│ 🥈 Bạc (SILVER) | Từ [0  ] điểm | CK: [0  ]%  [🗑] │
│ 🥇 Vàng (GOLD)  | Từ [1000] điểm | CK: [2  ]%  [🗑] │
│ 💎 KK (DIAMOND) | Từ [5000] điểm | CK: [5  ]%  [🗑] │
└──────────────────────────────────────────────────┘
Cho phép hạ hạng: [Toggle]
──────────────────────────────────────────────────
[Lưu cài đặt]
```

### Tier Configuration
- Mỗi tier có: Tên hiển thị, mã (SILVER/GOLD/DIAMOND), điểm tối thiểu, % chiết khấu mặc định
- Sắp xếp kéo-thả (drag & drop) để đổi thứ tự
- Tối thiểu 1 tier, tối đa 5 tier
- Tier đầu tiên (điểm = 0) không thể xóa

### Preview Panel
Bên phải form: Preview hiển thị "Ví dụ: KH thanh toán 500,000₫ → nhận được 500 điểm"

---

## 9.2 Loyalty in Customer Detail Screen

### Task: #110

**Location:** Màn hình `/customers/:id` — hiển thị trong stats bar + tab riêng

### Stats Bar (trong Customer Detail)
```
... | 🥇 GOLD — 1,200 điểm | Hết hạn 300pt: 01/06/2026 |
```

### Loyalty Tab
```
Tabs: [...] [Tích điểm]
─────────────────────────────────────────
Tổng điểm hiện tại: 1,200 điểm (GOLD 🥇)
Điểm sắp hết hạn: 300 điểm (01/06/2026)
─────────────────────────────────────────
Lịch sử điểm:
| Ngày       | Loại  | Mô tả               | Điểm    |
|------------|-------|---------------------|---------|
| 22/04/2026 | +Tích | Thanh toán PT-0045  | +50 🟢  |
| 10/04/2026 | -Dùng | Đơn hàng SO-0032    | -200 🔴 |
| 01/04/2026 | +Tích | Thanh toán PT-0040  | +300 🟢 |
```

---

## 9.3 Loyalty in Create Order Screen

**Location:** Form tạo đơn hàng — sau khi chọn khách hàng

### Display (sau khi chọn KH)
```
Điểm tích lũy: 🥇 1,200 điểm (GOLD — CK 2%)
Dùng điểm:   [☐] Dùng [_____] điểm → giảm [_________₫]
```

### Redeem Flow
1. Tick checkbox "Dùng điểm"
2. Input số điểm muốn dùng (max = `customer.loyaltyPoints`, không vượt `totalAmount/amountPerPoint`)
3. Real-time preview: "Dùng 500 điểm → giảm 500,000₫"
4. Số tiền giảm cập nhật vào Order Summary

### Validation
- Số điểm ≤ số điểm hiện có
- Số tiền giảm ≤ `totalAmount` của đơn

---

## 9.4 Member Tier Badge

### Task: #110

Dùng `<MemberTierBadge>` xuyên suốt ứng dụng:
- Trong Customer List: hiện tier icon + điểm
- Trong Create Order: hiện tier của KH đang chọn
- Trong Customer Detail: hiện tier + progress đến tier tiếp theo

### Progress to Next Tier
```
GOLD: 1,200 / 5,000 điểm để lên DIAMOND
[████░░░░░░░░░░░░░░░] 24%
```

---

## Shared Components

| Component | Mô tả |
|-----------|-------|
| `<TierBadge tier points />` | Badge hạng + điểm |
| `<LoyaltyPointsInput customerId orderTotal onChange />` | Input dùng điểm trong form đơn hàng |
| `<TierProgressBar currentPoints tiers />` | Progress bar đến tier tiếp theo |
| `<LoyaltyTransactionsList customerId />` | Danh sách lịch sử tích/dùng điểm |
| `<TierEditor tiers onChange />` | Editor cấu hình hạng thành viên |

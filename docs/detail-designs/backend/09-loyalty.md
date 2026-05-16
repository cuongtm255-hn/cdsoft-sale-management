# MODULE 9 — Loyalty & Membership: Backend Detail Design

> Ref: `srs-tenant-detail.md` Ch.4.3 | Feature list tasks #105–#110

---

## Architecture Notes

- Module path: `src/tenant-module/loyalty/`
- Guard: `@UseGuards(JwtAuthGuard)` on controller class — **no `RolesGuard`**
- All routes prefixed with `tenant/loyalty`
- Service uses `getRepo()` pattern via `TenantDataSourceManager` + `TenantContextService`
- Register in `TenantAppModule.controllers[]` and `providers[]`

---

## 9.1 Loyalty Configuration

### Task #105 — `GET /tenant/loyalty/config` & `PUT /tenant/loyalty/config`

**Auth:** JWT · Roles: `TENANT_ADMIN`

**GET Response / PUT Request Body:**
```json
{
  "isEnabled": true,
  "pointsPerAmount": 1,
  "amountPerPoint": 1000,
  "currencyUnit": "VND",
  "tiers": [
    { "name": "SILVER", "label": "Bạc", "minPoints": 0, "discountPercent": 0 },
    { "name": "GOLD", "label": "Vàng", "minPoints": 1000, "discountPercent": 2 },
    { "name": "DIAMOND", "label": "Kim cương", "minPoints": 5000, "discountPercent": 5 }
  ],
  "tierEvaluationPeriodDays": 365,
  "pointExpiryDays": 730
}
```

**Business Rules:**
- `pointsPerAmount`: cứ bao nhiêu VNĐ thực thu → 1 điểm. VD: `1000` → 1,000₫ = 1 điểm
- `amountPerPoint`: 1 điểm = bao nhiêu VNĐ khi tiêu. VD: `1000` → 1 điểm = 1,000₫
- Tier sắp xếp theo `minPoints` ASC; `minPoints = 0` là tier thấp nhất
- `tierEvaluationPeriodDays`: khoảng thời gian nhìn lại để tính điểm xét hạng

**DB:** `loyalty_configs (tenant_id, config_json, updated_at)`

---

## 9.2 Auto Point Accumulation

### Task #106 — Event: `payment.completed`

**Trigger:** Sau khi `POST /payments` tạo thành công

**Logic:**
```
IF loyalty.isEnabled AND payment.method != 'POINTS' THEN:
  baseAmount = payment.amount
  pointsEarned = FLOOR(baseAmount / loyalty.pointsPerAmount)
  IF pointsEarned > 0 THEN:
    INSERT INTO loyalty_transactions (customer_id, type, points, ref_id, ref_type, expires_at)
    VALUES (:customerId, 'EARN', :pointsEarned, :paymentId, 'payment',
            NOW() + INTERVAL ':pointExpiryDays days')
    UPDATE customers SET loyalty_points = loyalty_points + pointsEarned
```

**Note:** Điểm tích trên số tiền **thực thu** (sau giảm giá, theo SRS 4.3), không phải tổng đơn hàng.

---

## 9.3 Point Redemption

### Task #107 — Áp dụng điểm khi tạo đơn hàng

**`POST /loyalty/redeem-preview`:**
```json
Request:  { "customerId": "uuid", "pointsToRedeem": 500 }
Response: { "pointsToRedeem": 500, "discountAmount": 500000, "remainingPoints": 700 }
```

**Khi tạo đơn hàng với points:**
```json
// Trong POST /orders body:
{
  ...
  "loyaltyPointsRedeemed": 500
}
```

**Server logic khi confirm order + payment:**
1. Validate `pointsToRedeem <= customer.loyaltyPoints`
2. Tính `discountAmount = pointsToRedeem * amountPerPoint`
3. `discountAmount <= totalAmount` (không cho dùng điểm vượt giá trị đơn)
4. Khi order confirm: `INSERT INTO loyalty_transactions(type='REDEEM', points=-500)`
5. `UPDATE customers SET loyalty_points -= 500`

**DB:** `loyalty_transactions(id, customer_id, type, points, ref_id, ref_type, expires_at, created_at)`
- `type`: `EARN` | `REDEEM` | `EXPIRE` | `ADJUST`

---

## 9.4 Member Tier Auto-upgrade Job

### Task #108 — Scheduled Job: `EvaluateMemberTiersJob`

**Schedule:** Chạy daily lúc 02:00 AM

**Logic per customer:**
```
1. Tính tổng điểm đã tích trong `tierEvaluationPeriodDays` gần nhất
   (chỉ tính điểm EARN, bỏ REDEEM/EXPIRE)

2. Tìm tier phù hợp (tier có minPoints cao nhất ≤ earnedPoints)

3. Nếu tier thay đổi:
   - UPDATE customers SET member_tier = newTier
   - INSERT INTO tier_change_log (customer_id, old_tier, new_tier, changed_at)
   - Gửi notification (email/SMS) cho KH
```

**Ví dụ:**
- Tiers: SILVER (0pt), GOLD (1000pt), DIAMOND (5000pt)
- KH tích được 1,200pt trong 365 ngày → tier = GOLD
- Tháng sau chỉ có 900pt → tier giảm về SILVER (nếu config cho phép downgrade)

**Config:** `allowTierDowngrade: boolean` trong loyalty config

---

## 9.5 Loyalty APIs

### `GET /customers/:id/loyalty`

**Response:**
```json
{
  "customerId": "uuid",
  "currentPoints": 1200,
  "memberTier": "GOLD",
  "tierDiscountPercent": 2,
  "transactions": [
    { "date": "2026-04-22", "type": "EARN", "points": 50, "ref": "Payment PT-0045" },
    { "date": "2026-04-10", "type": "REDEEM", "points": -200, "ref": "Order SO-0032" }
  ],
  "pointsExpiringSoon": {
    "amount": 300,
    "expiresAt": "2026-06-01"
  }
}
```

### `GET /loyalty/transactions`

**Auth:** JWT · Roles: `MANAGER`, `TENANT_ADMIN`

Danh sách tất cả loyalty transactions của tenant, filter theo customer/type/date.

---

## Database Schema

```sql
CREATE TABLE loyalty_configs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled                BOOLEAN NOT NULL DEFAULT false,
  points_per_amount         DECIMAL(10,2) NOT NULL DEFAULT 1000,
  amount_per_point          DECIMAL(10,2) NOT NULL DEFAULT 1000,
  tier_evaluation_days      INT NOT NULL DEFAULT 365,
  point_expiry_days         INT NOT NULL DEFAULT 730,
  allow_tier_downgrade      BOOLEAN NOT NULL DEFAULT true,
  tiers                     JSONB NOT NULL DEFAULT '[]',
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE loyalty_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL REFERENCES customers(id),
  type         VARCHAR(20) NOT NULL, -- EARN, REDEEM, EXPIRE, ADJUST
  points       INT NOT NULL,         -- positive = earn, negative = redeem/expire
  ref_id       UUID,
  ref_type     VARCHAR(30),          -- payment, order, manual
  description  TEXT,
  expires_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tier_change_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  old_tier    VARCHAR(20),
  new_tier    VARCHAR(20) NOT NULL,
  reason      VARCHAR(100),
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

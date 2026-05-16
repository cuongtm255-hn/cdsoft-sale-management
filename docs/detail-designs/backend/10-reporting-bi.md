# MODULE 10 — Reporting & BI: Backend Detail Design

> Ref: `usecase.md` UC-26 → UC-28 | `srs-tenant-detail.md` Ch.6, Ch.7 | Feature list tasks #111–#124

---

## Architecture Notes

- Module path: `src/tenant-module/reports/`
- Guard: `@UseGuards(JwtAuthGuard)` on controller class — **no `RolesGuard`**
- All routes prefixed with `tenant/reports`
- Service uses `getRepo()` + raw SQL/QueryBuilder via `TenantDataSourceManager` + `TenantContextService`
- Register in `TenantAppModule.controllers[]` and `providers[]`
- Reports are read-only aggregations — no mutations

---

## 10.1 Sales Report

### Task #111 — `GET /tenant/reports/sales`

**Auth:** JWT · Roles: `MANAGER`, `TENANT_ADMIN`

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `groupBy` | `day\|week\|month\|year` | Nhóm thời gian |
| `from` | date | Từ ngày |
| `to` | date | Đến ngày |
| `salesRepId` | uuid | Filter NV |
| `channel` | string | `POS\|WHOLESALE\|DELIVERY` |
| `categoryId` | uuid | Filter nhóm hàng |

**Response 200:**
```json
{
  "summary": {
    "totalRevenue": 150000000,
    "totalOrders": 320,
    "averageOrderValue": 468750,
    "returnRate": 1.5
  },
  "chart": [
    { "period": "2026-04", "revenue": 75000000, "orders": 160 },
    { "period": "2026-03", "revenue": 75000000, "orders": 160 }
  ],
  "topProducts": [
    { "productId": "uuid", "name": "Aquafina 500ml", "revenue": 25000000, "qty": 5000 }
  ],
  "topCustomers": [
    { "customerId": "uuid", "name": "ABC Corp", "revenue": 30000000, "orders": 45 }
  ]
}
```

**SQL Pattern:**
```sql
SELECT
  DATE_TRUNC(:groupBy, o.created_at) AS period,
  SUM(o.total_amount) AS revenue,
  COUNT(o.id) AS orders
FROM orders o
WHERE o.status NOT IN ('DRAFT', 'CANCELLED')
  AND o.created_at BETWEEN :from AND :to
  AND (:salesRepId IS NULL OR o.sales_rep_id = :salesRepId)
GROUP BY 1
ORDER BY 1
```

---

### Task #112 — `GET /reports/sales/profit-by-product`

**Response 200:**
```json
{
  "data": [
    {
      "productId": "uuid",
      "productName": "Aquafina 500ml",
      "category": "Nước uống",
      "revenue": 25000000,
      "cogs": 17500000,
      "grossProfit": 7500000,
      "grossMarginPercent": 30
    }
  ]
}
```

**Logic:** `grossProfit = revenue - (sum(order_items.cost_price * order_items.quantity))`

---

## 10.2 Inventory Report

### Task #114 — `GET /reports/inventory/movement`

**Query Params:** `from`, `to`, `productId`, `warehouseId`, `categoryId`

**Response 200:**
```json
{
  "data": [
    {
      "productId": "uuid",
      "sku": "PROD-001",
      "name": "Aquafina 500ml",
      "openingQty": 200,
      "openingValue": 1400000,
      "stockIn": 500,
      "stockOut": 450,
      "closingQty": 250,
      "closingValue": 1750000,
      "unit": "Chai"
    }
  ]
}
```

**Logic (Nhập-Xuất-Tồn):**
```sql
-- Opening: tồn kho tại thời điểm from
-- Stock in: sum của STOCK_IN transactions trong kỳ
-- Stock out: sum của STOCK_OUT transactions trong kỳ
-- Closing: opening + stockIn - stockOut
```

---

### Task #115 — `GET /reports/inventory/deadstock`

**Query Params:** `warehouseid`, `daysSinceLastSale` (default 90)

**Response 200:**
```json
{
  "data": [
    {
      "productId": "uuid",
      "name": "Sản phẩm tồn lâu",
      "currentStock": 150,
      "lastSaleDate": "2026-01-10",
      "daysSinceLastSale": 101,
      "stockValue": 3000000,
      "turnoverRate": 0.12
    }
  ]
}
```

### Task #115 — `GET /reports/inventory/abc-analysis`

**Response 200:**
```json
{
  "data": [
    {
      "productId": "uuid",
      "name": "...",
      "revenueContribution": 25000000,
      "revenuePercent": 16.7,
      "cumulativePercent": 16.7,
      "abcClass": "A"
    }
  ]
}
```

**ABC Logic:**
- Class A: top 70% doanh thu (thường ~20% SKU)
- Class B: tiếp theo 20% doanh thu
- Class C: cuối 10% doanh thu

---

## 10.3 Financial Reports

### Task #117 — `GET /reports/finance/pnl`

**Query Params:** `from`, `to`

**Response 200:**
```json
{
  "revenue": {
    "grossSales": 150000000,
    "returns": 2500000,
    "discounts": 5000000,
    "netRevenue": 142500000
  },
  "cogs": 99750000,
  "grossProfit": 42750000,
  "grossMarginPercent": 30,
  "operatingExpenses": {
    "selling": 8000000,
    "adminGeneral": 5000000,
    "total": 13000000
  },
  "netProfit": 29750000,
  "netProfitMarginPercent": 20.9
}
```

**Formulas (SRS 7.3):**
- Net Revenue = Gross Sales - Returns - Discounts
- Gross Profit = Net Revenue - COGS
- Net Profit = Gross Profit - Operating Expenses

---

### Task #118 — `GET /reports/finance/cashflow`

**Query Params:** `from`, `to`

**Response 200:**
```json
{
  "openingBalance": 50000000,
  "inflows": [
    { "category": "Thu tiền bán hàng", "amount": 120000000 },
    { "category": "Thu nợ khách hàng", "amount": 30000000 }
  ],
  "outflows": [
    { "category": "Trả tiền nhà cung cấp", "amount": 80000000 },
    { "category": "Chi phí vận hành", "amount": 13000000 }
  ],
  "totalInflow": 150000000,
  "totalOutflow": 93000000,
  "netCashFlow": 57000000,
  "closingBalance": 107000000
}
```

---

## 10.4 KPI & Commission Reports

### Task #120 — `GET /commissions/config` & `PUT /commissions/config`

**Auth:** JWT · Roles: `TENANT_ADMIN`

**Config Schema:**
```json
{
  "type": "REVENUE_PERCENT",
  "rules": [
    { "minRevenue": 0, "rate": 1.5 },
    { "minRevenue": 50000000, "rate": 2.0 },
    { "minRevenue": 100000000, "rate": 2.5 }
  ]
}
```

`type`: `REVENUE_PERCENT` | `PROFIT_PERCENT` | `PRODUCT_SPECIFIC`

---

### Task #121 — `GET /reports/commissions`

**Query Params:** `from`, `to`, `userId`

**Response 200:**
```json
{
  "data": [
    {
      "userId": "uuid",
      "userName": "Nguyen Van A",
      "totalRevenue": 65000000,
      "totalOrders": 85,
      "commissionRate": 2.0,
      "commissionAmount": 1300000,
      "details": [
        { "orderId": "uuid", "orderCode": "SO-001", "revenue": 500000, "commission": 10000 }
      ]
    }
  ]
}
```

---

### Task #122 — `GET /reports/kpi`

**Query Params:** `from`, `to`, `userId`

**Response 200:**
```json
{
  "data": [
    {
      "userId": "uuid",
      "userName": "Nguyen Van A",
      "target": 100000000,
      "achieved": 65000000,
      "achievementRate": 65,
      "newCustomers": 8,
      "totalOrders": 85,
      "closingRate": 78.5,
      "overdueDebt": 2000000
    }
  ]
}
```

---

## Performance Considerations

- **Báo cáo nặng** (P&L, cashflow, NXT): nên cache với TTL 1 giờ; invalidate khi có transaction mới
- **Báo cáo realtime** (tồn kho): không cache hoặc TTL rất ngắn (1 phút)
- **Export Excel:** dùng thư viện server-side (ExcelJS); limit export 50,000 rows
- **ABC analysis, aging report:** chạy nightly job ghi kết quả vào summary tables thay vì compute on-the-fly

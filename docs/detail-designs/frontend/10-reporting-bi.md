# MODULE 10 — Reporting & BI: Frontend Detail Design

> Ref: `usecase.md` UC-26 → UC-28 | `srs-tenant-detail.md` Ch.6, Ch.7 | Feature list tasks #113, #116, #119, #123–#124

---

## Architecture Notes

- Tenant pages: `src/tenant/pages/`
- Imports: `@shared/components/PageHeader`, `@shared/components/DataTable`, `@shared/hooks/useApi`, `@api/tenant.api`
- Add `reportsApi` to `@api/tenant.api`:
  ```javascript
  reportsApi = {
    sales:     (params) => tenantApi.get('/tenant/reports/sales', { params }),
    inventory: (params) => tenantApi.get('/tenant/reports/inventory', { params }),
    finance:   (params) => tenantApi.get('/tenant/reports/finance', { params }),
    kpi:       (params) => tenantApi.get('/tenant/reports/kpi', { params }),
    commissions:(params)=> tenantApi.get('/tenant/reports/commissions', { params }),
  }
  ```
- Charts: use Ant Design Charts (`@ant-design/charts`) or Recharts
- Role-based access check via `useAuth().tenantUser.role` — hide from STAFF

---

## 10.1 Sales Report Screen

### Task: #113

**Route:** `/tenant/reports/sales`
**Access:** MANAGER, TENANT_ADMIN (check in UI via `tenantUser.role`)

### Layout
```
[Header: "Báo cáo Doanh số"]
[Từ ngày] [Đến ngày]  [Nhóm: Tháng ▼]  [NV ▼]  [Kênh ▼]  [Xem báo cáo]
──────────────────────────────────────────────────────────────────────────
Stats Cards:
┌──────────────┐ ┌───────────────┐ ┌──────────────┐ ┌──────────────┐
│ Doanh thu    │ │ Số đơn hàng   │ │ Giá trị TB   │ │ Tỷ lệ trả   │
│ 150,000,000₫ │ │ 320 đơn       │ │ 468,750₫     │ │ 1.5%         │
└──────────────┘ └───────────────┘ └──────────────┘ └──────────────┘
──────────────────────────────────────────────────────────────────────────
[Biểu đồ doanh số theo tháng — Bar/Line chart]
──────────────────────────────────────────────────────────────────────────
Tabs: [Top sản phẩm] [Top khách hàng]

Top sản phẩm:
| #  | Sản phẩm       | Doanh thu     | Số lượng |
|----|----------------|---------------|----------|
| 1  | Aquafina 500ml | 25,000,000₫   | 5,000    |

[Xuất Excel]
```

### Chart Options
- Bar chart (default): doanh thu theo kỳ
- Toggle sang Line chart: xu hướng tăng trưởng
- Drill-down: click vào tháng → xem chi tiết theo tuần

### Filter Behavior
- Tất cả filter apply ngay khi thay đổi (không cần nhấn "Xem báo cáo")
- "So sánh kỳ trước": toggle thêm line so sánh

---

## 10.2 Inventory Report Screen

### Task: #116

**Route:** `/tenant/reports/inventory`
**Access:** `MANAGER`, `WAREHOUSE`, `TENANT_ADMIN`

### Layout
```
[Header: "Báo cáo Kho"]
Tabs: [Nhập-Xuất-Tồn] [Hàng tồn lâu] [Phân tích ABC]
```

**Tab Nhập-Xuất-Tồn:**
```
[Từ ngày] [Đến ngày] [Kho ▼] [Danh mục ▼]  [Xuất Excel]
──────────────────────────────────────────────────────────────────────
| SKU      | Tên SP         | Đầu kỳ | Nhập  | Xuất  | Cuối kỳ | GT Kho |
|----------|----------------|--------|-------|-------|---------|--------|
| PROD-001 | Aquafina 500ml | 200    | 500   | 450   | 250     | 1.75M₫ |
```

**Tab Hàng tồn lâu:**
```
[Không bán trong: 90 ngày ▼]  [Kho ▼]
──────────────────────────────────────────────────────────────────────
| Sản phẩm       | Tồn kho | Ngày bán cuối | Số ngày   | Giá trị   |
|----------------|---------|---------------|-----------|-----------|
| Sản phẩm XYZ   | 150     | 10/01/2026    | 101 ngày  | 3,000,000₫|
```

**Tab Phân tích ABC:**
```
[Kỳ: 01/01 - 22/04/2026]
──────────────────────────────────────────────────────────────────────
[Biểu đồ Pareto: % doanh thu tích lũy]
──────────────────────────────────────────────────────────────────────
| Hạng | Sản phẩm      | Doanh thu    | % DT | % tích lũy | Class |
|------|---------------|--------------|------|------------|-------|
| 1    | Aquafina 500ml| 25,000,000₫  | 16.7%| 16.7%      | 🅐 A  |
```

---

## 10.3 Financial Report Screen

### Task: #119

**Route:** `/tenant/reports/finance`
**Access:** `MANAGER`, `TENANT_ADMIN`

### Layout
```
[Header: "Báo cáo Tài chính"]
[Từ ngày] [Đến ngày]   [Xem báo cáo]
Tabs: [Kết quả kinh doanh (P&L)] [Lưu chuyển tiền tệ]
```

**P&L Tab:**
```
KẾT QUẢ KINH DOANH (01/01/2026 — 22/04/2026)
───────────────────────────────────────────────
I. DOANH THU                          150,000,000₫
   Doanh thu bán hàng                 150,000,000₫
   Trừ: Hàng trả lại                  (2,500,000₫)
   Trừ: Chiết khấu                    (5,000,000₫)
   = DOANH THU THUẦN                  142,500,000₫
───────────────────────────────────────────────
II. GIÁ VỐN HÀNG BÁN                  (99,750,000₫)
───────────────────────────────────────────────
III. LỢI NHUẬN GỘP                     42,750,000₫
     Tỷ suất lợi nhuận gộp:               30.0%
───────────────────────────────────────────────
IV. CHI PHÍ HOẠT ĐỘNG                 (13,000,000₫)
───────────────────────────────────────────────
V. LỢI NHUẬN RÒNG                      29,750,000₫
   Tỷ suất lợi nhuận ròng:               20.9%
───────────────────────────────────────────────
```

**Cash Flow Tab:**
```
Số dư đầu kỳ:              50,000,000₫
+ Thu tiền bán hàng:      120,000,000₫
+ Thu nợ KH:               30,000,000₫
- Trả NCC:               (80,000,000₫)
- Chi phí VH:            (13,000,000₫)
= Số dư cuối kỳ:          107,000,000₫
```

Both tabs: nút "Xuất PDF" để in báo cáo tài chính

---

## 10.4 KPI Report Screen

### Task: #123

**Route:** `/tenant/reports/kpi`
**Access:** `MANAGER`, `TENANT_ADMIN`

### Layout
```
[Header: "Báo cáo KPI Nhân viên"]
[Kỳ: Tháng 4/2026 ▼]  [Nhân viên: Tất cả ▼]
──────────────────────────────────────────────────────────────────────
| NV          | Doanh số   | Chỉ tiêu    | %HT  | KH mới | Chốt đơn | Nợ QH |
|-------------|------------|-------------|------|--------|----------|-------|
| Nguyễn VAnA | 65,000,000₫| 100,000,000₫| 65% 🔴| 8    | 78.5%    | 2M₫  |
| Trần Thị B  | 95,000,000₫| 100,000,000₫| 95% 🟢| 15   | 88.0%    | 0₫   |
──────────────────────────────────────────────────────────────────────
[Chi tiết] button per row
```

**KPI columns:**
- % Hoàn thành: màu đỏ < 70%, vàng 70-90%, xanh ≥ 90%
- Nợ quá hạn: màu đỏ nếu > 0

### KPI Detail (per staff)
Click "Chi tiết" → expand hoặc navigate tới `/reports/kpi/:userId`:
```
Biểu đồ tiến độ chỉ tiêu (gauge chart)
Danh sách đơn hàng trong kỳ
```

---

## 10.5 Commission Report Screen

### Task: #124

**Route:** `/tenant/reports/commissions`
**Access:** `MANAGER`, `TENANT_ADMIN`; STAFF chỉ xem của mình

### Layout
```
[Header: "Bảng hoa hồng"]
[Kỳ: Tháng 4/2026 ▼]  [NV ▼]   [Xuất Excel]
──────────────────────────────────────────────────────────────────────
| NV          | Doanh thu   | Tỷ lệ HH | Hoa hồng     |
|-------------|-------------|----------|--------------|
| Nguyễn Van A| 65,000,000₫ | 2.0%     | 1,300,000₫   |
──────────────────────────────────────────────────────────────────────
Expandable: click row → xem chi tiết từng đơn hàng đóng góp HH
```

---

## Shared Components

| Component | Mô tả |
|-----------|-------|
| `<ReportDateRangePicker from to onChange />` | Date range picker với shortcuts (tháng này, quý này, năm này) |
| `<RevenueChart data groupBy />` | Bar/Line chart doanh số |
| `<PnLStatement data />` | Component hiển thị P&L dạng kế toán |
| `<KPIProgressBar achieved target />` | Progress bar KPI với màu theo % hoàn thành |
| `<ExportExcelButton reportType params />` | Nút export Excel |
| `<ABCAnalysisChart data />` | Biểu đồ Pareto cho ABC analysis |

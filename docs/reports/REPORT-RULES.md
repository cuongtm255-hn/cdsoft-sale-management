# Quy tắc chung thiết kế báo cáo

**Phiên bản:** 1.0  
**Áp dụng cho:** Tất cả báo cáo trong hệ thống cdsoft-sale-management  

---

## 1. Chuẩn đặt tên

| Đối tượng | Convention | Ví dụ |
|---|---|---|
| File thiết kế | `rpt-<module>-by-<dimension>.md` | `rpt-sales-by-customer.md` |
| Mã báo cáo | `RPT-<MODULE>-<DIMENSION>` | `RPT-SALES-CUSTOMER` |
| API endpoint | `GET /api/reports/<module>-by-<dimension>` | `/api/reports/sales-by-customer` |
| Component FE | `Rpt<Module>By<Dimension>.tsx` | `RptSalesByCustomer.tsx` |
| Service BE | `<module>-by-<dimension>.report.service.ts` | `sales-by-customer.report.service.ts` |
| Controller BE | `<module>-by-<dimension>.report.controller.ts` | `sales-by-customer.report.controller.ts` |

---

## 2. Cấu trúc bắt buộc của mọi báo cáo

### 2.1 Phần tiêu đề (Header)
```
[TÊN CÔNG TY / CỬA HÀNG]
[Địa chỉ | Điện thoại]

[TÊN BÁO CÁO - in hoa, đậm, căn giữa]
Từ ngày: DD/MM/YYYY  Đến ngày: DD/MM/YYYY
```
- Tên công ty lấy từ cấu hình tenant (`tenant.company_name`, `tenant.address`, `tenant.phone`)
- Kỳ báo cáo luôn hiển thị ngày bắt đầu và ngày kết thúc

### 2.2 Phần bảng dữ liệu (Body)
- Cột đầu tiên luôn là **STT** (số thứ tự, bắt đầu từ 1)
- Dòng cuối luôn là **dòng tổng cộng** (in đậm)
- Cột số tiền căn phải, cột text căn trái, cột STT/mã căn giữa

### 2.3 Phần chữ ký (Footer)
```
Ngày ... tháng ... năm ...

KẾ TOÁN VIÊN                    KẾ TOÁN TRƯỞNG
(Ký, ghi rõ họ tên)          (Ký, ghi rõ họ tên)
```
- Bắt buộc có 2 vị trí: **Kế toán viên** (trái) và **Kế toán trưởng** (phải)
- Ngày ký mặc định là ngày in/xuất báo cáo

---

## 3. Bộ lọc chuẩn

Mọi báo cáo PHẢI có:

| Tham số | Bắt buộc | Ghi chú |
|---|:---:|---|
| `from_date` | Có | Mặc định: ngày đầu tháng hiện tại |
| `to_date` | Có | Mặc định: ngày hiện tại |

Bộ lọc tùy chọn phổ biến (thêm nếu phù hợp với báo cáo):

| Tham số | Loại | Ghi chú |
|---|---|---|
| `customer_code` | String | Search theo mã/tên khách hàng |
| `product_code` | String | Search theo mã/tên sản phẩm |
| `category_id` | Integer | Lọc theo danh mục |
| `supplier_id` | Integer | Lọc theo nhà cung cấp |
| `warehouse_id` | Integer | Lọc theo kho |
| `order_status` | Enum | Trạng thái đơn hàng |

---

## 4. Định dạng dữ liệu chuẩn

| Loại | Định dạng | Ví dụ |
|---|---|---|
| Tiền tệ VND | `#,##0` (ngăn cách bởi dấu chấm `.`) | `1.500.000` |
| Số lượng | `#,##0` | `1.200` |
| Ngày tháng | `DD/MM/YYYY` | `07/05/2026` |
| Tỷ lệ % | `#,##0.00%` | `15,00%` |
| Công nợ âm | Màu đỏ, ký hiệu `-` | `-500.000` |

---

## 5. Cấu trúc Response API chuẩn

```typescript
interface ReportResponse<T> {
  meta: {
    report_code: string;       // VD: "RPT-SALES-CUSTOMER"
    report_name: string;       // VD: "Doanh thu bán hàng theo khách hàng"
    from_date: string;         // ISO: "2026-01-01"
    to_date: string;           // ISO: "2026-01-31"
    generated_at: string;      // ISO datetime
    tenant_name: string;       // Tên cửa hàng/công ty
    filters: Record<string, any>; // Các filter đã áp dụng
  };
  summary: Record<string, number>; // Dòng tổng cộng
  data: T[];                   // Dữ liệu chi tiết
}
```

---

## 6. Cấu trúc file backend

```
backend/src/tenant-module/reports/
├── reports.module.ts
├── dto/
│   └── report-query.dto.ts          # Base DTO chứa from_date, to_date
├── sales-by-customer/
│   ├── sales-by-customer.report.controller.ts
│   ├── sales-by-customer.report.service.ts
│   └── dto/
│       └── sales-by-customer-query.dto.ts
├── sales-by-product/
│   └── ...
└── ...
```

---

## 7. Cấu trúc file frontend

```
frontend/src/tenant/pages/reports/
├── index.tsx                         # Trang danh sách báo cáo
├── components/
│   ├── ReportHeader.tsx              # Component tiêu đề dùng chung
│   ├── ReportFooter.tsx              # Component chữ ký dùng chung
│   └── ReportFilterBar.tsx           # Filter bar dùng chung
├── sales-by-customer/
│   ├── SalesByCustomerPage.tsx
│   ├── SalesByCustomerTable.tsx
│   └── useSalesByCustomer.ts
└── ...
```

---

## 8. Phân quyền chuẩn

| Vai trò | Xem | Xuất |
|---|:---:|:---:|
| Tenant Admin | Có | Có |
| Kế toán trưởng | Có | Có |
| Kế toán viên | Có | Có |
| Nhân viên bán hàng | Tùy báo cáo | Không |

---

## 9. Xuất file

Mọi báo cáo phải hỗ trợ:
- **In (Print):** Sử dụng `window.print()` hoặc thư viện print, ẩn sidebar/menu
- **Xuất Excel:** Sử dụng `exceljs` (backend) hoặc `xlsx` (frontend)
- **Xuất PDF:** Sử dụng `pdfmake` hoặc `jsPDF` (frontend) hoặc render HTML-to-PDF (backend)

---

## 10. Danh sách báo cáo hệ thống

| Mã báo cáo | Tên báo cáo | File thiết kế | Trạng thái |
|---|---|---|:---:|
| RPT-SALES-CUSTOMER | Doanh thu bán hàng theo khách hàng | [rpt-sales-by-customer.md](rpt-sales-by-customer.md) | Thiết kế xong |
| RPT-SALES-PRODUCT | Doanh thu bán hàng theo sản phẩm | [rpt-sales-by-product.md](rpt-sales-by-product.md) | Thiết kế xong |
| RPT-INVENTORY | Báo cáo tồn kho | [rpt-inventory.md](rpt-inventory.md) | Thiết kế xong |
| RPT-DEBT-CUSTOMER | Công nợ phải thu theo khách hàng | [rpt-debt-by-customer.md](rpt-debt-by-customer.md) | Thiết kế xong |
| RPT-DEBT-SUPPLIER | Công nợ phải trả theo nhà cung cấp | [rpt-debt-by-supplier.md](rpt-debt-by-supplier.md) | Thiết kế xong |
| RPT-PURCHASE | Báo cáo mua hàng theo nhà cung cấp | [rpt-purchase-by-supplier.md](rpt-purchase-by-supplier.md) | Thiết kế xong |

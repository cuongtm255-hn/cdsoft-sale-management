# Thiết kế báo cáo: Mua hàng theo nhà cung cấp

**Mã báo cáo:** RPT-PURCHASE  
**Module:** Mua hàng  
**Phiên bản:** 1.0  

---

## 1. Tổng quan

| Thuộc tính | Giá trị |
|---|---|
| Tên báo cáo | Báo cáo mua hàng theo nhà cung cấp |
| Mục đích | Tổng hợp toàn bộ hoạt động mua hàng theo từng nhà cung cấp; theo dõi giá trị nhập hàng, thanh toán và công nợ còn lại |
| Người dùng | Kế toán mua hàng, Kế toán trưởng, Giám đốc |
| Kỳ báo cáo | Tháng / Quý / Năm (tùy chọn) |
| Nguồn dữ liệu | Bảng: `purchase_orders`, `purchase_order_items`, `purchase_payments`, `suppliers` |

---

## 2. Giao diện báo cáo (Layout)

### 2.1 Phần tiêu đề

```
┌─────────────────────────────────────────────────────────────────────┐
│                      TÊN CÔNG TY / CỬA HÀNG                        │
│                   Địa chỉ: ....  |  ĐT: ....                       │
│                                                                     │
│              BÁO CÁO MUA HÀNG THEO NHÀ CUNG CẤP                    │
│              Từ ngày: ____/____/______  Đến ngày: ____/____/______  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Phần bảng dữ liệu

| STT | Mã NCC | Tên nhà cung cấp | Địa chỉ | Số đơn nhập | Tổng tiền hàng | Chiết khấu | Thuế (VAT) | Tổng phải trả | Đã thanh toán | Còn lại |
|:---:|:---:|---|---|:---:|---:|---:|---:|---:|---:|---:|
| 1 | NCC001 | Công ty Vinamilk | HCM | 5 | 20.000.000 | 500.000 | 1.950.000 | 21.450.000 | 18.000.000 | 3.450.000 |
| 2 | NCC002 | Cty TH True Milk | Hà Nội | 3 | 15.000.000 | 0 | 1.500.000 | 16.500.000 | 16.500.000 | 0 |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| **Tổng** | | | | **8** | **35.000.000** | **500.000** | **3.450.000** | **37.950.000** | **34.500.000** | **3.450.000** |

### 2.3 Phần chân báo cáo (chữ ký)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Ngày .... tháng .... năm ........                                  │
│                                                                     │
│      KẾ TOÁN VIÊN                     KẾ TOÁN TRƯỞNG               │
│   (Ký, ghi rõ họ tên)              (Ký, ghi rõ họ tên)             │
│                                                                     │
│                                                                     │
│   ......................           ......................             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Định nghĩa cột dữ liệu

| Cột | Tên hiển thị | Kiểu dữ liệu | Mô tả / Công thức |
|---|---|---|---|
| supplier_code | Mã NCC | String | Mã định danh nhà cung cấp |
| supplier_name | Tên nhà cung cấp | String | Tên công ty hoặc cá nhân |
| address | Địa chỉ | String | Địa chỉ nhà cung cấp |
| order_count | Số đơn nhập | Integer | Số phiếu nhập hàng đã xác nhận trong kỳ |
| subtotal | Tổng tiền hàng | Currency | `SUM(purchase_order_items.quantity * unit_price)` |
| total_discount | Chiết khấu | Currency | Tổng chiết khấu nhận từ NCC trong kỳ |
| total_tax | Thuế (VAT) | Currency | `SUM(purchase_orders.tax_amount)` |
| total_payable | Tổng phải trả | Currency | `subtotal - total_discount + total_tax` |
| total_paid | Đã thanh toán | Currency | `SUM(purchase_payments.amount)` trong kỳ |
| remaining | Còn lại | Currency | `total_payable - total_paid` |

### Công thức tính:
```
total_payable = subtotal - total_discount + total_tax
remaining     = total_payable - total_paid
```

---

## 4. Bộ lọc (Filter Parameters)

| Tham số | Bắt buộc | Loại | Mô tả |
|---|:---:|---|---|
| from_date | Có | Date | Từ ngày |
| to_date | Có | Date | Đến ngày |
| supplier_code | Không | String | Tìm kiếm theo mã/tên nhà cung cấp |
| warehouse_id | Không | Integer | Lọc theo kho nhập hàng |
| payment_filter | Không | Enum | `all` / `paid` / `partial` / `unpaid` |

---

## 5. Sắp xếp mặc định

- Sắp xếp theo: `total_payable DESC` (nhà cung cấp có giá trị mua hàng lớn nhất lên đầu)
- Dòng tổng cộng cuối bảng

---

## 6. Định dạng hiển thị

| Loại dữ liệu | Định dạng |
|---|---|
| Tiền tệ (VND) | `#,##0` |
| Số đơn nhập | Số nguyên không định dạng |
| Còn lại > 0 | Màu cam (chưa thanh toán hết) |
| Còn lại = 0 | Màu xanh (đã thanh toán đủ) |
| Ngày tháng | `DD/MM/YYYY` |

---

## 7. API Endpoint (dự kiến)

```
GET /api/reports/purchase-by-supplier
Query params:
  - from_date:       string (YYYY-MM-DD)
  - to_date:         string (YYYY-MM-DD)
  - supplier_code?:  string
  - warehouse_id?:   number
  - payment_filter?: 'all' | 'paid' | 'partial' | 'unpaid'

Response:
{
  "meta": {
    "report_code": "RPT-PURCHASE",
    "report_name": "Báo cáo mua hàng theo nhà cung cấp",
    "from_date": "2026-01-01",
    "to_date": "2026-01-31",
    "generated_at": "2026-05-07T10:00:00Z",
    "tenant_name": "Cửa hàng ABC",
    "filters": {}
  },
  "summary": {
    "total_order_count": 8,
    "total_subtotal": 35000000,
    "total_discount": 500000,
    "total_tax": 3450000,
    "total_payable": 37950000,
    "total_paid": 34500000,
    "total_remaining": 3450000
  },
  "data": [
    {
      "supplier_code": "NCC001",
      "supplier_name": "Công ty Vinamilk",
      "address": "HCM",
      "order_count": 5,
      "subtotal": 20000000,
      "total_discount": 500000,
      "total_tax": 1950000,
      "total_payable": 21450000,
      "total_paid": 18000000,
      "remaining": 3450000
    }
  ]
}
```

---

## 8. Xuất file

| Định dạng | Yêu cầu |
|---|---|
| In trực tiếp | Có — layout đúng theo mẫu trên |
| Xuất Excel (.xlsx) | Có — bao gồm màu trạng thái thanh toán |
| Xuất PDF | Có — giống bản in |

---

## 9. Phân quyền

| Vai trò | Xem báo cáo | Xuất file |
|---|:---:|:---:|
| Admin (tenant) | Có | Có |
| Kế toán trưởng | Có | Có |
| Kế toán viên | Có | Có |
| Nhân viên mua hàng | Có | Không |

---

## 10. Ghi chú nghiệp vụ

- Chỉ tính phiếu nhập hàng có trạng thái `approved` hoặc `received`; bỏ qua phiếu hủy.
- **Chiết khấu** là chiết khấu thương mại nhận từ NCC (giảm giá mua), không phải chiết khấu thanh toán.
- **Còn lại** = `total_payable - total_paid` tính trong kỳ báo cáo; không phải công nợ lũy kế.
- Để xem công nợ lũy kế toàn bộ quá trình, dùng báo cáo `RPT-DEBT-SUPPLIER`.
- Nếu lọc `payment_filter=partial`: nhà cung cấp có `0 < total_paid < total_payable`.
- Nếu lọc `payment_filter=unpaid`: nhà cung cấp có `total_paid = 0` và `total_payable > 0`.

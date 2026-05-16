# Thiết kế báo cáo: Doanh thu bán hàng theo sản phẩm

**Mã báo cáo:** RPT-SALES-PRODUCT  
**Module:** Bán hàng  
**Phiên bản:** 1.0  

---

## 1. Tổng quan

| Thuộc tính | Giá trị |
|---|---|
| Tên báo cáo | Doanh thu bán hàng theo sản phẩm |
| Mục đích | Phân tích doanh thu, sản lượng bán ra theo từng sản phẩm trong kỳ; xác định sản phẩm bán chạy |
| Người dùng | Kế toán, Kế toán trưởng, Giám đốc, Quản lý kinh doanh |
| Kỳ báo cáo | Tháng / Quý / Năm (tùy chọn) |
| Nguồn dữ liệu | Bảng: `order_items`, `orders`, `products`, `categories` |

---

## 2. Giao diện báo cáo (Layout)

### 2.1 Phần tiêu đề

```
┌─────────────────────────────────────────────────────────────────────┐
│                      TÊN CÔNG TY / CỬA HÀNG                        │
│                   Địa chỉ: ....  |  ĐT: ....                       │
│                                                                     │
│              BÁO CÁO DOANH THU BÁN HÀNG THEO SẢN PHẨM             │
│              Từ ngày: ____/____/______  Đến ngày: ____/____/______  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Phần bảng dữ liệu

| STT | Mã SP | Tên sản phẩm | Danh mục | ĐVT | SL bán | Đơn giá TB | Doanh thu | Chiết khấu | Doanh thu thuần | Tỷ trọng |
|:---:|:---:|---|---|:---:|---:|---:|---:|---:|---:|---:|
| 1 | SP001 | Sữa TH True Milk 1L | Sữa | Hộp | 250 | 32.000 | 8.000.000 | 400.000 | 7.600.000 | 45,23% |
| 2 | SP002 | Bánh mì sandwich | Bánh | Ổ | 180 | 15.000 | 2.700.000 | 0 | 2.700.000 | 16,08% |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| **Tổng** | | | | | **430** | | **10.700.000** | **400.000** | **10.300.000** | **100%** |

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
| product_code | Mã SP | String | Mã định danh sản phẩm |
| product_name | Tên sản phẩm | String | Tên đầy đủ sản phẩm |
| category_name | Danh mục | String | Tên danh mục sản phẩm |
| unit | ĐVT | String | Đơn vị tính (hộp, cái, kg...) |
| quantity_sold | SL bán | Integer | `SUM(order_items.quantity)` trong kỳ |
| avg_price | Đơn giá TB | Currency | `total_revenue / quantity_sold` |
| total_revenue | Doanh thu | Currency | `SUM(order_items.quantity * order_items.unit_price)` |
| total_discount | Chiết khấu | Currency | `SUM(order_items.discount_amount)` |
| net_revenue | Doanh thu thuần | Currency | `total_revenue - total_discount` |
| revenue_ratio | Tỷ trọng | Percent | `net_revenue / SUM(tất cả net_revenue) * 100` |

### Công thức tính:
```
net_revenue      = total_revenue - total_discount
avg_price        = total_revenue / quantity_sold
revenue_ratio    = (net_revenue / total_net_revenue) * 100
```

---

## 4. Bộ lọc (Filter Parameters)

| Tham số | Bắt buộc | Loại | Mô tả |
|---|:---:|---|---|
| from_date | Có | Date | Từ ngày |
| to_date | Có | Date | Đến ngày |
| product_code | Không | String | Tìm kiếm theo mã/tên sản phẩm |
| category_id | Không | Integer | Lọc theo danh mục |
| warehouse_id | Không | Integer | Lọc theo kho xuất hàng |
| order_status | Không | Enum | Mặc định: `completed`, `delivered` |
| sort_by | Không | Enum | `net_revenue` / `quantity_sold` / `product_code` |

---

## 5. Sắp xếp mặc định

- Sắp xếp theo: `net_revenue DESC` (sản phẩm doanh thu cao nhất lên đầu)
- Tùy chọn: có thể đổi sang `quantity_sold DESC` hoặc `product_code ASC`
- Dòng tổng cộng luôn ở cuối bảng

---

## 6. Định dạng hiển thị

| Loại dữ liệu | Định dạng |
|---|---|
| Tiền tệ (VND) | `#,##0` — VD: `8.000.000` |
| Số lượng | `#,##0` — VD: `1.200` |
| Tỷ trọng % | `#,##0.00%` — VD: `45,23%` |
| Ngày tháng | `DD/MM/YYYY` |

---

## 7. API Endpoint (dự kiến)

```
GET /api/reports/sales-by-product
Query params:
  - from_date:     string (YYYY-MM-DD)
  - to_date:       string (YYYY-MM-DD)
  - product_code?: string
  - category_id?:  number
  - warehouse_id?: number
  - order_status?: string (default: 'completed,delivered')
  - sort_by?:      'net_revenue' | 'quantity_sold' | 'product_code'

Response:
{
  "meta": {
    "report_code": "RPT-SALES-PRODUCT",
    "report_name": "Doanh thu bán hàng theo sản phẩm",
    "from_date": "2026-01-01",
    "to_date": "2026-01-31",
    "generated_at": "2026-05-07T10:00:00Z",
    "tenant_name": "Cửa hàng ABC",
    "filters": {}
  },
  "summary": {
    "total_quantity_sold": 430,
    "total_revenue": 10700000,
    "total_discount": 400000,
    "total_net_revenue": 10300000
  },
  "data": [
    {
      "product_code": "SP001",
      "product_name": "Sữa TH True Milk 1L",
      "category_name": "Sữa",
      "unit": "Hộp",
      "quantity_sold": 250,
      "avg_price": 32000,
      "total_revenue": 8000000,
      "total_discount": 400000,
      "net_revenue": 7600000,
      "revenue_ratio": 0.4523
    }
  ]
}
```

---

## 8. Xuất file

| Định dạng | Yêu cầu |
|---|---|
| In trực tiếp | Có — layout đúng theo mẫu trên |
| Xuất Excel (.xlsx) | Có — bao gồm cột tỷ trọng, dòng tổng |
| Xuất PDF | Có — giống bản in |

---

## 9. Phân quyền

| Vai trò | Xem báo cáo | Xuất file |
|---|:---:|:---:|
| Admin (tenant) | Có | Có |
| Kế toán trưởng | Có | Có |
| Kế toán viên | Có | Có |
| Nhân viên bán hàng | Có | Không |

---

## 10. Ghi chú nghiệp vụ

- Chỉ tính đơn hàng có trạng thái `completed` hoặc `delivered`; bỏ qua đơn hủy (`cancelled`).
- Nếu 1 sản phẩm có nhiều mức giá khác nhau trong kỳ, cột **Đơn giá TB** là giá bình quân gia quyền.
- Cột **Tỷ trọng** tính trên `net_revenue` (sau chiết khấu), không phải `total_revenue`.
- Sản phẩm không phát sinh doanh thu trong kỳ sẽ không hiển thị trong báo cáo.
- Nếu lọc theo danh mục, **Tỷ trọng** tính trong phạm vi danh mục đó, không phải toàn bộ.

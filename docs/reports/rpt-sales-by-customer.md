# Thiết kế báo cáo: Doanh thu bán hàng theo khách hàng

**Mã báo cáo:** RPT-SALES-CUSTOMER  
**Module:** Bán hàng  
**Phiên bản:** 1.0  

---

## 1. Tổng quan

| Thuộc tính | Giá trị |
|---|---|
| Tên báo cáo | Doanh thu bán hàng theo khách hàng |
| Mục đích | Theo dõi tổng hợp doanh thu, thanh toán và công nợ theo từng khách hàng trong kỳ |
| Người dùng | Kế toán, Kế toán trưởng, Giám đốc |
| Kỳ báo cáo | Tháng / Quý / Năm (tùy chọn) |
| Nguồn dữ liệu | Bảng: `orders`, `order_payments`, `customers`, `debt_opening_balance` |

---

## 2. Giao diện báo cáo (Layout)

### 2.1 Phần tiêu đề

```
┌─────────────────────────────────────────────────────────────────────┐
│                      TÊN CÔNG TY / CỬA HÀNG                        │
│                   Địa chỉ: ....  |  ĐT: ....                       │
│                                                                     │
│            BÁO CÁO DOANH THU BÁN HÀNG THEO KHÁCH HÀNG             │
│              Từ ngày: ____/____/______  Đến ngày: ____/____/______  │
│              (Kỳ: Tháng ____ / Quý ____ / Năm ______)              │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Phần bảng dữ liệu

| STT | Mã KH | Tên khách hàng | Địa chỉ | Công nợ đầu kỳ | Tổng tiền trong kỳ | Tổng thanh toán trong kỳ | Công nợ cuối kỳ |
|:---:|:---:|---|---|---:|---:|---:|---:|
| 1 | KH001 | Nguyễn Văn A | 123 Lê Lợi, HCM | 1.500.000 | 5.000.000 | 4.000.000 | 2.500.000 |
| 2 | KH002 | Trần Thị B | 45 Trần Hưng Đạo, HN | 0 | 3.200.000 | 3.200.000 | 0 |
| ... | ... | ... | ... | ... | ... | ... | ... |
| **Tổng** | | | | **1.500.000** | **8.200.000** | **7.200.000** | **2.500.000** |

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
| STT | STT | Integer | Số thứ tự, bắt đầu từ 1 |
| customer_code | Mã khách hàng | String | Mã định danh duy nhất của khách hàng |
| customer_name | Tên khách hàng | String | Họ tên đầy đủ hoặc tên công ty |
| address | Địa chỉ | String | Địa chỉ giao hàng hoặc địa chỉ công ty |
| opening_debt | Công nợ đầu kỳ | Currency (VND) | Công nợ còn lại từ kỳ trước chuyển sang |
| total_sales | Tổng tiền trong kỳ | Currency (VND) | Tổng giá trị đơn hàng trong kỳ (đã bao gồm VAT) |
| total_payment | Tổng thanh toán trong kỳ | Currency (VND) | Tổng số tiền khách hàng đã thanh toán trong kỳ |
| closing_debt | Công nợ cuối kỳ | Currency (VND) | `opening_debt + total_sales - total_payment` |

### Công thức tính:
```
closing_debt = opening_debt + total_sales - total_payment
```

- **Công nợ đầu kỳ:** Lấy từ bảng `debt_opening_balance` hoặc tính từ `closing_debt` kỳ trước
- **Tổng tiền trong kỳ:** `SUM(orders.total_amount)` WHERE `order_date BETWEEN from_date AND to_date` AND `status IN ('completed', 'delivered')`
- **Tổng thanh toán trong kỳ:** `SUM(order_payments.amount)` WHERE `payment_date BETWEEN from_date AND to_date`

---

## 4. Bộ lọc (Filter Parameters)

| Tham số | Bắt buộc | Loại | Mô tả |
|---|:---:|---|---|
| from_date | Có | Date | Từ ngày |
| to_date | Có | Date | Đến ngày |
| customer_code | Không | String | Lọc theo mã/tên khách hàng (search) |
| debt_filter | Không | Enum | `all` / `has_debt` / `no_debt` — Lọc theo trạng thái công nợ |

---

## 5. Sắp xếp mặc định

- Sắp xếp theo: `customer_code ASC`
- Dòng tổng cộng luôn hiển thị cuối bảng

---

## 6. Định dạng hiển thị

| Loại dữ liệu | Định dạng |
|---|---|
| Tiền tệ (VND) | `#,##0` (ví dụ: 1.500.000) |
| Ngày tháng | `DD/MM/YYYY` |
| STT | Số nguyên, không có định dạng đặc biệt |
| Công nợ âm (dư có) | Hiển thị màu đỏ, ví dụ: `-500.000` |

---

## 7. API Endpoint (dự kiến)

```
GET /api/reports/sales-by-customer
Query params:
  - from_date: string (YYYY-MM-DD)
  - to_date:   string (YYYY-MM-DD)
  - customer_code?: string
  - debt_filter?:  'all' | 'has_debt' | 'no_debt'

Response:
{
  "meta": {
    "from_date": "2026-01-01",
    "to_date": "2026-01-31",
    "generated_at": "2026-05-07T10:00:00Z"
  },
  "summary": {
    "total_opening_debt": 1500000,
    "total_sales": 8200000,
    "total_payment": 7200000,
    "total_closing_debt": 2500000
  },
  "data": [
    {
      "customer_code": "KH001",
      "customer_name": "Nguyễn Văn A",
      "address": "123 Lê Lợi, HCM",
      "opening_debt": 1500000,
      "total_sales": 5000000,
      "total_payment": 4000000,
      "closing_debt": 2500000
    }
  ]
}
```

---

## 8. Xuất file

| Định dạng | Yêu cầu |
|---|---|
| In trực tiếp | Có — layout đúng theo mẫu trên, bao gồm tiêu đề + bảng + chữ ký |
| Xuất Excel (.xlsx) | Có — bao gồm tiêu đề, bảng dữ liệu, dòng tổng, chữ ký |
| Xuất PDF | Có — giống bản in |

---

## 9. Phân quyền

| Vai trò | Xem báo cáo | Xuất file |
|---|:---:|:---:|
| Admin (tenant) | Có | Có |
| Kế toán trưởng | Có | Có |
| Kế toán viên | Có | Có |
| Nhân viên bán hàng | Không | Không |

---

## 10. Ghi chú nghiệp vụ

- Khách hàng không phát sinh giao dịch trong kỳ vẫn hiển thị nếu có công nợ đầu kỳ khác 0.
- Công nợ cuối kỳ âm biểu thị khách hàng đang trả thừa (dư có).
- Kỳ báo cáo mặc định là tháng hiện tại.

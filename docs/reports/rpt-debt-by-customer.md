# Thiết kế báo cáo: Công nợ phải thu theo khách hàng

**Mã báo cáo:** RPT-DEBT-CUSTOMER  
**Module:** Công nợ / Bán hàng  
**Phiên bản:** 1.0  

---

## 1. Tổng quan

| Thuộc tính | Giá trị |
|---|---|
| Tên báo cáo | Công nợ phải thu theo khách hàng |
| Mục đích | Theo dõi toàn bộ công nợ phải thu khách hàng; phân tích biến động nợ trong kỳ và cảnh báo nợ quá hạn |
| Người dùng | Kế toán công nợ, Kế toán trưởng, Giám đốc |
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
│              BÁO CÁO CÔNG NỢ PHẢI THU THEO KHÁCH HÀNG              │
│              Từ ngày: ____/____/______  Đến ngày: ____/____/______  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Phần bảng dữ liệu

| STT | Mã KH | Tên khách hàng | Điện thoại | Nợ đầu kỳ | Phát sinh tăng | Phát sinh giảm | Nợ cuối kỳ | Hạn mức tín dụng | Quá hạn mức |
|:---:|:---:|---|---|---:|---:|---:|---:|---:|:---:|
| 1 | KH001 | Nguyễn Văn A | 0901234567 | 1.500.000 | 5.000.000 | 4.000.000 | 2.500.000 | 5.000.000 | Không |
| 2 | KH002 | Công ty XYZ | 0289123456 | 8.000.000 | 12.000.000 | 6.000.000 | 14.000.000 | 10.000.000 | **Có** |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| **Tổng** | | | | **9.500.000** | **17.000.000** | **10.000.000** | **16.500.000** | | |

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
| customer_code | Mã KH | String | Mã định danh khách hàng |
| customer_name | Tên khách hàng | String | Họ tên hoặc tên công ty |
| phone | Điện thoại | String | Số điện thoại liên hệ |
| opening_debt | Nợ đầu kỳ | Currency | Công nợ còn lại từ kỳ trước |
| debit_amount | Phát sinh tăng | Currency | Tổng tiền hàng phát sinh trong kỳ (đơn hàng mới) |
| credit_amount | Phát sinh giảm | Currency | Tổng tiền khách đã thanh toán trong kỳ |
| closing_debt | Nợ cuối kỳ | Currency | `opening_debt + debit_amount - credit_amount` |
| credit_limit | Hạn mức tín dụng | Currency | Hạn mức tín dụng được cấp cho khách hàng |
| over_limit | Quá hạn mức | Boolean | `closing_debt > credit_limit` |

### Công thức tính:
```
closing_debt = opening_debt + debit_amount - credit_amount
over_limit   = closing_debt > credit_limit
```

---

## 4. Bộ lọc (Filter Parameters)

| Tham số | Bắt buộc | Loại | Mô tả |
|---|:---:|---|---|
| from_date | Có | Date | Từ ngày |
| to_date | Có | Date | Đến ngày |
| customer_code | Không | String | Tìm kiếm theo mã/tên khách hàng |
| debt_filter | Không | Enum | `all` / `has_debt` / `over_limit` / `no_debt` |

---

## 5. Sắp xếp mặc định

- Sắp xếp theo: `closing_debt DESC` (công nợ cao nhất lên đầu)
- Khách hàng quá hạn mức tín dụng hiển thị cảnh báo (highlight đỏ)
- Dòng tổng cộng cuối bảng

---

## 6. Định dạng hiển thị

| Loại dữ liệu | Định dạng |
|---|---|
| Tiền tệ (VND) | `#,##0` |
| Công nợ âm (dư có) | Màu đỏ, ký hiệu `-` |
| Quá hạn mức | Màu đỏ, in đậm |
| Ngày tháng | `DD/MM/YYYY` |

---

## 7. API Endpoint (dự kiến)

```
GET /api/reports/debt-by-customer
Query params:
  - from_date:      string (YYYY-MM-DD)
  - to_date:        string (YYYY-MM-DD)
  - customer_code?: string
  - debt_filter?:   'all' | 'has_debt' | 'over_limit' | 'no_debt'

Response:
{
  "meta": {
    "report_code": "RPT-DEBT-CUSTOMER",
    "report_name": "Công nợ phải thu theo khách hàng",
    "from_date": "2026-01-01",
    "to_date": "2026-01-31",
    "generated_at": "2026-05-07T10:00:00Z",
    "tenant_name": "Cửa hàng ABC",
    "filters": {}
  },
  "summary": {
    "total_opening_debt": 9500000,
    "total_debit": 17000000,
    "total_credit": 10000000,
    "total_closing_debt": 16500000,
    "over_limit_count": 1
  },
  "data": [
    {
      "customer_code": "KH002",
      "customer_name": "Công ty XYZ",
      "phone": "0289123456",
      "opening_debt": 8000000,
      "debit_amount": 12000000,
      "credit_amount": 6000000,
      "closing_debt": 14000000,
      "credit_limit": 10000000,
      "over_limit": true
    }
  ]
}
```

---

## 8. Xuất file

| Định dạng | Yêu cầu |
|---|---|
| In trực tiếp | Có — highlight đỏ khách quá hạn mức |
| Xuất Excel (.xlsx) | Có — có cột trạng thái quá hạn mức |
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

- Khách hàng không phát sinh giao dịch trong kỳ vẫn hiển thị nếu có công nợ đầu kỳ ≠ 0.
- **Phát sinh tăng** chỉ tính đơn hàng đã xác nhận (`confirmed`, `delivered`, `completed`); bỏ qua đơn hủy.
- **Phát sinh giảm** bao gồm cả thanh toán tiền mặt, chuyển khoản và phiếu giảm nợ.
- Công nợ âm (closing_debt < 0) biểu thị khách hàng trả thừa — hiển thị màu đỏ và ghi chú "Dư có".
- Cột **Quá hạn mức** chỉ hiển thị khi khách hàng có hạn mức tín dụng được cấp (credit_limit > 0).
- Cần tích hợp cảnh báo trong dashboard khi số lượng khách quá hạn mức tăng đột biến.

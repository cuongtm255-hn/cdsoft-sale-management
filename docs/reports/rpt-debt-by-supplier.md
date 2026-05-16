# Thiết kế báo cáo: Công nợ phải trả theo nhà cung cấp

**Mã báo cáo:** RPT-DEBT-SUPPLIER  
**Module:** Công nợ / Mua hàng  
**Phiên bản:** 1.0  

---

## 1. Tổng quan

| Thuộc tính | Giá trị |
|---|---|
| Tên báo cáo | Công nợ phải trả theo nhà cung cấp |
| Mục đích | Theo dõi toàn bộ công nợ phải trả cho nhà cung cấp; hỗ trợ lên kế hoạch thanh toán |
| Người dùng | Kế toán công nợ, Kế toán trưởng, Giám đốc |
| Kỳ báo cáo | Tháng / Quý / Năm (tùy chọn) |
| Nguồn dữ liệu | Bảng: `purchase_orders`, `purchase_payments`, `suppliers`, `debt_opening_balance` |

---

## 2. Giao diện báo cáo (Layout)

### 2.1 Phần tiêu đề

```
┌─────────────────────────────────────────────────────────────────────┐
│                      TÊN CÔNG TY / CỬA HÀNG                        │
│                   Địa chỉ: ....  |  ĐT: ....                       │
│                                                                     │
│            BÁO CÁO CÔNG NỢ PHẢI TRẢ THEO NHÀ CUNG CẤP             │
│              Từ ngày: ____/____/______  Đến ngày: ____/____/______  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Phần bảng dữ liệu

| STT | Mã NCC | Tên nhà cung cấp | Điện thoại | Nợ đầu kỳ | Phát sinh tăng | Phát sinh giảm | Nợ cuối kỳ |
|:---:|:---:|---|---|---:|---:|---:|---:|
| 1 | NCC001 | Công ty Vinamilk | 02838123456 | 5.000.000 | 20.000.000 | 18.000.000 | 7.000.000 |
| 2 | NCC002 | Cty TNHH Tân Hiệp Phát | 02512223456 | 0 | 15.000.000 | 15.000.000 | 0 |
| ... | ... | ... | ... | ... | ... | ... | ... |
| **Tổng** | | | | **5.000.000** | **35.000.000** | **33.000.000** | **7.000.000** |

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
| supplier_name | Tên nhà cung cấp | String | Tên công ty hoặc cá nhân cung cấp |
| phone | Điện thoại | String | Số điện thoại liên hệ |
| opening_debt | Nợ đầu kỳ | Currency | Công nợ còn lại từ kỳ trước chuyển sang |
| debit_amount | Phát sinh tăng | Currency | Tổng giá trị hàng nhập trong kỳ (phiếu nhập hàng) |
| credit_amount | Phát sinh giảm | Currency | Tổng số tiền đã thanh toán cho NCC trong kỳ |
| closing_debt | Nợ cuối kỳ | Currency | `opening_debt + debit_amount - credit_amount` |

### Công thức tính:
```
closing_debt = opening_debt + debit_amount - credit_amount
```

- **Nợ đầu kỳ:** Công nợ tại cuối ngày liền trước `from_date`
- **Phát sinh tăng:** Tổng giá trị phiếu nhập hàng được xác nhận trong kỳ
- **Phát sinh giảm:** Tổng phiếu thanh toán/chi tiền cho NCC trong kỳ

---

## 4. Bộ lọc (Filter Parameters)

| Tham số | Bắt buộc | Loại | Mô tả |
|---|:---:|---|---|
| from_date | Có | Date | Từ ngày |
| to_date | Có | Date | Đến ngày |
| supplier_code | Không | String | Tìm kiếm theo mã/tên nhà cung cấp |
| debt_filter | Không | Enum | `all` / `has_debt` / `no_debt` |

---

## 5. Sắp xếp mặc định

- Sắp xếp theo: `closing_debt DESC` (nhà cung cấp nợ nhiều nhất lên đầu)
- Dòng tổng cộng cuối bảng

---

## 6. Định dạng hiển thị

| Loại dữ liệu | Định dạng |
|---|---|
| Tiền tệ (VND) | `#,##0` |
| Công nợ âm (trả thừa) | Màu đỏ, ký hiệu `-` |
| Ngày tháng | `DD/MM/YYYY` |

---

## 7. API Endpoint (dự kiến)

```
GET /api/reports/debt-by-supplier
Query params:
  - from_date:      string (YYYY-MM-DD)
  - to_date:        string (YYYY-MM-DD)
  - supplier_code?: string
  - debt_filter?:   'all' | 'has_debt' | 'no_debt'

Response:
{
  "meta": {
    "report_code": "RPT-DEBT-SUPPLIER",
    "report_name": "Công nợ phải trả theo nhà cung cấp",
    "from_date": "2026-01-01",
    "to_date": "2026-01-31",
    "generated_at": "2026-05-07T10:00:00Z",
    "tenant_name": "Cửa hàng ABC",
    "filters": {}
  },
  "summary": {
    "total_opening_debt": 5000000,
    "total_debit": 35000000,
    "total_credit": 33000000,
    "total_closing_debt": 7000000
  },
  "data": [
    {
      "supplier_code": "NCC001",
      "supplier_name": "Công ty Vinamilk",
      "phone": "02838123456",
      "opening_debt": 5000000,
      "debit_amount": 20000000,
      "credit_amount": 18000000,
      "closing_debt": 7000000
    }
  ]
}
```

---

## 8. Xuất file

| Định dạng | Yêu cầu |
|---|---|
| In trực tiếp | Có — layout đúng theo mẫu trên |
| Xuất Excel (.xlsx) | Có — bao gồm dòng tổng |
| Xuất PDF | Có — giống bản in |

---

## 9. Phân quyền

| Vai trò | Xem báo cáo | Xuất file |
|---|:---:|:---:|
| Admin (tenant) | Có | Có |
| Kế toán trưởng | Có | Có |
| Kế toán viên | Có | Có |
| Nhân viên mua hàng | Không | Không |

---

## 10. Ghi chú nghiệp vụ

- Nhà cung cấp không phát sinh giao dịch trong kỳ vẫn hiển thị nếu có công nợ đầu kỳ ≠ 0.
- **Phát sinh tăng** chỉ tính phiếu nhập hàng đã duyệt (`approved`); bỏ qua phiếu hủy.
- **Phát sinh giảm** bao gồm thanh toán tiền mặt, chuyển khoản, và bù trừ công nợ.
- Công nợ âm (closing_debt < 0) biểu thị đã trả thừa cho NCC — hiển thị màu đỏ, ghi chú "Dư nợ".
- Báo cáo này là cơ sở để lập kế hoạch thanh toán công nợ nhà cung cấp hàng tháng.

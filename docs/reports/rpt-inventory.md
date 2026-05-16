# Thiết kế báo cáo: Tồn kho

**Mã báo cáo:** RPT-INVENTORY  
**Module:** Kho  
**Phiên bản:** 1.0  

---

## 1. Tổng quan

| Thuộc tính | Giá trị |
|---|---|
| Tên báo cáo | Báo cáo tồn kho |
| Mục đích | Theo dõi số lượng và giá trị hàng tồn kho theo từng sản phẩm; biến động nhập-xuất trong kỳ |
| Người dùng | Thủ kho, Kế toán, Kế toán trưởng, Giám đốc |
| Kỳ báo cáo | Tháng / Quý / Năm (tùy chọn) |
| Nguồn dữ liệu | Bảng: `inventory_transactions`, `products`, `categories`, `warehouses` |

---

## 2. Giao diện báo cáo (Layout)

### 2.1 Phần tiêu đề

```
┌─────────────────────────────────────────────────────────────────────┐
│                      TÊN CÔNG TY / CỬA HÀNG                        │
│                   Địa chỉ: ....  |  ĐT: ....                       │
│                                                                     │
│                       BÁO CÁO TỒN KHO                              │
│              Từ ngày: ____/____/______  Đến ngày: ____/____/______  │
│              Kho: [Tất cả kho / Tên kho cụ thể]                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Phần bảng dữ liệu

| STT | Mã SP | Tên sản phẩm | Danh mục | ĐVT | Tồn đầu kỳ | Nhập trong kỳ | Xuất trong kỳ | Tồn cuối kỳ | Đơn giá vốn | Giá trị tồn |
|:---:|:---:|---|---|:---:|---:|---:|---:|---:|---:|---:|
| 1 | SP001 | Sữa TH True Milk 1L | Sữa | Hộp | 100 | 500 | 250 | 350 | 28.000 | 9.800.000 |
| 2 | SP002 | Bánh mì sandwich | Bánh | Ổ | 50 | 200 | 180 | 70 | 12.000 | 840.000 |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| **Tổng** | | | | | **150** | **700** | **430** | **420** | | **10.640.000** |

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
| category_name | Danh mục | String | Tên danh mục |
| unit | ĐVT | String | Đơn vị tính |
| opening_qty | Tồn đầu kỳ | Integer | Tồn kho tại thời điểm `from_date - 1` |
| import_qty | Nhập trong kỳ | Integer | `SUM(qty)` WHERE `type='import'` AND trong kỳ |
| export_qty | Xuất trong kỳ | Integer | `SUM(qty)` WHERE `type='export'` AND trong kỳ |
| closing_qty | Tồn cuối kỳ | Integer | `opening_qty + import_qty - export_qty` |
| cost_price | Đơn giá vốn | Currency | Giá nhập bình quân gia quyền |
| stock_value | Giá trị tồn | Currency | `closing_qty * cost_price` |

### Công thức tính:
```
closing_qty  = opening_qty + import_qty - export_qty
stock_value  = closing_qty * cost_price
```
- **Tồn đầu kỳ:** Số tồn tại cuối ngày liền trước `from_date`
- **Đơn giá vốn:** Giá nhập bình quân gia quyền (weighted average cost)

---

## 4. Bộ lọc (Filter Parameters)

| Tham số | Bắt buộc | Loại | Mô tả |
|---|:---:|---|---|
| from_date | Có | Date | Từ ngày (để tính tồn đầu kỳ) |
| to_date | Có | Date | Đến ngày (tồn cuối kỳ = tồn tại ngày này) |
| warehouse_id | Không | Integer | Lọc theo kho (mặc định: tất cả kho) |
| category_id | Không | Integer | Lọc theo danh mục |
| product_code | Không | String | Tìm kiếm theo mã/tên sản phẩm |
| stock_filter | Không | Enum | `all` / `in_stock` / `out_of_stock` / `low_stock` |

---

## 5. Sắp xếp mặc định

- Sắp xếp theo: `category_name ASC`, `product_code ASC`
- Tùy chọn: `stock_value DESC` (giá trị tồn cao nhất lên đầu)
- Dòng tổng cộng cuối bảng (tổng số lượng và giá trị)

---

## 6. Định dạng hiển thị

| Loại dữ liệu | Định dạng |
|---|---|
| Tiền tệ (VND) | `#,##0` — VD: `9.800.000` |
| Số lượng | `#,##0` — VD: `350` |
| Tồn âm (xuất vượt nhập) | Màu đỏ, ký hiệu `-` |
| Ngày tháng | `DD/MM/YYYY` |

---

## 7. API Endpoint (dự kiến)

```
GET /api/reports/inventory
Query params:
  - from_date:      string (YYYY-MM-DD)
  - to_date:        string (YYYY-MM-DD)
  - warehouse_id?:  number
  - category_id?:   number
  - product_code?:  string
  - stock_filter?:  'all' | 'in_stock' | 'out_of_stock' | 'low_stock'

Response:
{
  "meta": {
    "report_code": "RPT-INVENTORY",
    "report_name": "Báo cáo tồn kho",
    "from_date": "2026-01-01",
    "to_date": "2026-01-31",
    "generated_at": "2026-05-07T10:00:00Z",
    "tenant_name": "Cửa hàng ABC",
    "filters": { "warehouse_id": null }
  },
  "summary": {
    "total_opening_qty": 150,
    "total_import_qty": 700,
    "total_export_qty": 430,
    "total_closing_qty": 420,
    "total_stock_value": 10640000
  },
  "data": [
    {
      "product_code": "SP001",
      "product_name": "Sữa TH True Milk 1L",
      "category_name": "Sữa",
      "unit": "Hộp",
      "opening_qty": 100,
      "import_qty": 500,
      "export_qty": 250,
      "closing_qty": 350,
      "cost_price": 28000,
      "stock_value": 9800000
    }
  ]
}
```

---

## 8. Xuất file

| Định dạng | Yêu cầu |
|---|---|
| In trực tiếp | Có — layout đúng theo mẫu trên |
| Xuất Excel (.xlsx) | Có — bao gồm phân nhóm theo danh mục |
| Xuất PDF | Có — giống bản in |

---

## 9. Phân quyền

| Vai trò | Xem báo cáo | Xuất file |
|---|:---:|:---:|
| Admin (tenant) | Có | Có |
| Kế toán trưởng | Có | Có |
| Kế toán viên | Có | Có |
| Thủ kho | Có | Có |
| Nhân viên bán hàng | Không | Không |

---

## 10. Ghi chú nghiệp vụ

- Tồn âm (closing_qty < 0) là tình trạng bất thường; hiển thị màu đỏ và cần cảnh báo.
- Nếu lọc theo nhiều kho, số tồn là tổng cộng tất cả kho được chọn.
- Sản phẩm chưa từng có giao dịch nhập/xuất vẫn hiển thị với tồn = 0 nếu được chọn trong filter.
- Báo cáo tồn kho tại một thời điểm cụ thể: đặt `from_date = to_date`.
- Giá trị tồn dùng giá vốn (cost price), không phải giá bán.
- `low_stock`: sản phẩm có `closing_qty <= min_stock_level` (cấu hình per-product).

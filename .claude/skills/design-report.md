# Skill: design-report

Thiết kế tài liệu báo cáo mới theo chuẩn dự án cdsoft-sale-management.

## Khi nào dùng skill này

Khi user yêu cầu "thiết kế báo cáo X", "tạo report Y", "thêm báo cáo Z vào hệ thống".

## Các bước thực hiện

### Bước 1 — Thu thập thông tin

Hỏi user (nếu chưa rõ) những thông tin sau:
- Tên báo cáo đầy đủ (VD: "Doanh thu bán hàng theo khách hàng")
- Các cột dữ liệu cần hiển thị
- Bộ lọc cần có (ngoài from_date/to_date bắt buộc)
- Module nghiệp vụ (sales / inventory / purchase / debt / ...)

### Bước 2 — Đọc rule chung

Luôn đọc `docs/reports/REPORT-RULES.md` trước khi tạo file thiết kế mới để đảm bảo tuân thủ chuẩn chung.

### Bước 3 — Tạo file thiết kế

Tạo file `docs/reports/rpt-<module>-by-<dimension>.md` với cấu trúc:

```markdown
# Thiết kế báo cáo: [Tên báo cáo]

**Mã báo cáo:** RPT-<MODULE>-<DIMENSION>
**Module:** [Tên module]
**Phiên bản:** 1.0

---

## 1. Tổng quan
[Bảng thông tin: tên, mục đích, người dùng, kỳ báo cáo, nguồn dữ liệu]

## 2. Giao diện báo cáo (Layout)
### 2.1 Phần tiêu đề
[ASCII layout phần tiêu đề]

### 2.2 Phần bảng dữ liệu
[Markdown table mẫu với dữ liệu giả lập]

### 2.3 Phần chân báo cáo (chữ ký)
[ASCII layout phần chữ ký — KẾ TOÁN VIÊN + KẾ TOÁN TRƯỞNG]

## 3. Định nghĩa cột dữ liệu
[Bảng: tên cột, tên hiển thị, kiểu dữ liệu, mô tả/công thức]

## 4. Bộ lọc (Filter Parameters)
[Bảng: tham số, bắt buộc, loại, mô tả — bắt buộc có from_date/to_date]

## 5. Sắp xếp mặc định
[Mô tả sort mặc định]

## 6. Định dạng hiển thị
[Bảng định dạng theo loại dữ liệu — theo chuẩn REPORT-RULES]

## 7. API Endpoint (dự kiến)
[GET endpoint + query params + response JSON mẫu]

## 8. Xuất file
[Bảng: Print / Excel / PDF]

## 9. Phân quyền
[Bảng vai trò — theo chuẩn REPORT-RULES]

## 10. Ghi chú nghiệp vụ
[Các quy tắc nghiệp vụ đặc thù của báo cáo này]
```

### Bước 4 — Cập nhật index

Thêm báo cáo mới vào bảng "Danh sách báo cáo hệ thống" trong `docs/reports/REPORT-RULES.md`.

### Bước 5 — Xác nhận với user

Sau khi tạo file, thông báo:
- Đường dẫn file thiết kế
- Mã báo cáo
- Bước tiếp theo: implement BE/FE hay cần review trước

## Quy tắc bắt buộc

- Mọi báo cáo PHẢI có cột STT và dòng tổng cộng
- Mọi báo cáo PHẢI có phần chữ ký: Kế toán viên + Kế toán trưởng
- Mọi báo cáo PHẢI có bộ lọc from_date / to_date
- Định dạng tiền tệ luôn dùng VND, ngăn cách bằng dấu chấm (`.`), không có ký hiệu `đ`
- Công nợ âm hiển thị màu đỏ
- Tên file và mã báo cáo theo đúng convention trong REPORT-RULES.md

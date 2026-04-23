# FEATURE LIST — Multi-Tenant Sales Management Platform

> Mỗi nhóm đại diện cho một màn hình / luồng nghiệp vụ. Task BE và FE cùng nhóm phục vụ chung một màn hình.
> Tham chiếu: `usecase.md` (UC-xx) · `srs-tenant-detail.md` (Chương N.x)

---

## MODULE 1 — PLATFORM MANAGEMENT (Super Admin)

### 1.1 Tenant List & Create (UC-01, UC-04)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 1 | BE | API `GET /tenants` — phân trang, filter theo status (ACTIVE/SUSPENDED/PENDING) | UC-04 |
| 2 | BE | API `POST /tenants` — validate unique slug/domain, tạo tenant record (PENDING) | UC-01 |
| 3 | BE | Job provision database riêng cho tenant sau khi tạo thành công | UC-01 |
| 4 | BE | Tự động tạo TENANT_ADMIN account khi provision xong, set status ACTIVE | UC-01 |
| 5 | FE | Màn hình danh sách tenant: bảng + filter status + badge màu theo trạng thái | UC-04 |
| 6 | FE | Modal/form tạo tenant: nhập tên, slug, domain, email admin | UC-01 |
| 7 | FE | Hiển thị tiến trình provision (PENDING → ACTIVE) realtime hoặc polling | UC-01 |

### 1.2 Tenant Detail & Update (UC-02)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 8 | BE | API `PUT /tenants/:id` — cập nhật thông tin, cấu hình tenant | UC-02 |
| 9 | FE | Màn hình chi tiết tenant: form edit thông tin & cấu hình | UC-02 |

### 1.3 Suspend / Activate Tenant (UC-03)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 10 | BE | API `PATCH /tenants/:id/status` — chuyển đổi ACTIVE ↔ SUSPENDED, validate transition | UC-03 |
| 11 | FE | Nút Suspend/Activate trên detail page, confirm dialog trước khi thực hiện | UC-03 |

### 1.4 Reset Tenant Admin Password (UC-05)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 12 | BE | API `POST /tenants/:id/reset-admin` — generate password mới, gửi email | UC-05 |
| 13 | FE | Nút "Reset Admin Password" + confirm dialog | UC-05 |

---

## MODULE 2 — AUTHENTICATION & USER MANAGEMENT

### 2.1 Login (UC-06)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 14 | BE | API `POST /auth/login` — xác thực credentials, kiểm tra tenant status (chặn nếu SUSPENDED) | UC-06 |
| 15 | BE | JWT token generation + refresh token mechanism | UC-06 |
| 16 | BE | 2FA cho tài khoản Giám đốc/Admin (SRS Ch.8.1) | SRS 8.1 |
| 17 | FE | Màn hình đăng nhập: form email/password, xử lý error states | UC-06 |
| 18 | FE | Màn hình nhập mã 2FA (nếu bật) | SRS 8.1 |

### 2.2 User Management (UC-07)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 19 | BE | API CRUD `/users` — tạo, cập nhật, deactivate user trong tenant | UC-07 |
| 20 | BE | API `POST /users/:id/assign-role` — gán/thay đổi vai trò | UC-07, SRS 8.1 |
| 21 | BE | Seed các vai trò mặc định: STAFF, WAREHOUSE, ACCOUNTANT, MANAGER, ADMIN | SRS 8.1 |
| 22 | FE | Danh sách user: bảng + filter role/status | UC-07 |
| 23 | FE | Form tạo/sửa user: thông tin cơ bản + dropdown chọn role | UC-07 |
| 24 | FE | Toggle deactivate user với confirm dialog | UC-07 |

---

## MODULE 3 — MASTER DATA: SẢN PHẨM

### 3.1 Product List (UC-10)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 25 | BE | API `GET /products` — search full-text (SKU, tên, barcode), filter category/status, phân trang | UC-10 |
| 26 | FE | Màn hình danh sách sản phẩm: bảng + search bar + filter | UC-10 |

### 3.2 Create / Update Product (UC-08, UC-09)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 27 | BE | API `POST /products` — validate SKU + barcode unique trong tenant | UC-08, SRS 2.1 |
| 28 | BE | API `PUT /products/:id` — cập nhật thông tin sản phẩm | UC-09 |
| 29 | BE | Hỗ trợ đa đơn vị tính + tỷ lệ quy đổi (VD: Thùng → Hộp → Cái) | SRS 2.1 |
| 30 | BE | Hỗ trợ cấu hình định mức tồn kho tối thiểu / tối đa | SRS 2.1, 3.3 |
| 31 | BE | Hỗ trợ nhiều bảng giá (giá vốn, giá lẻ, giá buôn, giá đại lý) | SRS 2.1 |
| 32 | FE | Form tạo/sửa sản phẩm: thông tin cơ bản, danh mục, đơn vị tính, kho, bảng giá | UC-08/09 |
| 33 | FE | Component quản lý đơn vị tính đa tầng có thể add/remove dòng | SRS 2.1 |

### 3.3 Delete Product (UC-11)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 34 | BE | API `DELETE /products/:id` — soft delete, chặn nếu sản phẩm đang có tồn kho | UC-11 |
| 35 | FE | Nút xoá + confirm dialog, hiển thị lý do nếu không thể xoá | UC-11 |

### 3.4 Category Management

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 36 | BE | API CRUD `/categories` — cây danh mục đa tầng (parent/child) | SRS 2.1 |
| 37 | FE | Màn hình quản lý danh mục dạng cây (tree view) có thể thêm/sửa/xoá node | SRS 2.1 |

---

## MODULE 4 — MASTER DATA: KHÁCH HÀNG

### 4.1 Customer List (UC-14)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 38 | BE | API `GET /customers` — search tên/mã/SĐT, filter nhóm khách hàng | UC-14 |
| 39 | FE | Danh sách khách hàng: bảng + search + filter nhóm | UC-14 |

### 4.2 Create / Update Customer (UC-12, UC-13)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 40 | BE | API `POST /customers` — lưu thông tin: tên, mã, MST, nhóm, hạn mức tín dụng, thời hạn nợ | UC-12, SRS 2.2 |
| 41 | BE | API `PUT /customers/:id` — cập nhật thông tin | UC-13 |
| 42 | BE | Gắn nhân viên phụ trách (sales rep) vào customer | SRS 2.2 |
| 43 | FE | Form tạo/sửa khách hàng: thông tin liên lạc, nhóm KH, hạn mức tín dụng, NV phụ trách | UC-12/13 |

### 4.3 Customer Detail — Lịch sử giao dịch (UC-14)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 44 | BE | API `GET /customers/:id/transactions` — lịch sử đơn hàng, công nợ | UC-14 |
| 45 | FE | Tab lịch sử giao dịch trong trang chi tiết khách hàng | UC-14 |

---

## MODULE 5 — MASTER DATA: NHÀ CUNG CẤP

### 5.1 Supplier Management

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 46 | BE | API CRUD `/suppliers` — thông tin NCC: tên, MST, điều khoản thanh toán, thời hạn nợ | SRS 2.3 |
| 47 | BE | Hỗ trợ đối tượng vừa là khách hàng vừa là NCC (flag `is_customer`) | SRS 2.3 |
| 48 | FE | Màn hình danh sách + form tạo/sửa nhà cung cấp | SRS 2.3 |

---

## MODULE 6 — QUẢN LÝ KHO

### 6.1 Stock In — Nhập kho (UC-15)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 49 | BE | API `POST /stock-receipts` — tạo phiếu nhập kho, liên kết NCC, validate số lượng | UC-15, SRS 3.1 |
| 50 | BE | API `PATCH /stock-receipts/:id/confirm` — xác nhận nhập kho, cập nhật tồn kho | UC-15, SRS 3.1 |
| 51 | BE | Tính giá vốn theo phương pháp được cấu hình (Bình quân / FIFO) | SRS 3.1 |
| 52 | BE | Tự động phát sinh công nợ phải trả NCC khi xác nhận nhập (nếu mua nợ) | SRS 3.1, 5.3 |
| 53 | FE | Màn hình tạo phiếu nhập kho: chọn NCC, thêm dòng sản phẩm, giá nhập, số lượng | UC-15 |
| 54 | FE | Nút xác nhận nhập kho + hiển thị tồn kho sau khi cập nhật | UC-15 |

### 6.2 Stock Out — Xuất kho (UC-16)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 55 | BE | API `POST /stock-issues` — xuất kho nội bộ hoặc theo đơn hàng | UC-16, SRS 3.2 |
| 56 | BE | Hỗ trợ xuất nhiều đợt từ một đơn hàng, track số lượng còn lại | SRS 3.2 |
| 57 | FE | Màn hình xuất kho: chọn lý do xuất (bán hàng/nội bộ/điều chuyển), dòng sản phẩm | UC-16 |

### 6.3 Stock Adjustment — Điều chỉnh kho (UC-17)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 58 | BE | API `POST /stock-adjustments` — điều chỉnh +/- số lượng, bắt buộc nhập lý do | UC-17, SRS 3.3 |
| 59 | FE | Form điều chỉnh kho: chọn sản phẩm, nhập số lượng thực tế, lý do chênh lệch | UC-17 |

### 6.4 Warehouse Transfer — Điều chuyển kho

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 60 | BE | API `POST /stock-transfers` — tạo lệnh điều chuyển giữa 2 kho | SRS 3.2 |
| 61 | BE | API `PATCH /stock-transfers/:id/receive` — kho đến xác nhận nhận hàng | SRS 3.2 |
| 62 | FE | Màn hình tạo lệnh điều chuyển: chọn kho đi / kho đến, sản phẩm + số lượng | SRS 3.2 |
| 63 | FE | Màn hình xác nhận nhận hàng phía kho đến | SRS 3.2 |

### 6.5 Inventory View — Xem tồn kho (UC-18)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 64 | BE | API `GET /inventory` — tồn kho realtime, filter kho/sản phẩm/nhóm hàng | UC-18 |
| 65 | BE | Logic cảnh báo khi tồn kho ≤ định mức tối thiểu | SRS 3.3 |
| 66 | FE | Màn hình tồn kho: bảng hiện tại + highlight cảnh báo hàng sắp hết | UC-18 |

### 6.6 Stocktaking — Kiểm kê

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 67 | BE | API `POST /stocktaking` — tạo phiếu kiểm kê, snapshot tồn kho tại thời điểm | SRS 3.3 |
| 68 | BE | API `PATCH /stocktaking/:id/complete` — tự động sinh phiếu điều chỉnh sau kiểm kê | SRS 3.3 |
| 69 | FE | Màn hình kiểm kê: nhập số lượng thực tế từng sản phẩm, so sánh vs sổ sách | SRS 3.3 |

---

## MODULE 7 — QUẢN LÝ ĐƠN HÀNG

### 7.1 Order List (UC-22)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 70 | BE | API `GET /orders` — filter theo status, khách hàng, ngày, nhân viên | UC-22 |
| 71 | FE | Danh sách đơn hàng: bảng + filter + badge status | UC-22 |

### 7.2 Create Sales Order (UC-19)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 72 | BE | API `POST /orders` — tạo đơn hàng: chọn KH, thêm sản phẩm, tính tổng tiền | UC-19, SRS 4.1 |
| 73 | BE | Áp dụng bảng giá đúng theo nhóm khách hàng (giá lẻ / buôn / đại lý) | SRS 2.1, 4.1 |
| 74 | BE | Kiểm tra hạn mức tín dụng trước khi lưu đơn nợ | SRS 2.2 |
| 75 | FE | Màn hình tạo đơn hàng: tìm KH, thêm dòng sản phẩm, xem tổng tiền, chọn hình thức thanh toán | UC-19 |
| 76 | FE | Auto-fill giá theo bảng giá KH, hiển thị warning vượt hạn mức tín dụng | SRS 2.1 |

### 7.3 Confirm Order (UC-20)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 77 | BE | API `PATCH /orders/:id/confirm` — kiểm tra tồn kho đủ, lock đơn hàng | UC-20 |
| 78 | BE | Trừ tồn kho (hoặc reserve) khi confirm đơn | UC-20, SRS 3.2 |
| 79 | FE | Nút Confirm trên trang chi tiết đơn + hiển thị trạng thái sau confirm | UC-20 |

### 7.4 Cancel Order (UC-21)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 80 | BE | API `PATCH /orders/:id/cancel` — huỷ đơn, hoàn trả tồn kho đã reserve | UC-21 |
| 81 | FE | Nút huỷ đơn + nhập lý do huỷ | UC-21 |

### 7.5 Promotions & Discounts (SRS Ch.4.2)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 82 | BE | API CRUD `/promotions` — quản lý các chương trình khuyến mãi (chiết khấu, mua X tặng Y, combo, voucher) | SRS 4.2 |
| 83 | BE | Engine tính khuyến mãi tự động khi tạo đơn hàng | SRS 4.2 |
| 84 | BE | Quản lý voucher: phát hành, validate hạn dùng + điều kiện | SRS 4.2 |
| 85 | FE | Màn hình quản lý chương trình khuyến mãi: danh sách + form tạo/sửa | SRS 4.2 |
| 86 | FE | Ô nhập mã voucher trong màn hình tạo đơn, hiển thị discount được áp dụng | SRS 4.2 |

### 7.6 Returns — Trả hàng (RMA) (SRS Ch.4.4)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 87 | BE | API `POST /returns` — tìm hoá đơn gốc, tính tiền hoàn theo giá thực mua | SRS 4.4 |
| 88 | BE | Nhập lại kho (tăng tồn), tạo phiếu chi hoặc cấn trừ công nợ | SRS 4.4 |
| 89 | FE | Màn hình trả hàng: tìm kiếm đơn gốc, chọn sản phẩm trả, số lượng, lý do | SRS 4.4 |

---

## MODULE 8 — HOÁ ĐƠN & THANH TOÁN

### 8.1 Generate Invoice (UC-23)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 90 | BE | Auto-generate invoice từ order khi confirm (trigger event) | UC-23 |
| 91 | BE | API `GET /invoices/:id` — lấy chi tiết hoá đơn, hỗ trợ export PDF | UC-23 |
| 92 | FE | Trang xem hoá đơn: hiển thị đầy đủ thông tin, nút in/export PDF | UC-23 |

### 8.2 Record Payment (UC-24)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 93 | BE | API `POST /payments` — ghi nhận thanh toán (full/partial), validate không vượt tổng nợ | UC-24, SRS 5.1 |
| 94 | BE | Tự động sinh phiếu thu, cập nhật công nợ khách hàng | SRS 5.1, 5.2 |
| 95 | FE | Màn hình ghi thanh toán: chọn hoá đơn, nhập số tiền, phương thức (tiền mặt/chuyển khoản) | UC-24 |

### 8.3 Payment History (UC-25)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 96 | BE | API `GET /customers/:id/payments` — lịch sử thanh toán theo KH | UC-25 |
| 97 | FE | Tab lịch sử thanh toán trong trang chi tiết khách hàng | UC-25 |

### 8.4 Accounts Receivable — Công nợ phải thu (SRS Ch.5.2)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 98 | BE | API `GET /ar/aging` — báo cáo tuổi nợ: 0-30, 31-60, 61-90, >90 ngày | SRS 5.2 |
| 99 | BE | API `POST /ar/match` — đối trừ chứng từ (khớp khoản thanh toán với nhiều hoá đơn) | SRS 5.2 |
| 100 | FE | Màn hình sổ công nợ phải thu: bảng phân nhóm theo tuổi nợ | SRS 5.2 |
| 101 | FE | Giao diện đối trừ chứng từ | SRS 5.2 |

### 8.5 Accounts Payable — Công nợ phải trả (SRS Ch.5.3)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 102 | BE | API `GET /ap/schedule` — lịch thanh toán dự kiến, sắp đến hạn | SRS 5.3 |
| 103 | BE | API `POST /ap/offset` — cấn trừ công nợ 2 chiều (KH vừa là NCC) | SRS 5.3 |
| 104 | FE | Màn hình công nợ phải trả: danh sách NCC + số nợ + ngày đến hạn | SRS 5.3 |

---

## MODULE 9 — LOYALTY & MEMBERSHIP (SRS Ch.4.3)

### 9.1 Loyalty Program

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 105 | BE | API cấu hình quy tắc tích điểm (tỷ lệ VNĐ → điểm) | SRS 4.3 |
| 106 | BE | Tự động cộng điểm sau khi thanh toán thực tế | SRS 4.3 |
| 107 | BE | API tiêu điểm: validate số điểm, áp dụng vào đơn hàng | SRS 4.3 |
| 108 | BE | Job tự động nâng/hạ hạng thành viên (Bạc/Vàng/Kim cương) theo chu kỳ | SRS 4.3 |
| 109 | FE | Màn hình cấu hình loyalty: quy tắc tích điểm, ngưỡng hạng thành viên | SRS 4.3 |
| 110 | FE | Hiển thị điểm tích lũy và hạng thành viên trong trang KH + màn hình bán hàng | SRS 4.3 |

---

## MODULE 10 — BÁO CÁO & BI

### 10.1 Sales Report (UC-26)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 111 | BE | API báo cáo doanh số theo thời gian (ngày/tuần/tháng/năm), filter nhân viên/kênh bán | SRS 7.2 |
| 112 | BE | API báo cáo lãi lỗ theo mặt hàng/nhóm hàng | SRS 7.2 |
| 113 | FE | Dashboard doanh số: biểu đồ xu hướng + bảng top sản phẩm/khách hàng | UC-26 |

### 10.2 Inventory Report (UC-27)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 114 | BE | API báo cáo Nhập-Xuất-Tồn theo kỳ, filter sản phẩm/nhóm/kho | SRS 7.1 |
| 115 | BE | API báo cáo hàng tồn lâu ngày (deadstock), phân tích ABC | SRS 7.1 |
| 116 | FE | Màn hình báo cáo kho: bảng NXT + tab deadstock + phân tích ABC | UC-27 |

### 10.3 Financial Report (UC-28)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 117 | BE | API báo cáo P&L: doanh thu thuần, lợi nhuận gộp, lợi nhuận ròng | SRS 7.3 |
| 118 | BE | API báo cáo lưu chuyển tiền tệ: nguồn thu/chi trong kỳ | SRS 7.3 |
| 119 | FE | Màn hình báo cáo tài chính: P&L + Cash Flow với filter kỳ báo cáo | UC-28 |

### 10.4 KPI & Commission Report (SRS Ch.6)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 120 | BE | API cấu hình công thức hoa hồng (theo doanh thu / lợi nhuận / sản phẩm) | SRS 6.1 |
| 121 | BE | API tính hoa hồng theo nhân viên trong kỳ | SRS 6.1 |
| 122 | BE | API báo cáo KPI: doanh số thực vs chỉ tiêu, tỷ lệ chốt đơn, KH mới, nợ quá hạn | SRS 6.2 |
| 123 | FE | Màn hình báo cáo KPI nhân viên: bảng điểm cá nhân + tiến độ chỉ tiêu | SRS 6.2 |
| 124 | FE | Màn hình bảng hoa hồng: chi tiết tính toán theo đơn hàng | SRS 6.1 |

---

## MODULE 11 — PHÂN QUYỀN & HỆ THỐNG

### 11.1 Role-Based Access Control (UC-29)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 125 | BE | Schema RBAC: Role → Permission (resource + action) | UC-29, SRS 8.1 |
| 126 | BE | Middleware kiểm tra permission trên mọi API endpoint | UC-29 |
| 127 | BE | API CRUD `/roles` — tạo vai trò tuỳ chỉnh, gán/thu hồi quyền | UC-29 |
| 128 | FE | Màn hình quản lý vai trò: danh sách role + ma trận permission (checkbox grid) | UC-29 |

### 11.2 Audit Log (UC-30)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 129 | BE | Middleware ghi audit log: actor, action, resource, before/after value, timestamp | UC-30, SRS 8.2 |
| 130 | BE | API `GET /audit-logs` — filter actor/resource/ngày, phân trang | UC-30 |
| 131 | FE | Màn hình xem audit log: bảng log + filter theo người dùng, loại thao tác, thời gian | UC-30 |

### 11.3 Cash & Bank Management (SRS Ch.5.1)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 132 | BE | API CRUD quỹ tiền mặt và tài khoản ngân hàng | SRS 5.1 |
| 133 | BE | API tạo phiếu thu/chi thủ công, yêu cầu phê duyệt | SRS 5.1 |
| 134 | BE | API đối soát ngân hàng: import sao kê, khớp giao dịch tự động | SRS 5.1 |
| 135 | FE | Màn hình quản lý quỹ: số dư hiện tại, lịch sử thu/chi | SRS 5.1 |
| 136 | FE | Form tạo phiếu thu/chi thủ công + luồng phê duyệt | SRS 5.1 |

---

## MODULE 12 — NGHIỆP VỤ MỞ RỘNG

### 12.1 Batch & Expiry Date — Quản lý lô/HSD (SRS Ch.9.1)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 137 | BE | Mở rộng stock model: thêm `batch_number`, `expiry_date` | SRS 9.1 |
| 138 | BE | Logic xuất kho ưu tiên FEFO (First Expired, First Out) | SRS 9.1 |
| 139 | BE | Job cảnh báo hàng sắp hết hạn (3–6 tháng) | SRS 9.1 |
| 140 | FE | UI nhập lô/HSD trong phiếu nhập kho | SRS 9.1 |
| 141 | FE | Màn hình danh sách hàng sắp hết hạn | SRS 9.1 |

### 12.2 Serial Number / IMEI (SRS Ch.9.2)

| # | Layer | Task | Ref SRS |
|---|-------|------|---------|
| 142 | BE | Quản lý serial: nhập kho gắn serial → xuất kho gắn serial với đơn hàng | SRS 9.2 |
| 143 | BE | API tra cứu bảo hành theo serial number | SRS 9.2 |
| 144 | FE | UI scan/nhập serial khi nhập và xuất kho | SRS 9.2 |
| 145 | FE | Màn hình tra cứu bảo hành: nhập serial → hiển thị lịch sử | SRS 9.2 |

---

## TỔNG QUAN SỐ LƯỢNG TASK

| Module | BE | FE | Tổng |
|--------|----|----|------|
| 1. Platform Management | 7 | 6 | 13 |
| 2. Auth & Users | 5 | 6 | 11 |
| 3. Master Data: Products | 9 | 4 | 13 |
| 4. Master Data: Customers | 5 | 4 | 9 |
| 5. Master Data: Suppliers | 2 | 1 | 3 |
| 6. Inventory Management | 14 | 9 | 23 |
| 7. Order Management | 14 | 11 | 25 |
| 8. Invoice & Payment | 10 | 7 | 17 |
| 9. Loyalty | 4 | 2 | 6 |
| 10. Báo cáo & BI | 10 | 5 | 15 |
| 11. Phân quyền & Hệ thống | 9 | 6 | 15 |
| 12. Nghiệp vụ mở rộng | 7 | 5 | 12 |
| **Tổng** | **96** | **66** | **162** |

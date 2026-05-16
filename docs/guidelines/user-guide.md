# Hướng dẫn sử dụng phần mềm Quản lý Bán hàng CDSoft

> **Phiên bản:** 1.0 | **Cập nhật:** 2026-05-12  
> **Đối tượng:** Người dùng cuối — nhân viên bán hàng, kế toán, quản lý kho, giám đốc  
> **Hỗ trợ:** Liên hệ quản trị viên hệ thống nếu gặp vấn đề không có trong tài liệu này

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Đăng nhập & Quản lý người dùng](#2-đăng-nhập--quản-lý-người-dùng)
3. [Quản lý Sản phẩm & Danh mục](#3-quản-lý-sản-phẩm--danh-mục)
4. [Quản lý Khách hàng](#4-quản-lý-khách-hàng)
5. [Quản lý Nhà cung cấp](#5-quản-lý-nhà-cung-cấp)
6. [Quản lý Kho hàng](#6-quản-lý-kho-hàng)
7. [Quản lý Đơn hàng bán](#7-quản-lý-đơn-hàng-bán)
8. [Hoá đơn & Thanh toán](#8-hoá-đơn--thanh-toán)
9. [Chương trình Tích điểm & Thành viên](#9-chương-trình-tích-điểm--thành-viên)
10. [Báo cáo & Phân tích kinh doanh](#10-báo-cáo--phân-tích-kinh-doanh)
11. [Phân quyền & Nhật ký hệ thống](#11-phân-quyền--nhật-ký-hệ-thống)
12. [Trợ lý ảo (Chatbot AI)](#12-trợ-lý-ảo-chatbot-ai)

---

## 1. Tổng quan hệ thống

### Phần mềm CDSoft là gì và dùng để làm gì

**CDSoft** là phần mềm quản lý bán hàng và vận hành doanh nghiệp thương mại toàn diện. Hệ thống giúp doanh nghiệp kiểm soát từ đầu đến cuối toàn bộ luồng nghiệp vụ: nhập hàng → lưu kho → bán hàng → thu tiền → báo cáo.

Mọi dữ liệu trong hệ thống được **kết nối với nhau tự động**. Khi bạn xác nhận một đơn hàng, hệ thống sẽ đồng thời:
- Giảm số lượng tồn kho tương ứng
- Tạo hoá đơn bán hàng
- Cập nhật công nợ của khách hàng
- Ghi nhận doanh thu vào báo cáo

### Các phân hệ chính của CDSoft

| Phân hệ | Dùng để làm gì | Người dùng chính |
|---------|---------------|-----------------|
| **Sản phẩm** | Quản lý danh mục hàng hoá, giá bán | Admin, Quản lý |
| **Khách hàng** | Lưu thông tin KH, lịch sử mua hàng | Nhân viên bán hàng |
| **Nhà cung cấp** | Quản lý đối tác cung ứng | Quản lý mua hàng |
| **Kho hàng** | Nhập, xuất, kiểm kê, tồn kho | Thủ kho |
| **Đơn hàng** | Tạo và xử lý đơn bán | Nhân viên bán hàng |
| **Thanh toán** | Ghi nhận thu tiền, công nợ | Kế toán |
| **Báo cáo** | Doanh thu, lãi lỗ, KPI | Giám đốc, Quản lý |
| **Trợ lý AI** | Hỏi đáp nhanh nghiệp vụ | Tất cả |

---

## 2. Đăng nhập & Quản lý người dùng

### Cách đăng nhập vào hệ thống CDSoft

**Phân hệ:** Xác thực & Quản lý người dùng

**Tổng quan:** Màn hình đăng nhập là cổng vào hệ thống. Mỗi tài khoản được gán một vai trò (Role) để xác định quyền thao tác.

**Các bước đăng nhập:**

1. Mở trình duyệt web và truy cập địa chỉ hệ thống được cung cấp bởi quản trị viên
2. Nhập **Email** và **Mật khẩu** vào ô tương ứng
3. Nhấn nút **Đăng nhập**
4. Nếu tài khoản yêu cầu xác thực 2 bước (2FA), nhập mã OTP gửi về điện thoại/email
5. Hệ thống chuyển hướng vào trang Dashboard sau khi đăng nhập thành công

> **Lưu ý:** Nếu công ty bạn đang trong trạng thái **Tạm ngưng**, hệ thống sẽ chặn đăng nhập và hiển thị thông báo. Hãy liên hệ nhà cung cấp phần mềm để được hỗ trợ.

**Hỏi đáp — Đăng nhập:**

| Câu hỏi | Trả lời |
|---------|---------|
| Quên mật khẩu phải làm gì? | Liên hệ quản trị viên của công ty để được reset mật khẩu |
| Đăng nhập sai bao nhiêu lần thì bị khoá? | Liên hệ quản trị viên để biết chính sách của hệ thống |
| Mã 2FA gửi về đâu? | Gửi về email hoặc ứng dụng xác thực đã đăng ký khi tạo tài khoản |

---

### Cách quản lý tài khoản người dùng trong hệ thống

**Phân hệ:** Quản lý người dùng — dành cho Admin hoặc Quản lý

**Tổng quan:** Quản trị viên có thể tạo mới, chỉnh sửa thông tin và vô hiệu hoá tài khoản nhân viên. Mỗi tài khoản được gán một trong các vai trò sau:

- **STAFF** — Nhân viên bán hàng
- **WAREHOUSE** — Thủ kho
- **ACCOUNTANT** — Kế toán
- **MANAGER** — Quản lý
- **ADMIN** — Quản trị viên

**Các bước tạo tài khoản mới cho nhân viên:**

1. Vào menu **Hệ thống** → chọn **Quản lý người dùng**
2. Nhấn nút **+ Tạo người dùng**
3. Điền các thông tin:
   - **Họ tên** *(bắt buộc)*
   - **Email** *(bắt buộc — dùng để đăng nhập)*
   - **Số điện thoại** *(tuỳ chọn)*
   - **Vai trò** *(chọn từ danh sách thả xuống)*
4. Nhấn **Lưu**. Hệ thống sẽ gửi thông tin đăng nhập về email của nhân viên

**Các bước thay đổi vai trò của nhân viên:**

1. Vào danh sách người dùng, tìm nhân viên cần thay đổi
2. Nhấn vào tên nhân viên để mở trang chi tiết
3. Chọn **Thay đổi vai trò** → chọn vai trò mới
4. Nhấn **Xác nhận**

**Các bước vô hiệu hoá tài khoản nhân viên đã nghỉ việc:**

1. Tìm tài khoản cần vô hiệu hoá trong danh sách
2. Nhấn biểu tượng **Tắt** (toggle) ở cột trạng thái
3. Xác nhận trong hộp thoại xuất hiện
4. Tài khoản sẽ không thể đăng nhập cho đến khi được kích hoạt lại

**Hỏi đáp — Quản lý người dùng:**

| Câu hỏi | Trả lời |
|---------|---------|
| Có thể xoá hẳn tài khoản không? | Không. Hệ thống chỉ cho phép vô hiệu hoá để giữ lịch sử thao tác |
| Nhân viên mới không nhận được email thì làm gì? | Kiểm tra hộp thư rác (Spam). Nếu vẫn không có, Admin reset mật khẩu thủ công |
| Một người có thể có nhiều vai trò không? | Không. Mỗi tài khoản chỉ có một vai trò duy nhất |

---

## 3. Quản lý Sản phẩm & Danh mục

### Cách xem danh sách và tìm kiếm sản phẩm

**Phân hệ:** Quản lý Sản phẩm

**Tổng quan:** Màn hình danh sách sản phẩm hiển thị toàn bộ hàng hoá của doanh nghiệp, hỗ trợ tìm kiếm nhanh theo nhiều tiêu chí.

**Các bước tìm kiếm sản phẩm:**

1. Vào menu **Sản phẩm** → chọn **Danh sách sản phẩm**
2. Sử dụng thanh tìm kiếm để nhập: **tên sản phẩm**, **mã SKU**, hoặc **mã vạch**
3. Lọc thêm theo:
   - **Danh mục** — chọn nhóm hàng từ danh sách
   - **Trạng thái** — Đang bán / Ngừng bán
4. Nhấn **Enter** hoặc nhấn nút **Tìm kiếm**

---

### Cách tạo mới sản phẩm trong hệ thống CDSoft

**Phân hệ:** Quản lý Sản phẩm — dành cho Admin hoặc Quản lý

**Tổng quan:** Thêm mặt hàng mới vào danh mục để hệ thống theo dõi tồn kho và hỗ trợ bán hàng. Mỗi sản phẩm cần có mã SKU duy nhất.

**Các bước tạo sản phẩm mới:**

1. Vào **Sản phẩm** → nhấn **+ Tạo sản phẩm**
2. Điền thông tin cơ bản:
   - **Tên sản phẩm** *(bắt buộc)*
   - **Mã SKU** *(bắt buộc — phải duy nhất trong hệ thống)*
   - **Mã vạch** (Barcode) *(tuỳ chọn — dùng khi quét barcode)*
   - **Thương hiệu** *(tuỳ chọn)*
   - **Danh mục** — chọn nhóm sản phẩm phù hợp
3. Thiết lập **Đơn vị tính** (xem hướng dẫn bên dưới)
4. Thiết lập **Bảng giá**:
   - **Giá vốn** (giá nhập trung bình)
   - **Giá bán lẻ**
   - **Giá bán buôn** *(áp dụng cho khách hàng đại lý/sỉ)*
   - **Giá đại lý**
5. Thiết lập **Định mức tồn kho**:
   - **Tồn tối thiểu** — hệ thống cảnh báo khi tồn kho xuống dưới mức này
   - **Tồn tối đa** — ngưỡng tồn kho lý tưởng
6. Nhấn **Lưu sản phẩm**

**Cách thiết lập đơn vị tính đa tầng (Ví dụ: Thùng → Hộp → Cái):**

1. Trong form tạo sản phẩm, cuộn đến mục **Đơn vị tính**
2. Nhấn **+ Thêm đơn vị**
3. Nhập tên đơn vị (ví dụ: **Thùng**) và tỷ lệ quy đổi (ví dụ: **1 Thùng = 24 Hộp**)
4. Thêm tiếp các đơn vị nhỏ hơn nếu cần
5. Đánh dấu đơn vị **nhỏ nhất** là đơn vị tính mặc định khi bán

**Hỏi đáp — Tạo sản phẩm:**

| Câu hỏi | Trả lời |
|---------|---------|
| SKU bị trùng thì sao? | Hệ thống báo lỗi ngay khi lưu. Phải nhập mã SKU khác |
| Có thể nhập giá bán 0 đồng không? | Có, nhưng nhân viên bán hàng phải nhập giá thủ công khi tạo đơn |
| Làm sao biết sản phẩm nào sắp hết hàng? | Vào **Kho hàng** → **Tồn kho** → xem các dòng được tô màu đỏ/cam |

---

### Cách cập nhật thông tin sản phẩm đã có

**Phân hệ:** Quản lý Sản phẩm

**Các bước sửa thông tin sản phẩm:**

1. Tìm sản phẩm cần sửa trong **Danh sách sản phẩm**
2. Nhấn vào tên sản phẩm để mở trang chi tiết
3. Nhấn nút **Chỉnh sửa**
4. Thay đổi các trường cần cập nhật
5. Nhấn **Lưu thay đổi**

> **Lưu ý:** Thay đổi giá bán sẽ ảnh hưởng đến các đơn hàng **mới tạo**. Các đơn hàng cũ giữ nguyên giá tại thời điểm tạo.

---

### Cách xoá sản phẩm khỏi hệ thống

**Phân hệ:** Quản lý Sản phẩm — dành cho Admin

**Các bước xoá sản phẩm:**

1. Mở trang chi tiết sản phẩm cần xoá
2. Nhấn nút **Xoá sản phẩm**
3. Đọc thông báo xác nhận và nhấn **Đồng ý xoá**

> **Lưu ý quan trọng:** Hệ thống **không cho phép xoá** sản phẩm đang có tồn kho. Bạn phải xuất kho toàn bộ hoặc điều chỉnh tồn về 0 trước khi xoá.

---

### Cách quản lý danh mục sản phẩm (nhóm hàng)

**Phân hệ:** Quản lý Danh mục

**Tổng quan:** Danh mục (nhóm hàng) giúp phân loại sản phẩm theo dạng cây nhiều tầng. Ví dụ: Thực phẩm → Đồ khô → Gạo.

**Các bước tạo danh mục mới:**

1. Vào **Sản phẩm** → **Danh mục**
2. Nhấn **+ Thêm danh mục**
3. Nhập **Tên danh mục**
4. Chọn **Danh mục cha** nếu đây là danh mục con (tuỳ chọn)
5. Nhấn **Lưu**

---

## 4. Quản lý Khách hàng

### Cách xem danh sách và tìm kiếm khách hàng

**Phân hệ:** Quản lý Khách hàng

**Tổng quan:** Phân hệ Khách hàng lưu trữ toàn bộ thông tin đối tác mua hàng, bao gồm lịch sử giao dịch và công nợ. Đây là dữ liệu gốc (Master Data) được dùng xuyên suốt trong đơn hàng và thanh toán.

**Các bước tìm kiếm khách hàng:**

1. Vào menu **Khách hàng** → **Danh sách khách hàng**
2. Nhập vào thanh tìm kiếm: **tên khách hàng**, **mã khách**, hoặc **số điện thoại**
3. Lọc theo **Nhóm khách hàng** (VIP, Đại lý, Khách lẻ...)
4. Nhấn **Tìm kiếm**

---

### Cách tạo mới khách hàng trong hệ thống CDSoft

**Phân hệ:** Quản lý Khách hàng

**Tổng quan:** Thêm khách hàng mới để hệ thống tự động áp giá đúng nhóm, theo dõi công nợ và lịch sử mua hàng.

**Các bước tạo khách hàng mới:**

1. Vào **Khách hàng** → nhấn **+ Tạo khách hàng**
2. Điền thông tin liên lạc:
   - **Tên khách hàng** *(bắt buộc)*
   - **Mã khách hàng** *(tự động tạo hoặc nhập thủ công)*
   - **Số điện thoại**
   - **Email**
   - **Địa chỉ**
   - **Mã số thuế** *(nếu khách hàng là doanh nghiệp)*
3. Chọn **Nhóm khách hàng**:
   - *Khách lẻ* → áp giá bán lẻ
   - *Khách buôn / Đại lý* → áp giá buôn hoặc giá đại lý
4. Thiết lập **Chính sách công nợ**:
   - **Hạn mức tín dụng** — số tiền nợ tối đa cho phép (0 = không cho nợ)
   - **Thời hạn nợ** — số ngày được phép nợ (ví dụ: 30 ngày)
5. Chọn **Nhân viên phụ trách** *(tuỳ chọn)*
6. Nhấn **Lưu khách hàng**

---

### Cách xem lịch sử giao dịch của khách hàng

**Phân hệ:** Quản lý Khách hàng — Chi tiết khách hàng

**Các bước xem lịch sử:**

1. Tìm và mở trang chi tiết của khách hàng
2. Chuyển sang tab **Lịch sử giao dịch**
3. Xem toàn bộ đơn hàng và thanh toán theo thời gian
4. Chuyển sang tab **Lịch sử thanh toán** để xem chi tiết các lần thu tiền

**Hỏi đáp — Quản lý khách hàng:**

| Câu hỏi | Trả lời |
|---------|---------|
| Khách hàng là cả nhà cung cấp thì tạo ở đâu? | Tạo trong phân hệ Nhà cung cấp, đánh dấu flag "Cũng là khách hàng" để dùng được cả hai chiều |
| Hạn mức tín dụng bằng 0 có nghĩa là gì? | Khách hàng không được mua nợ. Phải thanh toán ngay khi tạo đơn |
| Làm sao biết khách hàng nào đang nợ quá hạn? | Vào **Thanh toán** → **Công nợ phải thu** → xem bảng phân nhóm theo tuổi nợ |

---

## 5. Quản lý Nhà cung cấp

### Cách quản lý danh sách nhà cung cấp trong CDSoft

**Phân hệ:** Quản lý Nhà cung cấp

**Tổng quan:** Phân hệ Nhà cung cấp (NCC) quản lý thông tin các đối tác bán hàng đầu vào. Thông tin nhà cung cấp được liên kết với phiếu nhập kho và công nợ phải trả.

**Các bước tạo nhà cung cấp mới:**

1. Vào menu **Nhà cung cấp** → nhấn **+ Tạo nhà cung cấp**
2. Điền thông tin:
   - **Tên nhà cung cấp** *(bắt buộc)*
   - **Mã nhà cung cấp** *(tự động hoặc nhập thủ công)*
   - **Mã số thuế**
   - **Số điện thoại**, **Email**, **Địa chỉ**
   - **Điều khoản thanh toán** — số ngày được nợ tiền hàng (ví dụ: 30 ngày)
3. Nếu nhà cung cấp **cũng là khách hàng**, bật tuỳ chọn **"Cũng là khách hàng"** để có thể cấn trừ công nợ 2 chiều
4. Nhấn **Lưu**

**Hỏi đáp — Nhà cung cấp:**

| Câu hỏi | Trả lời |
|---------|---------|
| Làm sao xem tổng nợ phải trả cho từng NCC? | Vào **Thanh toán** → **Công nợ phải trả** → xem bảng danh sách |
| Xoá nhà cung cấp đã có giao dịch được không? | Không. Hệ thống giữ lịch sử. Chỉ có thể vô hiệu hoá |

---

## 6. Quản lý Kho hàng

### Cách tạo phiếu nhập kho khi nhận hàng từ nhà cung cấp

**Phân hệ:** Quản lý Kho hàng — Nhập kho

**Tổng quan:** Phiếu nhập kho là chứng từ ghi nhận hàng hoá đã được nhận vào kho. Sau khi xác nhận, tồn kho tăng lên và công nợ phải trả nhà cung cấp tự động phát sinh (nếu mua nợ).

**Các bước tạo phiếu nhập kho:**

1. Vào **Kho hàng** → **Nhập kho** → nhấn **+ Tạo phiếu nhập**
2. Chọn **Nhà cung cấp** từ danh sách
3. Điền **Số hoá đơn NCC** (số phiếu của nhà cung cấp) và **Ngày nhập**
4. Thêm sản phẩm vào phiếu nhập:
   - Nhấn **+ Thêm sản phẩm**
   - Tìm sản phẩm theo tên hoặc mã SKU
   - Nhập **Số lượng** và **Đơn giá nhập**
   - Lặp lại cho từng mặt hàng
5. Kiểm tra tổng tiền và nhấn **Lưu nháp** (chưa vào kho) hoặc **Xác nhận nhập kho**

> **Quan trọng:** Chỉ sau khi nhấn **Xác nhận nhập kho** thì tồn kho mới được cập nhật.

**Cách nhập hàng có số lô và hạn sử dụng (HSD):**

Nếu sản phẩm cần quản lý lô và HSD (thực phẩm, dược phẩm):
1. Khi thêm sản phẩm vào phiếu nhập, điền thêm:
   - **Số lô** (Batch Number)
   - **Ngày sản xuất** và **Ngày hết hạn**
2. Hệ thống sẽ tự động ưu tiên xuất hàng gần hết hạn trước (FEFO)

**Hỏi đáp — Nhập kho:**

| Câu hỏi | Trả lời |
|---------|---------|
| Nhập nhầm số lượng, có sửa được không? | Chỉ sửa được khi phiếu còn ở trạng thái **Nháp**. Sau khi Xác nhận phải tạo phiếu điều chỉnh |
| Giá vốn được tính như thế nào? | Hệ thống tính giá vốn theo phương pháp Bình quân (hoặc FIFO tuỳ cấu hình). Giá nhập thực tế sẽ cập nhật giá vốn |
| Nhập kho có tự động tạo công nợ không? | Có, nếu giao dịch là **mua nợ**. Công nợ phải trả NCC tự động tăng |

---

### Cách xuất kho hàng trong hệ thống CDSoft

**Phân hệ:** Quản lý Kho hàng — Xuất kho

**Tổng quan:** Xuất kho được thực hiện khi bán hàng, sử dụng nội bộ, hoặc điều chuyển sang kho khác. Thông thường, xuất kho bán hàng được tự động kích hoạt từ đơn hàng đã xác nhận.

**Các bước tạo phiếu xuất kho thủ công (xuất nội bộ, không phải bán hàng):**

1. Vào **Kho hàng** → **Xuất kho** → nhấn **+ Tạo phiếu xuất**
2. Chọn **Lý do xuất kho**:
   - *Xuất bán hàng* (liên kết đơn hàng)
   - *Xuất nội bộ* (dùng trong công ty)
   - *Xuất điều chuyển* (chuyển sang kho khác)
3. Thêm sản phẩm và số lượng cần xuất
4. Nhấn **Xác nhận xuất kho**

---

### Cách điều chỉnh tồn kho khi có chênh lệch thực tế

**Phân hệ:** Quản lý Kho hàng — Điều chỉnh kho

**Tổng quan:** Khi kiểm đếm thực tế kho phát hiện số lượng khác với hệ thống, dùng tính năng Điều chỉnh kho để cập nhật lại số liệu.

**Các bước tạo phiếu điều chỉnh kho:**

1. Vào **Kho hàng** → **Điều chỉnh kho** → nhấn **+ Điều chỉnh**
2. Tìm và chọn **Sản phẩm** cần điều chỉnh
3. Hệ thống hiển thị **Tồn kho hiện tại theo sổ sách**
4. Nhập **Số lượng thực tế** đếm được
5. Nhập **Lý do chênh lệch** *(bắt buộc)*
6. Nhấn **Xác nhận điều chỉnh**

> **Lưu ý:** Mọi phiếu điều chỉnh kho đều được ghi vào Nhật ký hệ thống để kiểm tra sau này.

---

### Cách điều chuyển hàng giữa các kho trong CDSoft

**Phân hệ:** Quản lý Kho hàng — Điều chuyển kho

**Tổng quan:** Khi doanh nghiệp có nhiều kho, tính năng Điều chuyển giúp ghi nhận hàng hoá di chuyển từ kho này sang kho khác với quy trình xác nhận 2 đầu.

**Các bước tạo lệnh điều chuyển kho:**

1. Vào **Kho hàng** → **Điều chuyển kho** → nhấn **+ Tạo lệnh điều chuyển**
2. Chọn **Kho gửi** (kho đi) và **Kho nhận** (kho đến)
3. Thêm sản phẩm và số lượng cần chuyển
4. Nhấn **Gửi lệnh điều chuyển**

**Cách kho nhận xác nhận đã nhận hàng:**

1. Bên kho nhận vào **Kho hàng** → **Điều chuyển kho** → tìm phiếu đang chờ
2. Kiểm tra số lượng thực tế nhận được
3. Nhấn **Xác nhận đã nhận hàng**
4. Tồn kho kho đến tăng lên, tồn kho kho gửi giảm xuống

---

### Cách xem tồn kho hiện tại và cảnh báo hàng sắp hết

**Phân hệ:** Quản lý Kho hàng — Xem tồn kho

**Các bước xem tồn kho:**

1. Vào **Kho hàng** → **Tồn kho hiện tại**
2. Danh sách hiển thị tất cả sản phẩm với số lượng tồn hiện tại
3. Sản phẩm được **tô màu đỏ/cam** là đang ở dưới mức tồn tối thiểu — cần nhập thêm hàng
4. Lọc theo **Kho**, **Nhóm sản phẩm**, hoặc nhập tên để tìm nhanh

---

### Cách thực hiện kiểm kê kho định kỳ

**Phân hệ:** Quản lý Kho hàng — Kiểm kê

**Tổng quan:** Kiểm kê kho là quá trình đếm lại toàn bộ hàng hoá thực tế và so sánh với số liệu trong hệ thống.

**Các bước thực hiện kiểm kê kho:**

1. Vào **Kho hàng** → **Kiểm kê** → nhấn **+ Tạo phiếu kiểm kê**
2. Chọn **Kho** cần kiểm kê (có thể kiểm kê theo từng nhóm hàng)
3. Hệ thống tự động ghi lại **Số lượng tồn theo sổ sách** tại thời điểm bắt đầu
4. Nhân viên kho đếm thực tế và nhập **Số lượng thực tế** cho từng sản phẩm
5. Nhấn **Hoàn thành kiểm kê**
6. Hệ thống tự động tạo **Phiếu điều chỉnh** cho những mặt hàng có chênh lệch

**Hỏi đáp — Kiểm kê kho:**

| Câu hỏi | Trả lời |
|---------|---------|
| Trong khi kiểm kê có nhập xuất hàng được không? | Nên tạm dừng nhập xuất trong quá trình kiểm kê để đảm bảo số liệu chính xác |
| Sau kiểm kê, tồn kho có tự cập nhật không? | Có. Sau khi "Hoàn thành kiểm kê" hệ thống tự điều chỉnh tồn kho theo số thực tế |

---

## 7. Quản lý Đơn hàng bán

### Cách tạo mới đơn hàng bán trong CDSoft

**Phân hệ:** Quản lý Đơn hàng

**Tổng quan:** Đơn hàng bán là chứng từ ghi nhận giao dịch bán hàng với khách hàng. Hệ thống tự động áp đúng bảng giá theo nhóm khách và kiểm tra hạn mức công nợ.

**Các bước tạo đơn hàng mới:**

1. Vào **Đơn hàng** → nhấn **+ Tạo đơn hàng**
2. Tìm và chọn **Khách hàng**:
   - Nhập tên, mã, hoặc số điện thoại
   - Hệ thống hiển thị thông tin khách và nhóm giá tương ứng
3. Thêm sản phẩm vào đơn:
   - Nhấn **+ Thêm sản phẩm**
   - Tìm theo tên hoặc mã SKU
   - **Giá bán sẽ tự động điền** theo nhóm khách hàng. Nhân viên có thể điều chỉnh trong phạm vi được phép
   - Nhập **Số lượng**
4. Nhập **Mã voucher** nếu khách có khuyến mãi (hệ thống tự tính giảm giá)
5. Chọn **Phương thức thanh toán**: Tiền mặt / Chuyển khoản / Nợ
6. Nhấn **Lưu nháp** hoặc **Xác nhận đơn hàng**

> **Cảnh báo hạn mức tín dụng:** Nếu tổng nợ của khách vượt hạn mức, hệ thống hiển thị cảnh báo màu vàng. Cần có sự phê duyệt của quản lý để tiếp tục.

---

### Cách xác nhận (Confirm) đơn hàng trong CDSoft

**Phân hệ:** Quản lý Đơn hàng

**Tổng quan:** Xác nhận đơn hàng là bước khoá đơn hàng, trừ tồn kho và tạo hoá đơn. Đơn đã xác nhận không thể chỉnh sửa.

**Các bước xác nhận đơn hàng:**

1. Mở đơn hàng cần xác nhận (trạng thái **Nháp**)
2. Kiểm tra lại toàn bộ thông tin
3. Nhấn nút **Xác nhận đơn hàng**
4. Hệ thống kiểm tra tồn kho. Nếu đủ hàng:
   - Đơn hàng chuyển sang trạng thái **Đã xác nhận**
   - Tồn kho bị trừ (hoặc dự trữ) tương ứng
   - Hoá đơn được tự động tạo
5. Nhấn **In hoá đơn** hoặc **Xuất PDF** nếu cần

---

### Cách huỷ đơn hàng trong CDSoft

**Phân hệ:** Quản lý Đơn hàng

**Các bước huỷ đơn hàng:**

1. Mở đơn hàng cần huỷ
2. Nhấn nút **Huỷ đơn hàng**
3. Nhập **Lý do huỷ** *(bắt buộc)*
4. Xác nhận trong hộp thoại

> **Lưu ý:** Huỷ đơn đã xác nhận sẽ hoàn trả lại tồn kho đã trừ. Tuy nhiên không thể huỷ đơn đã thanh toán đầy đủ — cần dùng tính năng **Trả hàng** thay thế.

---

### Cách xử lý trả hàng và hoàn tiền trong CDSoft

**Phân hệ:** Quản lý Đơn hàng — Trả hàng (RMA)

**Tổng quan:** Khi khách hàng trả lại hàng đã mua, dùng tính năng Trả hàng để ghi nhận, nhập hàng trở lại kho và xử lý hoàn tiền.

**Các bước tạo phiếu trả hàng:**

1. Vào **Đơn hàng** → **Trả hàng** → nhấn **+ Tạo phiếu trả hàng**
2. Tìm **Đơn hàng gốc** (nhập số hoá đơn hoặc tên khách hàng)
3. Chọn **Sản phẩm** và **Số lượng** khách muốn trả
4. Nhập **Lý do trả hàng**
5. Chọn hình thức hoàn tiền:
   - **Hoàn tiền mặt** — tạo phiếu chi
   - **Cấn trừ vào đơn sau** — giảm công nợ
6. Nhấn **Xác nhận trả hàng**. Hàng tự động nhập lại vào kho.

---

### Cách quản lý chương trình khuyến mãi

**Phân hệ:** Quản lý Đơn hàng — Khuyến mãi

**Tổng quan:** Phân hệ Khuyến mãi cho phép tạo các chương trình giảm giá, mua tặng, combo hoặc voucher áp dụng tự động khi bán hàng.

**Các loại khuyến mãi hỗ trợ:**
- **Chiết khấu %** — giảm X% trên tổng đơn hoặc từng sản phẩm
- **Mua X tặng Y** — mua đủ số lượng X, tặng thêm Y sản phẩm
- **Combo** — mua gộp nhiều sản phẩm với giá ưu đãi
- **Voucher** — mã giảm giá có thời hạn và điều kiện sử dụng

**Các bước tạo chương trình khuyến mãi:**

1. Vào **Đơn hàng** → **Khuyến mãi** → nhấn **+ Tạo chương trình**
2. Đặt **Tên chương trình** và **Thời gian áp dụng** (Từ ngày — Đến ngày)
3. Chọn **Loại khuyến mãi** và điền điều kiện tương ứng
4. Chọn **Đối tượng áp dụng** (tất cả, theo nhóm khách hàng, theo sản phẩm)
5. Nhấn **Kích hoạt chương trình**

**Hỏi đáp — Đơn hàng & Khuyến mãi:**

| Câu hỏi | Trả lời |
|---------|---------|
| Có thể áp nhiều voucher vào một đơn không? | Tuỳ cấu hình của từng chương trình. Thông thường chỉ áp 1 voucher/đơn |
| Đơn hàng không đủ tồn kho thì xác nhận được không? | Không. Hệ thống chặn và thông báo sản phẩm nào thiếu hàng |
| Nhân viên có thể tự ý giảm giá cho khách không? | Tuỳ quyền được gán. STAFF thường không được tự giảm ngoài khuyến mãi hệ thống |

---

## 8. Hoá đơn & Thanh toán

### Cách xem và in hoá đơn bán hàng

**Phân hệ:** Hoá đơn & Thanh toán

**Tổng quan:** Hoá đơn được tự động tạo khi đơn hàng được xác nhận. Bạn có thể xem, in, hoặc xuất file PDF để gửi cho khách.

**Các bước in hoá đơn:**

1. Vào **Thanh toán** → **Hoá đơn** → tìm hoá đơn cần in
2. Hoặc vào **Đơn hàng** → mở đơn → nhấn **Xem hoá đơn**
3. Nhấn **In hoá đơn** để in trực tiếp
4. Hoặc nhấn **Xuất PDF** để tải về file

---

### Cách ghi nhận thanh toán từ khách hàng

**Phân hệ:** Hoá đơn & Thanh toán — Thu tiền

**Tổng quan:** Khi khách hàng trả tiền (toàn bộ hoặc một phần), dùng tính năng Ghi nhận thanh toán để cập nhật công nợ.

**Các bước ghi nhận thanh toán:**

1. Vào **Thanh toán** → **Thu tiền** → nhấn **+ Ghi nhận thanh toán**
2. Tìm **Khách hàng** và chọn **Hoá đơn** cần thanh toán
3. Nhập **Số tiền thanh toán** (có thể thanh toán từng phần)
4. Chọn **Phương thức**: Tiền mặt / Chuyển khoản ngân hàng
5. Nhập **Ngày thanh toán** và **Ghi chú** (nếu có)
6. Nhấn **Xác nhận thu tiền**. Phiếu thu tự động được tạo và công nợ khách giảm tương ứng.

---

### Cách xem báo cáo công nợ phải thu (khách hàng nợ tiền)

**Phân hệ:** Hoá đơn & Thanh toán — Công nợ phải thu

**Tổng quan:** Màn hình công nợ phải thu tổng hợp danh sách khách hàng đang nợ tiền, phân nhóm theo thời gian (tuổi nợ).

**Các bước xem công nợ phải thu:**

1. Vào **Thanh toán** → **Công nợ phải thu**
2. Bảng hiển thị từng khách hàng với số tiền nợ theo nhóm:
   - **0–30 ngày** — nợ mới, chưa đến hạn
   - **31–60 ngày** — sắp đến hạn
   - **61–90 ngày** — quá hạn cần nhắc
   - **Trên 90 ngày** — nợ lâu, rủi ro cao
3. Nhấn vào từng khách để xem chi tiết và thực hiện **Đối trừ chứng từ**

---

### Cách xem và thanh toán công nợ phải trả (nợ nhà cung cấp)

**Phân hệ:** Hoá đơn & Thanh toán — Công nợ phải trả

**Tổng quan:** Màn hình công nợ phải trả giúp kế toán theo dõi tiền đang nợ các nhà cung cấp và lên lịch thanh toán.

**Các bước xem lịch thanh toán nhà cung cấp:**

1. Vào **Thanh toán** → **Công nợ phải trả**
2. Danh sách hiển thị từng nhà cung cấp với tổng số tiền đang nợ và ngày đến hạn
3. Các khoản sắp đến hạn được **đánh dấu nổi bật**
4. Nhấn vào NCC để xem chi tiết từng hoá đơn đang nợ

---

### Cách quản lý quỹ tiền mặt và tài khoản ngân hàng

**Phân hệ:** Hoá đơn & Thanh toán — Quản lý quỹ

**Tổng quan:** Phân hệ quỹ giúp doanh nghiệp kiểm soát số dư tiền mặt tại quầy và số dư tài khoản ngân hàng.

**Các bước tạo phiếu thu/chi thủ công:**

1. Vào **Thanh toán** → **Quản lý quỹ** → nhấn **+ Tạo phiếu thu/chi**
2. Chọn loại: **Phiếu thu** (tiền vào) hoặc **Phiếu chi** (tiền ra)
3. Chọn **Quỹ** (Tiền mặt hoặc tài khoản ngân hàng tương ứng)
4. Nhập **Số tiền**, **Nội dung**, **Người liên quan**
5. Nhấn **Lưu** và chờ duyệt (nếu hệ thống yêu cầu phê duyệt)

**Hỏi đáp — Thanh toán & Quỹ:**

| Câu hỏi | Trả lời |
|---------|---------|
| Đối trừ chứng từ là gì? | Là khi 1 khoản tiền thanh toán của khách được khớp với nhiều hoá đơn còn nợ |
| Có thể ghi nhận thanh toán nhiều hoá đơn một lúc không? | Có. Dùng tính năng Đối trừ chứng từ trong Công nợ phải thu |
| Làm sao đối soát ngân hàng? | Vào **Quản lý quỹ** → **Đối soát ngân hàng** → import file sao kê và khớp tự động |

---

## 9. Chương trình Tích điểm & Thành viên

### Cách cấu hình chương trình tích điểm cho khách hàng

**Phân hệ:** Tích điểm & Thành viên (Loyalty)

**Tổng quan:** Phân hệ Loyalty giúp doanh nghiệp xây dựng chương trình tích điểm thưởng cho khách hàng thân thiết, tự động nâng/hạ hạng thành viên.

**Các hạng thành viên trong hệ thống:**
- **Bạc** — hạng mặc định
- **Vàng** — đạt được sau khi tích đủ điểm ngưỡng Vàng
- **Kim cương** — hạng cao nhất

**Các bước cấu hình quy tắc tích điểm:**

1. Vào **Thành viên** → **Cấu hình Loyalty**
2. Thiết lập **Tỷ lệ tích điểm**: ví dụ **10.000 VNĐ = 1 điểm**
3. Thiết lập **Ngưỡng hạng thành viên**:
   - Ví dụ: 100 điểm → Hạng Vàng, 500 điểm → Hạng Kim cương
4. Thiết lập **Quy đổi điểm thưởng**: ví dụ **1 điểm = 1.000 VNĐ** giảm trừ khi mua
5. Nhấn **Lưu cấu hình**

> Hệ thống tự động rà soát và **nâng/hạ hạng thành viên** vào đầu mỗi chu kỳ (tháng/quý).

---

### Cách khách hàng sử dụng điểm tích luỹ để giảm giá

**Phân hệ:** Tích điểm & Thành viên — Sử dụng điểm

**Các bước áp dụng điểm thưởng vào đơn hàng:**

1. Khi tạo đơn hàng, sau khi chọn khách hàng, hệ thống hiển thị **Số điểm hiện tại** và **Hạng thành viên**
2. Tích chọn ô **Sử dụng điểm tích luỹ**
3. Nhập số điểm muốn dùng (không vượt quá số điểm hiện có và không vượt quá giá trị đơn hàng)
4. Hệ thống tự động tính và hiển thị **Số tiền giảm** tương ứng
5. Hoàn tất đơn hàng như bình thường

---

## 10. Báo cáo & Phân tích kinh doanh

### Cách xem báo cáo doanh số bán hàng

**Phân hệ:** Báo cáo & Phân tích — Doanh số

**Tổng quan:** Báo cáo doanh số cung cấp cái nhìn tổng quan về hiệu quả kinh doanh theo thời gian, theo sản phẩm, và theo nhân viên.

**Các bước xem báo cáo doanh số:**

1. Vào **Báo cáo** → **Doanh số**
2. Chọn **Kỳ báo cáo**: Ngày / Tuần / Tháng / Quý / Năm, hoặc chọn khoảng ngày tuỳ chỉnh
3. Lọc thêm theo:
   - **Nhân viên bán hàng**
   - **Kênh bán** (trực tiếp, online...)
4. Dashboard hiển thị:
   - **Biểu đồ xu hướng doanh thu** theo thời gian
   - **Top sản phẩm** bán chạy nhất
   - **Top khách hàng** mua nhiều nhất
5. Nhấn **Xuất Excel** để tải về báo cáo chi tiết

---

### Cách xem báo cáo nhập-xuất-tồn kho

**Phân hệ:** Báo cáo & Phân tích — Báo cáo Kho

**Tổng quan:** Báo cáo Nhập-Xuất-Tồn (NXT) cung cấp bảng theo dõi biến động hàng hoá trong kỳ.

**Các bước xem báo cáo kho:**

1. Vào **Báo cáo** → **Báo cáo kho**
2. Chọn **Kỳ báo cáo** và **Kho** cần xem
3. Bảng NXT hiển thị với các cột:
   - **Tồn đầu kỳ** — số lượng tồn kho đầu kỳ
   - **Nhập trong kỳ** — tổng số lượng nhập kho
   - **Xuất trong kỳ** — tổng số lượng xuất kho
   - **Tồn cuối kỳ** — số lượng tồn kho cuối kỳ
4. Tab **Hàng tồn lâu ngày** — liệt kê hàng không có biến động (deadstock)
5. Tab **Phân tích ABC** — phân loại hàng theo giá trị xuất kho (A=quan trọng, C=ít quan trọng)

---

### Cách xem báo cáo tài chính (Lãi lỗ & Dòng tiền)

**Phân hệ:** Báo cáo & Phân tích — Báo cáo Tài chính

**Tổng quan:** Báo cáo tài chính cung cấp cho ban lãnh đạo cái nhìn về lợi nhuận và dòng tiền của doanh nghiệp.

**Các bước xem báo cáo Lãi - Lỗ (P&L):**

1. Vào **Báo cáo** → **Tài chính** → chọn tab **Lãi - Lỗ**
2. Chọn **Kỳ báo cáo**
3. Báo cáo hiển thị:
   - **Doanh thu thuần** — tổng tiền bán sau chiết khấu
   - **Giá vốn hàng bán** — chi phí nhập hàng tương ứng
   - **Lợi nhuận gộp** = Doanh thu thuần - Giá vốn
   - **Lợi nhuận ròng** — sau khi trừ các chi phí khác

**Các bước xem báo cáo Lưu chuyển tiền tệ (Cash Flow):**

1. Chọn tab **Lưu chuyển tiền tệ**
2. Báo cáo phân tích:
   - **Nguồn thu** — tiền nhận từ khách hàng
   - **Nguồn chi** — tiền trả cho nhà cung cấp và chi phí

---

### Cách xem báo cáo KPI và hoa hồng nhân viên

**Phân hệ:** Báo cáo & Phân tích — KPI & Hoa hồng

**Tổng quan:** Báo cáo KPI giúp nhân viên và quản lý theo dõi tiến độ đạt chỉ tiêu. Báo cáo hoa hồng tính toán khoản thưởng của từng nhân viên.

**Các bước xem báo cáo KPI cá nhân:**

1. Vào **Báo cáo** → **KPI nhân viên**
2. Chọn **Nhân viên** và **Kỳ đánh giá**
3. Bảng điểm hiển thị:
   - **Doanh số thực tế** vs **Chỉ tiêu** đặt ra
   - **Tỷ lệ chốt đơn** (số đơn thành công / số báo giá)
   - **Số khách hàng mới** trong kỳ
   - **Công nợ quá hạn** của khách do nhân viên phụ trách

**Các bước xem chi tiết hoa hồng:**

1. Vào **Báo cáo** → **Hoa hồng**
2. Chọn nhân viên và kỳ tính hoa hồng
3. Bảng hiển thị từng đơn hàng và khoản hoa hồng tương ứng

**Hỏi đáp — Báo cáo:**

| Câu hỏi | Trả lời |
|---------|---------|
| Xuất báo cáo ra Excel được không? | Có. Hầu hết các báo cáo đều có nút **Xuất Excel** |
| Dữ liệu báo cáo có realtime không? | Có, báo cáo phản ánh dữ liệu gần realtime (dưới 5 phút) |
| Có thể xem báo cáo của tháng trước không? | Có. Chọn khoảng thời gian tuỳ chỉnh trong bộ lọc |

---

## 11. Phân quyền & Nhật ký hệ thống

### Cách thiết lập và quản lý vai trò quyền hạn (RBAC)

**Phân hệ:** Phân quyền & Hệ thống — Quản lý Vai trò

**Tổng quan:** Hệ thống phân quyền dựa trên Vai trò (RBAC — Role-Based Access Control) cho phép Admin kiểm soát chính xác từng nhóm người dùng có thể làm gì trong hệ thống.

**Các bước tạo vai trò mới (Custom Role):**

1. Vào **Hệ thống** → **Quản lý vai trò** → nhấn **+ Tạo vai trò**
2. Đặt **Tên vai trò** (ví dụ: "Nhân viên kho cấp cao")
3. Bảng ma trận quyền hiển thị theo dạng lưới: **Phân hệ** (hàng) × **Hành động** (cột: Xem / Tạo / Sửa / Xoá)
4. Đánh dấu **tick** vào các ô tương ứng với quyền muốn cấp
5. Nhấn **Lưu vai trò**
6. Vào **Quản lý người dùng** để gán vai trò mới này cho nhân viên

---

### Cách xem Nhật ký thao tác hệ thống (Audit Log)

**Phân hệ:** Phân quyền & Hệ thống — Nhật ký

**Tổng quan:** Nhật ký thao tác ghi lại mọi hành động quan trọng trong hệ thống: ai đã làm gì, lúc mấy giờ, thay đổi gì. Dùng để kiểm tra khi có sự cố hoặc tranh chấp.

**Các bước xem Nhật ký thao tác:**

1. Vào **Hệ thống** → **Nhật ký thao tác**
2. Lọc theo:
   - **Người dùng** — nhân viên cụ thể
   - **Loại thao tác** — Tạo mới / Chỉnh sửa / Xoá / Đăng nhập
   - **Phân hệ** — Đơn hàng / Kho / Thanh toán...
   - **Khoảng thời gian**
3. Danh sách hiển thị chi tiết: **Thời gian**, **Người thực hiện**, **Hành động**, **Dữ liệu trước và sau thay đổi**

**Hỏi đáp — Phân quyền & Nhật ký:**

| Câu hỏi | Trả lời |
|---------|---------|
| Nhật ký có thể xoá được không? | Không. Nhật ký thao tác được bảo vệ và không thể xoá |
| Ai được xem Nhật ký? | Chỉ tài khoản ADMIN hoặc MANAGER được gán quyền xem |
| Có thể giới hạn nhân viên chỉ xem được dữ liệu của mình không? | Có, cấu hình trong ma trận phân quyền theo từng phân hệ |

---

## 12. Trợ lý ảo (Chatbot AI)

### Trợ lý ảo CDSoft là gì và dùng để làm gì

**Phân hệ:** Trợ lý ảo (Chatbot AI)

**Tổng quan:** Trợ lý ảo là tính năng tích hợp trí tuệ nhân tạo, giúp người dùng tra cứu thông tin, hỏi đáp nghiệp vụ và thực hiện một số tác vụ nhanh bằng ngôn ngữ tự nhiên — mà không cần phải điều hướng qua nhiều menu.

**Trợ lý ảo có thể giúp bạn:**
- Tra cứu tồn kho: *"Còn bao nhiêu sản phẩm X trong kho?"*
- Hỏi về công nợ: *"Tổng công nợ của khách hàng A là bao nhiêu?"*
- Hướng dẫn nghiệp vụ: *"Cách tạo phiếu nhập kho như thế nào?"*
- Tra cứu đơn hàng: *"Đơn hàng của khách B hôm qua trạng thái như thế nào?"*

---

### Cách mở và sử dụng Trợ lý ảo CDSoft

**Phân hệ:** Trợ lý ảo — Dành cho tất cả người dùng đã đăng nhập

**Các bước sử dụng Trợ lý ảo:**

1. Nhìn góc **dưới bên phải** màn hình, nhấn vào **biểu tượng trợ lý** (hình robot hoặc chat)
2. Cửa sổ chat mở ra
3. Gõ câu hỏi bằng **tiếng Việt** tự nhiên vào ô nhập liệu
4. Nhấn **Enter** hoặc nút **Gửi**
5. Trợ lý sẽ phản hồi trong vài giây. Nếu cần tra cứu dữ liệu thực tế, bạn sẽ thấy thông báo *"Đang tra cứu..."*

**Ví dụ câu hỏi hữu ích:**

| Câu hỏi mẫu | Kết quả nhận được |
|------------|-----------------|
| *"Tồn kho hiện tại của Sản phẩm ABC là bao nhiêu?"* | Số lượng tồn theo kho |
| *"Khách hàng Nguyễn Văn A đang nợ bao nhiêu tiền?"* | Tổng công nợ và số hoá đơn chưa thanh toán |
| *"Làm sao để tạo phiếu nhập kho?"* | Hướng dẫn từng bước |
| *"Doanh thu tháng này là bao nhiêu?"* | Số liệu doanh thu tháng hiện tại |

---

### Giới hạn sử dụng Trợ lý ảo (Quota)

**Phân hệ:** Trợ lý ảo — Chính sách sử dụng

**Tổng quan:** Để đảm bảo dịch vụ ổn định cho tất cả người dùng, hệ thống áp dụng giới hạn số lượng câu hỏi mỗi ngày.

**Giới hạn áp dụng:**
- **Mỗi người dùng:** Tối đa **200 câu hỏi/ngày**
- Giới hạn được **tự động reset lúc 00:00 mỗi ngày**

**Thông báo khi hết lượt:**
- Khi bạn đạt giới hạn ngày, ô nhập liệu sẽ **bị khoá** kèm thông báo lịch sự
- Trợ lý sẽ hoạt động trở lại vào ngày hôm sau

**Hỏi đáp — Trợ lý ảo:**

| Câu hỏi | Trả lời |
|---------|---------|
| Trợ lý ảo có thể tạo đơn hàng thay tôi không? | Có thể. Bạn có thể nhờ trợ lý tạo đơn bằng cách cung cấp đủ thông tin (khách hàng, sản phẩm, số lượng) |
| Dữ liệu tôi hỏi có bị lưu lại không? | Hệ thống ghi lại nhật ký sử dụng chatbot cho mục đích kiểm soát chất lượng nội bộ |
| Trợ lý không trả lời đúng thì làm gì? | Thử diễn đạt lại câu hỏi rõ ràng hơn, hoặc liên hệ bộ phận hỗ trợ |
| Trợ lý có thể nói được tiếng Anh không? | Có, nhưng khuyến khích dùng tiếng Việt để nhận câu trả lời chính xác nhất |

---

## Phụ lục — Bảng tra cứu nhanh

### Các trạng thái đơn hàng trong CDSoft

| Trạng thái | Ý nghĩa | Hành động tiếp theo |
|-----------|---------|-------------------|
| **Nháp** | Đơn mới tạo, chưa khoá | Chỉnh sửa hoặc Xác nhận |
| **Đã xác nhận** | Đơn đã khoá, tồn kho đã trừ | Giao hàng hoặc Thanh toán |
| **Đã thanh toán** | Khách đã trả đủ tiền | Hoàn tất |
| **Đã huỷ** | Đơn bị huỷ, tồn kho được hoàn | Không thể khôi phục |

### Các trạng thái phiếu kho trong CDSoft

| Trạng thái | Ý nghĩa |
|-----------|---------|
| **Nháp** | Phiếu chưa xác nhận, tồn kho chưa thay đổi |
| **Đã xác nhận** | Phiếu đã xử lý, tồn kho đã cập nhật |
| **Đã huỷ** | Phiếu bị huỷ |

### Vai trò người dùng và quyền cơ bản trong CDSoft

| Vai trò | Quyền mặc định |
|---------|--------------|
| **ADMIN** | Toàn quyền hệ thống |
| **MANAGER** | Xem tất cả báo cáo, duyệt phiếu, quản lý nhân viên |
| **ACCOUNTANT** | Quản lý thanh toán, công nợ, báo cáo tài chính |
| **WAREHOUSE** | Nhập/xuất/điều chỉnh kho, xem tồn kho |
| **STAFF** | Tạo đơn hàng, xem sản phẩm, xem khách hàng |
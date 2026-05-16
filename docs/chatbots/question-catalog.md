# Danh mục câu hỏi cho Chatbot CDSoft

> Cập nhật 2026-05-12: backend chatbot đã được mở rộng theo hướng read-only cho toàn bộ các nhóm dữ liệu trong tài liệu này. File này vẫn hữu ích như catalog câu hỏi mẫu và backlog tinh chỉnh chất lượng trả lời, nhưng không còn phản ánh trạng thái "thiếu tool" như ở giai đoạn đầu.

Tài liệu này tổng hợp các nhóm câu hỏi người dùng có thể hỏi chatbot trong phần mềm quản lý bán hàng CDSoft.

Nhận định hiện tại là đúng:

- Cách làm trong `backend/src/tenant-module/chatbot/chatbot-tools.service.ts` là hợp lý cho bài toán multi-tenant vì truy vấn đi thẳng vào tenant database hiện tại.
- Điểm thiếu chính không nằm ở kiến trúc truy vấn, mà nằm ở độ phủ dữ liệu và số lượng tool chatbot đang có.
- Hiện chatbot mới có 9 tool: `getProducts`, `getCustomers`, `getSuppliers`, `getInvoices`, `getPurchaseInvoices`, `getStock`, `calculateCustomerDebt`, `calculateSupplierDebt`, `ragSearch`.
- Vì vậy chatbot mới mạnh ở tra cứu cơ bản và how-to, nhưng còn thiếu nhiều câu hỏi về đơn hàng, dòng tiền, tồn kho chi tiết, báo cáo, loyalty và thao tác tạo chứng từ.

## Cách đọc tài liệu

- `Đã hỗ trợ`: có thể trả lời tương đối tốt với tool hiện tại.
- `Hỗ trợ một phần`: có dữ liệu gần đúng, nhưng cần bổ sung thêm tool hoặc mở rộng truy vấn để trả lời chắc chắn hơn.
- `Chưa hỗ trợ`: cần bổ sung tool, nguồn dữ liệu hoặc hành động mới.

## 1. Hướng dẫn sử dụng phần mềm

Nguồn chính: `ragSearch` từ OpenSearch.

| Câu hỏi mẫu | Trạng thái |
|---|---|
| Làm sao để tạo đơn bán hàng? | Đã hỗ trợ |
| Tôi mở trợ lý ảo ở đâu? | Đã hỗ trợ |
| Cách tạo phiếu nhập kho như thế nào? | Đã hỗ trợ |
| Làm sao để tạo khách hàng mới? | Đã hỗ trợ nếu tài liệu đã ingest |
| Làm sao để ghi nhận thanh toán cho hóa đơn? | Đã hỗ trợ nếu tài liệu đã ingest |
| Tôi muốn xem báo cáo doanh thu thì vào đâu? | Đã hỗ trợ nếu tài liệu đã ingest |
| Vì sao chatbot bị khóa ô nhập? | Đã hỗ trợ nếu tài liệu đã ingest |
| Giới hạn 200 câu hỏi mỗi ngày có reset khi nào? | Đã hỗ trợ nếu tài liệu đã ingest |

## 2. Sản phẩm

Nguồn hiện có: `getProducts`, `getStock`.

| Câu hỏi mẫu | Trạng thái |
|---|---|
| Tìm sản phẩm có mã ABC123 | Đã hỗ trợ |
| Sản phẩm iPhone 15 đang bán giá bao nhiêu? | Đã hỗ trợ |
| Sản phẩm nào đang còn hàng nhiều nhất? | Đã hỗ trợ |
| Sản phẩm nào đang ngừng kinh doanh? | Đã hỗ trợ |
| Sản phẩm nào sắp chạm mức tồn tối thiểu? | Hỗ trợ một phần |
| Giá vốn của sản phẩm X là bao nhiêu? | Đã hỗ trợ |
| Lịch sử nhập xuất của sản phẩm X trong tháng này | Chưa hỗ trợ |
| Sản phẩm X đang nằm ở những kho nào? | Hỗ trợ một phần |
| Sản phẩm nào bán chạy nhất tuần này? | Chưa hỗ trợ trực tiếp qua chatbot hiện tại |

## 3. Khách hàng

Nguồn hiện có: `getCustomers`, `calculateCustomerDebt`.

| Câu hỏi mẫu | Trạng thái |
|---|---|
| Tìm khách hàng Nguyễn Văn A | Đã hỗ trợ |
| Khách hàng A đang nợ bao nhiêu? | Đã hỗ trợ |
| Khách hàng nào có công nợ cao nhất? | Chưa hỗ trợ |
| Danh sách khách hàng mới tạo gần đây | Đã hỗ trợ |
| Khách hàng A có số điện thoại gì? | Đã hỗ trợ |
| Khách hàng A có bao nhiêu hóa đơn chưa thanh toán? | Đã hỗ trợ |
| Lịch sử giao dịch của khách hàng A | Chưa hỗ trợ |
| Khách hàng nào vượt hạn mức tín dụng? | Chưa hỗ trợ |
| Top khách hàng mua nhiều nhất tháng này | Chưa hỗ trợ trực tiếp qua chatbot hiện tại |

## 4. Nhà cung cấp

Nguồn hiện có: `getSuppliers`, `calculateSupplierDebt`.

| Câu hỏi mẫu | Trạng thái |
|---|---|
| Tìm nhà cung cấp ABC | Đã hỗ trợ |
| Nhà cung cấp ABC đang được ghi nhận công nợ bao nhiêu? | Đã hỗ trợ |
| Có bao nhiêu hóa đơn mua chưa thanh toán của nhà cung cấp ABC? | Đã hỗ trợ |
| Danh sách nhà cung cấp đang hoạt động | Đã hỗ trợ |
| Nhà cung cấp nào đang có công nợ lớn nhất? | Chưa hỗ trợ |
| Nhà cung cấp nào đã lâu chưa phát sinh đơn mua? | Chưa hỗ trợ |
| Lịch sử mua hàng từ nhà cung cấp ABC | Chưa hỗ trợ |

## 5. Hóa đơn bán hàng và phải thu

Nguồn hiện có: `getInvoices`, `calculateCustomerDebt`.

| Câu hỏi mẫu | Trạng thái |
|---|---|
| Liệt kê hóa đơn chưa thanh toán hôm nay | Đã hỗ trợ |
| Hóa đơn của khách hàng A trong tuần này | Đã hỗ trợ |
| Tổng phải thu hiện tại là bao nhiêu? | Chưa hỗ trợ |
| Hóa đơn INV-2026-0001 có trạng thái gì? | Hỗ trợ một phần |
| Hóa đơn nào sắp đến hạn thanh toán? | Chưa hỗ trợ |
| Có bao nhiêu hóa đơn đã thanh toán trong tháng này? | Hỗ trợ một phần |
| Lịch sử thanh toán của hóa đơn INV-2026-0001 | Chưa hỗ trợ |
| Khách hàng nào đang có hóa đơn quá hạn? | Chưa hỗ trợ |

## 6. Hóa đơn mua hàng và phải trả

Nguồn hiện có: `getPurchaseInvoices`, `calculateSupplierDebt`.

| Câu hỏi mẫu | Trạng thái |
|---|---|
| Liệt kê hóa đơn mua chưa thanh toán | Đã hỗ trợ |
| Hóa đơn mua của nhà cung cấp ABC trong tháng này | Đã hỗ trợ |
| Tổng phải trả hiện tại là bao nhiêu? | Chưa hỗ trợ |
| Hóa đơn mua nào sắp đến hạn? | Chưa hỗ trợ |
| Nhà cung cấp nào đang bị nợ nhiều nhất? | Chưa hỗ trợ |
| Hóa đơn PINV-2026-0003 có trạng thái gì? | Hỗ trợ một phần |

## 7. Đơn bán hàng và đơn mua hàng

Nguồn dữ liệu hệ thống đã có ở controller, nhưng chatbot chưa có tool riêng.

| Câu hỏi mẫu | Trạng thái |
|---|---|
| Đơn bán hàng SO-2026-0001 đang ở trạng thái nào? | Chưa hỗ trợ |
| Liệt kê các đơn bán hôm nay | Chưa hỗ trợ |
| Đơn hàng nào đang chờ giao? | Chưa hỗ trợ |
| Có bao nhiêu đơn đã hoàn thành trong tuần này? | Chưa hỗ trợ |
| Đơn mua hàng PO-2026-0002 đã nhận chưa? | Chưa hỗ trợ |
| Danh sách đơn mua đang chờ nhận hàng | Chưa hỗ trợ |
| Đơn nào đã bị hủy hôm nay? | Chưa hỗ trợ |
| Trả hàng của khách A trong tuần này | Chưa hỗ trợ |

## 8. Kho và tồn kho chi tiết

Nguồn hiện có: `getStock`. Dữ liệu hệ thống có thêm nhiều endpoint kho nhưng chatbot chưa khai thác.

| Câu hỏi mẫu | Trạng thái |
|---|---|
| Tồn kho của sản phẩm X ở kho Hà Nội | Đã hỗ trợ |
| Top sản phẩm tồn cao nhất | Đã hỗ trợ |
| Sản phẩm nào sắp hết hàng? | Hỗ trợ một phần |
| Lô nào sắp hết hạn trong 30 ngày tới? | Chưa hỗ trợ |
| Lịch sử nhập xuất của sản phẩm X | Chưa hỗ trợ |
| Phiếu nhập kho gần nhất của sản phẩm X | Chưa hỗ trợ |
| Phiếu xuất kho nào vừa xác nhận hôm nay? | Chưa hỗ trợ |
| Có bao nhiêu phiếu kiểm kê đang mở? | Chưa hỗ trợ |
| Hàng nào đang deadstock? | Chưa hỗ trợ trực tiếp qua chatbot hiện tại |
| Hàng nào đang chuyển kho nhưng chưa nhận? | Chưa hỗ trợ |

## 9. Tiền mặt, ngân hàng, thu chi

Nguồn dữ liệu hệ thống có, chatbot chưa có tool riêng.

| Câu hỏi mẫu | Trạng thái |
|---|---|
| Quỹ tiền mặt hiện tại còn bao nhiêu? | Chưa hỗ trợ |
| Tài khoản ngân hàng A còn số dư bao nhiêu? | Chưa hỗ trợ |
| Hôm nay đã thu được bao nhiêu tiền mặt? | Chưa hỗ trợ |
| Hôm nay đã chi bao nhiêu tiền? | Chưa hỗ trợ |
| Phiếu thu gần nhất của khách hàng A | Chưa hỗ trợ |
| Danh sách phiếu chi đang chờ duyệt | Chưa hỗ trợ |
| Khoản chi nào vừa bị từ chối? | Chưa hỗ trợ |

## 10. Báo cáo, KPI, phân tích

Nguồn dữ liệu hệ thống đã có trong `tenant/reports`, nhưng chatbot chưa có tool riêng.

| Câu hỏi mẫu | Trạng thái |
|---|---|
| Doanh thu hôm nay là bao nhiêu? | Chưa hỗ trợ trực tiếp qua chatbot hiện tại |
| Doanh thu tháng này so với tháng trước | Chưa hỗ trợ |
| Lợi nhuận theo sản phẩm trong tháng này | Chưa hỗ trợ |
| Dòng tiền tháng này như thế nào? | Chưa hỗ trợ |
| KPI tổng quan hôm nay | Chưa hỗ trợ |
| Top 10 sản phẩm bán chạy nhất | Chưa hỗ trợ |
| Top 10 khách hàng mua nhiều nhất | Chưa hỗ trợ |
| Nhà cung cấp nào có tổng mua lớn nhất quý này? | Chưa hỗ trợ |
| Hàng nào có vòng quay tồn kho thấp? | Chưa hỗ trợ |
| Phân tích ABC tồn kho | Chưa hỗ trợ |

## 11. Loyalty và thành viên

Nguồn dữ liệu hệ thống đã có, chatbot chưa có tool riêng.

| Câu hỏi mẫu | Trạng thái |
|---|---|
| Khách hàng A đang có bao nhiêu điểm? | Chưa hỗ trợ |
| Khách hàng A thuộc hạng thành viên nào? | Chưa hỗ trợ |
| Nếu đổi 500 điểm thì được bao nhiêu tiền? | Chưa hỗ trợ |
| Lịch sử cộng trừ điểm của khách hàng A | Chưa hỗ trợ |
| Cấu hình tích điểm hiện tại là gì? | Chưa hỗ trợ |

## 12. Câu hỏi hành động

Đây là nhóm câu hỏi có giá trị cao, nhưng hiện chatbot gần như chưa có tool mutation để làm việc thay người dùng.

| Câu hỏi mẫu | Trạng thái |
|---|---|
| Tạo đơn bán hàng cho khách A gồm 2 sản phẩm | Chưa hỗ trợ |
| Tạo đơn mua hàng cho nhà cung cấp B | Chưa hỗ trợ |
| Ghi nhận thanh toán cho hóa đơn INV-2026-0001 | Chưa hỗ trợ |
| Tạo phiếu nhập kho cho lô hàng mới | Chưa hỗ trợ |
| Tạo phiếu xuất kho cho đơn SO-2026-0001 | Chưa hỗ trợ |
| Tạo phiếu thu 5 triệu từ khách A | Chưa hỗ trợ |
| Phê duyệt phiếu chi đang chờ | Chưa hỗ trợ |
| Tạo khách hàng mới với số điện thoại X | Chưa hỗ trợ |

## 13. Nhóm câu hỏi nên ưu tiên bổ sung trước

Nếu phải chọn các nhóm có giá trị nhất để mở rộng chatbot, nên ưu tiên theo thứ tự này:

1. Đơn bán hàng và đơn mua hàng.
2. Báo cáo doanh thu, KPI, lợi nhuận, công nợ tổng hợp.
3. Tồn kho chi tiết: lô, hạn dùng, lịch sử nhập xuất, cảnh báo hết hàng.
4. Thu chi, quỹ tiền mặt, ngân hàng, phiếu thu/phiếu chi.
5. Loyalty và lịch sử khách hàng.
6. Hành động tạo chứng từ cơ bản.

## 14. Tool nên có tương ứng

Để trả lời được phần lớn câu hỏi ở trên, chatbot nên được bổ sung tối thiểu các tool sau:

- `getSalesOrders`
- `getSalesOrderDetail`
- `getPurchaseOrders`
- `getPurchaseOrderDetail`
- `getInventoryTransactions`
- `getInventoryLots`
- `getExpiryAlerts`
- `getDashboardStats`
- `getCashFunds`
- `getBankAccounts`
- `getCashReceipts`
- `getDisbursements`
- `getArAging`
- `getApSchedule`
- `getSalesReport`
- `getKpiReport`
- `getCashflowReport`
- `getDebtByCustomer`
- `getDebtBySupplier`
- `getSalesByProduct`
- `getSalesByCustomer`
- `getCustomerPaymentHistory`
- `getCustomerTransactions`
- `getCustomerLoyalty`
- `getLoyaltyTransactions`

Nhóm tool hành động nên triển khai sau:

- `createSalesOrder`
- `createPurchaseOrder`
- `recordPayment`
- `recordSupplierPayment`
- `createCashReceipt`
- `createStockReceipt`
- `createStockIssue`

## 15. Kết luận

Nhận định ban đầu là đúng:

- Phần chatbot hiện tại không yếu ở cách truy cập tenant data.
- Phần còn thiếu là bề rộng dữ liệu và số lượng tool phục vụ các câu hỏi nghiệp vụ thực tế.
- Chỉ cần mở rộng thêm tool theo đúng các service đã có sẵn trong hệ thống, chatbot sẽ mạnh lên rất nhanh mà không cần đổi kiến trúc.

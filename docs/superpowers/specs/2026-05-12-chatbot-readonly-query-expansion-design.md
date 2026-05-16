# Thiết kế mở rộng chatbot read-only theo domain query service

## Mục tiêu

Mở rộng chatbot để trả lời toàn bộ nhóm câu hỏi tra cứu trong [question-catalog.md](/D:/Github/cdsoft-sale-management/docs/chatbots/question-catalog.md) mà không đổi kiến trúc multi-tenant hiện tại.

Phần cốt lõi cần giữ nguyên:

- Chatbot vẫn chỉ có một API công khai là `POST /tenant/chatbot/chat`.
- Chatbot vẫn truy vấn đúng tenant database hiện tại qua `TenantDataSourceManager`.
- OpenSearch vẫn chỉ dùng cho nhóm câu hỏi hướng dẫn sử dụng phần mềm.

## Vấn đề hiện tại

`ChatbotToolsService` đang làm hai việc cùng lúc:

- khai báo tool schema cho OpenAI function calling
- chứa toàn bộ SQL truy vấn read-only

Cách này ổn khi số tool ít, nhưng sẽ nhanh chóng khó bảo trì khi mở rộng thêm nhiều nhóm dữ liệu như đơn hàng, kho, thu chi, báo cáo và loyalty.

## Phương án được chọn

Tách phần truy vấn read-only thành các service theo domain, còn `ChatbotToolsService` chỉ giữ vai trò:

- định nghĩa tool schema
- nhận tool call từ model
- dispatch sang service tương ứng
- giữ `ragSearch`

Các service mới:

- `ChatbotQueryContextService`: cung cấp `getDs()`, `like()`, `clampLimit()`
- `ChatbotMasterDataReadService`: sản phẩm, khách hàng, nhà cung cấp, công nợ cơ bản
- `ChatbotOrdersReadService`: đơn bán, đơn mua, trả hàng
- `ChatbotInventoryReadService`: tồn kho, giao dịch kho, lô, hạn dùng, phiếu nhập/xuất/chuyển/kiểm kê
- `ChatbotFinanceReadService`: quỹ tiền mặt, tài khoản ngân hàng, phiếu thu chi, disbursement, AR/AP, lịch sử thanh toán
- `ChatbotReportsReadService`: dashboard, sales, profit, cashflow, KPI, debt, sales by product/customer, purchase by supplier, deadstock, ABC
- `ChatbotLoyaltyReadService`: cấu hình loyalty, điểm khách hàng, lịch sử điểm

## Nguyên tắc thiết kế tool

Không tạo quá nhiều tool nhỏ theo từng câu hỏi. Thay vào đó, mỗi domain có một số tool đủ rộng để model tái sử dụng:

- master data: giữ các tool hiện có
- orders: `getSalesOrders`, `getPurchaseOrders`, `getReturnOrders`
- inventory: `getInventoryTransactions`, `getInventoryLots`, `getExpiryAlerts`, `getStockReceipts`, `getStockIssues`, `getStockTransfers`, `getStocktakingSessions`
- finance: `getCashFunds`, `getBankAccounts`, `getCashReceipts`, `getDisbursements`, `getArAging`, `getApSchedule`, `getCustomerPaymentHistory`
- reports: `getDashboardStats`, `getSalesReport`, `getProfitByProduct`, `getCashflowReport`, `getKpiReport`, `getDebtByCustomer`, `getDebtBySupplier`, `getSalesByProduct`, `getSalesByCustomer`, `getPurchaseBySupplier`, `getDeadstockReport`, `getAbcAnalysis`
- loyalty: `getCustomerLoyalty`, `getLoyaltyTransactions`, `getLoyaltyConfig`

## Dữ liệu trả về

Mỗi tool trả về JSON đơn giản, ổn định cho LLM:

- `count`
- `items` hoặc `summary`
- số liệu đã chuẩn hóa về `number` nếu cần

Không trả về object quá sâu hoặc dữ liệu thừa như UUID nội bộ nếu model không cần.

## Phạm vi đợt này

Bao phủ toàn bộ nhóm câu hỏi read-only trong catalog:

- hướng dẫn sử dụng qua RAG
- master data
- công nợ, hóa đơn, đơn hàng
- kho và tồn kho chi tiết
- thu chi và tài khoản
- báo cáo/KPI/phân tích
- loyalty

Không làm trong đợt này:

- mutation tool như tạo đơn, ghi nhận thanh toán, tạo phiếu thu/chi/nhập/xuất
- thay đổi UI
- thay đổi API công khai chatbot

## Cập nhật prompt

`SYSTEM_PROMPT` phải được mở rộng để model:

- biết toàn bộ tool read-only mới
- luôn gọi tool khi câu hỏi liên quan dữ liệu nghiệp vụ
- ưu tiên `ragSearch` cho how-to
- không tự suy đoán số liệu khi chưa gọi tool

## Kiểm thử

Kiểm thử tối thiểu:

- build backend TypeScript không lỗi
- smoke test các tool mới qua `runTool()` hoặc chat flow
- rà lại tài liệu `question-catalog.md` để phản ánh phạm vi đã hỗ trợ

## Rủi ro

- số tool tăng có thể làm model chọn sai tool nếu mô tả schema không đủ rõ
- một số report của chatbot sẽ là bản read-only tối ưu cho hội thoại, không nhất thiết khớp 100% shape REST hiện tại
- phần dữ liệu tài chính như cashflow có thể phụ thuộc cách hệ thống ghi nhận cash movement; cần ưu tiên tính nhất quán hơn là sao chép toàn bộ logic UI

## Kết quả kỳ vọng

Sau thay đổi này, chatbot có thể xử lý phần lớn câu hỏi read-only trong tài liệu catalog mà không cần đổi kiến trúc đa tenant, đồng thời code query được chia nhỏ đủ rõ để tiếp tục mở rộng về sau.

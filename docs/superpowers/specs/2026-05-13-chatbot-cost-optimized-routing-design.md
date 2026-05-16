# Chatbot Cost-Optimized Routing Design

## Mục tiêu

Giảm mạnh token và chi phí chatbot cho bài toán phần mềm quản lý bán hàng bằng 3 đòn chính:

- route bằng rule trước khi gọi model
- chọn model theo độ chắc chắn và độ phức tạp
- tránh dùng LLM cho các câu tra cứu mã chứng từ hoặc action chưa hỗ trợ

## Vấn đề của cách cũ

1. Mỗi request đều đi vào một model chat chính.
2. Prompt luôn dài và mang theo gần như toàn bộ tool schema.
3. Các câu rất rõ như `tra cứu hóa đơn HD001` vẫn phải tốn token để model tự quyết định tool.

## Thiết kế mới

### 1. Rule-first router

Thêm lớp router nội bộ đọc `last user message` và sinh `ChatRoutePlan`.

Intent:

- `QUERY_DB`
- `RAG_GUIDE`
- `API_ACTION`
- `UNCERTAIN`

Rule chính:

- có mã chứng từ rõ ràng -> `QUERY_DB`
- có keyword tra cứu -> `QUERY_DB`
- có keyword hướng dẫn -> `RAG_GUIDE`
- có keyword action -> `API_ACTION`
- còn lại -> `UNCERTAIN`

### 2. Direct handling không qua LLM

Hai loại request được short-circuit:

- `API_ACTION`: trả lời ngay chatbot đang ở chế độ read-only
- `QUERY_DB` có `directToolCall`: gọi tool read-only trực tiếp và render bằng template

Ví dụ:

- `Tra cứu hóa đơn HD001` -> `getInvoices({ codeQuery: 'HD001' })`
- `Xem đơn bán DH1001` -> `getSalesOrders({ codeQuery: 'DH1001' })`

### 3. Route-specific tool subset

Khi vẫn cần LLM, chỉ expose nhóm tool liên quan:

- documents
- inventory
- finance
- reports
- master data / loyalty
- guide chỉ có `ragSearch`

Điểm tiết kiệm chính là không gửi cả catalog tool cho mọi request.

### 4. Dynamic model selection

Mỗi route chọn model khác nhau:

- `fastModel`: `gpt-5-nano`
- `uncertainModel`: `gpt-5.4-nano`
- `complexModel`: `gpt-5.4-mini`

Policy:

- route rõ + câu ngắn -> `fastModel`
- route không chắc -> `uncertainModel`
- câu dài / cần giải thích / tổng hợp -> `complexModel`

### 5. Compact prompts

Thay system prompt dài bằng:

- base prompt ngắn
- route instruction ngắn
- runtime date context
- runtime access context

Không lặp lại mô tả của mọi tool trong mọi request.

## Thay đổi code

- `chatbot-routing.ts`
  - rule router
  - direct lookup plan
  - domain tool subset

- `chatbot-direct-response.ts`
  - render kết quả trực tiếp cho lookup không qua LLM

- `openai.service.ts`
  - hỗ trợ override model theo request

- `chatbot.service.ts`
  - áp route-first orchestration
  - short-circuit cho action và direct lookup
  - dùng tool subset và model động

- `chatbot-tools.service.ts`
  - lọc tool schema theo danh sách route yêu cầu
  - thêm `codeQuery` cho một số tool

- các read service
  - hỗ trợ `codeQuery` cho lookup mã chứng từ

## Cấu hình

```env
CHATBOT_FAST_MODEL=gpt-5-nano
CHATBOT_UNCERTAIN_MODEL=gpt-5.4-nano
CHATBOT_COMPLEX_MODEL=gpt-5.4-mini
```

## Hành vi mong đợi

- action request: 0 token chat
- lookup mã chứng từ: 0 token chat
- query rõ nhưng không render trực tiếp: token thấp hơn đáng kể nhờ prompt ngắn + ít tool
- query mơ hồ hoặc hỏi giải thích phức tạp: chỉ lúc đó mới nâng model

## Rủi ro còn lại

- regex mã chứng từ có thể cần tinh chỉnh thêm theo format thực tế của từng tenant
- một số loại chứng từ kho/thu chi chưa có `codeQuery` riêng, nên hiện tại mới tối ưu trước nhóm hóa đơn/đơn hàng/phiếu nhập
- nếu user hỏi đa ý trong một câu, router có thể xếp vào `UNCERTAIN` và vẫn phải dùng model fallback

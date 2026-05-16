# Chiến lược tối ưu chi phí chatbot

## Bài toán

Chatbot hiện có 2 điểm đốt token lớn:

1. Mọi request đều đi thẳng vào LLM, kể cả câu rất rõ như tra cứu mã hóa đơn.
2. Prompt luôn mang theo bộ tool lớn, làm input token phình ra không cần thiết.

Mục tiêu là giảm chi phí trên mỗi request mà vẫn giữ chất lượng đủ tốt cho phần mềm quản lý bán hàng.

## Chọn model

Theo tài liệu chính thức của OpenAI:

- `gpt-5-nano`: rẻ nhất, rất phù hợp cho classification, summarization và câu trả lời ngắn.
- `gpt-5.4-nano`: model mới hơn, vẫn rẻ, phù hợp cho tác vụ đơn giản khối lượng lớn.
- `gpt-5.4-mini`: mạnh hơn đáng kể, phù hợp cho câu hỏi mơ hồ hoặc cần giải thích phức tạp.

Nguồn:

- [Pricing](https://developers.openai.com/api/docs/pricing)
- [Models](https://developers.openai.com/api/docs/models)
- [GPT-5 nano](https://developers.openai.com/api/docs/models/gpt-5-nano)
- [GPT-5.4 nano](https://developers.openai.com/api/docs/models/gpt-5.4-nano)
- [GPT-5.4 mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini)

### Cấu hình khuyến nghị

Mặc định:

```text
Fast / câu ngắn / query rõ ràng:
gpt-5-nano
```

```text
Fallback khi rule không chắc:
gpt-5.4-nano
```

```text
Giải thích phức tạp / câu dài / RAG phức tạp:
gpt-5.4-mini
```

Embedding:

```text
text-embedding-3-small
```

## Rule router trước khi gọi model

Không dùng LLM để classify mọi request.

Áp rule trước:

```text
Có mã chứng từ / hóa đơn / đơn hàng rõ ràng -> QUERY_DB
Có từ khóa "tra cứu", "tìm", "xem", "kiểm tra trạng thái" -> QUERY_DB
Có từ khóa "làm sao", "hướng dẫn", "cách", "ở đâu", "quy trình" -> RAG_GUIDE
Có từ khóa "tạo", "cập nhật", "xóa", "duyệt", "gửi" -> API_ACTION
Không chắc -> UNCERTAIN
```

## Chiến lược xử lý theo route

### 1. `API_ACTION`

Không gọi LLM.

Backend trả lời ngay:

```text
Chatbot hiện đang tối ưu cho tra cứu read-only.
Các thao tác tạo, cập nhật, xóa, duyệt, gửi chứng từ chưa được hỗ trợ qua chatbot.
```

### 2. `QUERY_DB` có mã chứng từ rõ ràng

Không gọi LLM.

Backend:

1. xác định loại đối tượng qua keyword
2. gọi đúng tool read-only
3. render kết quả bằng template

Ví dụ:

```text
"Tra cứu hóa đơn HD001"
-> getInvoices({ codeQuery: "HD001" })
-> render text trực tiếp
```

Đây là đường tiết kiệm nhất vì:

- không tốn classifier LLM
- không tốn answer LLM
- không phải gửi tool schema lớn

### 3. `QUERY_DB` rõ ràng nhưng chưa đủ để render trực tiếp

Vẫn gọi LLM, nhưng:

- chỉ dùng `gpt-5-nano`
- chỉ truyền một nhóm tool liên quan
- dùng prompt ngắn, không kéo theo toàn bộ catalog

Ví dụ:

```text
"Tìm đơn hàng chưa thanh toán tuần này"
-> route QUERY_DB
-> chỉ expose tool nhóm orders/finance liên quan
-> model nhỏ gọi tool và tóm tắt kết quả
```

### 4. `RAG_GUIDE`

Nếu câu hỏi how-to đơn giản:

- dùng `gpt-5-nano`
- chỉ expose `ragSearch`

Nếu câu hỏi dài, mơ hồ, cần giải thích hoặc tổng hợp:

- nâng lên `gpt-5.4-mini`

### 5. `UNCERTAIN`

Khi rule không chắc:

- không gọi classifier riêng
- dùng `gpt-5.4-nano` làm model fallback
- truyền bộ tool đã thu hẹp theo domain gần nhất

## Tối ưu token ở lớp prompt

Thay vì luôn gửi một system prompt dài và toàn bộ tool schema:

1. dùng `route-specific prompt`
2. chỉ gửi các tool của route hiện tại
3. chỉ gửi access context và date context cần thiết

Ví dụ:

- `QUERY_DB`: chỉ cần rule “phải dùng tool, không bịa dữ liệu”
- `RAG_GUIDE`: chỉ cần rule “luôn dùng ragSearch trước”

Không cần nhắc lại toàn bộ tất cả nhóm tool trong mọi request.

## Tối ưu token ở lớp tool

### Giảm số tool theo domain

Ví dụ:

- inventory question -> chỉ gửi tool kho
- report question -> chỉ gửi tool báo cáo
- document lookup -> chỉ gửi tool hóa đơn / đơn hàng / công nợ liên quan

### Hỗ trợ tra cứu theo mã chứng từ

Các tool read-only nên có thêm `codeQuery` để tránh phải dùng LLM suy diễn từ text tự do.

Áp dụng cho:

- hóa đơn bán
- hóa đơn mua
- đơn bán
- đơn mua
- đơn trả hàng
- phiếu nhập

## Tối ưu chi phí thực tế

Đường chi phí thấp nhất nên là:

```text
Request rõ mã chứng từ -> query trực tiếp + render template -> 0 token chat
Request action -> trả lời rule-based -> 0 token chat
Request query rõ -> gpt-5-nano
Request how-to đơn giản -> gpt-5-nano + ragSearch
Request mơ hồ / giải thích dài -> gpt-5.4-nano hoặc gpt-5.4-mini
```

## Cấu hình môi trường đề xuất

```env
CHATBOT_FAST_MODEL=gpt-5-nano
CHATBOT_UNCERTAIN_MODEL=gpt-5.4-nano
CHATBOT_COMPLEX_MODEL=gpt-5.4-mini
CHATBOT_EMBEDDING_MODEL=text-embedding-3-small
```

## Kỳ vọng sau tối ưu

Nếu phần lớn request là tra cứu read-only hoặc lookup mã chứng từ, chi phí sẽ giảm mạnh vì:

- nhiều request không đi vào LLM
- request có vào LLM thì thường chỉ dùng `gpt-5-nano`
- input token giảm do prompt và tool schema ngắn hơn

Chiến lược này phù hợp nhất cho phần mềm quản lý bán hàng, nơi số lượng câu tra cứu có cấu trúc thường nhiều hơn số câu hỏi giải thích mở.

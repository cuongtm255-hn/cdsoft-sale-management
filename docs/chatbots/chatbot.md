Kiến trúc kết hợp NextJS, GPT-4, mô hình RAG và Aiven OpenSearch là một lựa chọn cực kỳ chuẩn xác cho một nền tảng SaaS hiện đại. Nó sẽ biến chatbot từ một công cụ FAQ thụ động thành một trợ lý ảo thực thụ, thấu hiểu ngữ cảnh.

Trước khi đi vào kỹ thuật, đây là những tính năng nâng cao mà trợ lý AI có thể mang lại cho hệ thống quản lý bán hàng của bạn:

### Các tính năng nâng cao cho Chatbot (Agentic AI)

1. **Tra cứu chứng từ và Công nợ qua ngôn ngữ tự nhiên:** Người dùng có thể gõ *"Tìm cho tôi chứng từ nhập hàng của nhà cung cấp A tuần trước"* hoặc *"Tổng công nợ hiện tại của đối tác B là bao nhiêu?"*. Chatbot sẽ dùng AI (Function Calling) để dịch câu này thành truy vấn, gọi API nội bộ và hiển thị kết quả ngay trên khung chat.
2. **Phân tích Tồn kho (Inventory Insights):** Khách có thể hỏi *"Sản phẩm nào đang tồn kho lâu nhất?"* hoặc *"Dự báo tuần sau cần nhập thêm mặt hàng nào?"*. Chatbot sẽ phân tích dữ liệu bán hàng và đưa ra đề xuất.
3. **Điều hướng thông minh (Deep Linking):** Thay vì chỉ chỉ đường, khi AI nhận diện khách đang muốn tạo một chương trình khuyến mãi, nó có thể trả lời kèm theo một nút bấm mở thẳng modal `/dashboard/promotions/new`.
4. **Hành động tự động:** *"Tạo giúp tôi một phiếu thu 5 triệu từ khách hàng Nguyễn Văn A"*. AI sẽ parse các tham số (Số tiền: 5.000.000, Khách hàng: Nguyễn Văn A, Loại: Phiếu thu) và gọi hàm tạo phiếu mà không cần khách phải click nhiều bước.

---

### Hướng dẫn triển khai từng bước với NextJS & OpenSearch

Dưới đây là luồng kiến trúc (Data Flow) để bạn setup hệ thống.

#### Bước 1: Thiết lập Aiven OpenSearch và Data Isolation

Trong môi trường Multi-tenant, việc bảo mật dữ liệu giữa các khách hàng (Tenant) là yếu tố sống còn khi làm tìm kiếm.

1. Khởi tạo service OpenSearch trên Aiven. Đảm bảo bạn kích hoạt plugin `opensearch-knn` (K-Nearest Neighbor) để hỗ trợ lưu trữ và tìm kiếm Vector.
2. Tạo một Index (ví dụ: `knowledge_base`) với cấu trúc Mapping bao gồm:
* `content`: Chứa văn bản text.
* `embedding`: Kiểu `knn_vector` (kích thước thường là 1536 nếu dùng model `text-embedding-3-small` của OpenAI).
* **`tenant_id`:** Đây là trường metadata bắt buộc để phân tách dữ liệu. Các tài liệu hướng dẫn dùng chung sẽ có `tenant_id = 'global'`, trong khi chứng từ của khách sẽ lưu theo ID của họ.



#### Bước 2: Chuẩn bị dữ liệu (Data Ingestion Pipeline)

Việc sử dụng trực tiếp cú pháp Markdown để soạn thảo và cấu trúc tài liệu hướng dẫn (User Manual) là phương pháp tối ưu nhất cho RAG, vì AI đọc Markdown rất tốt.

1. Viết một script (có thể đặt bên NestJS Backend hoặc một file batch riêng) để đọc các file `.md` tài liệu hoặc lấy dữ liệu chứng từ.
2. Sử dụng các kỹ thuật Chunking (như `RecursiveCharacterTextSplitter` của LangChain) để cắt tài liệu thành các đoạn nhỏ (khoảng 500 - 1000 tokens) để giữ nguyên ngữ cảnh.
3. Gọi API của OpenAI (endpoint `/v1/embeddings`) để chuyển đổi các đoạn text này thành chuỗi Vector.
4. Lưu (Upsert) các Vector kèm metadata (`tenant_id`, `doc_url`...) vào Aiven OpenSearch.

#### Bước 3: Xây dựng Backend API (NextJS Route Handlers)

Sử dụng thư viện **Vercel AI SDK** để tối ưu hóa việc stream dữ liệu về client. Bạn cần cài đặt: `npm i ai @ai-sdk/openai`.

Tạo một API Route tại `app/api/chat/route.ts`:

1. **Nhận input:** Lấy tin nhắn mới nhất của người dùng từ Client.
2. **Tạo Vector:** Gọi OpenAI API để biến câu hỏi của người dùng thành Vector.
3. **Truy xuất ngữ cảnh (Retrieval):** Viết query xuống OpenSearch sử dụng thuật toán KNN để tìm các chunk text có vector gần nhất. **Lưu ý:** Bắt buộc phải gắn kèm filter `tenant_id` (ví dụ: tìm trong global docs + dữ liệu riêng của tenant hiện tại) để tránh lấy nhầm chứng từ của công ty khác.
4. **Bơm ngữ cảnh (Augmented Generation):** Nối các chunk text vừa tìm được vào `System Prompt` của GPT-4o. Mẫu câu: *"Bạn là trợ lý ảo của hệ thống quản lý bán hàng. Dựa vào thông tin sau: [KẾT QUẢ TỪ OPENSEARCH], hãy trả lời câu hỏi..."*
5. **Streaming:** Dùng hàm `streamText` từ Vercel AI SDK để trả kết quả dạng stream về frontend, giúp người dùng không phải chờ đợi.

#### Bước 4: Tích hợp Frontend NextJS (UI)

Phần này Vercel AI SDK đã lo phần lớn logic khó nhằn.

1. Tạo một Component `ChatWindow.tsx`.
2. Sử dụng hook `useChat` từ package `ai/react`. Hook này cung cấp sẵn các state `messages`, `input`, `handleInputChange`, và `handleSubmit`.
3. Khi người dùng type và submit, hook sẽ tự động gọi đến `api/chat`, lấy luồng stream trả về và tự động append vào mảng `messages`, render ra giao diện chữ chạy mượt mà như ChatGPT.

Với kiến trúc này, bạn đánh giá việc đẩy logic xử lý chứng từ vào thẳng Database của Backend NestJS qua các Tool/Function Calling, hay muốn OpenSearch index luôn cả siêu dữ liệu của chứng từ để AI tự động tìm kiếm?

---

Tuyệt vời! Việc xử lý Business Logic phức tạp (như Tra cứu Công nợ, Kiểm tra Tồn kho) ngay tại Backend NestJS thông qua **Function Calling (Tools)** là một hướng đi thông minh, giúp giảm tải cho LLM và đảm bảo tính chính xác tuyệt đối.

Aiven OpenSearch trong trường hợp này sẽ đóng vai trò là **Lớp Tìm kiếm ngữ cảnh (Retrieval Layer)**, giúp AI tìm ra các chứng từ liên quan một cách nhanh chóng.

Dưới đây là hướng dẫn chi tiết cách kết hợp 3 thành phần này theo luồng xử lý bạn đề xuất.

### 1. Chuẩn bị Database & OpenSearch (Setup)

#### A. Indexing cho Tài liệu (Knowledge Base)
Để chatbot có thể trả lời các câu hỏi chung (FAQ), bạn cần chuẩn bị dữ liệu embedding.

1. **Chọn Embedding Model:** Cài đặt thư viện `@openai/embeddings` (hoặc dùng `@langchain/openai`) phía Backend để gọi API embedding.
2. **Tạo Index:**
   Bạn cần một index để lưu trữ vector embeddings của tài liệu hướng dẫn.
   * File `.md` của bạn (User Manual) sẽ được cắt thành từng đoạn (chunks).
   * Mỗi đoạn được nhúng thành vector (ví dụ: 1536 chiều nếu dùng OpenAI).
   * Lưu vào OpenSearch với metadata `tenant_id`.
   **Cấu trúc mapping ví dụ:**
   ```json
   {
     "mappings": {
       "properties": {
         "embedding": {
           "type": "knn_vector",
           "dimension": 1536,
           "method": {
             "name": "hnsw",
             "space_type": "cosinesimil"
           }
         },
         "content": { "type": "text" },
         "tenant_id": { "type": "keyword" },
         "source": { "type": "keyword" }
       }
     }
   }
   ```

#### B. Chuẩn bị Dữ liệu cho Business Logic (Trace Data)
Đối với các chứng từ (Hóa đơn, Phiếu thu/chi, Đơn hàng), bạn **không** nên lưu vector của toàn bộ chứng từ vào OpenSearch để giảm chi phí và tăng tốc độ tìm kiếm. Thay vào đó, bạn hãy dùng OpenSearch chỉ để **tìm ID** của chứng từ.

1. **Index Chứng từ (Metadata Only):**
   * Index các chứng từ (ví dụ: `invoice`, `order`, `supplier_invoice`, `customer`) với các trường metadata quan trọng: `code`, `reference_number`, `customer_id`, `supplier_id`, `amount`, `issue_date`, `status`, `tenant_id`.
   * **Không** lưu trường vector embedding cho các index này.
2. **Vector Search cho Nhu cầu Đặc biệt:**
   Nếu bạn có nhu cầu tìm kiếm chứng từ dựa trên **nội dung mô tả tự nhiên** (ví dụ: "Tìm hóa đơn bán hàng cho khách A có ghi kèm điều khoản bảo hành"), bạn có thể:
   * Tạo 1 index riêng `document_metadata`.
   * Index các trường mô tả/ghi chú của chứng từ dưới dạng vector.
   * Hoặc đơn giản là dùng Text Search (Fuzzy Query) của OpenSearch.

### 2. Backend API: Function Calling & Orchestration (NestJS)

Đây là não bộ của hệ thống. Bạn sẽ dùng `@openai/agents` (hoặc tương tự) để quản lý các Tool.

#### A. Định nghĩa Tools (Function Calling)
Bạn cần định nghĩa các Tool để kết nối với Service trong Backend của bạn.

```typescript
// Các tool để lấy dữ liệu chứng từ
const tools = [
  // 1. Lấy thông tin nhà cung cấp
  async ({ name }: { name: string }) => {
    // Gọi Service: await this.supplierService.findByName(name);
  },

  // 2. Lấy danh sách hóa đơn (có thể lọc theo trạng thái, ngày tháng)
  async ({ supplierId, dateRange, status }: { supplierId?: string, dateRange?: [string, string], status?: string }) => {
    // Gọi Service: await this.invoiceService.findBySupplier(supplierId, { dateRange, status });
    // Trả về danh sách hóa đơn
  },

  // 3. Tính toán công nợ (Tổng phát sinh - Tổng thanh toán)
  async ({ supplierId }: { supplierId: string }) => {
    // Logic: Lấy tổng công nợ phải trả
    // return { balance: 1000000 };
  },

  // 4. Lấy danh sách tồn kho
  async ({ productId }: { productId?: string }) => {
    // Gọi Service: await this.inventoryService.getStocks(productId);
    // Trả về danh sách Lot, hạn sử dụng, số lượng
  }
];
```

#### B. Cấu trúc Vector Search (RAG) cho Tài liệu
Bạn tạo thêm một Tool riêng để gọi RAG (Retrieval-Augmented Generation) từ OpenSearch.

```typescript
const ragTool = async ({ query }: { query: string }) => {
  // 1. Embedding câu hỏi
  const vector = await this.openaiService.createEmbeddings(query);
  
  // 2. Query OpenSearch (KNN Search + Tenant Filter)
  const searchParams = {
    knn: {
      vector_field: "embedding",
      k: 5,
      vector: vector
    },
    filter: {
      term: { tenant_id: "currentTenantId" }
    }
  };
  const response = await this.opensearchClient.search(searchParams);
  
  // 3. Trả về Context
  const context = response.hits.hits.map(h => h._source.content).join('\n\n');
  
  return context;
};

// Thêm ragTool vào danh sách tools
tools.push(ragTool);
```

#### C. System Prompt thông minh
System Prompt sẽ đóng vai trò hướng dẫn AI sử dụng Tools và dữ liệu.

```
You are an AI assistant for a Sales & Inventory Management System (CDSoft).

## System Tools
You have access to the following tools: 
1. **getSupplier(name)**: Find supplier by name.
2. **getInvoices(params)**: Get list of invoices (Filter by supplier, date, status).
3. **calculateDebt(supplierId)**: Calculate total accounts payable.
4. **getStock(productId)**: Get current stock details (Lot, Expiry).
5. **ragSearch(query)**: Search knowledge base/user manuals.

## Data Source Rules
- Use **ragSearch** for general questions, "how-to", or instructions.
- Use **getInvoices** or **getSupplier** when user asks for specific documents, lists, or statuses.
- Use **calculateDebt** when user asks about "total debt", "how much I owe".
- Use **getStock** when user asks about "stock", "expiry date", "quantity on hand".
- **STRICTLY** apply filters (supplier, date, status) when calling tools to ensure accuracy.
- If a specific document is found (e.g., Invoice #123), refer to it directly by its code (e.g., "Invoice 00123"), do not hallucinate new codes.

## Response Format
- Be concise and helpful.
- If you return a list of items (Invoices, Stock), format them in a clean markdown table.
- If you cannot find something, admit it politely and suggest the user check the filters.
```

### 3. Frontend Implementation (NextJS UI)

Sử dụng Vercel AI SDK là lựa chọn tối ưu để xử lý luồng stream từ Backend.

#### A. Cài đặt
```bash
npm i ai @ai-sdk/react @tanstack/react-query
```

#### B. Component `ChatbotUI.tsx`
> Lưu ý: Stack thực tế của CDSoft là **React 18 + Vite + Ant Design 5** (không phải NextJS), nên ở triển khai chúng ta build chat UI bằng AntD (`Drawer` + `FloatButton` + `Input.TextArea` + custom message bubbles), nhận stream SSE từ NestJS backend.

---

## 4. Rate Limiting & Quota Policy (BẮT BUỘC)

Để kiểm soát chi phí gọi OpenAI và tránh abuse, hệ thống áp dụng quota theo ngày (reset 00:00 theo timezone server).

### 4.1 Hạn mức (configurable qua env)

| Quota | Giá trị mặc định | Phạm vi | Env var |
|---|---|---|---|
| `CHATBOT_DAILY_GLOBAL_LIMIT` | **20.000** câu hỏi/ngày | Toàn hệ thống (cộng dồn tất cả khách hàng) | `CHATBOT_DAILY_GLOBAL_LIMIT` |
| `CHATBOT_DAILY_PER_USER_LIMIT` | **200** câu hỏi/khách hàng/ngày | Mỗi user (định danh bằng `tenantCode + userId`) | `CHATBOT_DAILY_PER_USER_LIMIT` |

> Đơn vị tính 1 câu hỏi = 1 lần user submit prompt và backend gọi OpenAI thành công (tool calls trung gian KHÔNG tính, chỉ tính turn của user).

### 4.2 Storage counter

- Dùng **Upstash Redis** (project đã có sẵn `@upstash/redis` trong `backend/package.json`).
- Key pattern:
  - Global: `chatbot:quota:global:<YYYY-MM-DD>` → counter
  - Per user: `chatbot:quota:user:<tenantCode>:<userId>:<YYYY-MM-DD>` → counter
- TTL = 36 giờ (đủ để qua reset, tự xoá).
- Atomic `INCR` rồi compare với limit. Nếu vượt → return error trước khi gọi OpenAI.

### 4.3 Hành vi khi vượt quota

#### A. Vượt quota cá nhân (user hết 200 câu hỏi)
- Backend trả HTTP `429` với `errorCode: USER_QUOTA_EXCEEDED`.
- Frontend hiển thị toast + **disable input + đổi placeholder** sang câu thông báo lịch sự, ví dụ:
  > "Trợ lý đang gặp một chút sự cố tạm thời. Vui lòng quay lại sau ít phút nhé! 🙏"
- KHÔNG được tiết lộ rằng đó là do hết quota → tránh user thấy bị giới hạn.
- Trạng thái mute reset lúc 00:00 ngày hôm sau.
- (Tùy chọn) Gửi email thông báo nội bộ cho admin tenant biết user nào đã chạm trần.

#### B. Vượt quota toàn hệ thống (đã 20.000 câu hỏi/ngày)
- Backend trả HTTP `503` với `errorCode: GLOBAL_QUOTA_EXCEEDED`.
- Frontend hiển thị banner đỏ trên Drawer chat cho TẤT CẢ user:
  > "Trợ lý ảo đang tạm ngưng phục vụ do bảo trì hệ thống. Chúng tôi sẽ khôi phục trong thời gian sớm nhất. Xin cảm ơn quý khách đã thông cảm!"
- Toàn bộ Send button disabled.
- Tự động retry mỗi 5 phút (hoặc reset 00:00).

### 4.4 Implement checklist
- [ ] `ChatQuotaService` (Upstash Redis client) — methods: `checkAndIncrUser(tenantCode, userId)`, `checkAndIncrGlobal()`.
- [ ] `ChatController.sendMessage` gọi quota check TRƯỚC khi vào OpenAI client.
- [ ] Custom exception `QuotaExceededException` mapping ra `errorCode` cho `HttpExceptionFilter`.
- [ ] Frontend `ChatWidget` xử lý 2 errorCode trên: ẩn input / hiện banner global.
- [ ] Admin panel (Phase sau): UI xem stats quota theo ngày + reset quota thủ công.

### 4.5 Logging & Observability
- Log mỗi lần vượt quota vào `audit_log` của tenant: `action='CHATBOT_QUOTA_EXCEEDED'`, payload = `{ scope: 'user'|'global', limit, used }`.
- Track tổng số tokens tiêu thụ (input + output) để monitor chi phí OpenAI:
  - Lưu vào bảng `chatbot_usage_daily(date, tenant_code, user_id, request_count, prompt_tokens, completion_tokens)` ở **system DB** để báo cáo cross-tenant.

---

## 5. Cấu trúc thư mục đã triển khai

```
backend/src/
├── config/chatbot.config.ts                      # env loader
└── tenant-module/chatbot/
    ├── chatbot.module.ts
    ├── chatbot.controller.ts                      # POST /api/tenant/chatbot/chat (SSE) + GET /status
    ├── chatbot.service.ts                         # Orchestration: quota → tool-calling loop → stream
    ├── chatbot-quota.service.ts                   # Upstash Redis quota counters
    ├── chatbot-quota.exception.ts                 # USER_/GLOBAL_QUOTA_EXCEEDED
    ├── chatbot-tools.service.ts                   # 9 function-calling tools (raw SQL)
    ├── openai.service.ts                          # OpenAI SDK wrapper (chat + embeddings)
    ├── opensearch.service.ts                      # KNN search w/ tenant filter
    ├── dto/chat.dto.ts
    └── scripts/ingest-docs.ts                     # CLI: chunk + embed + upsert .md docs

frontend/src/tenant/components/Chatbot/
├── ChatbotWidget.jsx                              # FloatButton + Drawer (mounted globally)
├── MessageBubble.jsx                              # Assistant/user bubble + tool call badges
└── useChatStream.js                               # fetch + SSE parser hook
```

## 6. Hướng dẫn setup chi tiết

### Bước 1 — Lấy API key OpenAI
1. Tạo tài khoản tại <https://platform.openai.com>.
2. Vào **API Keys** → tạo key mới.
3. (Tuỳ chọn) Đặt budget cap để tránh vượt chi phí.

### Bước 2 — (Tuỳ chọn) Tạo OpenSearch trên Aiven cho RAG
1. Tạo tài khoản <https://aiven.io> → tạo service **OpenSearch** (free trial cũng được).
2. Vào **Overview** → copy `Service URI` (dạng `https://<user>:<password>@<host>:<port>`) → tách ra thành `OPENSEARCH_URL`, `OPENSEARCH_USERNAME`, `OPENSEARCH_PASSWORD`.
3. Index sẽ tự được tạo lần đầu chạy script ingest.

> Nếu chưa cần RAG: bỏ trống `OPENSEARCH_URL`. Tool `ragSearch` sẽ trả về thông báo "chưa cấu hình", nhưng tất cả tool nghiệp vụ khác vẫn hoạt động bình thường.

### Bước 3 — Cập nhật `.env`
Sao chép từ `backend/.env.example` các biến mới và điền giá trị:
```env
OPENAI_API_KEY=sk-...
CHATBOT_MODEL=gpt-4o-mini
OPENSEARCH_URL=https://your-host:25060   # tuỳ chọn
OPENSEARCH_USERNAME=avnadmin              # tuỳ chọn
OPENSEARCH_PASSWORD=...                   # tuỳ chọn
```

### Bước 4 — Ingest tài liệu vào OpenSearch (chạy 1 lần khi cập nhật docs)
Từ thư mục `backend/`:
```bash
npm run chatbot:ingest -- ../docs --tenant=global
```
Tham số `--tenant=global` → tài liệu dùng chung cho mọi tenant. Để index chứng từ riêng cho 1 tenant, truyền `--tenant=<tenantCode>`.

### Bước 5 — Khởi động và test
```bash
cd backend && npm run start:dev   # backend port 8080
cd frontend && npm run dev         # frontend port 5173
```
Đăng nhập tenant → góc dưới phải xuất hiện FloatButton trợ lý ảo. Click để mở Drawer chat.

## 7. API Reference

| Endpoint | Method | Mô tả |
|---|---|---|
| `/api/tenant/chatbot/chat` | POST | Stream phản hồi (SSE). Body: `{ messages: [{ role, content }] }`. Header `Authorization: Bearer <tenant_token>` |
| `/api/tenant/chatbot/status` | GET | Trả về quota hiện tại + flag `muted` |

### SSE Event types (data line là JSON)
| Type | Payload | Khi nào |
|---|---|---|
| `text` | `{ content }` | Mỗi delta chữ từ LLM |
| `tool_call` | `{ name, arguments }` | LLM gọi 1 function |
| `tool_result` | `{ name, result }` | Backend đã thực thi tool xong |
| `usage` | `{ promptTokens, completionTokens, totalTokens }` | Cuối turn |
| `error` | `{ message, errorCode? }` | Lỗi (vd quota) |
| `done` | — | Stream kết thúc |


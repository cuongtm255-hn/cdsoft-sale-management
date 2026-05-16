# Hướng dẫn triển khai Aiven OpenSearch cho Chatbot CDSoft

Tài liệu này hướng dẫn tạo Aiven for OpenSearch và tích hợp vào chatbot của phần mềm quản lý bán hàng CDSoft. Code hiện tại đã có sẵn module chatbot, OpenAI embeddings, OpenSearch k-NN search và script ingest tài liệu Markdown.

## 1. Mục tiêu và phạm vi

OpenSearch trong hệ thống này dùng làm lớp truy xuất ngữ cảnh cho chatbot, không thay thế MySQL.

- MySQL vẫn là nguồn dữ liệu nghiệp vụ chính: sản phẩm, khách hàng, nhà cung cấp, hóa đơn, tồn kho, công nợ.
- Chatbot dùng tools trong backend để đọc dữ liệu nghiệp vụ từ MySQL.
- OpenSearch lưu vector của tài liệu hướng dẫn, quy trình thao tác và knowledge base.
- Mỗi document trong OpenSearch có `tenant_id`; tài liệu chung dùng `tenant_id = global`, tài liệu riêng của tenant dùng `tenant_id = <tenantCode>`.
- Khi search, backend chỉ lấy document có `tenant_id` nằm trong `global` và tenant hiện tại.

Code liên quan:

- `backend/src/config/chatbot.config.ts`: đọc biến môi trường chatbot và OpenSearch.
- `backend/src/tenant-module/chatbot/opensearch.service.ts`: tạo index, upsert document, k-NN search.
- `backend/src/tenant-module/chatbot/scripts/ingest-docs.ts`: đọc file `.md`, chunk, tạo embedding, đẩy vào OpenSearch.
- `backend/src/tenant-module/chatbot/chatbot-tools.service.ts`: tool `ragSearch`.
- `backend/src/tenant-module/chatbot/chatbot.controller.ts`: API `/api/tenant/chatbot/status` và `/api/tenant/chatbot/chat`.
- `frontend/src/tenant/components/Chatbot/ChatbotWidget.jsx`: widget chatbot phía frontend.
- `docs/user-guide.md`: nguồn tài liệu hướng dẫn người dùng nên được ingest vào OpenSearch.

Tài liệu tham khảo chính thức:

- Aiven OpenSearch get started: https://aiven.io/docs/products/opensearch/get-started
- Aiven OpenSearch access control: https://aiven.io/docs/products/opensearch/concepts/access_control
- Aiven OpenSearch supported plugins: https://aiven.io/docs/products/opensearch/reference/plugins
- Aiven OpenSearch with cURL: https://aiven.io/docs/products/opensearch/howto/opensearch-with-curl
- OpenSearch k-NN query: https://docs.opensearch.org/latest/query-dsl/specialized/k-nn/
- OpenSearch k-NN vector: https://docs.opensearch.org/docs/field-types/supported-field-types/knn-vector/

## 2. Kiến trúc tích hợp

Luồng xử lý một câu hỏi chatbot:

```text
Tenant user
  -> Frontend ChatbotWidget
  -> POST /api/tenant/chatbot/chat
  -> ChatbotService
  -> OpenAI Chat Completion + function calling
  -> Nếu cần hướng dẫn sử dụng: ragSearch
  -> OpenAI embedding câu hỏi
  -> Aiven OpenSearch k-NN search, filter tenant_id in ['global', tenantCode]
  -> Đưa context về LLM để trả lời
```

Luồng nạp tài liệu vào OpenSearch:

```text
Markdown docs
  -> npm run chatbot:ingest
  -> chunk ~800 ký tự, overlap 100 ký tự
  -> OpenAI embedding, mặc định 1536 dimensions
  -> OpenSearch index cdsoft_knowledge_base
```

Mapping index hiện tại được tạo từ `OpenSearchService.ensureIndex()`:

```json
{
  "settings": {
    "index": {
      "knn": true
    }
  },
  "mappings": {
    "properties": {
      "content": { "type": "text" },
      "source": { "type": "keyword" },
      "tenant_id": { "type": "keyword" },
      "embedding": {
        "type": "knn_vector",
        "dimension": 1536,
        "method": {
          "name": "hnsw",
          "engine": "lucene",
          "space_type": "cosinesimil",
          "parameters": {
            "ef_construction": 128,
            "m": 16
          }
        }
      }
    }
  }
}
```

Lưu ý quan trọng: `CHATBOT_EMBEDDING_DIMENSION` phải khớp với `embedding.dimension` trong index. Nếu đổi model hoặc đổi dimension, nên tạo index mới thay vì sửa index cũ.

## 3. Chuẩn bị trước khi tạo OpenSearch

Cần có:

- Tài khoản Aiven và project đã tạo.
- Quyền tạo service OpenSearch trên Aiven.
- `OPENAI_API_KEY` để tạo chat completion và embeddings.
- Backend đã cài dependency từ `backend/package.json`, trong đó có `@opensearch-project/opensearch` và `openai`.
- Môi trường backend có thể kết nối internet tới Aiven OpenSearch và OpenAI.

Để giảm latency, chọn cloud/region Aiven gần nơi backend đang chạy. Nếu backend và MySQL đang nằm ở Singapore hoặc khu vực Đông Nam Á, ưu tiên region gần khu vực đó.

## 4. Tạo Aiven for OpenSearch

### Bước 1: Tạo service

1. Đăng nhập Aiven Console.
2. Chọn project của CDSoft.
3. Vào `Services`.
4. Chọn `Create service`.
5. Chọn `OpenSearch`.
6. Chọn cloud provider và region gần backend.
7. Chọn plan:
   - Môi trường dev/test: dùng plan nhỏ nhất hoặc free tier nếu còn phù hợp.
   - Production: nên dùng plan có đủ RAM/CPU và có HA theo nhu cầu SLA.
8. Đặt tên service, ví dụ `cdsoft-chatbot-opensearch`.
9. Bấm `Create service`.
10. Chờ service chuyển sang trạng thái `Running`.

### Bước 2: Kiểm tra plugin k-NN

Aiven for OpenSearch có danh sách plugin được hỗ trợ theo từng version, trong đó có `k-NN`. Nếu service tạo thành công nhưng index vector lỗi, cần kiểm tra lại version OpenSearch và plugin k-NN trong trang service của Aiven.

Kiểm tra nhanh bằng cURL:

```bash
curl -u "<username>:<password>" "https://<host>:<port>/_cat/plugins?v"
```

Trong kết quả cần thấy plugin liên quan đến `knn`.

### Bước 3: Lấy thông tin kết nối

Trong Aiven Console:

1. Mở service OpenSearch vừa tạo.
2. Vào `Overview`.
3. Lấy các giá trị trong `Connection information`:
   - `Host`
   - `Port`
   - `User`
   - `Password`
   - `Service URI`
4. `OPENSEARCH_URL` trong backend nên để dạng `https://<host>:<port>`, không kèm username/password.

Ví dụ:

```env
OPENSEARCH_URL=https://cdsoft-chatbot-opensearch-project.aivencloud.com:12345
OPENSEARCH_USERNAME=avnadmin
OPENSEARCH_PASSWORD=<password>
```

## 5. Tạo user và phân quyền

Không nên dùng `avnadmin` cho runtime production lâu dài. Nên tạo service user riêng cho chatbot.

### Bước 1: Bật Access Control

Trong Aiven Console:

1. Mở service OpenSearch.
2. Vào phần access control hoặc users theo giao diện hiện tại của Aiven.
3. Enable access control nếu service chưa bật.
4. Tạo user, ví dụ `cdsoft_chatbot_app`.

### Bước 2: Gán ACL theo index

Index mặc định của code là:

```text
cdsoft_knowledge_base
```

Khuyến nghị phân quyền:

| User | Pattern | Permission | Mục đích |
|---|---|---|---|
| `cdsoft_chatbot_app` | `cdsoft_knowledge_base*` | `readwrite` | Backend search và ingest docs |
| `cdsoft_chatbot_admin` | `cdsoft_knowledge_base*` | `admin` | Tạo/xóa/rebuild index khi cần |

Ghi chú:

- Aiven ACL áp dụng theo index pattern.
- Khi không có rule nào match, truy cập bị từ chối ngầm định.
- Nếu user runtime không đủ quyền tạo index, chạy ingest lần đầu bằng user admin, sau đó đổi backend sang user `readwrite`.

## 6. Cấu hình backend

Cập nhật file `.env` của backend theo mẫu sau:

```env
# ===== Chatbot AI =====
CHATBOT_ENABLED=true

OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
CHATBOT_MODEL=gpt-4o-mini
CHATBOT_EMBEDDING_MODEL=text-embedding-3-small
CHATBOT_EMBEDDING_DIMENSION=1536
CHATBOT_TEMPERATURE=0.2
CHATBOT_MAX_TOOL_ITERATIONS=5

# ===== Aiven OpenSearch =====
OPENSEARCH_URL=https://<aiven-host>:<aiven-port>
OPENSEARCH_USERNAME=cdsoft_chatbot_app
OPENSEARCH_PASSWORD=<password>
OPENSEARCH_INDEX=cdsoft_knowledge_base
OPENSEARCH_TOP_K=5
```

Ý nghĩa các biến quan trọng:

| Biến | Bắt buộc | Giá trị gợi ý | Ghi chú |
|---|---:|---|---|
| `CHATBOT_ENABLED` | Có | `true` | Bật/tắt tính năng chatbot |
| `OPENAI_API_KEY` | Có | `sk-...` | Thiếu biến này chatbot bị disable trên UI |
| `CHATBOT_EMBEDDING_MODEL` | Có | `text-embedding-3-small` | Model tạo vector |
| `CHATBOT_EMBEDDING_DIMENSION` | Có | `1536` | Phải khớp mapping OpenSearch |
| `OPENSEARCH_URL` | Có nếu dùng RAG | `https://host:port` | Bỏ trống thì `ragSearch` trả về context rỗng |
| `OPENSEARCH_USERNAME` | Có | `cdsoft_chatbot_app` | User Aiven OpenSearch |
| `OPENSEARCH_PASSWORD` | Có | secret | Không commit vào git |
| `OPENSEARCH_INDEX` | Có | `cdsoft_knowledge_base` | Index knowledge base |
| `OPENSEARCH_TOP_K` | Không | `5` | Số chunk lấy về mỗi câu hỏi |

Sau khi cập nhật `.env`, restart backend.

```bash
cd backend
npm run start:dev
```

Với production:

```bash
cd backend
npm run build
npm run start:prod
```

## 7. Tạo index và ingest tài liệu

Code đã có script `chatbot:ingest`. Script này sẽ:

1. Đọc toàn bộ file `.md` trong thư mục được truyền vào.
2. Cắt thành chunk khoảng 800 ký tự, overlap 100 ký tự.
3. Gọi OpenAI embeddings.
4. Gọi `OpenSearchService.ensureIndex()` để tạo index nếu chưa có.
5. Upsert từng chunk vào OpenSearch.

### Bước 1: Cài package

Chạy trong backend:

```bash
cd backend
npm install
```

### Bước 2: Ingest tài liệu chung

Tài liệu chung cho mọi tenant nên ingest với `tenant=global`.

```bash
cd backend
npm run chatbot:ingest -- ../docs/guidelines --tenant=global
```

Sau lệnh này, index `cdsoft_knowledge_base` sẽ được tạo nếu chưa tồn tại.

### Bước 3: Ingest tài liệu riêng cho một tenant

Nếu có tài liệu riêng cho từng khách hàng:

```bash
cd backend
npm run chatbot:ingest -- ../docs/tenants/<tenant-code> --tenant=<tenant-code>
```

Ví dụ:

```bash
npm run chatbot:ingest -- ../docs/tenants/demo-store --tenant=demo_store
```

Tenant code phải khớp với `tenantCode` trong JWT/backend context, vì runtime search bằng:

```text
tenant_id in ['global', tenantCode]
```

### Bước 4: Ưu tiên ingest tài liệu người dùng

File `docs/user-guide.md` có phần hướng dẫn nghiệp vụ và phần Trợ lý ảo cho người dùng cuối, nên được ingest vào `global` để chatbot trả lời các câu hỏi như:

- "Làm sao để tạo đơn bán hàng?"
- "Cách tạo phiếu nhập kho như thế nào?"
- "Tôi mở trợ lý ảo ở đâu?"
- "Vì sao ô nhập chatbot bị khóa?"

Nếu trong tương lai có nhiều file hướng dẫn theo từng phân hệ, nên giữ chúng ở dạng Markdown trong `docs/` để script ingest có thể đọc trực tiếp.

## 8. Kiểm tra OpenSearch bằng cURL

Dùng `avnadmin` hoặc user có quyền phù hợp để kiểm tra.

### Kiểm tra kết nối

```bash
curl -u "<username>:<password>" "https://<host>:<port>"
```

Kết quả hợp lệ sẽ trả về thông tin node và version OpenSearch.

### Kiểm tra index đã tạo

```bash
curl -u "<username>:<password>" "https://<host>:<port>/_cat/indices/cdsoft_knowledge_base?v"
```

### Kiểm tra mapping

```bash
curl -u "<username>:<password>" "https://<host>:<port>/cdsoft_knowledge_base/_mapping?pretty"
```

Cần thấy:

```json
"embedding": {
  "type": "knn_vector",
  "dimension": 1536
}
```

### Kiểm tra số document

```bash
curl -u "<username>:<password>" "https://<host>:<port>/cdsoft_knowledge_base/_count?pretty"
```

### Kiểm tra document theo tenant

```bash
curl -u "<username>:<password>" \
  -H "Content-Type: application/json" \
  "https://<host>:<port>/cdsoft_knowledge_base/_search?pretty" \
  -d '{
    "size": 5,
    "_source": ["source", "tenant_id", "content"],
    "query": {
      "term": {
        "tenant_id": "global"
      }
    }
  }'
```

## 9. Kiểm tra chatbot trong phần mềm

### Bước 1: Kiểm tra status API

Đăng nhập tenant để lấy tenant JWT, sau đó gọi:

```bash
curl -H "Authorization: Bearer <tenant_token>" \
  "http://localhost:8080/api/tenant/chatbot/status"
```

Kết quả cần có `enabled: true`.

Nếu `enabled: false`, thường là do backend không có `OPENAI_API_KEY`.

### Bước 2: Kiểm tra hiển thị trên frontend

Theo hướng dẫn người dùng hiện tại, chatbot hiển thị cho user đã đăng nhập tenant ở góc dưới bên phải màn hình.

Các bước kiểm tra:

1. Đăng nhập bằng tài khoản tenant.
2. Nhìn góc dưới bên phải màn hình.
3. Bấm biểu tượng trợ lý hoặc chat.
4. Cửa sổ chat mở ra.
5. Gõ câu hỏi bằng tiếng Việt tự nhiên.
6. Nhấn `Enter` hoặc nút gửi.

Nếu không thấy nút chatbot, kiểm tra:

- User chưa đăng nhập tenant.
- `/api/tenant/chatbot/status` trả `enabled: false`.
- `VITE_API_BASE_URL` trỏ sai backend.
- Backend thiếu `OPENAI_API_KEY`.

### Bước 3: Kiểm tra câu hỏi RAG

Trên frontend, mở chatbot và hỏi:

```text
Hướng dẫn tạo đơn bán hàng
```

Kỳ vọng:

- LLM gọi tool `ragSearch`.
- Backend tạo embedding câu hỏi.
- OpenSearch trả về các chunk từ `docs`.
- Chatbot trả lời dựa trên tài liệu hướng dẫn.

### Bước 4: Kiểm tra các câu hỏi nghiệp vụ

Các câu hỏi dưới đây giúp kiểm tra cả tool MySQL và RAG:

| Câu hỏi mẫu | Kết quả kỳ vọng |
|---|---|
| "Tồn kho hiện tại của Sản phẩm ABC là bao nhiêu?" | Chatbot gọi tool tồn kho và trả số lượng theo kho |
| "Khách hàng Nguyễn Văn A đang nợ bao nhiêu tiền?" | Chatbot gọi tool công nợ khách hàng |
| "Làm sao để tạo phiếu nhập kho?" | Chatbot dùng `ragSearch` và trả hướng dẫn thao tác |
| "Doanh thu tháng này là bao nhiêu?" | Chatbot gọi tool báo cáo/doanh thu nếu tool hiện tại hỗ trợ |
| "Tôi mở trợ lý ảo ở đâu?" | Chatbot dùng tài liệu `user-guide.md` để trả lời |

### Bước 5: Kiểm tra log backend

Khi backend start thành công với OpenSearch, log sẽ có thông tin từ `OpenSearchService`:

```text
OpenSearch client initialized -> index=cdsoft_knowledge_base
```

Nếu không có `OPENSEARCH_URL`, log sẽ báo RAG search trả context rỗng.

## 10. Giới hạn sử dụng chatbot

Theo tài liệu người dùng hiện tại, chatbot có quota sử dụng hằng ngày:

- Mỗi người dùng: tối đa `200` câu hỏi/ngày.
- Hệ thống có giới hạn toàn cục theo `CHATBOT_DAILY_GLOBAL_LIMIT`, mặc định trong code là `20000` câu hỏi/ngày.
- Quota được lưu trong Upstash Redis.
- Khi người dùng đạt giới hạn ngày, ô nhập liệu trên frontend sẽ bị khóa và chatbot hoạt động trở lại vào ngày hôm sau.

Biến môi trường liên quan:

```env
CHATBOT_DAILY_GLOBAL_LIMIT=20000
CHATBOT_DAILY_PER_USER_LIMIT=200
```

Cần kiểm thử các trạng thái quota:

- User còn quota: gửi câu hỏi bình thường.
- User hết quota: backend trả lỗi quota, frontend khóa input.
- Global hết quota: frontend hiển thị trạng thái tạm ngưng cho tất cả user.

## 11. Vận hành và bảo trì

### Khi cập nhật tài liệu

Mỗi khi sửa file `.md` trong `docs`, chạy lại:

```bash
cd backend
npm run chatbot:ingest -- ../docs --tenant=global
```

Script tạo document id bằng hash của `tenant + file path + chunk index`, nên cùng một file/chunk sẽ được upsert lại.

### Khi đổi embedding model hoặc dimension

Không đổi trực tiếp trên index cũ. Tạo index mới:

```env
OPENSEARCH_INDEX=cdsoft_knowledge_base_v2
CHATBOT_EMBEDDING_MODEL=text-embedding-3-small
CHATBOT_EMBEDDING_DIMENSION=1536
```

Sau đó ingest lại:

```bash
cd backend
npm run chatbot:ingest -- ../docs --tenant=global
```

Khi test tốt, cập nhật `OPENSEARCH_INDEX` trên production sang index mới và restart backend.

### Khi muốn rebuild sạch index

Chỉ dùng user admin:

```bash
curl -u "<admin-user>:<admin-password>" \
  -X DELETE "https://<host>:<port>/cdsoft_knowledge_base"
```

Sau đó ingest lại.

### Monitoring cần theo dõi

- CPU, RAM, JVM heap của OpenSearch.
- Disk usage và shard health.
- Số document trong `cdsoft_knowledge_base`.
- Latency của API `/api/tenant/chatbot/chat`.
- Log lỗi `KNN search failed`.
- Chi phí OpenAI embedding khi ingest lại nhiều tài liệu.
- Số lượt chatbot theo user/ngày để phát hiện quota bất thường.

## 12. Bảo mật và multi-tenant

Nguyên tắc bắt buộc:

- Không đưa `OPENSEARCH_PASSWORD` vào git.
- Không log password, Service URI có chứa password, hoặc OpenAI key.
- Tài liệu nội bộ dùng chung gắn `tenant_id = global`.
- Tài liệu riêng của khách hàng gắn đúng `tenant_id = <tenantCode>`.
- Không index dữ liệu nhạy cảm không cần thiết: mật khẩu, token, số tài khoản đầy đủ, thông tin cá nhân vượt mức cần dùng.
- Nếu index dữ liệu nghiệp vụ trong tương lai, chỉ index metadata cần tìm kiếm; số liệu gốc vẫn lấy từ MySQL qua backend tools.
- Hệ thống có thể ghi nhật ký sử dụng chatbot cho mục đích kiểm soát chất lượng nội bộ; không nên đưa nội dung nhạy cảm vào prompt nếu không cần thiết.

Code hiện tại đã filter RAG theo tenant:

```typescript
filter: [
  { terms: { tenant_id: ['global', tenantCode] } },
]
```

Vì vậy không được ingest tài liệu riêng của tenant vào `global`.

## 13. Lỗi thường gặp

### `OPENAI_API_KEY missing`

Nguyên nhân:

- Chưa set `OPENAI_API_KEY`.
- Backend chưa restart sau khi sửa `.env`.

Cách xử lý:

```bash
cd backend
npm run start:dev
```

Kiểm tra lại `/api/tenant/chatbot/status`.

### `OPENSEARCH_URL missing`

Nguyên nhân:

- Chưa set `OPENSEARCH_URL`.
- Runtime RAG sẽ không có context, nhưng chatbot vẫn có thể dùng tool MySQL nếu OpenAI đã cấu hình.

Cách xử lý:

- Set `OPENSEARCH_URL=https://<host>:<port>`.
- Set username/password.
- Restart backend.

### `KNN search failed`

Nguyên nhân phổ biến:

- Index chưa được tạo.
- Mapping `embedding.dimension` không khớp với `CHATBOT_EMBEDDING_DIMENSION`.
- User OpenSearch thiếu quyền search.
- Plugin k-NN không hoạt động trên service/version hiện tại.

Cách xử lý:

1. Chạy lại ingest bằng user admin.
2. Kiểm tra mapping.
3. Kiểm tra `_cat/plugins`.
4. Kiểm tra ACL cho index.

### Lỗi SSL certificate

Code hiện tại set:

```typescript
ssl: { rejectUnauthorized: false }
```

Điều này giúp kết nối Aiven dễ hơn trong môi trường deploy hiện tại, nhưng production nên cân nhắc cấu hình CA certificate đúng chuẩn nếu yêu cầu bảo mật cao hơn.

### Chatbot không hiện trên frontend

Nguyên nhân:

- Chưa đăng nhập tenant.
- `/api/tenant/chatbot/status` trả `enabled: false`.
- `VITE_API_BASE_URL` trỏ sai backend.
- Backend thiếu `OPENAI_API_KEY`.

### Chatbot trả lời không đúng ý

Nguyên nhân:

- Tài liệu chưa được ingest hoặc chưa cập nhật.
- Câu hỏi quá mơ hồ, thiếu tên khách hàng/sản phẩm/kho/thời gian.
- OpenSearch không trả về chunk phù hợp do tài liệu chưa đủ chi tiết.

Cách xử lý:

- Chạy lại ingest tài liệu.
- Hỏi lại rõ hơn, ví dụ thêm mã sản phẩm, tên khách hàng, khoảng thời gian.
- Bổ sung nội dung vào `docs/user-guide.md` hoặc tài liệu hướng dẫn phân hệ tương ứng.

## 14. Checklist triển khai production

- [ ] Aiven OpenSearch service đã `Running`.
- [ ] Region gần backend.
- [ ] Plugin `k-NN` khả dụng.
- [ ] Đã tạo service user riêng cho chatbot.
- [ ] ACL cho `cdsoft_knowledge_base*` đã cấu hình.
- [ ] Backend đã set `OPENAI_API_KEY`.
- [ ] Backend đã set `OPENSEARCH_URL`, `OPENSEARCH_USERNAME`, `OPENSEARCH_PASSWORD`.
- [ ] `CHATBOT_EMBEDDING_DIMENSION=1536` khớp mapping.
- [ ] Đã ingest `../docs` với `--tenant=global`.
- [ ] `_cat/indices/cdsoft_knowledge_base?v` hiện index green/yellow hợp lệ.
- [ ] `/api/tenant/chatbot/status` trả `enabled: true`.
- [ ] Frontend chatbot hiển thị ở góc dưới bên phải sau khi đăng nhập tenant.
- [ ] Chatbot trả lời được câu hỏi hướng dẫn sử dụng.
- [ ] Chatbot gọi được tool nghiệp vụ cho tồn kho, công nợ, hóa đơn.
- [ ] Quota `200` câu hỏi/user/ngày hoạt động đúng.
- [ ] Password và API key không nằm trong git/log.
- [ ] Đã có quy trình rebuild index khi đổi embedding model.

## 15. Tiêu chí nghiệm thu

Một triển khai được xem là đạt khi:

- Người dùng tenant đăng nhập và thấy biểu tượng trợ lý ở góc dưới bên phải.
- Người dùng hỏi "Làm sao để tạo phiếu nhập kho?" và chatbot trả lời theo tài liệu hướng dẫn.
- Người dùng hỏi tồn kho hoặc công nợ và chatbot trả dữ liệu thực tế từ tenant hiện tại.
- Không có dữ liệu của tenant khác xuất hiện trong câu trả lời.
- OpenSearch index có document `tenant_id = global` sau khi ingest.
- Khi xóa hoặc đổi sai `OPENSEARCH_URL`, chatbot vẫn không crash; RAG trả context rỗng và backend log cảnh báo.
- Khi hết quota, frontend khóa ô nhập liệu theo đúng hành vi trong `docs/user-guide.md`.

## 16. Hướng mở rộng sau

Trong giai đoạn hiện tại, chỉ nên dùng OpenSearch cho knowledge base. Khi cần mở rộng tìm kiếm nâng cao, có thể tạo thêm index riêng:

- `cdsoft_document_lookup`: metadata chung của hóa đơn, đơn hàng, phiếu thu chi để search nhanh theo mã, tên, trạng thái.
- `cdsoft_product_search`: metadata sản phẩm, SKU, barcode, từ khóa.
- `cdsoft_kb_v2`: index knowledge base mới khi đổi embedding model.

Vẫn giữ nguyên quy tắc: OpenSearch tìm ứng viên và trả về ID/metadata; backend MySQL mới là nơi lấy số liệu chính xác trước khi chatbot trả lời.

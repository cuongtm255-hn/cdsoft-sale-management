# Chatbot RBAC-aware Access Design

## Muc tieu

Chatbot phai ton trong thiet ke RBAC hien tai cua he thong, khong duoc tra loi vuot qua quyen cua user dang dang nhap.

Pham vi bao gom 2 nhom:

- `RAG / how-to`: chi tra ve tai lieu huong dan phu hop voi permission cua user.
- `Read-only data query`: chi cho phep chatbot goi cac tool truy van tenant DB ma role hien tai duoc phep dung, va trong mot so nghiep vu can them role scope de han che du lieu.

## Nguyen tac

1. Khong hardcode nghiep vu theo role cho tung cau hoi neu da co permission tu RBAC seed.
2. Chatbot phai dua vao `permission codes` hien co de quyet dinh:
   - tool nao duoc hien cho model
   - tool nao duoc phep chay
   - tai lieu RAG nao duoc phep doc
3. Mot so role van can scope hep hon tren cung mot permission. Vi du `STAFF` khong chi bi an tai lieu nhay cam ma con phai bi gioi han du lieu ban hang theo user phu trach.

## Nguon su that RBAC

Permission duoc lay tu thiet ke hien tai:

- role enum tren user entity
- permission seed trong `backend/src/tenant-module/roles/rbac-seed.ts`
- logic resolve permission trong `backend/src/tenant-module/roles/roles.service.ts`

Chatbot khong tu quan ly mot he permission rieng.

## Access model

Them `ChatbotAccessContext`:

- `userId`
- `role`
- `permissions[]`

Context nay duoc tao cho moi request chat va duoc dung xuyen suot qua:

- runtime prompt
- tool schema filtering
- tool execution guard
- field masking
- query scope
- RAG filtering

## Tool gating theo permission

Them `ChatbotAccessService` de map `tool -> required permissions`.

Quy trinh:

1. Resolve permission list tu role hien tai.
2. Lọc `toolSchemas` truoc khi gui sang OpenAI.
3. Guard them lan nua khi thuc thi tool de tranh prompt jailbreak hoac tool call gia mao.

Vi du:

- `getProducts` can `products:read`
- `getSalesOrders` can `orders:read`
- `getCashReceipts` can `payments:read`
- `getProfitByProduct` can `reports.finance:read`
- `ragSearch` khong can permission truc tiep, vi tai lieu se duoc loc o tang RAG

## Scope theo role cho du lieu read-only

Ngoai permission-level gating, role `STAFF` can duoc gioi han du lieu ban hang va du lieu lien quan theo user phu trach.

Rule scope hien tai:

- `customers`: `sales_rep_id = currentUserId`
- `sales orders / invoices / return orders`: `orders.sales_rep_id = currentUserId`
- `AR / customer payment history / customer debt`: scope theo customer hoac order cua staff
- `loyalty`: chi xem khach hang staff dang phu trach
- `dashboard` va mot so sales reports: tinh toan tren tap du lieu staff phu trach

Manager va cac role co quyen cao hon van theo scope toan tenant, nhung chi trong nhung tool ma permission cho phep.

## Field masking

Co cac truong hop user duoc xem danh sach san pham nhung khong duoc xem gia von.

Chatbot ap dung field masking sau khi query:

- `getProducts`: neu user khong co `cost_price:read` thi loai bo `cost_price` khoi ket qua

Mo rong ve sau:

- margin / gross profit chi duoc hien neu co finance permission phu hop
- salary / audit log neu chatbot mo rong sang nhom do

## RAG theo permission

Tai lieu how-to khong duoc coi la "mo cua cho tat ca". Can loc theo permission.

### Metadata moi trong OpenSearch

Moi chunk tai lieu duoc index them:

- `required_permissions: keyword[]`

Truong nay duoc suy ra tu:

- duong dan file
- noi dung chunk

Heuristic hien tai map cac nhom nhu:

- phan quyen / role -> `roles:read`
- nguoi dung -> `users:read`
- audit log -> `audit_logs:read`
- bao cao -> `reports:read`
- finance / debt / cashflow / profit -> `reports.finance:read`
- inventory -> `inventory:read`
- orders -> `orders:read`
- invoices / payments -> `payments:read`
- products -> `products:read`
- cost / gross profit -> `cost_price:read`
- customers / loyalty -> `customers:read`

### Query-time filtering

Khi chatbot goi `ragSearch`:

1. embedding query van duoc tao nhu cu
2. OpenSearch filter theo:
   - tenant `global` + tenant hien tai
   - `required_permissions` giao voi permission list cua user
3. Neu chunk cu chua co metadata, backend fallback sang heuristic runtime va bo hit khong hop le

Dieu nay cho phep rollout an toan ngay ca khi chua re-ingest day du, nhung de dat ket qua tot nhat van can ingest lai docs.

## Runtime prompt

Moi request chat duoc bo sung them runtime access context:

- role hien tai
- danh sach permissions hien tai
- danh sach tool duoc phep dung
- rule scope cho `STAFF`
- huong dan neu user hoi ngoai quyen thi phai tu choi ro rang

Muc tieu cua prompt la giam tinh trang model tu suy luan vuot quyen, nhung prompt khong phai lop bao ve chinh. Lop bao ve chinh van la backend gating.

## Thay doi code chinh

- `chatbot-access.service.ts`
  - resolve permission list
  - map tool policy
  - filter tool schema
  - guard tool execution
  - sanitize tool result

- `chatbot-doc-access.ts`
  - infer required permissions cho chunk docs

- `opensearch.service.ts`
  - them mapping `required_permissions`
  - filter RAG hits theo permission
  - fallback runtime inference cho docs cu

- `scripts/ingest-docs.ts`
  - index them `required_permissions`

- `chatbot-tools.service.ts`
  - chi expose tool duoc phep cho moi user
  - pass `ChatbotAccessContext` vao tung read service
  - sanitize ket qua va ap permission-aware RAG

- cac `chatbot-*-read.service.ts`
  - ap scope `STAFF` vao nhung query can gioi han du lieu

- `chatbot.service.ts`
  - tao access context cho moi request
  - chen runtime access context vao prompt

- `chatbot.controller.ts`
  - truyen `user.role` vao service chat

## Van hanh sau deploy

1. Build va deploy backend.
2. Re-ingest lai docs de tat ca chunk moi co `required_permissions`.

Vi du:

```bash
cd backend
npm run chatbot:ingest -- ../docs --tenant=global
```

3. Smoke test theo role:

- `STAFF`: hoi "Huong dan phan quyen nguoi dung" phai bi tu choi hoac khong tim thay tai lieu
- `STAFF`: hoi "Tim don hang chua thanh toan tuan nay" chi tra ve du lieu staff phu trach
- `MANAGER`: cung cau hoi tren co the thay du lieu tenant rong hon
- role khong co `cost_price:read`: tra cuu san pham khong duoc lo `cost_price`

## Gioi han hien tai

- Heuristic map doc -> permission moi o muc rule-based, can tiep tuc tinh chinh khi kho tai lieu tang.
- Chua co source-level policy cho tung section trong mot file lon; hien tai chunk-level la du cho rollout dau.
- Scope hien tai tap trung vao `STAFF`; neu sau nay can scope dac biet cho `WAREHOUSE` hoac `ACCOUNTANT` thi mo rong tiep trong read services.

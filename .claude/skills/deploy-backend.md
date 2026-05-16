# Deploy Backend Skill

Deploy NestJS backend lên Vercel production.

## Steps

1. Build backend (compile TypeScript + resolve path aliases):
```bash
cd backend && npm run build
```
`npm run build` chạy `nest build && tsc-alias` — bắt buộc để Vercel resolve được `@common/*` aliases.

2. Deploy lên Vercel production:
```bash
cd backend && vercel --prod --yes
```

## Notes
- Tên project trên vercel: `cdsoft-sale-backend`
- File môi trường sử dụng: `backend/.env.aiven`
- Migrations chạy tự động ở bước `vercel-build` trên Vercel CI (không cần chạy tay).
- Nếu có lỗi migration conflict, kiểm tra Aiven DB và drop table `typeorm_migrations` nếu cần reset.
- Production URL: `https://cdsoft-sale-backend.vercel.app`
- Sau khi deploy xong, kiểm tra `/api/platform/auth/login` để verify (không dùng `/api/health` — route không tồn tại).

## ⚠️ QUAN TRỌNG — Vercel Env Vars phải đồng bộ với `.env.aiven`

`backend/.env.aiven` là nguồn sự thật duy nhất cho production config. File này bị gitignore nên **Vercel project settings KHÔNG tự cập nhật** khi file thay đổi.

**Khi nào cần sync Vercel env vars:**
- Thay đổi Aiven DB (host, port, credentials)
- Thay đổi API keys (OpenAI, Upstash Redis, OpenSearch)
- Thêm biến môi trường mới vào `.env.aiven`

**Cách sync — dùng bash `echo` (KHÔNG dùng PowerShell pipe vì sẽ thêm UTF-8 BOM vào value):**
```bash
# Xóa var cũ rồi add lại từ bash
vercel env rm DB_HOST production --yes && echo "new-host.aivencloud.com" | vercel env add DB_HOST production
```

**Hoặc update hàng loạt từ `.env.aiven`:**
```bash
cd backend
node -e "
require('dotenv').config({path:'.env.aiven'});
const {execSync}=require('child_process');
const vars=['DB_HOST','DB_PORT','DB_USERNAME','DB_PASSWORD','DB_NAME','DB_SSL',
            'TENANT_DB_HOST','TENANT_DB_PORT','TENANT_DB_USERNAME','TENANT_DB_PASSWORD','TENANT_DB_SSL',
            'OPENAI_API_KEY','OPENAI_BASE_URL','CHATBOT_MODEL','CHATBOT_EMBEDDING_MODEL',
            'CHATBOT_EMBEDDING_DIMENSION','CHATBOT_TEMPERATURE','CHATBOT_MAX_TOOL_ITERATIONS',
            'OPENSEARCH_URL','OPENSEARCH_USERNAME','OPENSEARCH_PASSWORD',
            'CHATBOT_DAILY_GLOBAL_LIMIT','CHATBOT_DAILY_PER_USER_LIMIT'];
for(const v of vars){
  if(!process.env[v]) continue;
  const tmp=require('os').tmpdir()+'/ve_'+v+'.txt';
  require('fs').writeFileSync(tmp, Buffer.from(process.env[v],'utf8'));
  execSync('vercel env rm '+v+' production --yes 2>&1||true',{stdio:'pipe'});
  execSync('vercel env add '+v+' production < '+tmp,{stdio:'pipe',shell:'bash'});
  console.log('OK:',v);
}
"
```

**Sau khi update env vars:** luôn redeploy để apply:
```bash
cd backend && vercel --prod --yes
```

**Dấu hiệu Vercel env vars bị lệch với `.env.aiven`:**
- `QueryFailedError: Unknown column 'deleted_at'` → DB_HOST/NAME trỏ DB cũ (schema chưa migrate)
- `Access denied for user '﻿avnadmin'` → BOM character trong username (dùng PowerShell pipe)
- `FUNCTION_INVOCATION_FAILED` → DB credentials sai hoàn toàn, app crash khi startup

**Alias production** (`cdsoft-sale-backend.vercel.app`) không tự update sau `vercel --prod` trong một số trường hợp. Kiểm tra bằng:
```bash
vercel inspect cdsoft-sale-backend.vercel.app
```
Nếu deployment ID cũ, chạy thủ công:
```bash
vercel alias set <new-deployment-url> cdsoft-sale-backend.vercel.app
```

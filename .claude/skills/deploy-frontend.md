# Deploy Frontend Skill

Deploy React frontend lên Vercel production.

## Steps

1. Build frontend:
```bash
cd frontend && npm run build
```
Kiểm tra output không có lỗi TypeScript/import. Warning về chunk size > 500kB là bình thường.

2. Deploy lên Vercel production:
```bash
cd frontend && vercel --prod --yes
```

## Notes
- Tên project trên vercel: `cdsoft-sale-frontend`
- File môi trường sử dụng: `frontend/.env.vercel`
- API base URL đang trỏ vào `https://cdsoft-sale-backend.vercel.app` (cấu hình trong `frontend/.env` — `VITE_API_BASE_URL`).
- Production URL: `https://cdsoft-sale-frontend.vercel.app`
- SPA routing được handle bởi `frontend/vercel.json` — tất cả routes rewrite về `index.html`.
- Sau khi deploy, test login tại production URL để verify kết nối backend OK.

# Frontend - CDSoft Sale Management

React 18 SPA dùng Vite, Ant Design, Zustand và React Router v6. Giao tiếp với backend NestJS qua REST API.

---

## Yêu cầu hệ thống

- Node.js >= 20
- npm >= 9
- Backend đang chạy tại `http://localhost:8080` (xem [backend/readme.md](../backend/readme.md))

---

## Cách 1: Chạy với Docker (khuyến nghị)

Từ thư mục **gốc** của project:

```bash
docker compose up -d
```

Frontend sẽ được build và phục vụ qua Nginx tại: `http://localhost`

---

## Cách 2: Chạy thủ công (development)

### Bước 1 — Cài dependencies

```bash
cd frontend
npm install
```

### Bước 2 — Cấu hình biến môi trường

```bash
cp .env.example .env.local
```

Mở `.env.local` và chỉnh URL backend nếu cần:

| Biến | Mô tả | Mặc định |
|------|-------|----------|
| `VITE_API_BASE_URL` | URL của backend API | `http://localhost:8080` |

> **Lưu ý:** Khi chạy dev, Vite tự proxy `/api/*` đến `http://localhost:8080` nên thường không cần thay đổi gì.

### Bước 3 — Khởi động dev server

```bash
npm run dev
```

Ứng dụng chạy tại: `http://localhost:5173`

---

## Tech stack

| Thành phần | Thư viện |
|------------|---------|
| Framework | React 18 |
| Build tool | Vite 5 |
| UI components | Ant Design 5 |
| Routing | React Router v6 |
| State management | Zustand |
| HTTP client | Axios |
| Date utils | Day.js |

---

## Build production

```bash
npm run build
# Output tại: dist/
```

Preview bản build production:

```bash
npm run preview
```

---

## Lint

```bash
npm run lint
```

---

## Cấu trúc thư mục

```
src/
├── api/          # Axios instances và API calls
├── auth/         # AuthContext, login logic
├── platform/     # Giao diện quản trị (layout, pages)
├── tenant/       # Giao diện tenant (layout, pages)
├── router/       # Cấu hình React Router
└── shared/       # Components và hooks dùng chung
```

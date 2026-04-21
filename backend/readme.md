# Backend - CDSoft Sale Management

NestJS backend cho hệ thống quản lý bán hàng multi-tenant. Sử dụng MySQL, TypeORM, JWT authentication và Swagger docs.

---

## Yêu cầu hệ thống

- Node.js >= 20
- npm >= 9
- MySQL 8.0 (hoặc Docker)

---

## Cách 1: Chạy với Docker (khuyến nghị)

Từ thư mục **gốc** của project (không phải thư mục `backend/`):

```bash
docker compose up -d
```

Docker sẽ khởi động 3 service: MySQL, Backend (port 8080), Frontend (port 80).

Kiểm tra log:

```bash
docker compose logs -f backend
```

---

## Cách 2: Chạy thủ công (development)

### Bước 1 — Cài dependencies

```bash
cd backend
npm install
```

### Bước 2 — Cấu hình biến môi trường

```bash
cp .env.example .env
```

Mở file `.env` và điền các giá trị:

| Biến | Mô tả | Ví dụ |
|------|-------|-------|
| `PORT` | Port backend lắng nghe | `8080` |
| `DB_HOST` | Host MySQL (system DB) | `localhost` |
| `DB_PORT` | Port MySQL | `3306` |
| `DB_USERNAME` | Username MySQL | `root` |
| `DB_PASSWORD` | Password MySQL | `secret` |
| `DB_NAME` | Tên database hệ thống | `cdsoft_system` |
| `TENANT_DB_HOST` | Host MySQL cho tenant DB | `localhost` |
| `TENANT_DB_USERNAME` | Username MySQL cho tenant | `root` |
| `TENANT_DB_PASSWORD` | Password MySQL cho tenant | `secret` |
| `JWT_SECRET` | Secret key cho JWT | chuỗi random dài |
| `JWT_ACCESS_EXPIRES_IN` | Thời hạn access token | `8h` |
| `JWT_REFRESH_EXPIRES_IN` | Thời hạn refresh token | `7d` |
| `TENANT_DB_PASSWORD_KEY` | Key AES-256 mã hóa password tenant | chuỗi 32 ký tự |
| `FRONTEND_URL` | URL frontend (CORS) | `http://localhost:5173` |

### Bước 3 — Chuẩn bị database

Tạo database MySQL và chạy migration:

```bash
npm run migration:run
```

### Bước 4 — Khởi động server

```bash
# Development (hot reload)
npm run start:dev

# Hoặc production
npm run build
npm run start:prod
```

Server chạy tại: `http://localhost:8080`

---

## API & Tài liệu

| Endpoint | Mô tả |
|----------|-------|
| `http://localhost:8080/api` | Base API URL |
| `http://localhost:8080/api/docs` | Swagger UI |

---

## Migration database

```bash
# Tạo migration mới
npm run migration:generate -- src/migrations/TenMigration

# Chạy migration
npm run migration:run

# Rollback migration gần nhất
npm run migration:revert
```

---

## Test

```bash
# Chạy unit test một lần
npm run test

# Test với coverage
npm run test:cov

# Test e2e
npm run test:e2e
```

---

## Build production

```bash
npm run build
# Output tại: dist/
```

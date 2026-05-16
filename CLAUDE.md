# CLAUDE.md

Multi-tenant SaaS sales platform. Database-per-tenant isolation. Backend: NestJS 10 + TypeORM + MySQL. Frontend: React 18 + Vite + Ant Design 5.

## Commands
- Backend: `cd backend && npm run start:dev` (port 8080). Migrations: `npm run migration:generate -- --name=X`, `npm run migration:run`
- Frontend: `cd frontend && npm run dev` (port 5173, proxy /api → 8080)
- Deploy backend lên Vercel: dùng skill `/deploy-backend`
- Deploy frontend lên Vercel: dùng skill `/deploy-frontend`

## Architecture — 3 Layers (KHÔNG import chéo)
- `backend/src/platform/` → System DB (`salesplatform_system`): tenant CRUD, platform users, auth
- `backend/src/tenant/` → Infrastructure: `TenantContextService` (AsyncLocalStorage), `TenantDataSourceManager` (dynamic connection pool)
- `backend/src/tenant-module/` → Per-tenant DB (`tenant_<code>`): products, orders, customers...

## Rules chi tiết theo layer
- Backend rules: xem `backend/CLAUDE.md`
- Frontend rules: xem `frontend/CLAUDE.md`

## Báo cáo (Reports)
- Thiết kế báo cáo mới: đọc `.claude/skills/design-report.md` và làm theo đúng các bước trong đó
- Rule chung cho tất cả báo cáo: `docs/reports/REPORT-RULES.md`
- Danh sách file thiết kế báo cáo: `docs/reports/`

Khi user yêu cầu "thiết kế báo cáo X" hoặc "design report X": đọc `.claude/skills/design-report.md` trước, sau đó tạo file `docs/reports/rpt-<module>-by-<dimension>.md` theo đúng chuẩn.

## Docs
- `docs/feature-list.md` — 162 tasks (96 BE + 66 FE), 12 modules
- `docs/requirements/srs-tenant-detail.md` — SRS chi tiết nghiệp vụ
- `docs/structure-coding-convension/` — Thiết kế chi tiết backend + frontend

## Status
Đã implement: platform auth/CRUD, product CRUD, migration system, seed, frontend skeleton (17 pages).
Chưa implement: tenant provisioning flow, resolveTenantDbConfig(), tenant auth query, categories/customers/suppliers/inventory/orders/payments/dashboard/audit-log.

## Log session claude code
Thêm file log-<yyyyMMddHHmmss>.md vào thư mục "claude-logs" để log session claude code. Hãy tạo file ngay khi bắt đầu nhận được prompt và kết thúc khi nhận được prompt "end". Mỗi khi có một action claude yêu cầu hỏi để nhận thêm thông tin để hoàn thành task, ví dụ xác nhận implement một tính năng, run một command ..., trước khi trả lời user hoặc thực hiện hành động thì hãy update vào file log trước. Mục đích để có thể xem lại các lệnh đã thực hiện và kết quả, tránh lặp lại và giúp ích cho việc debug. Ngoài ra khi hit limit claude, các claude sessions tiếp theo có thể tiếp tục từ file log.

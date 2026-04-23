# System Context for Claude Code

This project is a **Multi-Tenant Sales Management Platform** implementing a strict **Database-per-Tenant** architecture.

## 🛠 Tech Stack
- **Backend**: NestJS 10.x, TypeORM, MySQL, TypeScript.
- **Frontend**: React 18, Vite, Ant Design, Zustand, React Router v6.
- **Note**: The `readme.md` in the root may incorrectly reference Java/Spring Boot due to boilerplate. The actual implementation is purely **TypeScript (NestJS + React)**.

## 🏗 Architecture Rules & Concepts
- **Isolation Strategy**: Physical Database-per-tenant.
- **System DB**: Handled by the `platform` module. Manages metadata (tenants, platform_users).
- **Tenant DBs**: Dynamically resolved via `TenantDataSourceManager` in the `tenant` module. All tenant-specific business logic must reside in `tenant-module`.
- **Cross-Boundary Restrictions**: Code in `tenant-module` should **not** directly import or query entities from the `platform` module, and vice versa. Always respect the separation of concerns.
- **Response Format**: Handled globally by `TransformInterceptor` (Format: `{ success: boolean, data: any, timestamp: string }`).
- **Error Handling**: Handled globally by `HttpExceptionFilter`.
- **Authentication**: JWT-based. Separated into Platform Tokens (`userType: 'PLATFORM'`) and Tenant Tokens (`userType: 'TENANT'`). Handled via `JwtAuthGuard` and `RolesGuard`.

## 💻 Common Commands

### Backend (`/backend`)
- **Install Dependencies**: `npm install`
- **Run Development**: `npm run start:dev`
- **Build**: `npm run build`
- **Migrations (Generate)**: `npm run migration:generate`
- **Migrations (Run)**: `npm run migration:run`

### Frontend (`/frontend`)
- **Install Dependencies**: `npm install`
- **Run Development**: `npm run dev`
- **Build**: `npm run build`

## 📝 Code Style & Guidelines
- **NestJS**: Follow standard NestJS modular architecture. Use `@nestjs/swagger` for API documentation. Validate all inputs using `class-validator` DTOs.
- **TypeORM**: Use the Data Mapper pattern (Repositories). `synchronize` is set to `false`, so schema changes must be managed via explicit migrations.
- **React**: Use functional components and Hooks. Ant Design is the primary UI library.
- **TypeScript**: Enforce strict typing. Avoid using `any`.
- **Environment Configuration**: 
  - Backend uses `ConfigModule` loading `.env.local` or `.env`.
  - Frontend expects `.env.local` with `VITE_` prefixed variables (e.g., `VITE_API_BASE_URL`).

## 📁 Key Directories

### Backend
- `backend/src/platform/`: System-level APIs (Super Admin auth, tenant provisioning, platform users).
- `backend/src/tenant-module/`: Tenant-level APIs (products, orders, tenant-specific logic).
- `backend/src/tenant/`: Core multi-tenancy context and dynamic database connection pooling (`TenantDataSourceManager`).
- `backend/src/database/`: TypeORM data source, database initialization, and migrations.
- `backend/src/common/`: Global interceptors, filters, decorators, and guards.

### Frontend
- `frontend/src/platform/`: UI components and pages for System/Platform Administrators.
- `frontend/src/tenant/`: UI components and pages for Tenant Users (store managers, staff).
- `frontend/src/api/`: Axios interceptors, token injection, and API endpoint definitions.

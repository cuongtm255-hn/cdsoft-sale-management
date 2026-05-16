# Backend - CDSoft Sale Management

NestJS backend for the multi-tenant sales management platform. The service uses MySQL, TypeORM, JWT authentication, and Swagger docs.

---

## Requirements

- Node.js >= 20
- npm >= 9
- MySQL 8.0 or Docker

---

## Option 1: Run with Docker

From the project root:

```bash
docker compose up -d
```

Docker starts MySQL, Backend (`8080`), and Frontend (`80`).

Check backend logs:

```bash
docker compose logs -f backend
```

On startup, the backend automatically runs pending platform migrations for the existing system database, then seeds the super admin if seed env vars are set.

---

## Option 2: Run manually

### Step 1 - Install dependencies

```bash
cd backend
npm install
```

### Step 2 - Configure environment

```bash
cp .env.example .env
```

Fill in the required values in `.env`:

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Backend port | `8080` |
| `DB_HOST` | MySQL host for the system database | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USERNAME` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | `secret` |
| `DB_NAME` | Existing system database name | `salesplatform_system` |
| `TENANT_DB_HOST` | Default MySQL host for tenant databases | `localhost` |
| `TENANT_DB_USERNAME` | Default MySQL username for tenant databases | `root` |
| `TENANT_DB_PASSWORD` | Default MySQL password for tenant databases | `secret` |
| `JWT_SECRET` | JWT signing secret | long random string |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime | `8h` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | `7d` |
| `TENANT_DB_PASSWORD_KEY` | AES-256 key for tenant DB password encryption | 32-byte key |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |

### Step 3 - Prepare the system database

Create the MySQL database named by `DB_NAME` before starting the backend. The backend does **not** create the database itself.

When the backend starts, it automatically:

- runs pending platform migrations on the existing system database
- seeds the super admin account if `SEED_SUPER_ADMIN_*` values are configured

If the system database does not exist, startup fails at the database connection step.

### Step 4 - Start the server

```bash
# Development (hot reload)
npm run start:dev

# Or production
npm run build
npm run start:prod
```

Server URL: `http://localhost:8080`

---

## API and Docs

| Endpoint | Description |
|----------|-------------|
| `http://localhost:8080/api` | Base API URL |
| `http://localhost:8080/api/docs` | Swagger UI |

---

## Migrations

Platform migrations can still be run manually when needed:

```bash
# Generate a migration
npm run migration:generate -- src/migrations/MyMigration

# Run pending platform migrations
npm run migration:run

# Revert the latest platform migration
npm run migration:revert
```

Tenant migrations are applied automatically when a tenant datasource initializes.

---

## Test

```bash
npm run test
npm run test:cov
npm run test:e2e
```

---

## Test Seed Data

Use the built-in seed script to create a dedicated demo tenant and populate representative data for the main platform and tenant modules:

```bash
npm run seed:test-data
```

Behavior:

- runs pending platform migrations first
- refreshes the dedicated tenant `seed_demo`
- recreates the tenant database `tenant_seed_demo` on each run
- seeds platform operator, tenant users, RBAC, categories, products, customers, suppliers, inventory, sales, invoices, loyalty, finance, serials, and audit logs

Default accounts:

- Platform operator: `seed.operator@platform.local` / `Test@12345`
- Tenant users:
  `admin@seed_demo.local`
  `manager@seed_demo.local`
  `accountant@seed_demo.local`
  `warehouse@seed_demo.local`
  `staff@seed_demo.local`
  Password for all tenant users: `Test@12345`

Optional overrides:

- `SEED_TEST_TENANT_CODE`
- `SEED_TEST_DB_NAME`
- `SEED_TEST_PASSWORD`

---

## Production build

```bash
npm run build
```

Build output: `dist/`

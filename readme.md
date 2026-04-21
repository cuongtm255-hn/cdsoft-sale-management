# Multi-Tenant Sales Management Platform

> **Enterprise SaaS Starter Kit** · Spring Boot + React · Database-per-Tenant

![Java](https://img.shields.io/badge/Java-17%2B-orange?style=flat-square)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-6DB33F?style=flat-square)
![React](https://img.shields.io/badge/React-18%2B-61DAFB?style=flat-square)
![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![Version](https://img.shields.io/badge/Version-1.0.0-blue?style=flat-square)

*Production-ready architecture · Multi-database isolation · Full provisioning flow*

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Summary](#2-architecture-summary)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Database Design](#5-database-design)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Tenant Provisioning Flow](#7-tenant-provisioning-flow)
8. [API Reference](#8-api-reference)
9. [Frontend Structure](#9-frontend-structure)
10. [Quick Start Guide](#10-quick-start-guide)
11. [Default Accounts](#11-default-accounts)
12. [Configuration Reference](#12-configuration-reference)
13. [Development Guide](#13-development-guide)
14. [Deployment Guide](#14-deployment-guide)
15. [Roadmap & Next Enhancements](#15-roadmap--next-enhancements)

---

## 1. Project Overview

This project is an enterprise-grade, multi-tenant Sales Management Platform built as a SaaS starter kit. It enables a single platform provider to serve multiple independent business customers (tenants), each with complete data isolation, their own admin users, and a full suite of sales tools.

### 1.1 Business Context

Each tenant represents one customer company — a store, franchise unit, or business. The platform owner provisions tenants on demand via a centralized admin portal. Once provisioned, a tenant's admin can independently manage products, orders, inventory, suppliers, and reporting without any visibility into other tenants' data.

### 1.2 Key Capabilities

- Centralized platform administration with tenant lifecycle management
- Database-per-tenant architecture for strict data isolation
- Automated tenant provisioning with schema migration (Flyway)
- JWT-based authentication with platform and tenant role separation
- Full sales module: products, orders, inventory, payments, reports
- React SPA with separate admin portal and tenant portal areas
- Audit logging at both platform and tenant level

---

## 2. Architecture Summary

### 2.1 Deployment Topology

| Component | Description |
|-----------|-------------|
| **Frontend SPA** | React 18 + Vite, served as static files (Nginx / CDN) |
| **Backend API** | NestJS 10.x REST API — deployable as Node.js service/container |
| **System Database** | Single MySQL/MariaDB DB — platform metadata, tenants, platform users |
| **Tenant Databases** | One DB per tenant — provisioned on demand, fully isolated |
| **Connection Pool** | HikariCP with dynamic DataSource registry (one pool per tenant) |

### 2.2 Multi-Tenant Strategy

**Strategy: Database-per-Tenant (Physical Isolation)**

- Every tenant owns a dedicated MySQL database (e.g., `tenant_acme_corp`)
- No shared business tables between tenants
- Tenant connection metadata stored securely in system DB
- Backend resolves tenant context from JWT on every API request
- Dynamic DataSource is created on first access and cached in a registry

### 2.3 Request Lifecycle

```
1. HTTP Request arrives
   └─ Client sends: Authorization: Bearer <JWT>

2. JWT Filter extracts and validates the token
   └─ Decodes tenant_code, user_type, roles from claims

3. TenantContextHolder sets thread-local tenant context
   └─ Stores tenantCode for the duration of this request thread

4. RoutingDataSource resolves the correct DataSource
   └─ Reads tenantCode → looks up connection info → returns HikariCP pool

5. Business logic executes against the tenant's database
   └─ Service layer operates normally — no tenant code in business logic

6. TenantContextHolder is cleared in finally block
   └─ Prevents context leakage to other requests on the same thread
```

---

## 3. Technology Stack

| Layer | Technology / Library |
|-------|----------------------|
| **Backend Runtime** | Node.js 20 LTS |
| **Framework** | NestJS 10.x |
| **Web** | NestJS REST API |
| **Persistence** | TypeORM hoặc Prisma |
| **Security** | Passport.js + JWT |
| **DB Migration** | TypeORM Migrations hoặc Prisma Migrate |
| **Connection Pool** | HikariCP (Spring Boot default) |
| **Validation** | class-validator + class-transformer |
| **Build** | Nest CLI |
| **Mapping** | Custom mapper / class-transformer |
| **Utilities** | N/A (TypeScript decorators) |
| **Frontend Framework** | React 18 + Vite 5 |
| **Routing** | React Router v6 |
| **HTTP Client** | Axios 1.x with interceptors |
| **UI Components** | Ant Design 5 or shadcn/ui + Tailwind CSS |
| **State** | React Context + useReducer / Zustand |
| **Database** | MySQL 8.x or MariaDB 10.11+ |
| **Cache (optional)** | Redis 7 for DataSource registry + session cache |

---

## 4. Project Structure

### 4.1 Backend

```
src/main/java/com/salesplatform/
├── SalesPlatformApplication.java
├── config/
│   ├── SecurityConfig.java
│   ├── DataSourceConfig.java          # System + tenant DS beans
│   └── WebMvcConfig.java
├── tenant/
│   ├── TenantContext.java             # Thread-local holder
│   ├── TenantContextHolder.java
│   ├── TenantDataSourceManager.java   # Dynamic DS registry
│   ├── RoutingDataSource.java         # AbstractRoutingDataSource
│   └── TenantMetadataService.java
├── provisioning/
│   ├── ProvisioningService.java
│   ├── TenantSchemaInitializer.java
│   └── ProvisioningStatus.java        # Enum
├── security/
│   ├── JwtUtils.java
│   ├── JwtAuthFilter.java
│   └── UserDetailsServiceImpl.java
├── platform/
│   ├── controller/
│   │   ├── TenantController.java
│   │   └── PlatformUserController.java
│   ├── service/
│   ├── repository/
│   ├── entity/                        # System DB entities
│   └── dto/
├── tenant_module/
│   ├── controller/                    # Tenant business APIs
│   ├── service/
│   ├── repository/
│   ├── entity/                        # Tenant DB entities
│   └── dto/
├── audit/
├── exception/
│   ├── GlobalExceptionHandler.java
│   └── TenantNotFoundException.java
└── common/
    ├── BaseEntity.java                # createdAt, updatedAt
    └── ApiResponse.java               # Standard response wrapper
```

### 4.2 Frontend

```
src/
├── main.jsx
├── App.jsx
├── api/
│   ├── axios.js                       # Interceptors, token injection
│   ├── platform.api.js
│   └── tenant.api.js
├── auth/
│   ├── AuthContext.jsx
│   └── ProtectedRoute.jsx
├── platform/
│   ├── layout/PlatformLayout.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── TenantList.jsx
│   │   ├── TenantCreate.jsx
│   │   ├── TenantDetail.jsx
│   │   ├── PlatformUsers.jsx
│   │   └── AuditLogs.jsx
│   └── components/
├── tenant/
│   ├── layout/TenantLayout.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Products.jsx
│   │   ├── Categories.jsx
│   │   ├── Customers.jsx
│   │   ├── Suppliers.jsx
│   │   ├── Inventory.jsx
│   │   ├── PurchaseOrders.jsx
│   │   ├── SalesOrders.jsx
│   │   ├── Payments.jsx
│   │   └── Users.jsx
│   └── components/
├── shared/
│   ├── components/
│   └── hooks/
└── router/
    └── index.jsx                      # /platform/* and /tenant/*
```

---

## 5. Database Design

### 5.1 System Database (`salesplatform_system`)

| Table | Purpose |
|-------|---------|
| `platform_users` | SUPER_ADMIN, PLATFORM_OPERATOR accounts |
| `platform_roles` | Platform-level role definitions |
| `tenants` | Master tenant registry (one row per customer) |
| `tenant_databases` | DB host/port/name/credentials per tenant |
| `tenant_admin_accounts` | Bootstrap admin credentials per tenant |
| `tenant_provisioning_logs` | Step-by-step provisioning audit trail |
| `system_audit_logs` | Platform-level admin action log |
| `system_settings` | Global configuration key-value store |

#### Key columns — `tenants`

```sql
id, tenant_code (unique), tenant_name, company_name
contact_name, contact_email, contact_phone, address
status                ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED')
provisioning_status   ENUM('PENDING', 'PROVISIONING', 'ACTIVE', 'FAILED', 'SUSPENDED')
db_name, db_host, db_port, db_username, db_password_encrypted
created_at, updated_at, created_by
```

### 5.2 Tenant Database (`tenant_<code>`)

| Table | Purpose |
|-------|---------|
| `users` | Internal users of this tenant |
| `roles` | TENANT_ADMIN, MANAGER, STAFF |
| `products` | Product catalog with SKU, pricing, stock |
| `categories` | Product category hierarchy |
| `customers` | End-customers of this tenant's business |
| `suppliers` | Supplier/vendor master data |
| `inventory_transactions` | Stock-in, stock-out, adjustment history |
| `purchase_orders` | Inbound orders from suppliers |
| `purchase_order_items` | Line items of purchase orders |
| `sales_orders` | Outbound orders to customers |
| `sales_order_items` | Line items of sales orders |
| `invoices` | Invoice records linked to sales orders |
| `payments` | Payment records with partial/full status |
| `audit_logs` | Tenant-level user action log |

### 5.3 Provisioning Status Reference

| Status | Description |
|--------|-------------|
| `PENDING` | Tenant record created, provisioning not yet started |
| `PROVISIONING` | Database creation and schema migration in progress |
| `ACTIVE` | Tenant fully operational, login enabled |
| `FAILED` | Provisioning error occurred — check provisioning log |
| `SUSPENDED` | Tenant access temporarily locked by platform admin |

---

## 6. Authentication & Authorization

### 6.1 Platform Login

- `POST /api/platform/auth/login` `{ username, password }`
- Credentials validated against system database (`platform_users` table)
- Returns JWT with claims: `user_type=PLATFORM`, `role=SUPER_ADMIN|PLATFORM_OPERATOR`
- No `tenant_code` in platform tokens

### 6.2 Tenant Login

- `POST /api/tenant/auth/login` `{ username, password, tenantCode }`
- Backend resolves tenant DB connection from `tenantCode` in system DB
- Credentials validated against the resolved tenant database (`users` table)
- Returns JWT with claims: `user_type=TENANT`, `tenant_code`, `role=TENANT_ADMIN|MANAGER|STAFF`
- Tenant must have `provisioning_status=ACTIVE` — otherwise `403` is returned

### 6.3 JWT Claims Structure

```json
// Platform token
{
  "sub": "admin@platform.com",
  "user_type": "PLATFORM",
  "role": "SUPER_ADMIN",
  "iat": "...",
  "exp": "..."
}

// Tenant token
{
  "sub": "admin@acmecorp.com",
  "user_type": "TENANT",
  "tenant_code": "ACME_CORP",
  "role": "TENANT_ADMIN",
  "iat": "...",
  "exp": "..."
}
```

### 6.4 Authorization Rules

| Rule | Detail |
|------|--------|
| **Tenant isolation** | Every tenant API validates JWT `tenant_code` matches requested resource tenant |
| **Cross-tenant denial** | No tenant user may read or write another tenant's data |
| **Platform separation** | Platform tokens cannot access tenant business APIs |
| **Inactive denial** | Tenants with `status != ACTIVE` receive HTTP `403` on all business APIs |
| **Password hashing** | BCrypt with strength 12 for all stored passwords |
| **JWT expiry** | Access token: 8h · Refresh token: 7d (optional) |

---

## 7. Tenant Provisioning Flow

When a `SUPER_ADMIN` creates a new tenant, `ProvisioningService` executes the following steps:

**Step 1 — Validate Input**
> Verify unique `tenant_code` and email. Return `400` if duplicates exist.

**Step 2 — Create Tenant Record** *(status: `PENDING`)*
> Insert row into `tenants` and `tenant_databases` tables in system DB. Encrypt DB password using AES-256 before storage.

**Step 3 — Set Status → `PROVISIONING`**
> Update tenant row. Log step in `tenant_provisioning_logs`.

**Step 4 — Create Physical Database**
> Execute: `CREATE DATABASE tenant_<code> CHARACTER SET utf8mb4`. Uses a privileged system datasource connection.

**Step 5 — Run Flyway Migration on Tenant DB**
> Bootstrap a temporary DataSource for the new tenant DB. Run all migrations in `classpath:db/tenant/` to create the full schema.

**Step 6 — Create Default Tenant Admin User**
> Insert admin user into the new tenant's `users` table. Temporary password is generated and stored in `tenant_admin_accounts` (system DB). Admin must change password on first login.

**Step 7 — Set Status → `ACTIVE`**
> Update tenant `provisioning_status` to `ACTIVE`. Register new DataSource in `TenantDataSourceManager` cache.

**Step 8 — Return Onboarding Summary**
> API returns `tenant_code`, admin login URL, temporary credentials reference.

### 7.1 Error Handling

- Any step failure updates `provisioning_status` to `FAILED`
- Detailed error message and stack trace recorded in `tenant_provisioning_logs`
- Partially created databases are rolled back / cleaned up where safe
- `SUPER_ADMIN` can retry provisioning from the platform portal

---

## 8. API Reference

### 8.1 Platform APIs (`/api/platform`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/platform/auth/login` | Platform user login → JWT |
| `GET` | `/api/platform/tenants` | List all tenants (paginated) |
| `POST` | `/api/platform/tenants` | Create & provision new tenant |
| `GET` | `/api/platform/tenants/{id}` | Get tenant details |
| `PUT` | `/api/platform/tenants/{id}` | Update tenant profile |
| `PATCH` | `/api/platform/tenants/{id}/status` | Activate / deactivate / suspend |
| `POST` | `/api/platform/tenants/{id}/provision` | Retry failed provisioning |
| `POST` | `/api/platform/tenants/{id}/reset-admin` | Reset tenant admin password |
| `GET` | `/api/platform/tenants/{id}/provisioning-log` | Get provisioning history |
| `GET` | `/api/platform/users` | List platform users |
| `POST` | `/api/platform/users` | Create platform user |
| `PUT` | `/api/platform/users/{id}` | Update platform user |
| `PATCH` | `/api/platform/users/{id}/lock` | Lock / unlock platform user |
| `GET` | `/api/platform/audit-logs` | List system audit logs |
| `GET` | `/api/platform/settings` | Get system settings |
| `PUT` | `/api/platform/settings` | Update system settings |

### 8.2 Tenant Business APIs (`/api/tenant`)

> All tenant APIs require `X-Tenant-Code` header **or** `tenant_code` embedded in JWT.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/tenant/auth/login` | Tenant user login → JWT |
| `GET` | `/api/tenant/products` | List products (paginated, filterable) |
| `POST` | `/api/tenant/products` | Create product |
| `PUT` | `/api/tenant/products/{id}` | Update product |
| `DELETE` | `/api/tenant/products/{id}` | Delete product |
| `GET` | `/api/tenant/categories` | List categories |
| `POST` | `/api/tenant/categories` | Create category |
| `GET` | `/api/tenant/customers` | List customers |
| `POST` | `/api/tenant/customers` | Create customer |
| `GET` | `/api/tenant/suppliers` | List suppliers |
| `POST` | `/api/tenant/suppliers` | Create supplier |
| `POST` | `/api/tenant/inventory/stock-in` | Record stock receipt |
| `POST` | `/api/tenant/inventory/stock-out` | Record stock deduction |
| `POST` | `/api/tenant/inventory/adjust` | Manual stock adjustment |
| `GET` | `/api/tenant/inventory/transactions` | Inventory transaction history |
| `GET` | `/api/tenant/purchase-orders` | List purchase orders |
| `POST` | `/api/tenant/purchase-orders` | Create purchase order |
| `PATCH` | `/api/tenant/purchase-orders/{id}/confirm` | Confirm purchase order |
| `PATCH` | `/api/tenant/purchase-orders/{id}/receive` | Mark as received |
| `GET` | `/api/tenant/sales-orders` | List sales orders |
| `POST` | `/api/tenant/sales-orders` | Create sales order |
| `PATCH` | `/api/tenant/sales-orders/{id}/confirm` | Confirm sales order |
| `PATCH` | `/api/tenant/sales-orders/{id}/ship` | Mark as shipped |
| `PATCH` | `/api/tenant/sales-orders/{id}/complete` | Mark as completed |
| `GET` | `/api/tenant/invoices` | List invoices |
| `GET` | `/api/tenant/invoices/{id}` | Get invoice detail |
| `POST` | `/api/tenant/payments` | Record payment |
| `GET` | `/api/tenant/users` | List tenant users (TENANT_ADMIN) |
| `POST` | `/api/tenant/users` | Create tenant user |
| `PUT` | `/api/tenant/users/{id}` | Update tenant user |
| `GET` | `/api/tenant/dashboard/stats` | Dashboard KPIs |

---

## 9. Frontend Structure

### 9.1 Route Groups

| Route prefix | Area |
|--------------|------|
| `/platform/login` | Platform admin login page |
| `/platform/dashboard` | Platform dashboard |
| `/platform/tenants` | Tenant list, create, detail |
| `/platform/users` | Platform user management |
| `/platform/audit-logs` | System audit log viewer |
| `/tenant/login` | Tenant user login (requires `tenantCode` param) |
| `/tenant/dashboard` | Tenant dashboard with KPIs |
| `/tenant/products` | Product CRUD |
| `/tenant/categories` | Category management |
| `/tenant/customers` | Customer management |
| `/tenant/suppliers` | Supplier management |
| `/tenant/inventory` | Inventory transactions |
| `/tenant/purchase-orders` | Purchase order workflow |
| `/tenant/sales-orders` | Sales order workflow |
| `/tenant/payments` | Payments and invoices |
| `/tenant/users` | Internal user management (TENANT_ADMIN) |

### 9.2 Axios Interceptor

- Attaches `Authorization: Bearer <token>` to every request
- Reads token from `localStorage` (platform or tenant scope)
- On `401` response: clears token and redirects to appropriate login page
- On `403` response: shows permission-denied notification

---

## 10. Quick Start Guide

### 10.1 Prerequisites

| Dependency | Minimum Version |
|------------|-----------------|
| Java JDK | 17 LTS (Java 21 recommended) |
| Maven | 3.9+ |
| Node.js | 20 LTS |
| npm | 10+ |
| MySQL / MariaDB | MySQL 8.0 or MariaDB 10.11 |
| Git | Any recent version |

### 10.2 Database Setup

```sql
-- Connect to MySQL as root
mysql -u root -p

-- Create system database and a privileged user
CREATE DATABASE salesplatform_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'sp_admin'@'%' IDENTIFIED BY 'ChangeMe_Strong!';
GRANT ALL PRIVILEGES ON salesplatform_system.* TO 'sp_admin'@'%';

-- Grant CREATE DATABASE so provisioning can create tenant DBs
GRANT CREATE ON *.* TO 'sp_admin'@'%';
FLUSH PRIVILEGES;
```

### 10.3 Backend Startup

```bash
# Clone repository
git clone https://github.com/your-org/sales-platform.git
cd sales-platform/backend

# Configure datasource (or use environment variables — see Section 12)
# Edit src/main/resources/application.yml

# Build and run
mvn clean package -DskipTests
java -jar target/sales-platform-1.0.0.jar

# Or with Maven wrapper
./mvnw spring-boot:run

# Flyway will auto-migrate system DB schema on startup
# Check logs for: "Successfully applied N migrations to schema"
```

### 10.4 Frontend Startup

```bash
cd sales-platform/frontend
npm install
cp .env.example .env.local
# Edit .env.local → VITE_API_BASE_URL=http://localhost:8080

npm run dev
# Frontend available at http://localhost:5173
```

---

## 11. Default Accounts

| Account Type | Username / Email | Default Password | Role |
|--------------|-----------------|------------------|------|
| Super Admin (Platform) | `superadmin@platform.com` | `Admin@12345!` | `SUPER_ADMIN` |
| Platform Operator | `operator@platform.com` | `Operator@123!` | `PLATFORM_OPERATOR` |
| Tenant Admin (per tenant) | `admin@<tenantdomain>` | *(generated)* | `TENANT_ADMIN` |

> ⚠️ **Change all default passwords before any production deployment.**

---

## 12. Configuration Reference

### 12.1 `application.yml` — Key Properties

```yaml
spring:
  datasource:           # System database
    url: jdbc:mysql://localhost:3306/salesplatform_system
    username: sp_admin
    password: ${DB_PASSWORD}
  jpa:
    hibernate.ddl-auto: validate   # Flyway manages schema
    show-sql: false
  flyway:
    locations: classpath:db/migration  # System migrations
    baseline-on-migrate: true

app:
  jwt:
    secret: ${JWT_SECRET}            # Min 256-bit Base64
    expiration-ms: 28800000          # 8 hours
  tenant:
    db-host: localhost
    db-port: 3306
    db-user-prefix: tenant_          # tenant_<code>_user
    ds-cache-ttl-minutes: 60
  security:
    bcrypt-strength: 12
    password-policy:
      min-length: 10
      require-special-char: true
```

### 12.2 Environment Variables

| Variable | Description |
|----------|-------------|
| `DB_PASSWORD` | System database password |
| `JWT_SECRET` | JWT signing secret (256-bit minimum, Base64) |
| `TENANT_DB_PASSWORD_KEY` | AES key for encrypting tenant DB passwords |
| `SPRING_PROFILES_ACTIVE` | Active profile: `dev` \| `staging` \| `prod` |
| `SERVER_PORT` | API server port (default: `8080`) |
| `VITE_API_BASE_URL` | Frontend: backend API base URL |

---

## 13. Development Guide

### 13.1 Creating the First Super Admin

```bash
# Option 1: Use the seed SQL script
mysql -u sp_admin -p salesplatform_system < scripts/seed_super_admin.sql

# Option 2: Run Spring Boot with seed profile
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev,seed
```

```sql
-- Option 3: Direct INSERT (development only)
INSERT INTO platform_users (username, email, password_hash, role, status)
VALUES (
  'superadmin',
  'superadmin@platform.com',
  '$2a$12$<bcrypt_hash_of_Admin@12345!>',
  'SUPER_ADMIN',
  'ACTIVE'
);
```

### 13.2 Provisioning a Test Tenant

```bash
# 1. Login as super admin
POST /api/platform/auth/login
Body: { "username": "superadmin@platform.com", "password": "Admin@12345!" }

# 2. Create tenant (use the returned JWT as Bearer token)
POST /api/platform/tenants
Headers: Authorization: Bearer <platform_jwt>
Body:
{
  "tenantName":    "Acme Corp Store",
  "companyName":   "Acme Corporation",
  "tenantCode":    "ACME_CORP",
  "contactName":   "John Doe",
  "contactEmail":  "admin@acmecorp.com",
  "contactPhone":  "+84900000001",
  "dbHost":        "localhost",
  "dbPort":        3306
}

# Response includes temporary admin credentials and provisioning status
```

### 13.3 Adding a Flyway Migration

- **System migrations:** `src/main/resources/db/migration/V{n}__{description}.sql`
- **Tenant migrations:** `src/main/resources/db/tenant/V{n}__{description}.sql`
- Tenant migrations run automatically during provisioning via `TenantSchemaInitializer`
- Never modify existing migration files — always add a new versioned file

---

## 14. Deployment Guide

### 14.1 Production Checklist

- [ ] Set `SPRING_PROFILES_ACTIVE=prod`
- [ ] Use strong, randomly generated `JWT_SECRET` (`openssl rand -base64 64`)
- [ ] Set `spring.jpa.show-sql=false`
- [ ] Enable HTTPS / TLS termination at load balancer
- [ ] Use a dedicated MySQL user with least-privilege for each tenant
- [ ] Store tenant DB passwords encrypted (AES-256) in system DB
- [ ] Configure HikariCP pool limits appropriate to tenant count
- [ ] Set up log aggregation (ELK / Loki) for audit logs
- [ ] Enable Spring Boot Actuator health endpoints (restrict access)

### 14.2 Docker Compose (Development)

```yaml
version: '3.9'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: salesplatform_system
      MYSQL_USER: sp_admin
      MYSQL_PASSWORD: ChangeMe_Strong!
    ports:
      - '3306:3306'
    volumes:
      - mysql_data:/var/lib/mysql

  backend:
    build: ./backend
    ports:
      - '8080:8080'
    environment:
      DB_PASSWORD: ChangeMe_Strong!
      JWT_SECRET: <base64_secret>
    depends_on:
      - mysql

  frontend:
    build: ./frontend
    ports:
      - '5173:80'
    environment:
      VITE_API_BASE_URL: http://backend:8080

volumes:
  mysql_data:
```

---

## 15. Roadmap & Next Enhancements

| Enhancement | Description |
|-------------|-------------|
| **Subscription & Billing** | Stripe/PayOS integration — tenant plan tiers, usage metering, invoice generation |
| **Tenant Custom Domain** | Map custom domains (`acme.yoursaas.com`) to tenant context resolution |
| **File Storage** | S3-compatible storage (MinIO/AWS S3) for product images and invoice PDFs |
| **Message Queue** | RabbitMQ / Kafka for async provisioning, email notifications, audit events |
| **Redis Cache** | Cache tenant DataSource registry and hot-path config lookups |
| **Monitoring & Alerting** | Prometheus + Grafana dashboards, tenant health metrics, provisioning SLA alerts |
| **Backup & Restore** | Per-tenant logical backup (`mysqldump`) on schedule, point-in-time restore UI |
| **Multi-region** | Route tenant DBs to regional MySQL clusters for latency and data residency |
| **Webhooks** | Outbound webhooks for order events — enable tenant integrations |
| **Mobile App** | React Native or Flutter app for tenant staff (sales on the go) |
| **AI Sales Insights** | LLM-powered demand forecasting and sales trend analysis per tenant |
| **White-labeling** | Per-tenant branding: logo, colors, custom email templates |

---

> Built with ♥ as a serious enterprise SaaS starter — not a toy.
> Contributions welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a PR.

---

*© 2024 SalesPlatform Inc. — Confidential & Proprietary*

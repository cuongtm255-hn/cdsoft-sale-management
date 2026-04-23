# 📘 BUSINESS REQUIREMENTS DOCUMENT (BRD)

## Hệ thống: Multi-Tenant Sales Management Platform

---

## 1. 🎯 Executive Summary

### 1.1 Mục tiêu hệ thống

Xây dựng một nền tảng SaaS cho phép nhiều doanh nghiệp (SME) sử dụng chung một hệ thống quản lý bán hàng, nhưng **dữ liệu hoàn toàn tách biệt**.

👉 Hệ thống giúp:

* Chủ platform (SaaS owner) quản lý nhiều khách hàng
* Mỗi khách hàng (tenant) vận hành độc lập hệ thống bán hàng của mình

📌 Trích từ source: hệ thống cung cấp **multi-tenant SaaS với database riêng cho từng tenant** 

---

## 2. 🧩 Stakeholders

| Stakeholder                  | Vai trò                | Mục tiêu                          |
| ---------------------------- | ---------------------- | --------------------------------- |
| Platform Owner               | Chủ hệ thống SaaS      | Quản lý tenant, vận hành platform |
| Platform Admin (SUPER_ADMIN) | Quản trị cao nhất      | Tạo tenant, quản lý user          |
| Platform Operator            | Nhân viên vận hành     | Theo dõi tenant                   |
| Tenant Admin                 | Admin của từng công ty | Quản lý toàn bộ business          |
| Staff / Manager              | Nhân viên doanh nghiệp | Bán hàng, quản lý kho             |

---

## 3. 🏢 Business Context

### 3.1 Problem Statement

Các SME thường:

* Không có hệ thống quản lý bán hàng chuẩn
* Khó mở rộng khi tăng quy mô
* Không muốn tự build hệ thống riêng

👉 Solution:

* Cung cấp **SaaS platform**
* Mỗi doanh nghiệp có hệ thống riêng nhưng dùng chung nền tảng

📌 Theo tài liệu: mỗi tenant là một công ty/store độc lập với full sales tools 

---

## 4. 🎯 Business Goals

### 4.1 Platform Goals

* Onboard tenant nhanh (auto provisioning)
* Quản lý hàng trăm / hàng nghìn tenant
* Đảm bảo data isolation tuyệt đối

### 4.2 Tenant Goals

* Quản lý:

  * Sản phẩm
  * Đơn hàng
  * Khách hàng
  * Kho
  * Thanh toán
* Theo dõi báo cáo kinh doanh

---

## 5. 🧑‍💼 User Personas

### 5.1 Platform Admin

* Tạo tenant
* Quản lý trạng thái tenant
* Reset admin tenant

### 5.2 Tenant Admin

* Setup hệ thống ban đầu
* Quản lý user nội bộ
* Cấu hình sản phẩm/kho

### 5.3 Staff

* Tạo đơn hàng
* Xử lý bán hàng
* Quản lý tồn kho

---

## 6. 🧠 Business Capabilities (Core Features)

### 6.1 Platform Management

| Capability       | Description                   |
| ---------------- | ----------------------------- |
| Tenant Lifecycle | Tạo / update / suspend tenant |
| Provisioning     | Tự động tạo DB + schema       |
| Platform Users   | Quản lý admin hệ thống        |
| Audit Logs       | Log hoạt động                 |

📌 Có API đầy đủ cho tenant management 

---

### 6.2 Tenant Business Modules

#### 1. Product Management

* CRUD sản phẩm
* SKU, giá, tồn kho

#### 2. Customer Management

* Quản lý khách hàng

#### 3. Supplier Management

* Nhà cung cấp

#### 4. Inventory Management

* Nhập kho
* Xuất kho
* Điều chỉnh

#### 5. Order Management

* Sales Orders
* Purchase Orders

#### 6. Invoice & Payment

* Hóa đơn
* Thanh toán (partial/full)

#### 7. Reporting

* Dashboard KPI

📌 Các module này đã define trong tenant DB schema 

---

## 7. 🔄 Key Business Flows

### 7.1 Tenant Onboarding Flow

```
Platform Admin tạo tenant
    ↓
System validate
    ↓
Tạo record tenant (PENDING)
    ↓
Tạo database riêng
    ↓
Chạy migration schema
    ↓
Tạo admin tenant
    ↓
Set ACTIVE
```

📌 Flow provisioning chi tiết trong README 

---

### 7.2 Sales Order Flow

```
Staff tạo Sales Order
    ↓
Confirm order
    ↓
Ship hàng
    ↓
Complete
    ↓
Generate invoice
    ↓
Payment
```

---

### 7.3 Inventory Flow

```
Stock In (PO)
Stock Out (SO)
Adjustment
→ Update inventory_transactions
```

---

## 8. 🔐 Business Rules

### 8.1 Multi-tenant Rules

* Mỗi tenant = 1 database riêng
* Không truy cập cross-tenant

📌 enforced bằng tenant_code trong JWT 

---

### 8.2 Authorization Rules

| Rule               | Description                   |
| ------------------ | ----------------------------- |
| Platform vs Tenant | Tách biệt hoàn toàn           |
| Tenant Isolation   | Không đọc dữ liệu tenant khác |
| Role-based         | ADMIN / MANAGER / STAFF       |

---

### 8.3 Tenant Status Rules

| Status    | Meaning        |
| --------- | -------------- |
| PENDING   | Chưa provision |
| ACTIVE    | Hoạt động      |
| FAILED    | Lỗi            |
| SUSPENDED | Bị khóa        |

---

## 9. 📊 Data Requirements

### 9.1 System Data

* Tenants
* Platform users
* Audit logs
* DB connection info

### 9.2 Tenant Data

* Products
* Orders
* Inventory
* Customers
* Payments

📌 Split rõ system DB và tenant DB 

---

## 10. ⚙️ Non-Functional Requirements

### 10.1 Scalability

* Hỗ trợ nhiều tenant
* Dynamic datasource

### 10.2 Security

* JWT authentication
* Password bcrypt
* DB isolation

### 10.3 Performance

* Connection pool per tenant
* Cache datasource

### 10.4 Reliability

* Retry provisioning
* Logging đầy đủ

---

## 11. 🚧 Constraints

* Database-per-tenant → cost cao hơn
* Provisioning cần automation tốt
* Phải quản lý connection pool cẩn thận

---

## 12. 🚀 Future Enhancements

* Subscription & Billing
* Multi-region
* AI insights
* Webhooks
* Mobile app

📌 Được liệt kê trong roadmap 

---

# 🎯 Kết luận (SA Perspective)

Đây là một hệ thống:

👉 **SaaS ERP-lite cho SME**

* Core = Sales + Inventory
* Architecture = Multi-tenant (DB per tenant)
* Strategy = Scale theo tenant count
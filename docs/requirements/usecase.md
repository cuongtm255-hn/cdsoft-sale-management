# USE CASE DOCUMENT

## Multi-Tenant Sales Management Platform

------------------------------------------------------------------------

## I. Platform Management

### UC-01: Create Tenant

**Actor:** SUPER_ADMIN\
**Flow:** 1. Input tenant info\
2. Validate uniqueness\
3. Create tenant (PENDING)\
4. Provision database\
5. Create tenant admin\
6. Set ACTIVE

------------------------------------------------------------------------

### UC-02: Update Tenant

**Actor:** SUPER_ADMIN\
- Update tenant information\
- Modify configuration

------------------------------------------------------------------------

### UC-03: Suspend / Activate Tenant

**Actor:** SUPER_ADMIN\
- Change status: ACTIVE / SUSPENDED / FAILED

------------------------------------------------------------------------

### UC-04: View Tenant List

**Actor:** ADMIN / OPERATOR\
- View list\
- Filter by status

------------------------------------------------------------------------

### UC-05: Reset Tenant Admin

**Actor:** SUPER_ADMIN\
- Reset password

------------------------------------------------------------------------

## II. User & Authentication

### UC-06: Login

**Actor:** ALL USERS\
- Input credentials\
- Validate tenant status

------------------------------------------------------------------------

### UC-07: Manage Users

**Actor:** TENANT_ADMIN\
- Create user\
- Assign role\
- Update / deactivate

------------------------------------------------------------------------

## III. Product Management

### UC-08: Create Product

**Actor:** ADMIN / STAFF\
- Input SKU, name, price\
- Validate uniqueness

------------------------------------------------------------------------

### UC-09: Update Product

-   Modify product info

------------------------------------------------------------------------

### UC-10: View Product List

-   Search / filter

------------------------------------------------------------------------

### UC-11: Delete Product

-   Soft delete

------------------------------------------------------------------------

## IV. Customer Management

### UC-12: Create Customer

**Actor:** STAFF\
- Input customer info

------------------------------------------------------------------------

### UC-13: Update Customer

-   Update details

------------------------------------------------------------------------

### UC-14: View Customer

-   View transaction history

------------------------------------------------------------------------

## V. Inventory Management

### UC-15: Stock In

**Actor:** STAFF\
- Create stock-in record\
- Confirm goods\
- Update inventory

------------------------------------------------------------------------

### UC-16: Stock Out

-   Export inventory based on order

------------------------------------------------------------------------

### UC-17: Adjust Inventory

-   Manual adjustment

------------------------------------------------------------------------

### UC-18: View Inventory

-   Real-time inventory view

------------------------------------------------------------------------

## VI. Order Management

### UC-19: Create Sales Order

**Actor:** STAFF\
- Select customer\
- Add products\
- Calculate total\
- Save order\
- Confirm

------------------------------------------------------------------------

### UC-20: Confirm Order

-   Validate stock\
-   Lock order

------------------------------------------------------------------------

### UC-21: Cancel Order

-   Restore stock

------------------------------------------------------------------------

### UC-22: View Orders

-   Search / filter

------------------------------------------------------------------------

## VII. Invoice & Payment

### UC-23: Generate Invoice

**Actor:** SYSTEM\
- Auto-generate from order

------------------------------------------------------------------------

### UC-24: Record Payment

**Actor:** STAFF\
- Full / partial payment\
- Validate amount

------------------------------------------------------------------------

### UC-25: View Payment History

-   By customer

------------------------------------------------------------------------

## VIII. Reporting

### UC-26: View Sales Report

**Actor:** ADMIN / MANAGER

------------------------------------------------------------------------

### UC-27: View Inventory Report

------------------------------------------------------------------------

### UC-28: View Financial Report

------------------------------------------------------------------------

## IX. Authorization & Audit

### UC-29: Role-based Access

-   Assign permissions

------------------------------------------------------------------------

### UC-30: View Audit Logs

**Actor:** ADMIN

------------------------------------------------------------------------

## X. Business Flows Summary

### Tenant Lifecycle

-   Create → Provision → Activate

### Sales Flow

-   Order → Confirm → Inventory Deduction → Invoice → Payment

### Inventory Flow

-   Stock In → Stock Out → Adjustment

------------------------------------------------------------------------

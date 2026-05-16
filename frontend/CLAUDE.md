# frontend/CLAUDE.md

React 18 + Vite + Ant Design 5. Rules cho frontend — đọc cùng root `CLAUDE.md`.

## Key Conventions
- Aliases: `@api/`, `@auth/`, `@platform/`, `@tenant/`, `@shared/`
- Auth: `useAuth()` hook, 2 token riêng biệt `platform_token` / `tenant_token` trong localStorage
- Data fetching: `useApi(apiFn)` cho mutations, `usePagination(apiFn)` cho lists + `<DataTable>`

## Database Field Names — Đọc từ Response
- Dữ liệu từ **raw SQL** (list endpoints) → dùng **snake_case**: `total_amount`, `created_at`, `customer_code`
- Dữ liệu từ **TypeORM entity** (detail page qua `findOne`) → dùng **camelCase**: `totalAmount`, `createdAt`

## UI Display Rules
- **KHÔNG binding UUID/ID vào cột hiển thị.** Luôn dùng mã/tên đã enrich từ backend:
  - Khách hàng → `customer_code — customer_name` (Tooltip: code, title: name)
  - Nhà cung cấp → `supplier_code — supplier_name`
  - Sản phẩm → `<code>sku</code> product_name` (tooltip nếu tên dài)
  - Kho → `warehouse_name`
  - Đơn hàng → `order_code` (không dùng `orderId`)
- `dataIndex` chỉ dùng field tên/mã, không dùng field `*Id`

## Mobile-Responsive UI (Ant Design)
- Dùng `Grid.useBreakpoint()` để detect mobile: `const isMobile = screens.md === false`
- Layout: Desktop → `<Sider>` fixed bên trái; Mobile → hamburger button mở `<Drawer placement="left">`
- `<PageHeader>` tự stack title/actions theo chiều dọc trên mobile (`flexDirection: 'column'`)
- Content margin/padding: mobile 8px/12px, desktop 24px
- Header sticky (`position: 'sticky', top: 0, zIndex: 100`) trên cả hai layout
- `<DataTable>` / `<Table>`: wrap trong `overflow-x: auto` để scroll ngang trên mobile (đã có trong `index.css`)
- Form modal: max-width `calc(100vw - 16px)` trên mobile (đã có trong `index.css`)
- Logout button: icon-only trên mobile (`{!isMobile && 'Logout'}`)

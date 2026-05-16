# Frontend Design Skill — cdsoft-sale-management

This skill guides frontend UI generation for this multi-tenant SaaS sales platform.

## Stack
- React 18 + Vite
- Ant Design 5 (primary component library — always use `antd`)
- Vietnamese UI (all labels, placeholders, messages in Vietnamese)
- Path aliases: `@api/`, `@auth/`, `@shared/`, `@tenant/`, `@platform/`

## Design Aesthetic

**Theme:** Professional B2B utility — clean, data-dense, trustworthy. Not flashy.

**Color palette (Ant Design tokens):**
- Primary: `#1677ff` (Ant Design 5 blue)
- Success: `#52c41a`, Warning: `#faad14`, Error: `#ff4d4f`
- Text primary: `rgba(0,0,0,0.88)`, secondary: `rgba(0,0,0,0.45)`
- Background: `#f5f5f5` page, `#ffffff` cards

**Typography:** Ant Design defaults (system-ui stack). Labels bold (`fontWeight: 500`). Monetary values right-aligned with `₫` suffix. Format with `Number(v).toLocaleString('vi-VN') + '₫'`.

**Layout rhythm:**
- Page padding: `24px` (handled by TenantLayout)
- Section spacing: `Divider` between logical blocks
- Form max-width: `900px` for create/edit forms
- Table: always `size="small"`, `bordered` for detail tables

## Shared Components (always use these, never recreate)

| Component | Import | Usage |
|-----------|--------|-------|
| `<PageHeader>` | `@shared/components/PageHeader` | Top of every page, pass `title` + `extra` |
| `<DataTable>` | `@shared/components/DataTable` | All paginated lists |
| `<OrderStatusBadge>` | `@shared/components/OrderStatusBadge` | Order status everywhere |
| `<OrderItemsTable>` | `@shared/components/OrderItemsTable` | Order line items |
| `<OrderSummaryPanel>` | `@shared/components/OrderSummaryPanel` | Totals summary |
| `<VoucherInput>` | `@shared/components/VoucherInput` | Voucher field in order forms |
| `<CreditWarningBanner>` | `@shared/components/CreditWarningBanner` | Credit limit alert |

## Hooks (always use, never fetch with useEffect+axios directly in pages)

```javascript
const { fetch, loading, data, pagination, onTableChange } = usePagination(apiFn);
const { execute, loading } = useApi(apiFn, { onSuccess: () => {} });
```

Import from `@shared/hooks/useApi`.

## Page Patterns

### List page
```jsx
export default function MyList() {
  const [search, setSearch] = useState('');
  const { fetch, loading, data, pagination, onTableChange } = usePagination(myApi.list);
  const doFetch = useCallback(() => fetch({ search }), [fetch, search]);
  useEffect(() => { doFetch(); }, []);
  // columns array...
  return (
    <div>
      <PageHeader title="..." extra={<Button type="primary" ...>Tạo mới</Button>} />
      <Space style={{ marginBottom: 16 }}>
        <Input.Search ... onSearch={doFetch} />
      </Space>
      <DataTable columns={columns} dataSource={data} loading={loading}
                 pagination={pagination} onChange={onTableChange} rowKey="id" />
    </div>
  );
}
```

### Form page
```jsx
export default function MyForm() {
  const [form] = Form.useForm();
  const { execute, loading } = useApi(myApi.create);
  return (
    <div>
      <PageHeader title="Tạo mới" />
      <Form form={form} layout="vertical" style={{ maxWidth: 900 }}>
        {/* fields */}
        <Space>
          <Button onClick={() => navigate(-1)}>Hủy</Button>
          <Button type="primary" loading={loading} htmlType="submit">Lưu</Button>
        </Space>
      </Form>
    </div>
  );
}
```

### Detail page
- Use `Descriptions bordered column={2} size="small"` for header info
- Use `Divider orientation="left"` for section separators
- Action buttons in `PageHeader extra`
- Status transitions with `Modal.confirm` or inline `Modal`

## Status Badges
All entity statuses use `<Tag color={...}>`. Order statuses always use `<OrderStatusBadge>`.
Standard color mapping: `default=gray, blue=info, orange=warning, green=success, red=error, purple=special`.

## Vietnamese Conventions
- Button labels: "Tạo", "Lưu", "Hủy", "Xóa", "Sửa", "Xác nhận", "Tìm kiếm"
- Required field message: `'Vui lòng nhập {field}'` or `'Chọn {field}'`
- Success messages: `message.success('Lưu thành công')`, `message.error('Thao tác thất bại')`
- Column "Mã" for code fields, "Tên" for name, "Ngày tạo" for createdAt
- Date format: `dayjs(v).format('DD/MM/YYYY')` — always import dayjs

## API Pattern
All API calls go through `@api/tenant.api.js` or `@api/platform.api.js`. Never construct axios calls in pages. The response data is at `res.data?.data ?? res.data`.

## i18n (Bắt buộc cho mọi trang)
- Dùng `react-i18next`: `import { useTranslation } from 'react-i18next'`
- Trong mỗi component (kể cả sub-component): `const { t } = useTranslation()`
- **Không hardcode chuỗi hiển thị** — mọi label, message, placeholder đều dùng `t('namespace.key')`
- Keys được tổ chức theo module trong `frontend/src/i18n/locales/vi.json` và `en.json`
- Option arrays (Select, Radio...) **không** khai báo module-level với label cứng. Thay vào đó dùng custom hook trả về options đã translated:
  ```js
  function useMyOptions() {
    const { t } = useTranslation();
    return [{ value: 'FOO', label: t('module.fooLabel') }, ...];
  }
  ```
- Interpolation dùng cú pháp: `t('finance.fundLabel', { name: fund.name })` → `"Quỹ: {{name}}"`
- Khi thêm trang/component mới: thêm keys vào **cả hai** `vi.json` và `en.json` trước khi dùng

## What NOT to do
- No inline styles for colors that should use Ant Design tokens
- No `useState` + `useEffect` + raw `axios` for data fetching — use hooks
- No hardcoded English labels in UI visible to users
- No custom CSS files — use Ant Design `style` props
- No `<Table>` directly — use `<DataTable>` for paginated lists
- No hardcoded Vietnamese strings — always use `t()` even for Vietnamese-only text

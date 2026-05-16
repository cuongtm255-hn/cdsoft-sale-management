# MODULE 12 — Extended Features: Frontend Detail Design

> Ref: `srs-tenant-detail.md` Ch.9 | Feature list tasks #140–#141, #144–#145
> Stack: **React 18 + Ant Design 5 + Zustand** | Source: `frontend/src/tenant/`

---

## Cấu trúc file đề xuất

```
frontend/src/
└── tenant/
    ├── pages/
    │   ├── inventory/
    │   │   ├── ExpiryAlerts.jsx       — Danh sách hàng sắp hết hạn (Task #141)
    │   │   └── StockReceipt.jsx       — Mở rộng UI nhập lô/HSD (Task #140)
    │   └── serial/
    │       ├── WarrantyLookup.jsx     — Tra cứu bảo hành Serial (Task #145)
    │       └── SerialList.jsx         — Danh sách serial theo sản phẩm (Task #144)
    ├── components/
    │   ├── BatchInputTable.jsx        — Component nhập số lô/HSD (Task #140)
    │   └── SerialScanInput.jsx        — Input scan/nhập serial (Task #144)
    └── api/
        └── tenant.api.js              — Thêm inventoryApi.expiryAlerts, serialApi
```

---

## 12.1 Nhập Lô/HSD trong Phiếu Nhập Kho

### Task: #140

**Location:** Mở rộng màn hình `StockReceipt.jsx` — component nhập item

**File:** `frontend/src/tenant/components/BatchInputTable.jsx`

Khi sản phẩm được chọn và `product.trackBatch = true`, hiển thị thêm 2 field trong hàng item:

```jsx
export function StockReceiptItemRow({ item, onChange, onRemove }) {
  const { product } = item;

  return (
    <Row gutter={8} align="middle" style={{ marginBottom: 8 }}>
      {/* Các cột cơ bản: sản phẩm, đơn vị, số lượng, đơn giá */}
      <Col span={5}><ProductSearchInput value={item.productId} onSelect={p => onChange({ ...item, product: p })} /></Col>
      <Col span={3}><Select value={item.unitId} onChange={v => onChange({ ...item, unitId: v })} options={product?.units} /></Col>
      <Col span={2}><InputNumber min={1} value={item.quantity} onChange={v => onChange({ ...item, quantity: v })} /></Col>
      <Col span={3}><InputNumber min={0} value={item.unitCost} addonAfter="₫" onChange={v => onChange({ ...item, unitCost: v })} /></Col>

      {/* Batch fields — chỉ hiện khi product.trackBatch = true */}
      {product?.trackBatch && (
        <>
          <Col span={3}>
            <Input
              placeholder="Số lô (VD: LOT-2026-04)"
              value={item.batchNumber}
              onChange={e => onChange({ ...item, batchNumber: e.target.value })}
            />
          </Col>
          <Col span={3}>
            <DatePicker
              placeholder="Hạn sử dụng"
              value={item.expiryDate ? dayjs(item.expiryDate) : null}
              onChange={d => onChange({ ...item, expiryDate: d?.format('YYYY-MM-DD') })}
              disabledDate={(d) => d && d.isBefore(dayjs())} // không cho chọn ngày đã qua
            />
          </Col>
        </>
      )}

      <Col span={1}><Button icon={<DeleteOutlined />} danger type="text" onClick={onRemove} /></Col>
    </Row>
  );
}
```

**Header row** cần cập nhật để thêm cột Số lô và HSD (chỉ hiện khi ít nhất 1 sản phẩm có `trackBatch`):

```jsx
// Trong StockReceipt.jsx
const hasBatchProduct = items.some(i => i.product?.trackBatch);

<Row gutter={8} style={{ marginBottom: 4, fontWeight: 600 }}>
  <Col span={5}>Sản phẩm</Col>
  <Col span={3}>Đơn vị</Col>
  <Col span={2}>SL</Col>
  <Col span={3}>Đơn giá</Col>
  {hasBatchProduct && <Col span={3}>Số lô</Col>}
  {hasBatchProduct && <Col span={3}>Hạn SD</Col>}
  <Col span={1} />
</Row>
```

**Validation khi submit:**
```javascript
function validateItems(items) {
  for (const item of items) {
    if (item.product?.trackBatch) {
      if (!item.batchNumber) return 'Vui lòng nhập số lô cho ' + item.product.name;
      if (!item.expiryDate)  return 'Vui lòng nhập hạn sử dụng cho ' + item.product.name;
    }
  }
  return null;
}
```

---

## 12.2 Danh sách Hàng Sắp Hết Hạn

### Task: #141

**Route:** `/tenant/inventory/expiry-alerts`
**Access:** WAREHOUSE, MANAGER, TENANT_ADMIN

**File:** `frontend/src/tenant/pages/inventory/ExpiryAlerts.jsx`

```jsx
export default function ExpiryAlerts() {
  const [daysAhead, setDaysAhead] = useState(90);
  const [warehouseId, setWarehouseId] = useState(null);
  const { data, loading, fetch } = useApi(inventoryApi.expiryAlerts);

  useEffect(() => { fetch({ daysAhead, warehouseId }); }, [daysAhead, warehouseId]);

  const getUrgencyColor = (days) => {
    if (days <= 30) return 'red';
    if (days <= 60) return 'orange';
    return 'gold';
  };

  const columns = [
    { title: 'Sản phẩm', dataIndex: ['product', 'name'],
      render: (v, r) => <><strong>{v}</strong><br /><Text type="secondary">{r.product.sku}</Text></> },
    { title: 'Kho', dataIndex: ['warehouse', 'name'] },
    { title: 'Số lô', dataIndex: 'batchNumber', render: (v) => v ?? <Text type="secondary">—</Text> },
    {
      title: 'Hạn sử dụng',
      dataIndex: 'expiryDate',
      render: (v, r) => {
        const days = Math.ceil((new Date(v) - new Date()) / 86400000);
        return (
          <Space direction="vertical" size={0}>
            <Text>{dayjs(v).format('DD/MM/YYYY')}</Text>
            <Tag color={getUrgencyColor(days)}>
              {days <= 0 ? 'ĐÃ HẾT HẠN' : `Còn ${days} ngày`}
            </Tag>
          </Space>
        );
      },
      sorter: (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate),
    },
    { title: 'Tồn kho', dataIndex: 'remainingQty',
      render: (v) => <Text strong>{v.toLocaleString('vi-VN')}</Text> },
    { title: 'Giá trị', dataIndex: 'costPerUnit',
      render: (v, r) => `${(v * r.remainingQty).toLocaleString('vi-VN')}₫` },
  ];

  return (
    <div>
      <PageHeader
        title="Hàng sắp hết hạn sử dụng"
        extra={
          <Space>
            <Select value={daysAhead} onChange={setDaysAhead}
              options={[
                { value: 30,  label: 'Trong 30 ngày' },
                { value: 60,  label: 'Trong 60 ngày' },
                { value: 90,  label: 'Trong 90 ngày' },
                { value: 180, label: 'Trong 180 ngày' },
              ]}
            />
            <WarehouseSelect allowClear value={warehouseId} onChange={setWarehouseId} />
          </Space>
        }
      />

      {/* Summary cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic title="Đã hết hạn" value={data?.filter(d => new Date(d.expiryDate) < new Date()).length ?? 0}
              valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Hết hạn trong 30 ngày" suffix="lô"
              value={data?.filter(d => {
                const days = (new Date(d.expiryDate) - new Date()) / 86400000;
                return days > 0 && days <= 30;
              }).length ?? 0}
              valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Tổng giá trị sắp hết hạn" suffix="₫"
              value={data?.reduce((s, d) => s + d.remainingQty * d.costPerUnit, 0) ?? 0}
              formatter={(v) => v.toLocaleString('vi-VN')} />
          </Card>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        rowClassName={(r) => new Date(r.expiryDate) < new Date() ? 'row-expired' : ''}
        pagination={{ pageSize: 20 }}
      />
    </div>
  );
}
```

**CSS** (trong `index.css`):
```css
.row-expired { background-color: #fff1f0; }
.row-expired td { color: #cf1322; }
```

---

## 12.3 Nhập Serial trong Phiếu Nhập Kho

### Task: #144

**File:** `frontend/src/tenant/components/SerialScanInput.jsx`

Khi sản phẩm có `trackSerial = true`, thay thế số lượng bằng danh sách serial:

```jsx
export function SerialScanInput({ quantity, value = [], onChange }) {
  const [input, setInput] = useState('');
  const inputRef = useRef();

  const addSerial = (sn) => {
    const trimmed = sn.trim().toUpperCase();
    if (!trimmed) return;
    if (value.includes(trimmed)) {
      message.warning(`Serial ${trimmed} đã được nhập`);
      return;
    }
    onChange([...value, trimmed]);
    setInput('');
    inputRef.current?.focus();
  };

  // Enter hoặc Tab để xác nhận serial
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      addSerial(input);
    }
  };

  const removeSerial = (sn) => onChange(value.filter(s => s !== sn));

  const isComplete = value.length === quantity;

  return (
    <div>
      <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
        <Input
          ref={inputRef}
          placeholder="Nhập Serial hoặc scan mã vạch, Enter để xác nhận"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isComplete}
          prefix={<BarcodeOutlined />}
          suffix={
            <Text type={isComplete ? 'success' : 'secondary'}>
              {value.length}/{quantity}
            </Text>
          }
        />
        <Button onClick={() => addSerial(input)} disabled={isComplete}>Thêm</Button>
      </Space.Compact>

      {/* Danh sách serial đã nhập */}
      <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: 6, padding: 8 }}>
        {value.length === 0
          ? <Text type="secondary">Chưa có serial nào</Text>
          : value.map((sn, i) => (
              <Tag
                key={sn}
                closable
                onClose={() => removeSerial(sn)}
                style={{ marginBottom: 4 }}
                color={i < quantity ? 'blue' : 'red'}
              >
                {sn}
              </Tag>
            ))
        }
      </div>

      {!isComplete && value.length > 0 && (
        <Alert
          type="warning"
          message={`Còn thiếu ${quantity - value.length} serial`}
          style={{ marginTop: 8 }}
          showIcon
        />
      )}
      {isComplete && (
        <Alert type="success" message="Đã nhập đủ serial" style={{ marginTop: 8 }} showIcon />
      )}
    </div>
  );
}
```

**Tích hợp vào StockReceipt:**

```jsx
// Trong StockReceiptItemRow — khi product.trackSerial = true
{product?.trackSerial && (
  <Col span={24} style={{ paddingTop: 8, paddingLeft: 16 }}>
    <Form.Item label={`Serial numbers (${item.quantity} cái)`}>
      <SerialScanInput
        quantity={item.quantity ?? 0}
        value={item.serialNumbers ?? []}
        onChange={sns => onChange({ ...item, serialNumbers: sns })}
      />
    </Form.Item>
  </Col>
)}
```

---

## 12.4 Tra Cứu Bảo Hành

### Task: #145

**Route:** `/tenant/serial/warranty-lookup`
**Access:** All roles

**File:** `frontend/src/tenant/pages/serial/WarrantyLookup.jsx`

```jsx
export default function WarrantyLookup() {
  const [serial, setSerial] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLookup = async () => {
    if (!serial.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await serialApi.warrantyLookup(serial.trim());
      setResult(res);
    } catch (e) {
      setError(e.response?.status === 404 ? 'Không tìm thấy serial number này.' : 'Lỗi hệ thống.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <PageHeader title="Tra cứu bảo hành" />

      {/* Search bar */}
      <Input.Search
        size="large"
        placeholder="Nhập Serial Number hoặc IMEI..."
        enterButton={<><BarcodeOutlined /> Tra cứu</>}
        value={serial}
        onChange={e => setSerial(e.target.value)}
        onSearch={handleLookup}
        loading={loading}
        allowClear
      />

      {error && <Alert type="error" message={error} style={{ marginTop: 16 }} showIcon />}

      {result && (
        <Card style={{ marginTop: 24 }}>
          {/* Header */}
          <Row align="middle" gutter={16} style={{ marginBottom: 16 }}>
            <Col>
              <Avatar size={64} icon={<MobileOutlined />} style={{ background: '#1677ff' }} />
            </Col>
            <Col flex={1}>
              <Title level={4} style={{ margin: 0 }}>{result.product.name}</Title>
              <Text type="secondary">SKU: {result.product.sku}</Text>
            </Col>
            <Col>
              <Tag
                color={result.status === 'SOLD' ? 'blue' : result.status === 'IN_STOCK' ? 'green' : 'orange'}
                style={{ fontSize: 14, padding: '4px 12px' }}
              >
                {
                  { IN_STOCK: 'Còn trong kho', SOLD: 'Đã bán', RETURNED: 'Đã trả lại', DEFECTIVE: 'Hàng lỗi' }
                  [result.status]
                }
              </Tag>
            </Col>
          </Row>

          <Divider />

          {/* Detail info */}
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Serial Number" span={2}>
              <Text strong copyable>{result.serialNumber}</Text>
            </Descriptions.Item>
            {result.imei && (
              <Descriptions.Item label="IMEI" span={2}>
                <Text copyable>{result.imei}</Text>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Ngày bán">
              {result.purchasedAt ? dayjs(result.purchasedAt).format('DD/MM/YYYY') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Khách hàng">
              {result.customer?.name ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Bảo hành đến">
              {result.warrantyExpiry
                ? <Text strong>{dayjs(result.warrantyExpiry).format('DD/MM/YYYY')}</Text>
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Còn lại">
              {result.warrantyDaysRemaining != null
                ? (
                    <Tag color={result.warrantyDaysRemaining > 30 ? 'green' : result.warrantyDaysRemaining > 0 ? 'orange' : 'red'}>
                      {result.warrantyDaysRemaining <= 0
                        ? 'Hết bảo hành'
                        : `${result.warrantyDaysRemaining} ngày`}
                    </Tag>
                  )
                : '—'}
            </Descriptions.Item>
          </Descriptions>

          {/* Warranty progress bar */}
          {result.purchasedAt && result.warrantyExpiry && (
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Thời gian bảo hành</Text>
              <Progress
                percent={Math.min(100, Math.round(
                  (1 - result.warrantyDaysRemaining / Math.ceil(
                    (new Date(result.warrantyExpiry) - new Date(result.purchasedAt)) / 86400000
                  )) * 100
                ))}
                status={result.warrantyDaysRemaining <= 0 ? 'exception' : 'active'}
                format={() =>
                  result.warrantyDaysRemaining <= 0
                    ? 'Hết hạn'
                    : `Còn ${result.warrantyDaysRemaining} ngày`
                }
              />
            </div>
          )}

          {/* Repair history */}
          {result.repairHistory?.length > 0 && (
            <>
              <Divider>Lịch sử sửa chữa</Divider>
              <Timeline
                items={result.repairHistory.map(r => ({
                  color: 'blue',
                  children: (
                    <>
                      <Text strong>{dayjs(r.date).format('DD/MM/YYYY')}</Text>{' — '}
                      {r.description}
                    </>
                  ),
                }))}
              />
            </>
          )}
        </Card>
      )}
    </div>
  );
}
```

---

## 12.5 Danh Sách Serial Theo Sản Phẩm

### Task: #144 (bổ sung)

**Location:** Tab "Serial numbers" trong trang Product Detail

```jsx
// Trong /products/:id — thêm Tab
<Tabs.TabPane tab="Serial Numbers" key="serials">
  <SerialListTab productId={id} />
</Tabs.TabPane>

function SerialListTab({ productId }) {
  const { data, loading, fetch } = usePagination(serialApi.listByProduct);
  useEffect(() => { fetch({ productId }); }, [productId]);

  const columns = [
    { title: 'Serial', dataIndex: 'serialNumber', render: (v) => <Text copyable>{v}</Text> },
    { title: 'IMEI', dataIndex: 'imei' },
    { title: 'Trạng thái', dataIndex: 'status',
      render: (v) => {
        const map = { IN_STOCK: ['green', 'Trong kho'], SOLD: ['blue', 'Đã bán'],
                      RETURNED: ['orange', 'Trả lại'], DEFECTIVE: ['red', 'Hàng lỗi'] };
        return <Tag color={map[v][0]}>{map[v][1]}</Tag>;
      }
    },
    { title: 'Khách hàng', dataIndex: ['customer', 'name'], render: (v) => v ?? '—' },
    { title: 'Ngày bán', dataIndex: 'purchasedAt',
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '—' },
    { title: 'BH đến', dataIndex: 'warrantyExpiry',
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '—' },
  ];

  return <DataTable columns={columns} dataSource={data} loading={loading} />;
}
```

---

## API additions — `tenant.api.js`

```javascript
export const inventoryApi = {
  // ... existing methods ...
  expiryAlerts: (params) => api.get('/tenant/inventory/expiry-alerts', { params }),
};

export const serialApi = {
  warrantyLookup: (serial) => api.get('/tenant/serial/warranty-lookup', { params: { serial } }),
  listByProduct:  (params) => api.get(`/tenant/serial/${params.productId}`, { params }),
};
```

---

## Navigation & Menu additions

```jsx
// TenantLayout.jsx — thêm vào menu Kho hàng
{
  key: 'inventory',
  label: 'Kho hàng',
  children: [
    // ... existing items ...
    { key: 'expiry-alerts', label: 'Hàng sắp hết HSD', path: '/inventory/expiry-alerts' },
  ]
}

// Menu Tiện ích / Tra cứu
{
  key: 'tools',
  label: 'Tiện ích',
  icon: <ToolOutlined />,
  children: [
    { key: 'warranty-lookup', label: 'Tra cứu bảo hành', path: '/serial/warranty-lookup' },
  ]
}
```

---

## Shared Components Summary

| Component | File | Mô tả |
|-----------|------|-------|
| `<BatchInputTable />` | `components/BatchInputTable.jsx` | Mở rộng item row với Số lô + HSD |
| `<SerialScanInput />` | `components/SerialScanInput.jsx` | Scan/nhập serial với validation |
| `<ExpiryUrgencyTag />` | inline trong ExpiryAlerts | Tag màu theo số ngày còn lại |
| `<WarrantyProgress />` | inline trong WarrantyLookup | Progress bar thời gian bảo hành |

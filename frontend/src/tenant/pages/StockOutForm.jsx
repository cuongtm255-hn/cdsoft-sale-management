import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, Card, Col, Divider, Form, Input, InputNumber,
  Row, Select, Space, Tooltip, Typography,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined, WarningOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
import { useApi } from '@shared/hooks/useApi';
import { inventoryApi, warehousesApi, productsApi } from '@api/tenant.api';

const ISSUE_TYPE_OPTIONS = [
  { label: 'Xuất bán (theo đơn)', value: 'SALE' },
  { label: 'Xuất nội bộ', value: 'INTERNAL' },
  { label: 'Hỏng / Hủy', value: 'DAMAGED' },
];

export default function StockOutForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [form] = Form.useForm();
  const [warehouses, setWarehouses] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [unitOptions, setUnitOptions] = useState({});
  const [productMap, setProductMap] = useState({});
  const [stockMap, setStockMap] = useState({});

  const items = Form.useWatch('items', form) ?? [];
  const warehouseId = Form.useWatch('warehouseId', form);
  const issueType = Form.useWatch('issueType', form);

  const loadProducts = (search = '') => {
    productsApi.list({ search, limit: 50, isActive: true }).then((res) => {
      const list = res.data?.data?.data ?? res.data?.data ?? [];
      setProductOptions(list.map((p) => ({ label: `${p.sku} — ${p.name}`, value: p.id })));
      const map = {};
      list.forEach((p) => { map[p.id] = p; });
      setProductMap((prev) => ({ ...prev, ...map }));
    });
  };

  useEffect(() => {
    warehousesApi.list().then((res) => {
      const list = res.data?.data ?? res.data ?? [];
      setWarehouses(list.map((w) => ({ label: w.name, value: w.id })));
    });
    loadProducts();
  }, []);

  useEffect(() => { loadProducts(productSearch); }, [productSearch]);

  // Load existing issue when editing
  useEffect(() => {
    if (!isEditing) return;
    inventoryApi.getIssue(id).then((res) => {
      const issue = res.data?.data ?? res.data;
      form.setFieldsValue({
        warehouseId: issue.warehouseId,
        issueType: issue.issueType,
        orderId: issue.orderId,
        notes: issue.notes,
        items: (issue.items ?? []).map((i) => ({
          productId: i.productId,
          unitId: i.unitId ?? null,
          quantity: Number(i.quantity),
        })),
      });
      // Pre-load units for each item
      (issue.items ?? []).forEach((item, index) => {
        handleProductSelect(item.productId, index, issue.warehouseId);
      });
    });
  }, [id]);

  const handleProductSelect = async (productId, index, overrideWarehouseId) => {
    let product = productMap[productId];
    if (!product?.units) {
      const res = await productsApi.get(productId);
      product = res.data?.data ?? res.data;
      setProductMap((prev) => ({ ...prev, [productId]: product }));
    }

    const baseOpt = { label: product.baseUnit || 'Đơn vị cơ bản', value: null, convRate: 1 };
    const conversionOpts = (product.units ?? [])
      .filter((u) => !u.isBase)
      .map((u) => ({ label: `${u.name} (×${Number(u.conversionRate)})`, value: u.id, convRate: Number(u.conversionRate) }));
    setUnitOptions((prev) => ({ ...prev, [index]: [baseOpt, ...conversionOpts] }));

    const wid = overrideWarehouseId ?? warehouseId;
    if (wid) {
      inventoryApi.productStock(productId, wid).then((res) => {
        const qty = res.data?.data?.quantity ?? res.data?.quantity ?? 0;
        setStockMap((prev) => ({ ...prev, [`${index}_${productId}`]: qty }));
      });
    }

    if (!overrideWarehouseId) {
      const currentItems = form.getFieldValue('items') ?? [];
      currentItems[index] = { ...currentItems[index], productId, unitId: null };
      form.setFieldValue('items', currentItems);
    }
  };

  const buildPayload = (values) => ({
    warehouseId: values.warehouseId,
    issueType: values.issueType,
    orderId: values.orderId,
    notes: values.notes,
    items: values.items.map((i) => ({
      productId: i.productId,
      ...(i.unitId ? { unitId: i.unitId } : {}),
      quantity: i.quantity,
    })),
  });

  const { execute: saveDraft, loading: savingDraft } = useApi(
    (payload) => isEditing ? inventoryApi.updateIssue(id, payload) : inventoryApi.createIssue(payload),
    {
      successMessage: 'Phiếu xuất đã lưu nháp',
      onSuccess: (r) => {
        const issueId = r?.data?.id ?? r?.id ?? id;
        navigate(`/tenant/inventory/issues/${issueId}`);
      },
    },
  );

  const { execute: confirmAndSave, loading: confirming } = useApi(
    async (payload) => {
      let issueId = id;
      if (!isEditing) {
        const created = await inventoryApi.createIssue(payload);
        issueId = created.data?.data?.id ?? created.data?.id;
      } else {
        await inventoryApi.updateIssue(id, payload);
      }
      return inventoryApi.confirmIssue(issueId);
    },
    {
      successMessage: 'Xuất kho thành công',
      onSuccess: () => navigate('/tenant/inventory/issues'),
    },
  );

  const handleSaveDraft = () => form.validateFields().then((v) => saveDraft(buildPayload(v)));
  const handleConfirm = () => form.validateFields().then((v) => confirmAndSave(buildPayload(v)));

  const loading = savingDraft || confirming;

  return (
    <div>
      <PageHeader
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate(isEditing ? `/tenant/inventory/issues/${id}` : '/tenant/inventory/issues')} />
            {isEditing ? 'Chỉnh sửa phiếu xuất kho' : 'Phiếu xuất kho mới'}
          </Space>
        }
      />

      <Card>
        <Form form={form} layout="vertical" initialValues={{ issueType: 'INTERNAL', items: [{}] }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="warehouseId" label="Kho xuất" rules={[{ required: true }]}>
                <Select options={warehouses} placeholder="Chọn kho" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="issueType" label="Loại xuất" rules={[{ required: true }]}>
                <Select options={ISSUE_TYPE_OPTIONS} />
              </Form.Item>
            </Col>
            {issueType === 'SALE' && (
              <Col span={8}>
                <Form.Item name="orderId" label="Mã đơn hàng">
                  <Input placeholder="SO-2026-0001" />
                </Form.Item>
              </Col>
            )}
            <Col span={24}>
              <Form.Item name="notes" label="Ghi chú">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>Danh sách hàng xuất</Divider>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 160px 100px 120px 40px', gap: 8, marginBottom: 8, fontWeight: 600 }}>
                  <span>Sản phẩm</span><span>Đơn vị</span><span>Số lượng</span><span>Tồn kho</span><span />
                </div>

                {fields.map(({ key, name }) => {
                  const item = items[name] ?? {};
                  const stockKey = `${name}_${item.productId}`;
                  const available = stockMap[stockKey];
                  const unitOpts = unitOptions[name] ?? [];
                  const selectedUnit = unitOpts.find((u) => u.value === (item.unitId ?? null));
                  const convRate = selectedUnit?.convRate ?? 1;
                  const qtyInBase = Number(item.quantity ?? 0) * convRate;
                  const insufficient = available !== undefined && qtyInBase > available;

                  return (
                    <div key={key} style={{ display: 'grid', gridTemplateColumns: '2fr 160px 100px 120px 40px', gap: 8, marginBottom: 8, alignItems: 'start' }}>
                      <Form.Item name={[name, 'productId']} rules={[{ required: true }]} style={{ margin: 0 }}>
                        <Select
                          showSearch options={productOptions} onSearch={setProductSearch}
                          filterOption={false} placeholder="Tìm sản phẩm"
                          onChange={(v) => handleProductSelect(v, name)}
                        />
                      </Form.Item>
                      <Form.Item name={[name, 'unitId']} style={{ margin: 0 }}>
                        <Select options={unitOpts} placeholder="ĐVT" />
                      </Form.Item>
                      <Form.Item name={[name, 'quantity']} rules={[{ required: true }]} style={{ margin: 0 }}>
                        <InputNumber
                          min={0.0001} style={{ width: '100%', borderColor: insufficient ? '#ff4d4f' : undefined }}
                          placeholder="SL"
                        />
                      </Form.Item>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: 4 }}>
                        {available !== undefined ? (
                          <>
                            <Typography.Text style={{ color: insufficient ? '#cf1322' : undefined }}>
                              {Number(available).toLocaleString('vi-VN')}
                            </Typography.Text>
                            {insufficient && (
                              <Tooltip title={convRate > 1 ? `Cần ${qtyInBase.toLocaleString('vi-VN')} đvcs, tồn ${Number(available).toLocaleString('vi-VN')}` : 'Không đủ hàng'}>
                                <WarningOutlined style={{ color: '#ff4d4f' }} />
                              </Tooltip>
                            )}
                          </>
                        ) : '—'}
                      </div>
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} style={{ marginTop: 4 }} />
                    </div>
                  );
                })}

                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({})}>
                  Thêm sản phẩm
                </Button>
              </>
            )}
          </Form.List>

          <Divider />
          <Space>
            <Button onClick={handleSaveDraft} loading={savingDraft} disabled={loading || items.length === 0}>
              Lưu nháp
            </Button>
            <Button type="primary" onClick={handleConfirm} loading={confirming} disabled={loading || items.length === 0}>
              Xác nhận xuất kho
            </Button>
            <Button onClick={() => navigate(-1)}>Huỷ</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}

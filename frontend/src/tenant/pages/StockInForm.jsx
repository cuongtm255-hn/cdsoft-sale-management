import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Card, Col, DatePicker, Divider, Form, Input, InputNumber,
  Row, Select, Space, Spin, Typography,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import { useApi } from '@shared/hooks/useApi';
import { inventoryApi, warehousesApi, suppliersApi, productsApi } from '@api/tenant.api';

function fmtVND(v) {
  return Number(v ?? 0).toLocaleString('vi-VN') + ' ₫';
}

export default function StockInForm() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [productMap, setProductMap] = useState({});
  const [productSearch, setProductSearch] = useState('');
  const [productOptions, setProductOptions] = useState([]);
  const [unitOptions, setUnitOptions] = useState({});
  const items = Form.useWatch('items', form) ?? [];

  const loadProducts = (search = '') => {
    productsApi.list({ search, limit: 50, isActive: true }).then((res) => {
      const list = res.data?.data?.data ?? res.data?.data ?? [];
      const opts = list.map((p) => ({ label: `${p.sku} — ${p.name}`, value: p.id, product: p }));
      setProductOptions(opts);
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
    suppliersApi.list({ limit: 100 }).then((res) => {
      const list = res.data?.data?.data ?? res.data?.data ?? [];
      setSuppliers(list.map((s) => ({ label: `${s.code} — ${s.name}`, value: s.id })));
    });
    loadProducts();
  }, []);

  useEffect(() => {
    loadProducts(productSearch);
  }, [productSearch]);

  const handleProductSelect = async (productId, index) => {
    // Fetch full product to get units + prices (list endpoint doesn't include units)
    let product = productMap[productId];
    if (!product?.units) {
      const res = await productsApi.get(productId);
      product = res.data?.data ?? res.data;
      setProductMap((prev) => ({ ...prev, [productId]: product }));
    }

    // Unit options: base unit (null = no conversion) + conversion units
    const baseOpt = { label: product.baseUnit || 'Đơn vị cơ bản', value: null };
    const conversionOpts = (product.units ?? [])
      .filter((u) => !u.isBase)
      .map((u) => ({ label: `${u.name} (×${Number(u.conversionRate)})`, value: u.id }));
    setUnitOptions((prev) => ({ ...prev, [index]: [baseOpt, ...conversionOpts] }));

    // Suggest COST price as default unit cost
    const costPrice = (product.prices ?? []).find((p) => p.priceType === 'COST');

    const currentItems = form.getFieldValue('items') ?? [];
    currentItems[index] = {
      ...currentItems[index],
      productId,
      unitId: null,
      ...(costPrice ? { unitCost: Number(costPrice.amount) } : {}),
    };
    form.setFieldValue('items', currentItems);
  };

  const totalAmount = items.reduce((sum, item) => {
    return sum + (Number(item?.quantity ?? 0) * Number(item?.unitCost ?? 0));
  }, 0);

  const { execute: saveDraft, loading: savingDraft } = useApi(inventoryApi.stockIn, {
    successMessage: 'Phiếu nhập đã được lưu nháp',
    onSuccess: (r) => navigate(`/tenant/inventory/receipts/${r.id}`),
  });

  const { execute: confirmAndSave, loading: confirming } = useApi(
    async (data) => {
      const receipt = await inventoryApi.stockIn(data);
      const id = receipt.data?.data?.id ?? receipt.data?.id;
      return inventoryApi.confirmReceipt(id, {});
    },
    {
      successMessage: 'Nhập kho thành công',
      onSuccess: () => navigate('/tenant/inventory/receipts'),
    },
  );

  const handleSaveDraft = () => {
    form.validateFields().then((values) => saveDraft(buildPayload(values)));
  };

  const handleConfirm = () => {
    form.validateFields().then((values) => confirmAndSave(buildPayload(values)));
  };

  function buildPayload(values) {
    const { expectedDate, items: rawItems, ...rest } = values;
    return {
      ...rest,
      expectedDate: expectedDate ? dayjs(expectedDate).format('YYYY-MM-DD') : undefined,
      items: rawItems.map((i) => ({
        productId: i.productId,
        ...(i.unitId ? { unitId: i.unitId } : {}),
        quantity: i.quantity,
        unitCost: i.unitCost,
        batchNumber: i.batchNumber,
        expiryDate: i.expiryDate ? dayjs(i.expiryDate).format('YYYY-MM-DD') : undefined,
      })),
    };
  }

  const loading = savingDraft || confirming;

  return (
    <div>
      <PageHeader
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/tenant/inventory')} />
            Phiếu nhập kho mới
          </Space>
        }
      />

      <Card>
        <Form form={form} layout="vertical" initialValues={{ items: [{}] }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="supplierId" label="Nhà cung cấp">
                <Select
                  options={suppliers}
                  showSearch
                  filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
                  placeholder="Tìm nhà cung cấp"
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="warehouseId" label="Kho nhập" rules={[{ required: true }]}>
                <Select options={warehouses} placeholder="Chọn kho" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="expectedDate" label="Ngày dự kiến">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="refCode" label="Mã tham chiếu">
                <Input placeholder="PO-2026-0001" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label="Ghi chú">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>Danh sách hàng nhập</Divider>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 120px 100px 140px 140px 60px', gap: 8, marginBottom: 8, fontWeight: 600 }}>
                  <span>Sản phẩm</span><span>Đơn vị</span><span>Số lượng</span><span>Đơn giá</span><span>Thành tiền</span><span />
                </div>

                {fields.map(({ key, name }) => {
                  const item = items[name] ?? {};
                  const lineTotal = Number(item.quantity ?? 0) * Number(item.unitCost ?? 0);
                  return (
                    <div key={key} style={{ display: 'grid', gridTemplateColumns: '2fr 120px 100px 140px 140px 60px', gap: 8, marginBottom: 8, alignItems: 'start' }}>
                      <Form.Item name={[name, 'productId']} rules={[{ required: true }]} style={{ margin: 0 }}>
                        <Select
                          showSearch
                          options={productOptions}
                          onSearch={setProductSearch}
                          filterOption={false}
                          placeholder="Tìm SKU/Tên sản phẩm"
                          onChange={(v) => handleProductSelect(v, name)}
                        />
                      </Form.Item>
                      <Form.Item name={[name, 'unitId']} style={{ margin: 0 }}>
                        <Select options={unitOptions[name] ?? []} placeholder="ĐVT" />
                      </Form.Item>
                      <Form.Item name={[name, 'quantity']} rules={[{ required: true }]} style={{ margin: 0 }}>
                        <InputNumber min={0.0001} style={{ width: '100%' }} placeholder="SL" />
                      </Form.Item>
                      <Form.Item name={[name, 'unitCost']} rules={[{ required: true }]} style={{ margin: 0 }}>
                        <InputNumber
                          min={0}
                          style={{ width: '100%' }}
                          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={(v) => v.replace(/,/g, '')}
                          placeholder="Đơn giá"
                        />
                      </Form.Item>
                      <div style={{ display: 'flex', alignItems: 'center', paddingTop: 4 }}>
                        <Typography.Text style={{ color: '#1890ff' }}>{fmtVND(lineTotal)}</Typography.Text>
                      </div>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                        style={{ marginTop: 4 }}
                      />
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
          <Row justify="end">
            <Typography.Title level={5} style={{ margin: 0 }}>
              Tổng cộng: <span style={{ color: '#1890ff' }}>{fmtVND(totalAmount)}</span>
            </Typography.Title>
          </Row>
          <Divider />

          <Space>
            <Button onClick={handleSaveDraft} loading={savingDraft} disabled={loading}>
              Lưu nháp
            </Button>
            <Button
              type="primary"
              onClick={handleConfirm}
              loading={confirming}
              disabled={loading || items.length === 0}
            >
              Xác nhận nhập kho
            </Button>
            <Button onClick={() => navigate(-1)}>Huỷ</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}

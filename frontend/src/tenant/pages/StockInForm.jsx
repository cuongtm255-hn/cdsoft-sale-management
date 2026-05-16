import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, Card, Col, DatePicker, Divider, Form, Input, InputNumber,
  Row, Select, Space, Spin, Typography,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import PageHeader from '@shared/components/PageHeader';
import { formatGroupedInput, parseGroupedInput } from '@shared/utils/numberInput';
import { useApi } from '@shared/hooks/useApi';
import { inventoryApi, warehousesApi, suppliersApi, productsApi, purchaseOrdersApi } from '@api/tenant.api';

function fmtVND(v) {
  return Number(v ?? 0).toLocaleString('vi-VN') + ' ₫';
}

export default function StockInForm() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [form] = Form.useForm();
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [productMap, setProductMap] = useState({});
  const [productSearch, setProductSearch] = useState('');
  const [productOptions, setProductOptions] = useState([]);
  const [unitOptions, setUnitOptions] = useState({});
  const [purchaseOrderOptions, setPurchaseOrderOptions] = useState([]);
  const [purchaseOrderSearch, setPurchaseOrderSearch] = useState('');
  const [purchaseOrderLoading, setPurchaseOrderLoading] = useState(false);
  const items = Form.useWatch('items', form) ?? [];
  const warehouseId = Form.useWatch('warehouseId', form);

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

  useEffect(() => { loadProducts(productSearch); }, [productSearch]);

  useEffect(() => {
    if (!isEditing) return;
    inventoryApi.getReceipt(id).then((res) => {
      const r = res.data?.data ?? res.data;
      form.setFieldsValue({
        supplierId: r.supplierId,
        purchaseOrderId: r.purchaseOrderId,
        warehouseId: r.warehouseId,
        expectedDate: r.expectedDate ? dayjs(r.expectedDate) : undefined,
        refCode: r.refCode,
        notes: r.notes,
        items: (r.items ?? []).map((i) => ({
          productId: i.productId,
          unitId: i.unitId ?? null,
          quantity: Number(i.quantity),
          unitCost: Number(i.unitCost),
          batchNumber: i.batchNumber,
          expiryDate: i.expiryDate ? dayjs(i.expiryDate) : undefined,
        })),
      });
      if (r.purchaseOrderId) {
        setPurchaseOrderOptions((prev) => {
          const exists = prev.some((option) => option.value === r.purchaseOrderId);
          if (exists) return prev;
          return [{
            label: `${r.purchaseOrderCode ?? r.refCode ?? r.purchaseOrderId}${r.supplierName ? ` â€” ${r.supplierName}` : ''}`,
            value: r.purchaseOrderId,
          }, ...prev];
        });
      }
      (r.items ?? []).forEach((item, index) => { handleProductSelect(item.productId, index); });
    });
  }, [id]);

  useEffect(() => {
    let ignore = false;
    setPurchaseOrderLoading(true);
    inventoryApi.getReceiptPurchaseOrders({
      receiptId: id,
      warehouseId,
      search: purchaseOrderSearch || undefined,
      limit: 50,
    })
      .then((res) => {
        if (ignore) return;
        const rows = res.data?.data?.data ?? res.data?.data ?? [];
        setPurchaseOrderOptions(rows.map((row) => ({
          label: `${row.code}${row.supplierName ? ` â€” ${row.supplierName}` : ''}`,
          value: row.id,
        })));
      })
      .finally(() => {
        if (!ignore) setPurchaseOrderLoading(false);
      });

    return () => { ignore = true; };
  }, [warehouseId, purchaseOrderSearch, id]);

  const applyPurchaseOrderItems = async (purchaseOrderId) => {
    if (!purchaseOrderId) return;

    const res = await purchaseOrdersApi.get(purchaseOrderId);
    const order = res.data?.data ?? res.data;
    const nextWarehouseId = order.warehouseId ?? form.getFieldValue('warehouseId');
    const nextItems = (order.items ?? []).map((item) => ({
      productId: item.productId,
      unitId: item.unitId ?? null,
      quantity: Number(item.quantity ?? 0),
      unitCost: Number(item.unitPrice ?? 0),
    }));

    setUnitOptions({});
    form.setFieldsValue({
      supplierId: order.supplierId ?? form.getFieldValue('supplierId'),
      warehouseId: nextWarehouseId,
      refCode: order.code ?? form.getFieldValue('refCode'),
      items: nextItems.length ? nextItems : [{}],
    });

    nextItems.forEach((item, index) => {
      handleProductSelect(item.productId, index);
    });
  };

  const handleProductSelect = async (productId, index) => {
    let product = productMap[productId];
    if (!product?.units) {
      const res = await productsApi.get(productId);
      product = res.data?.data ?? res.data;
      setProductMap((prev) => ({ ...prev, [productId]: product }));
    }

    const baseOpt = { label: product.baseUnit || t('productForm.baseUnit'), value: null };
    const conversionOpts = (product.units ?? [])
      .filter((u) => !u.isBase)
      .map((u) => ({ label: `${u.name} (×${Number(u.conversionRate)})`, value: u.id }));
    setUnitOptions((prev) => ({ ...prev, [index]: [baseOpt, ...conversionOpts] }));

    const costPrice = (product.prices ?? []).find((p) => p.priceType === 'COST');

    const currentItems = form.getFieldValue('items') ?? [];
    currentItems[index] = {
      ...currentItems[index],
      productId,
      unitId: null,
      ...(currentItems[index]?.unitCost == null && costPrice ? { unitCost: Number(costPrice.amount) } : {}),
    };
    form.setFieldValue('items', currentItems);
  };

  const totalAmount = items.reduce((sum, item) => {
    return sum + (Number(item?.quantity ?? 0) * Number(item?.unitCost ?? 0));
  }, 0);

  const { execute: saveDraft, loading: savingDraft } = useApi(
    (payload) => isEditing ? inventoryApi.updateReceipt(id, payload) : inventoryApi.stockIn(payload),
    {
      successMessage: t('inventoryPage.saveDraftSuccess'),
      onSuccess: (r) => {
        const receiptId = r?.data?.id ?? r?.id ?? id;
        navigate(`/tenant/inventory/receipts/${receiptId}`);
      },
    },
  );

  const { execute: confirmAndSave, loading: confirming } = useApi(
    async (payload) => {
      let receiptId = id;
      if (!isEditing) {
        const receipt = await inventoryApi.stockIn(payload);
        receiptId = receipt.data?.data?.id ?? receipt.data?.id;
      } else {
        await inventoryApi.updateReceipt(id, payload);
      }
      return inventoryApi.confirmReceipt(receiptId, {});
    },
    {
      successMessage: t('inventoryPage.stockInSuccess'),
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
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate(isEditing ? `/tenant/inventory/receipts/${id}` : '/tenant/inventory/receipts')} />
            {isEditing ? t('inventoryPage.editReceipt') : t('inventoryPage.newReceipt')}
          </Space>
        }
      />

      <Card>
        <Form form={form} layout="vertical" initialValues={{ items: [{}] }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="supplierId" label={t('inventoryPage.supplier')}>
                <Select
                  options={suppliers}
                  showSearch
                  filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
                  placeholder={t('inventoryPage.supplierSearch')}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="purchaseOrderId" label="Đơn mua">
                <Select
                  showSearch
                  filterOption={false}
                  options={purchaseOrderOptions}
                  loading={purchaseOrderLoading}
                  placeholder="PO-2026-0001"
                  onSearch={setPurchaseOrderSearch}
                  optionFilterProp="label"
                  onChange={applyPurchaseOrderItems}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="warehouseId" label={t('inventoryPage.warehouseIn')} rules={[{ required: true }]}>
                <Select
                  options={warehouses}
                  placeholder={t('inventoryPage.warehouseSelect')}
                  onChange={() => form.setFieldValue('purchaseOrderId', undefined)}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="expectedDate" label={t('inventoryPage.expectedDate')}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="refCode" label={t('inventoryPage.refCode')}>
                <Input placeholder="PO-2026-0001" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label={t('common.note')}>
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>{t('inventoryPage.stockInList')}</Divider>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 120px 100px 140px 140px 60px', gap: 8, marginBottom: 8, fontWeight: 600 }}>
                  <span>{t('inventory.product')}</span>
                  <span>{t('inventory.unit')}</span>
                  <span>{t('inventory.quantity')}</span>
                  <span>{t('inventory.unitCost')}</span>
                  <span>{t('inventory.total')}</span>
                  <span />
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
                          placeholder={t('inventoryPage.productSearch')}
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
                          formatter={formatGroupedInput}
                          parser={parseGroupedInput}
                          placeholder={t('inventory.unitCost')}
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
                  {t('inventoryPage.addProduct')}
                </Button>
              </>
            )}
          </Form.List>

          <Divider />
          <Row justify="end">
            <Typography.Title level={5} style={{ margin: 0 }}>
              {t('inventoryPage.totalSummary')}: <span style={{ color: '#1890ff' }}>{fmtVND(totalAmount)}</span>
            </Typography.Title>
          </Row>
          <Divider />

          <Space>
            <Button onClick={handleSaveDraft} loading={savingDraft} disabled={loading}>
              {t('common.saveDraft')}
            </Button>
            <Button
              type="primary"
              onClick={handleConfirm}
              loading={confirming}
              disabled={loading || items.length === 0}
            >
              {t('inventoryPage.confirmStockIn')}
            </Button>
            <Button onClick={() => navigate(-1)}>{t('common.cancel')}</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}

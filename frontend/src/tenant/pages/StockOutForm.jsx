import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, Card, Col, Divider, Form, Input, InputNumber,
  Row, Select, Space, Tooltip, Typography,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined, WarningOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PageHeader from '@shared/components/PageHeader';
import { useApi } from '@shared/hooks/useApi';
import { inventoryApi, warehousesApi, productsApi, salesOrdersApi } from '@api/tenant.api';

export default function StockOutForm() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [form] = Form.useForm();
  const [warehouses, setWarehouses] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [unitOptions, setUnitOptions] = useState({});
  const [productMap, setProductMap] = useState({});
  const [stockMap, setStockMap] = useState({});
  const [saleOrderOptions, setSaleOrderOptions] = useState([]);
  const [saleOrderSearch, setSaleOrderSearch] = useState('');
  const [saleOrderLoading, setSaleOrderLoading] = useState(false);

  const items = Form.useWatch('items', form) ?? [];
  const warehouseId = Form.useWatch('warehouseId', form);
  const issueType = Form.useWatch('issueType', form);

  const issueTypeOptions = [
    { label: t('inventory.issueTypeSale'), value: 'SALE' },
    { label: t('inventory.issueTypeInternal'), value: 'INTERNAL' },
    { label: t('inventory.issueTypeDamaged'), value: 'DAMAGED' },
  ];

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
      if (issue.issueType === 'SALE' && issue.orderId) {
        setSaleOrderOptions((prev) => {
          const exists = prev.some((option) => option.value === issue.orderId);
          if (exists) return prev;
          return [{
            label: `${issue.orderCode ?? issue.orderId}${issue.orderCustomerName ? ` â€” ${issue.orderCustomerName}` : ''}`,
            value: issue.orderId,
          }, ...prev];
        });
      }
      (issue.items ?? []).forEach((item, index) => {
        handleProductSelect(item.productId, index, issue.warehouseId);
      });
    });
  }, [id]);

  useEffect(() => {
    if (issueType !== 'SALE') {
      setSaleOrderOptions([]);
      setSaleOrderSearch('');
      form.setFieldValue('orderId', undefined);
      return;
    }

    let ignore = false;
    setSaleOrderLoading(true);
    inventoryApi.getIssueSaleOrders({
      issueId: id,
      warehouseId,
      search: saleOrderSearch || undefined,
      limit: 50,
    })
      .then((res) => {
        if (ignore) return;
        const rows = res.data?.data?.data ?? res.data?.data ?? [];
        setSaleOrderOptions(rows.map((row) => ({
          label: `${row.code}${row.customerName ? ` â€” ${row.customerName}` : ''}`,
          value: row.id,
        })));
      })
      .finally(() => {
        if (!ignore) setSaleOrderLoading(false);
      });

    return () => { ignore = true; };
  }, [issueType, warehouseId, saleOrderSearch, id]);

  const applySalesOrderItems = async (orderId) => {
    if (!orderId) return;

    const res = await salesOrdersApi.get(orderId);
    const order = res.data?.data ?? res.data;
    const nextWarehouseId = order.warehouseId ?? form.getFieldValue('warehouseId');
    const nextItems = (order.items ?? [])
      .map((item) => {
        const remainingQty = Math.max(Number(item.quantity ?? 0) - Number(item.issuedQty ?? 0), 0);
        const quantity = remainingQty > 0 ? remainingQty : Number(item.quantity ?? 0);
        return {
          productId: item.productId,
          unitId: item.unitId ?? null,
          quantity,
        };
      })
      .filter((item) => item.quantity > 0);

    setUnitOptions({});
    setStockMap({});
    form.setFieldsValue({
      warehouseId: nextWarehouseId,
      items: nextItems.length ? nextItems : [{}],
    });

    nextItems.forEach((item, index) => {
      handleProductSelect(item.productId, index, nextWarehouseId);
    });
  };

  const handleProductSelect = async (productId, index, overrideWarehouseId) => {
    let product = productMap[productId];
    if (!product?.units) {
      const res = await productsApi.get(productId);
      product = res.data?.data ?? res.data;
      setProductMap((prev) => ({ ...prev, [productId]: product }));
    }

    const baseOpt = { label: product.baseUnit || t('productForm.baseUnit'), value: null, convRate: 1 };
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
      successMessage: t('inventoryPage.saveDraftSuccess'),
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
      successMessage: t('inventoryPage.stockOutSuccess'),
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
            {isEditing ? t('inventoryPage.editIssue') : t('inventoryPage.newIssue')}
          </Space>
        }
      />

      <Card>
        <Form form={form} layout="vertical" initialValues={{ issueType: 'INTERNAL', items: [{}] }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="warehouseId" label={t('inventoryPage.warehouseOut')} rules={[{ required: true }]}>
                <Select
                  options={warehouses}
                  placeholder={t('inventoryPage.warehouseSelect')}
                  onChange={() => {
                    if (form.getFieldValue('issueType') === 'SALE') {
                      form.setFieldValue('orderId', undefined);
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="issueType" label={t('inventoryPage.issueTypeLabel')} rules={[{ required: true }]}>
                <Select options={issueTypeOptions} />
              </Form.Item>
            </Col>
            {issueType === 'SALE' && (
              <Col span={8}>
                <Form.Item name="orderId" label={t('inventoryPage.orderRef')}>
                  <Select
                    showSearch
                    filterOption={false}
                    options={saleOrderOptions}
                    loading={saleOrderLoading}
                    placeholder="SO-2026-0001"
                    onSearch={setSaleOrderSearch}
                    optionFilterProp="label"
                    onChange={applySalesOrderItems}
                    allowClear
                  />
                </Form.Item>
              </Col>
            )}
            <Col span={24}>
              <Form.Item name="notes" label={t('common.note')}>
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>{t('inventoryPage.productList')}</Divider>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 160px 100px 120px 40px', gap: 8, marginBottom: 8, fontWeight: 600 }}>
                  <span>{t('inventory.product')}</span>
                  <span>{t('inventory.unit')}</span>
                  <span>{t('inventory.quantity')}</span>
                  <span>{t('inventory.stockAvailable')}</span>
                  <span />
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
                          filterOption={false} placeholder={t('inventoryPage.productSearch')}
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
                              <Tooltip title={t('inventory.insufficientStock')}>
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
                  {t('inventoryPage.addProduct')}
                </Button>
              </>
            )}
          </Form.List>

          <Divider />
          <Space>
            <Button onClick={handleSaveDraft} loading={savingDraft} disabled={loading || items.length === 0}>
              {t('common.saveDraft')}
            </Button>
            <Button type="primary" onClick={handleConfirm} loading={confirming} disabled={loading || items.length === 0}>
              {t('inventoryPage.confirmStockOut')}
            </Button>
            <Button onClick={() => navigate(-1)}>{t('common.cancel')}</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Card, Col, DatePicker, Divider, Form, Input, InputNumber,
  Row, Select, Space,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import PageHeader from '@shared/components/PageHeader';
import { useApi } from '@shared/hooks/useApi';
import { inventoryApi, warehousesApi, productsApi } from '@api/tenant.api';

export default function TransferForm() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [warehouses, setWarehouses] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [unitOptions, setUnitOptions] = useState({});
  const [productMap, setProductMap] = useState({});

  const loadProducts = (search = '') => {
    productsApi.list({ search: search || undefined, limit: 100 }).then((res) => {
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

  const handleProductSelect = async (productId, index) => {
    let product = productMap[productId];
    if (!product?.units) {
      const res = await productsApi.get(productId);
      product = res.data?.data ?? res.data;
      setProductMap((prev) => ({ ...prev, [productId]: product }));
    }
    const baseOpt = { label: product.baseUnit || t('productForm.baseUnit'), value: null };
    const convOpts = (product.units ?? [])
      .filter((u) => !u.isBase)
      .map((u) => ({ label: `${u.name} (×${Number(u.conversionRate)})`, value: u.id }));
    setUnitOptions((prev) => ({ ...prev, [index]: [baseOpt, ...convOpts] }));
  };

  const { execute: submit, loading } = useApi(inventoryApi.createTransfer, {
    successMessage: t('inventoryPage.transferCreated'),
    onSuccess: () => navigate('/tenant/inventory/transfers'),
  });

  const handleSubmit = (values) => {
    const { expectedDate, items, ...rest } = values;
    submit({
      ...rest,
      expectedDate: expectedDate ? dayjs(expectedDate).format('YYYY-MM-DD') : undefined,
      items: items.map((i) => ({ productId: i.productId, unitId: i.unitId, quantity: i.quantity })),
    });
  };

  return (
    <div>
      <PageHeader
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/tenant/inventory/transfers')} />
            {t('inventoryPage.transferNew')}
          </Space>
        }
      />

      <Card>
        <Form form={form} layout="vertical" initialValues={{ items: [{}] }} onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="fromWarehouseId" label={t('inventoryPage.fromWarehouse')} rules={[{ required: true }]}>
                <Select options={warehouses} placeholder={t('inventoryPage.fromWarehouse')} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="toWarehouseId" label={t('inventoryPage.toWarehouse')} rules={[{ required: true }]}>
                <Select options={warehouses} placeholder={t('inventoryPage.toWarehouse')} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="expectedDate" label={t('inventoryPage.expectedDate')}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label={t('common.note')}>
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>{t('inventoryPage.productList')}</Divider>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 130px 100px 60px', gap: 8, marginBottom: 8, fontWeight: 600 }}>
            <span>{t('inventory.product')}</span><span>{t('inventory.unit')}</span><span>{t('inventory.quantity')}</span><span />
          </div>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <div key={key} style={{ display: 'grid', gridTemplateColumns: '2fr 130px 100px 60px', gap: 8, marginBottom: 8, alignItems: 'start' }}>
                    <Form.Item name={[name, 'productId']} rules={[{ required: true }]} style={{ margin: 0 }}>
                      <Select
                        showSearch
                        options={productOptions}
                        onSearch={(v) => loadProducts(v)}
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
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} style={{ marginTop: 4 }} />
                  </div>
                ))}
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({})}>
                  {t('inventoryPage.addProduct')}
                </Button>
              </>
            )}
          </Form.List>

          <Divider />
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {t('inventoryPage.createTransfer')}
            </Button>
            <Button onClick={() => navigate(-1)}>{t('common.cancel')}</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}

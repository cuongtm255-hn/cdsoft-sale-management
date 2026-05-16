import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Form, Input, InputNumber, Button, Card, Tabs, Space, Select,
  Switch, Divider, Row, Col, Spin, Typography,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PageHeader from '@shared/components/PageHeader';
import CompactNumberInput from '@shared/components/CompactNumberInput';
import { useApi } from '@shared/hooks/useApi';
import { useAuth } from '@auth/AuthContext';
import { productsApi, categoriesApi } from '@api/tenant.api';

const CAN_SEE_COST = ['TENANT_ADMIN', 'MANAGER', 'ACCOUNTANT'];

function CategoryTreeSelect({ value, onChange, categories, placeholder }) {
  const options = categories.map((c) => ({ label: c.name, value: c.id }));
  return (
    <Select
      value={value}
      onChange={onChange}
      options={options}
      allowClear
      showSearch
      filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
      placeholder={placeholder}
    />
  );
}

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tenantUser } = useAuth();
  const { t } = useTranslation();
  const isEditing = Boolean(id);

  const PRICE_TYPES = [
    { value: 'RETAIL', label: t('productForm.priceTypeRetail') },
    { value: 'WHOLESALE', label: t('productForm.priceTypeWholesale') },
    { value: 'AGENT', label: t('productForm.priceTypeAgent') },
    { value: 'VIP', label: t('productForm.priceTypeVIP') },
    { value: 'COST', label: t('productForm.priceTypeCost'), restricted: true },
  ];
  const canSeeCost = CAN_SEE_COST.includes(tenantUser?.role);

  const [form] = Form.useForm();
  const [loadingProduct, setLoadingProduct] = useState(isEditing);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('basic');

  const { execute: createProduct, loading: creating } = useApi(productsApi.create, {
    successMessage: t('productForm.createSuccess'),
    onSuccess: () => navigate(`/tenant/products`),
  });

  const { execute: updateProduct, loading: updating } = useApi(
    (data) => productsApi.update(id, data),
    {
      successMessage: t('productForm.updateSuccess'),
      onSuccess: () => navigate(`/tenant/products`),
    },
  );

  useEffect(() => {
    categoriesApi.flat().then((res) => {
      const cats = res.data?.data ?? res.data ?? [];
      setCategories(cats);
    });

    if (isEditing) {
      setLoadingProduct(true);
      productsApi.get(id).then((res) => {
        const p = res.data?.data ?? res.data;
        form.setFieldsValue({
          sku: p.sku,
          barcode: p.barcode,
          name: p.name,
          description: p.description,
          categoryId: p.categoryId,
          brand: p.brand,
          baseUnit: p.baseUnit,
          isActive: p.isActive,
          defaultWarehouseId: p.defaultWarehouseId,
          minStockLevel: p.minStockLevel,
          maxStockLevel: p.maxStockLevel,
          units: (p.units ?? []).map(({ name, conversionRate, barcode }) => ({
            name,
            conversionRate: Number(conversionRate),
            barcode,
          })),
          prices: (p.prices ?? []).map(({ priceType, amount, unitId, currency, effectiveFrom, effectiveTo }) => ({
            priceType,
            amount: Number(amount),
            unitId,
            currency,
            effectiveFrom,
            effectiveTo,
          })),
        });
      }).finally(() => setLoadingProduct(false));
    }
  }, [id]);

  const handleSubmit = (values) => {
    if (isEditing) {
      const { sku: _sku, ...updateData } = values;
      updateProduct(updateData);
    } else {
      createProduct(values);
    }
  };

  const priceTypeOptions = PRICE_TYPES.filter((t) => !t.restricted || canSeeCost);

  const tabItems = [
    {
      key: 'basic',
      label: t('productForm.basicInfo'),
      children: (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="sku" label="SKU" rules={[{ required: true, max: 100 }]}>
              <Input placeholder="PROD-001" disabled={isEditing} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="barcode" label={t('productForm.barcode')}>
              <Input placeholder="8934563012345" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="name" label={t('products.name')} rules={[{ required: true, min: 2, max: 255 }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="categoryId" label={t('products.category')}>
              <CategoryTreeSelect categories={categories} placeholder={t('productForm.categorySelect')} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="brand" label={t('productForm.brand')}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="description" label={t('productForm.description')}>
              <Input.TextArea rows={3} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="isActive" label={t('common.status')} valuePropName="checked" initialValue={true}>
              <Switch checkedChildren={t('productForm.selling')} unCheckedChildren={t('productForm.notSelling')} />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'units',
      label: t('productForm.unitsTab'),
      children: (
        <>
          <Form.Item name="baseUnit" label={t('productForm.baseUnit')} initialValue="Cái" rules={[{ required: true }]}>
            <Input style={{ width: 200 }} placeholder="Cái, Kg, Lít..." />
          </Form.Item>
          <Divider orientation="left" plain>{t('productForm.convertedUnits')}</Divider>
          <Form.List name="units">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item {...rest} name={[name, 'name']} rules={[{ required: true, message: t('productForm.baseUnit') }]}>
                      <Input placeholder="Tên (VD: Thùng)" style={{ width: 140 }} />
                    </Form.Item>
                    <Typography.Text type="secondary">= </Typography.Text>
                    <Form.Item {...rest} name={[name, 'conversionRate']} rules={[{ required: true }]}>
                      <InputNumber min={0.0001} precision={4} placeholder="Quy đổi" style={{ width: 100 }} />
                    </Form.Item>
                    <Form.Item noStyle shouldUpdate>
                      {() => (
                        <Typography.Text type="secondary">
                          {form.getFieldValue('baseUnit') || 'baseUnit'}
                        </Typography.Text>
                      )}
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'barcode']}>
                      <Input placeholder="Barcode" style={{ width: 160 }} />
                    </Form.Item>
                    <MinusCircleOutlined style={{ color: '#ff4d4f' }} onClick={() => remove(name)} />
                  </Space>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()}>
                  {t('productForm.addUnit')}
                </Button>
              </>
            )}
          </Form.List>
        </>
      ),
    },
    {
      key: 'prices',
      label: t('productForm.pricesTab'),
      children: (
        <Form.List name="prices">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...rest }) => (
                <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                  <Form.Item {...rest} name={[name, 'priceType']} rules={[{ required: true }]}>
                    <Select options={priceTypeOptions} placeholder={t('productForm.priceType')} style={{ width: 160 }} />
                  </Form.Item>
                  <Form.Item {...rest} name={[name, 'amount']} rules={[{ required: true }]}>
                    <CompactNumberInput
                      min={0}
                      style={{ width: 160 }}
                      formatGrouped
                      suffix="₫"
                    />
                  </Form.Item>
                  <MinusCircleOutlined style={{ color: '#ff4d4f' }} onClick={() => remove(name)} />
                </Space>
              ))}
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()}>
                {t('productForm.addPrice')}
              </Button>
            </>
          )}
        </Form.List>
      ),
    },
    {
      key: 'stock',
      label: t('productForm.stockTab'),
      children: (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="minStockLevel" label={t('productForm.minStockLevel')} initialValue={0}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="maxStockLevel" label={t('productForm.maxStockLevel')}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Typography.Text type="secondary">
              {t('productForm.stockHint')}
            </Typography.Text>
          </Col>
        </Row>
      ),
    },
  ];

  if (loadingProduct) return <Spin style={{ display: 'block', marginTop: 80 }} />;

  return (
    <div>
      <PageHeader
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/tenant/products')} />
            {isEditing ? t('productForm.editTitle') : t('productForm.createTitle')}
          </Space>
        }
      />
      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
          <Divider />
          <Space>
            <Button type="primary" htmlType="submit" loading={creating || updating}>
              {isEditing ? t('productForm.saveChanges') : t('productForm.createBtn')}
            </Button>
            <Button onClick={() => navigate('/tenant/products')}>{t('common.cancel')}</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}

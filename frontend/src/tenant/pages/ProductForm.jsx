import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Form, Input, InputNumber, Button, Card, Tabs, Space, Select,
  Switch, Divider, Row, Col, Spin, Typography,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
import { useApi } from '@shared/hooks/useApi';
import { useAuth } from '@auth/AuthContext';
import { productsApi, categoriesApi } from '@api/tenant.api';

const PRICE_TYPES = [
  { value: 'RETAIL', label: 'Giá bán lẻ' },
  { value: 'WHOLESALE', label: 'Giá bán buôn' },
  { value: 'AGENT', label: 'Giá đại lý' },
  { value: 'VIP', label: 'Giá VIP' },
  { value: 'COST', label: 'Giá vốn', restricted: true },
];

const CAN_SEE_COST = ['TENANT_ADMIN', 'MANAGER', 'ACCOUNTANT'];

function CategoryTreeSelect({ value, onChange, categories }) {
  const options = categories.map((c) => ({ label: c.name, value: c.id }));
  return (
    <Select
      value={value}
      onChange={onChange}
      options={options}
      allowClear
      showSearch
      filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
      placeholder="Chọn danh mục"
    />
  );
}

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tenantUser } = useAuth();
  const isEditing = Boolean(id);
  const canSeeCost = CAN_SEE_COST.includes(tenantUser?.role);

  const [form] = Form.useForm();
  const [loadingProduct, setLoadingProduct] = useState(isEditing);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('basic');

  const { execute: createProduct, loading: creating } = useApi(productsApi.create, {
    successMessage: 'Sản phẩm đã được tạo',
    onSuccess: (p) => navigate(`/tenant/products`),
  });

  const { execute: updateProduct, loading: updating } = useApi(
    (data) => productsApi.update(id, data),
    {
      successMessage: 'Sản phẩm đã được cập nhật',
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
          units: p.units ?? [],
          prices: p.prices ?? [],
        });
      }).finally(() => setLoadingProduct(false));
    }
  }, [id]);

  const handleSubmit = (values) => {
    if (isEditing) updateProduct(values);
    else createProduct(values);
  };

  const priceTypeOptions = PRICE_TYPES.filter((t) => !t.restricted || canSeeCost);

  const tabItems = [
    {
      key: 'basic',
      label: 'Thông tin cơ bản',
      children: (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="sku" label="SKU" rules={[{ required: true, max: 100 }]}>
              <Input placeholder="PROD-001" disabled={isEditing} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="barcode" label="Barcode">
              <Input placeholder="8934563012345" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="name" label="Tên sản phẩm" rules={[{ required: true, min: 2, max: 255 }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="categoryId" label="Danh mục">
              <CategoryTreeSelect categories={categories} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="brand" label="Thương hiệu">
              <Input />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="description" label="Mô tả">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="isActive" label="Trạng thái" valuePropName="checked" initialValue={true}>
              <Switch checkedChildren="Đang bán" unCheckedChildren="Ngừng bán" />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'units',
      label: 'Đơn vị tính',
      children: (
        <>
          <Form.Item name="baseUnit" label="Đơn vị cơ bản" initialValue="Cái" rules={[{ required: true }]}>
            <Input style={{ width: 200 }} placeholder="Cái, Kg, Lít..." />
          </Form.Item>
          <Divider orientation="left" plain>Đơn vị quy đổi</Divider>
          <Form.List name="units">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item {...rest} name={[name, 'name']} rules={[{ required: true, message: 'Tên đơn vị' }]}>
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
                      <Input placeholder="Barcode (tùy chọn)" style={{ width: 160 }} />
                    </Form.Item>
                    <MinusCircleOutlined style={{ color: '#ff4d4f' }} onClick={() => remove(name)} />
                  </Space>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()}>
                  Thêm đơn vị
                </Button>
              </>
            )}
          </Form.List>
        </>
      ),
    },
    {
      key: 'prices',
      label: 'Bảng giá',
      children: (
        <Form.List name="prices">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...rest }) => (
                <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                  <Form.Item {...rest} name={[name, 'priceType']} rules={[{ required: true }]}>
                    <Select options={priceTypeOptions} placeholder="Loại giá" style={{ width: 160 }} />
                  </Form.Item>
                  <Form.Item {...rest} name={[name, 'amount']} rules={[{ required: true }]}>
                    <InputNumber
                      min={0}
                      style={{ width: 160 }}
                      formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(v) => v.replace(/,/g, '')}
                      addonAfter="₫"
                    />
                  </Form.Item>
                  <MinusCircleOutlined style={{ color: '#ff4d4f' }} onClick={() => remove(name)} />
                </Space>
              ))}
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()}>
                Thêm giá
              </Button>
            </>
          )}
        </Form.List>
      ),
    },
    {
      key: 'stock',
      label: 'Kho & Định mức',
      children: (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="minStockLevel" label="Tồn kho tối thiểu" initialValue={0}>
              <InputNumber min={0} style={{ width: '100%' }} addonAfter="đơn vị" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="maxStockLevel" label="Tồn kho tối đa">
              <InputNumber min={0} style={{ width: '100%' }} addonAfter="đơn vị" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Typography.Text type="secondary">
              Khi tồn kho ≤ mức tối thiểu, sản phẩm sẽ hiển thị cảnh báo sắp hết hàng.
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
            {isEditing ? 'Chỉnh sửa sản phẩm' : 'Tạo sản phẩm mới'}
          </Space>
        }
      />
      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
          <Divider />
          <Space>
            <Button type="primary" htmlType="submit" loading={creating || updating}>
              {isEditing ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
            </Button>
            <Button onClick={() => navigate('/tenant/products')}>Huỷ</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}

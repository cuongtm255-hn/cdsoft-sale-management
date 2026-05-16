import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form, Select, Input, Button, Space, Divider, Row, Col, InputNumber, Table,
  Typography, message,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PageHeader from '@shared/components/PageHeader';
import { formatGroupedInput, parseGroupedInput } from '@shared/utils/numberInput';
import { useApi } from '@shared/hooks/useApi';
import { purchaseOrdersApi, suppliersApi, productsApi, warehousesApi } from '@api/tenant.api';

const fmt = (v) => Number(v || 0).toLocaleString('vi-VN') + '₫';

const PAYMENT_OPTIONS = [
  { label: 'Tiền mặt', value: 'CASH' },
  { label: 'Chuyển khoản', value: 'BANK_TRANSFER' },
  { label: 'Công nợ', value: 'CREDIT' },
];

export default function PurchaseOrderForm() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form] = Form.useForm();

  const PAYMENT_OPTIONS = [
    { label: t('orders.cash'), value: 'CASH' },
    { label: t('orders.bankTransfer'), value: 'BANK_TRANSFER' },
    { label: t('orders.credit'), value: 'CREDIT' },
  ];

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);

  const { execute: createOrder, loading: saving } = useApi(purchaseOrdersApi.create);
  const { execute: confirmOrder } = useApi(purchaseOrdersApi.confirm);

  useEffect(() => {
    suppliersApi.list({ limit: 500 }).then((r) => setSuppliers(r.data?.data?.data ?? r.data?.data ?? []));
    productsApi.list({ limit: 500 }).then((r) => setProducts(r.data?.data?.data ?? r.data?.data ?? []));
    warehousesApi.list().then((r) => setWarehouses(r.data?.data ?? []));
  }, []);

  const handleAddProduct = (productId) => {
    if (!productId) return;
    if (items.find((i) => i.productId === productId)) return;
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const costFromPrices = Number(product.prices?.find((pr) => pr.priceType === 'COST')?.amount ?? 0);
    const costPrice = costFromPrices || Number(product.costPrice ?? 0);
    setItems((prev) => [...prev, {
      key: productId,
      productId,
      productName: product.name,
      sku: product.sku,
      quantity: 1,
      unitPrice: costPrice,
    }]);
  };

  const handleItemChange = (productId, field, value) => {
    setItems((prev) => prev.map((i) => i.productId === productId ? { ...i, [field]: value } : i));
  };

  const handleRemoveItem = (productId) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const totalAmount = items.reduce((s, i) => s + (i.unitPrice ?? 0) * (i.quantity ?? 0), 0);

  const handleSubmit = async (confirmAfterCreate = false) => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    if (items.length === 0) {
      message.error(t('orders.noItemsError'));
      return;
    }

    const values = form.getFieldsValue();
    const payload = {
      supplierId: values.supplierId,
      warehouseId: values.warehouseId,
      paymentMethod: values.paymentMethod,
      notes: values.notes,
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    };

    try {
      const order = await createOrder(payload);
      if (!order?.id) throw new Error('No id returned');

      if (confirmAfterCreate) {
        try {
          await confirmOrder(order.id);
        } catch {
          message.error(t('orders.confirmFailed'));
        }
      }

      message.success(t('orders.createSuccess'));
      navigate('/tenant/purchase-orders');
    } catch {
      message.error(t('orders.createFailed'));
    }
  };

  const columns = [
    {
      title: t('orders.supplier'),
      dataIndex: 'productName',
      render: (name, row) => (
        <div>
          <Typography.Text code style={{ fontSize: 11 }}>{row.sku}</Typography.Text>
          <div style={{ fontSize: 13 }}>{name}</div>
        </div>
      ),
    },
    {
      title: t('inventory.quantity'),
      dataIndex: 'quantity',
      width: 120,
      render: (v, row) => (
        <InputNumber
          min={1}
          value={v}
          onChange={(val) => handleItemChange(row.productId, 'quantity', val ?? 1)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: t('inventory.unitCost'),
      dataIndex: 'unitPrice',
      width: 150,
      render: (v, row) => (
        <InputNumber
          min={0}
          value={v}
          formatter={formatGroupedInput}
          parser={parseGroupedInput}
          onChange={(val) => handleItemChange(row.productId, 'unitPrice', val ?? 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: t('inventory.total'),
      width: 130,
      render: (_, row) => (
        <Typography.Text strong>{fmt((row.unitPrice ?? 0) * (row.quantity ?? 0))}</Typography.Text>
      ),
    },
    {
      title: '',
      width: 40,
      render: (_, row) => (
        <Button danger type="text" icon={<DeleteOutlined />} onClick={() => handleRemoveItem(row.productId)} />
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={t('orders.purchaseCreateTitle')} />

      <Form form={form} layout="vertical" style={{ maxWidth: 900 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="supplierId" label={t('orders.supplier')} rules={[{ required: true }]}>
              <Select
                showSearch
                filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
                options={suppliers.map((s) => ({ label: `${s.name} (${s.code})`, value: s.id }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="warehouseId" label={t('orders.warehouse')}>
              <Select
                options={warehouses.map((w) => ({ label: w.name, value: w.id }))}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="paymentMethod" label={t('orders.paymentMethod')}>
              <Select options={PAYMENT_OPTIONS} allowClear />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="notes" label={t('orders.notes')}>
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">{t('orders.addProduct')}</Divider>

        <Space style={{ marginBottom: 12 }}>
          <Select
            showSearch
            placeholder={`+ ${t('orders.addProduct')}`}
            style={{ width: 300 }}
            filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
            options={products.map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))}
            onChange={handleAddProduct}
            value={null}
          />
        </Space>

        <Table
          dataSource={items}
          columns={columns}
          rowKey="productId"
          pagination={false}
          size="small"
          locale={{ emptyText: t('orders.noItems') }}
        />

        <Divider />

        <Row justify="end" style={{ marginBottom: 16 }}>
          <Col>
            <div style={{ textAlign: 'right', padding: '8px 0' }}>
              <Typography.Text style={{ fontSize: 16 }}>
                {t('orders.total')}:{' '}
                <Typography.Text strong style={{ fontSize: 18, color: '#1677ff' }}>{fmt(totalAmount)}</Typography.Text>
              </Typography.Text>
            </div>
          </Col>
        </Row>

        <Space>
          <Button onClick={() => navigate('/tenant/purchase-orders')}>{t('common.cancel')}</Button>
          <Button loading={saving} onClick={() => handleSubmit(false)}>{t('orders.saveDraft')}</Button>
          <Button type="primary" loading={saving} onClick={() => handleSubmit(true)}>{t('orders.confirmOrder')}</Button>
        </Space>
      </Form>
    </div>
  );
}

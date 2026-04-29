import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form, Select, Input, Button, Space, Divider, Row, Col, InputNumber, Table,
  Typography, message,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
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
  const [form] = Form.useForm();

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
      message.error('Vui lòng thêm ít nhất 1 sản phẩm');
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
          message.error('Xác nhận đơn thất bại');
        }
      }

      message.success('Đơn mua hàng đã được tạo');
      navigate('/tenant/purchase-orders');
    } catch {
      message.error('Tạo đơn mua hàng thất bại');
    }
  };

  const columns = [
    {
      title: 'Sản phẩm',
      dataIndex: 'productName',
      render: (name, row) => (
        <div>
          <Typography.Text code style={{ fontSize: 11 }}>{row.sku}</Typography.Text>
          <div style={{ fontSize: 13 }}>{name}</div>
        </div>
      ),
    },
    {
      title: 'Số lượng',
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
      title: 'Đơn giá nhập',
      dataIndex: 'unitPrice',
      width: 150,
      render: (v, row) => (
        <InputNumber
          min={0}
          value={v}
          formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(val) => val.replace(/,/g, '')}
          onChange={(val) => handleItemChange(row.productId, 'unitPrice', val ?? 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Thành tiền',
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
      <PageHeader title="Tạo đơn mua hàng" />

      <Form form={form} layout="vertical" style={{ maxWidth: 900 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="supplierId" label="Nhà cung cấp" rules={[{ required: true, message: 'Chọn nhà cung cấp' }]}>
              <Select
                showSearch
                placeholder="Tìm nhà cung cấp..."
                filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
                options={suppliers.map((s) => ({ label: `${s.name} (${s.code})`, value: s.id }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="warehouseId" label="Kho nhập">
              <Select
                placeholder="Chọn kho"
                options={warehouses.map((w) => ({ label: w.name, value: w.id }))}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="paymentMethod" label="Hình thức thanh toán">
              <Select placeholder="Chọn hình thức" options={PAYMENT_OPTIONS} allowClear />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="notes" label="Ghi chú">
              <Input placeholder="Nhập ghi chú..." />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Sản phẩm</Divider>

        <Space style={{ marginBottom: 12 }}>
          <Select
            showSearch
            placeholder="+ Thêm sản phẩm"
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
          locale={{ emptyText: 'Chưa có sản phẩm nào' }}
        />

        <Divider />

        <Row justify="end" style={{ marginBottom: 16 }}>
          <Col>
            <div style={{ textAlign: 'right', padding: '8px 0' }}>
              <Typography.Text style={{ fontSize: 16 }}>
                Tổng cộng:{' '}
                <Typography.Text strong style={{ fontSize: 18, color: '#1677ff' }}>{fmt(totalAmount)}</Typography.Text>
              </Typography.Text>
            </div>
          </Col>
        </Row>

        <Space>
          <Button onClick={() => navigate('/tenant/purchase-orders')}>Hủy</Button>
          <Button loading={saving} onClick={() => handleSubmit(false)}>Lưu nháp</Button>
          <Button type="primary" loading={saving} onClick={() => handleSubmit(true)}>Xác nhận đơn hàng</Button>
        </Space>
      </Form>
    </div>
  );
}

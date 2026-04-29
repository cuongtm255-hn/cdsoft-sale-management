import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form, Select, Input, Button, Space, Divider, Row, Col, Typography, message, Modal,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
import OrderItemsTable from '@shared/components/OrderItemsTable';
import OrderSummaryPanel from '@shared/components/OrderSummaryPanel';
import CreditWarningBanner from '@shared/components/CreditWarningBanner';
import VoucherInput from '@shared/components/VoucherInput';
import { useApi } from '@shared/hooks/useApi';
import { salesOrdersApi, customersApi, productsApi, warehousesApi, vouchersApi } from '@api/tenant.api';

const { Option } = Select;
const fmt = (v) => Number(v || 0).toLocaleString('vi-VN') + '₫';

const PAYMENT_OPTIONS = [
  { label: 'Tiền mặt', value: 'CASH' },
  { label: 'Chuyển khoản', value: 'BANK_TRANSFER' },
  { label: 'Công nợ', value: 'CREDIT' },
];

export default function SalesOrderForm() {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [items, setItems] = useState([]);
  const [voucherCode, setVoucherCode] = useState(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);

  const { execute: createOrder, loading: saving } = useApi(salesOrdersApi.create);
  const { execute: confirmOrder } = useApi(salesOrdersApi.confirm);

  useEffect(() => {
    customersApi.list({ limit: 500 }).then((r) => setCustomers(r.data?.data?.data ?? r.data?.data ?? []));
    productsApi.list({ limit: 500, isActive: true }).then((r) => setProducts(r.data?.data?.data ?? r.data?.data ?? []));
    warehousesApi.list().then((r) => setWarehouses(r.data?.data ?? []));
  }, []);

  const subtotal = items.reduce((s, i) => s + (i.unitPrice ?? 0) * (i.quantity ?? 0), 0);
  const discountTotal = items.reduce((s, i) => {
    const pct = i.discountPercent ?? 0;
    const fixed = i.discountAmount ?? 0;
    return s + (i.unitPrice ?? 0) * (i.quantity ?? 0) * (pct / 100) + fixed;
  }, 0);
  const totalAmount = subtotal - discountTotal - voucherDiscount;

  const creditLimit = Number(selectedCustomer?.creditLimit ?? 0);
  const currentDebt = Number(selectedCustomer?.currentDebt ?? 0);

  const handleAddProduct = (productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    if (items.find((i) => i.productId === productId)) return;
    setItems((prev) => [...prev, {
      productId,
      productName: product.name,
      quantity: 1,
      unitPrice: product.retailPrice ?? 0,
      discountPercent: 0,
      discountAmount: 0,
      lineTotal: product.retailPrice ?? 0,
    }]);
  };

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
      customerId: values.customerId,
      warehouseId: values.warehouseId,
      paymentMethod: values.paymentMethod,
      notes: values.notes,
      voucherCode: voucherCode || undefined,
      items: items.map((i) => ({
        productId: i.productId,
        unitId: i.unitId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountPercent: i.discountPercent ?? 0,
        discountAmount: i.discountAmount ?? 0,
      })),
    };

    try {
      const order = await createOrder(payload);
      if (!order?.id) throw new Error('No order id returned');

      if (confirmAfterCreate) {
        try {
          await confirmOrder(order.id);
        } catch (err) {
          const errData = err?.response?.data?.message;
          if (errData === 'INSUFFICIENT_STOCK' || err?.response?.data?.items) {
            const items = err?.response?.data?.items ?? [];
            Modal.error({
              title: 'Không đủ tồn kho',
              content: (
                <ul>
                  {items.map((item, i) => (
                    <li key={i}>
                      {item.productName}: cần {item.needed}, còn {item.available}
                    </li>
                  ))}
                </ul>
              ),
            });
          } else {
            message.error('Xác nhận đơn thất bại');
          }
        }
      }

      message.success('Đơn hàng đã được tạo');
      navigate(`/tenant/sales-orders/${order.id}`);
    } catch {
      message.error('Tạo đơn hàng thất bại');
    }
  };

  return (
    <div>
      <PageHeader title="Tạo đơn hàng mới" />

      <Form form={form} layout="vertical" style={{ maxWidth: 900 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="customerId" label="Khách hàng" rules={[{ required: true, message: 'Chọn khách hàng' }]}>
              <Select
                showSearch
                placeholder="Tìm khách hàng..."
                filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
                options={customers.map((c) => ({ label: `${c.name} (${c.code})`, value: c.id }))}
                onChange={(id) => setSelectedCustomer(customers.find((c) => c.id === id) ?? null)}
              />
            </Form.Item>
            {selectedCustomer && (
              <Typography.Text type="secondary" style={{ display: 'block', marginTop: -12, marginBottom: 8 }}>
                Nhóm: <strong>{selectedCustomer.customerGroup}</strong>
                {' · '}Nợ hiện tại: <strong>{fmt(selectedCustomer.currentDebt)}</strong>
                {' / '}Hạn mức: <strong>{fmt(selectedCustomer.creditLimit)}</strong>
              </Typography.Text>
            )}
          </Col>
          <Col span={12}>
            <Form.Item name="warehouseId" label="Kho xuất">
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

        <CreditWarningBanner
          creditLimit={creditLimit}
          currentDebt={currentDebt}
          orderTotal={totalAmount}
        />

        <Divider orientation="left">Sản phẩm</Divider>

        <Space style={{ marginBottom: 12 }}>
          <Select
            showSearch
            placeholder="+ Thêm sản phẩm"
            style={{ width: 280 }}
            filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
            options={products.map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))}
            onChange={handleAddProduct}
            value={null}
          />
        </Space>

        <OrderItemsTable items={items} editable onChange={setItems} />

        <Divider />

        <Row justify="end" style={{ marginBottom: 16 }}>
          <Col>
            <div style={{ marginBottom: 8 }}>
              <VoucherInput
                customerId={form.getFieldValue('customerId')}
                orderTotal={totalAmount}
                onValidated={(code, discount) => {
                  setVoucherCode(code);
                  setVoucherDiscount(discount ?? 0);
                }}
              />
            </div>
            <OrderSummaryPanel
              subtotal={subtotal}
              discountTotal={discountTotal}
              voucherDiscount={voucherDiscount}
              totalAmount={totalAmount}
            />
          </Col>
        </Row>

        <Space>
          <Button onClick={() => navigate(-1)}>Hủy</Button>
          <Button loading={saving} onClick={() => handleSubmit(false)}>Lưu nháp</Button>
          <Button type="primary" loading={saving} onClick={() => handleSubmit(true)}>Xác nhận đơn hàng</Button>
        </Space>
      </Form>
    </div>
  );
}

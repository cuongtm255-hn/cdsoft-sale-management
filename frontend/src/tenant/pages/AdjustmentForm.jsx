import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Card, Col, Divider, Form, Input, InputNumber,
  Row, Select, Space, Typography,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
import { useApi } from '@shared/hooks/useApi';
import { inventoryApi, warehousesApi, productsApi } from '@api/tenant.api';

export default function AdjustmentForm() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [warehouses, setWarehouses] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [systemQtyMap, setSystemQtyMap] = useState({});
  const items = Form.useWatch('items', form) ?? [];
  const warehouseId = Form.useWatch('warehouseId', form);

  useEffect(() => {
    warehousesApi.list().then((res) => {
      const list = res.data?.data ?? res.data ?? [];
      setWarehouses(list.map((w) => ({ label: w.name, value: w.id })));
    });
  }, []);

  useEffect(() => {
    if (!productSearch) return;
    productsApi.list({ search: productSearch, limit: 30 }).then((res) => {
      const list = res.data?.data?.data ?? res.data?.data ?? [];
      setProductOptions(list.map((p) => ({ label: `${p.sku} — ${p.name}`, value: p.id })));
    });
  }, [productSearch]);

  const handleProductSelect = (productId, index) => {
    if (!warehouseId) return;
    inventoryApi.productStock(productId, warehouseId).then((res) => {
      const qty = res.data?.data?.quantity ?? res.data?.quantity ?? 0;
      setSystemQtyMap((prev) => ({ ...prev, [index]: qty }));
      const currentItems = form.getFieldValue('items') ?? [];
      currentItems[index] = { ...currentItems[index], productId, systemQty: qty };
      form.setFieldValue('items', currentItems);
    });
  };

  const { execute: submit, loading } = useApi(inventoryApi.adjust, {
    successMessage: 'Điều chỉnh kho thành công',
    onSuccess: () => navigate('/tenant/inventory'),
  });

  const handleSubmit = (values) => {
    submit({
      warehouseId: values.warehouseId,
      reason: values.reason,
      items: values.items.map((i) => ({
        productId: i.productId,
        systemQty: Number(i.systemQty ?? 0),
        actualQty: Number(i.actualQty ?? 0),
      })),
    });
  };

  return (
    <div>
      <PageHeader
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/tenant/inventory')} />
            Điều chỉnh kho
          </Space>
        }
      />

      <Card>
        <Form form={form} layout="vertical" initialValues={{ items: [{}] }} onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="warehouseId" label="Kho" rules={[{ required: true }]}>
                <Select options={warehouses} placeholder="Chọn kho" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="reason" label="Lý do điều chỉnh" rules={[{ required: true }]}>
                <Input placeholder="Kiểm kê tháng 4 — phát hiện thiếu hàng" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>Danh sách sản phẩm điều chỉnh</Divider>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 130px 130px 100px 60px', gap: 8, marginBottom: 8, fontWeight: 600 }}>
            <span>Sản phẩm</span><span>SL sổ sách</span><span>SL thực tế</span><span>Chênh lệch</span><span />
          </div>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => {
                  const item = items[name] ?? {};
                  const systemQty = Number(item.systemQty ?? 0);
                  const actualQty = Number(item.actualQty ?? 0);
                  const diff = actualQty - systemQty;
                  const diffColor = diff > 0 ? '#52c41a' : diff < 0 ? '#cf1322' : undefined;

                  return (
                    <div key={key} style={{ display: 'grid', gridTemplateColumns: '2fr 130px 130px 100px 60px', gap: 8, marginBottom: 8, alignItems: 'start' }}>
                      <Form.Item name={[name, 'productId']} rules={[{ required: true }]} style={{ margin: 0 }}>
                        <Select
                          showSearch
                          options={productOptions}
                          onSearch={setProductSearch}
                          filterOption={false}
                          placeholder="Tìm sản phẩm"
                          onChange={(v) => handleProductSelect(v, name)}
                        />
                      </Form.Item>
                      <Form.Item name={[name, 'systemQty']} style={{ margin: 0 }}>
                        <InputNumber style={{ width: '100%' }} disabled placeholder="SL sổ sách" />
                      </Form.Item>
                      <Form.Item name={[name, 'actualQty']} rules={[{ required: true }]} style={{ margin: 0 }}>
                        <InputNumber min={0} style={{ width: '100%' }} placeholder="SL thực tế" />
                      </Form.Item>
                      <div style={{ display: 'flex', alignItems: 'center', paddingTop: 4 }}>
                        {item.actualQty !== undefined ? (
                          <Typography.Text style={{ color: diffColor, fontWeight: 500 }}>
                            {diff > 0 ? `+${diff}` : diff}
                          </Typography.Text>
                        ) : '—'}
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
          <Space>
            <Button type="primary" htmlType="submit" loading={loading} disabled={items.length === 0}>
              Lưu điều chỉnh
            </Button>
            <Button onClick={() => navigate(-1)}>Huỷ</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}

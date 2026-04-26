import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Card, Col, DatePicker, Divider, Form, Input, InputNumber,
  Row, Select, Space,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import { useApi } from '@shared/hooks/useApi';
import { inventoryApi, warehousesApi, productsApi } from '@api/tenant.api';

export default function TransferForm() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [warehouses, setWarehouses] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [unitOptions, setUnitOptions] = useState({});
  const [productMap, setProductMap] = useState({});

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
      const map = {};
      list.forEach((p) => { map[p.id] = p; });
      setProductMap((prev) => ({ ...prev, ...map }));
    });
  }, [productSearch]);

  const handleProductSelect = (productId, index) => {
    const product = productMap[productId];
    if (!product) return;
    const units = (product.units ?? []).map((u) => ({ label: u.name, value: u.id }));
    setUnitOptions((prev) => ({ ...prev, [index]: units }));
  };

  const { execute: submit, loading } = useApi(inventoryApi.createTransfer, {
    successMessage: 'Lệnh điều chuyển đã được tạo',
    onSuccess: () => navigate('/tenant/inventory'),
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
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/tenant/inventory')} />
            Lệnh điều chuyển kho mới
          </Space>
        }
      />

      <Card>
        <Form form={form} layout="vertical" initialValues={{ items: [{}] }} onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="fromWarehouseId" label="Kho đi" rules={[{ required: true }]}>
                <Select options={warehouses} placeholder="Chọn kho đi" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="toWarehouseId" label="Kho đến" rules={[{ required: true }]}>
                <Select options={warehouses} placeholder="Chọn kho đến" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="expectedDate" label="Ngày dự kiến">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label="Ghi chú">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>Danh sách sản phẩm</Divider>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 130px 100px 60px', gap: 8, marginBottom: 8, fontWeight: 600 }}>
            <span>Sản phẩm</span><span>Đơn vị</span><span>Số lượng</span><span />
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
                        onSearch={setProductSearch}
                        filterOption={false}
                        placeholder="Tìm sản phẩm"
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
                  Thêm sản phẩm
                </Button>
              </>
            )}
          </Form.List>

          <Divider />
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Tạo lệnh điều chuyển
            </Button>
            <Button onClick={() => navigate(-1)}>Huỷ</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}

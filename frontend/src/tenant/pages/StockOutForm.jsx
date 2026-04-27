import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Card, Col, Divider, Form, Input, InputNumber,
  Row, Select, Space, Tooltip, Typography,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined, WarningOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
import { useApi } from '@shared/hooks/useApi';
import { inventoryApi, warehousesApi, productsApi } from '@api/tenant.api';

const ISSUE_TYPE_OPTIONS = [
  { label: 'Xuất bán (theo đơn)', value: 'SALE' },
  { label: 'Xuất nội bộ', value: 'INTERNAL' },
  { label: 'Hỏng / Hủy', value: 'DAMAGED' },
];

export default function StockOutForm() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [warehouses, setWarehouses] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [unitOptions, setUnitOptions] = useState({});
  const [productMap, setProductMap] = useState({});
  const [stockMap, setStockMap] = useState({});
  const items = Form.useWatch('items', form) ?? [];
  const warehouseId = Form.useWatch('warehouseId', form);
  const issueType = Form.useWatch('issueType', form);

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

  useEffect(() => {
    loadProducts(productSearch);
  }, [productSearch]);

  const handleProductSelect = async (productId, index) => {
    const product = productMap[productId];
    if (!product) return;
    const units = (product.units ?? []).map((u) => ({ label: u.name, value: u.id }));
    setUnitOptions((prev) => ({ ...prev, [index]: units }));

    if (warehouseId) {
      inventoryApi.productStock(productId, warehouseId).then((res) => {
        const qty = res.data?.data?.quantity ?? res.data?.quantity ?? 0;
        setStockMap((prev) => ({ ...prev, [`${index}_${productId}`]: qty }));
      });
    }
  };

  const { execute: submit, loading } = useApi(inventoryApi.stockOut, {
    successMessage: 'Xuất kho thành công',
    onSuccess: () => navigate('/tenant/inventory'),
  });

  const handleSubmit = (values) => {
    submit({
      warehouseId: values.warehouseId,
      issueType: values.issueType,
      orderId: values.orderId,
      notes: values.notes,
      items: values.items.map((i) => ({
        productId: i.productId,
        unitId: i.unitId,
        quantity: i.quantity,
      })),
    });
  };

  return (
    <div>
      <PageHeader
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/tenant/inventory')} />
            Phiếu xuất kho mới
          </Space>
        }
      />

      <Card>
        <Form form={form} layout="vertical" initialValues={{ issueType: 'INTERNAL', items: [{}] }} onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="warehouseId" label="Kho xuất" rules={[{ required: true }]}>
                <Select options={warehouses} placeholder="Chọn kho" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="issueType" label="Loại xuất" rules={[{ required: true }]}>
                <Select options={ISSUE_TYPE_OPTIONS} />
              </Form.Item>
            </Col>
            {issueType === 'SALE' && (
              <Col span={8}>
                <Form.Item name="orderId" label="Mã đơn hàng">
                  <Input placeholder="SO-2026-0001" />
                </Form.Item>
              </Col>
            )}
            <Col span={24}>
              <Form.Item name="notes" label="Ghi chú">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>Danh sách hàng xuất</Divider>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 130px 100px 120px 60px', gap: 8, marginBottom: 8, fontWeight: 600 }}>
                  <span>Sản phẩm</span><span>Đơn vị</span><span>Số lượng</span><span>Tồn kho</span><span />
                </div>

                {fields.map(({ key, name }) => {
                  const item = items[name] ?? {};
                  const stockKey = `${name}_${item.productId}`;
                  const available = stockMap[stockKey];
                  const insufficient = available !== undefined && Number(item.quantity ?? 0) > available;

                  return (
                    <div key={key} style={{ display: 'grid', gridTemplateColumns: '2fr 130px 100px 120px 60px', gap: 8, marginBottom: 8, alignItems: 'start' }}>
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
                        <InputNumber
                          min={0.0001}
                          style={{ width: '100%', borderColor: insufficient ? '#ff4d4f' : undefined }}
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
                              <Tooltip title="Không đủ hàng">
                                <WarningOutlined style={{ color: '#ff4d4f' }} />
                              </Tooltip>
                            )}
                          </>
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
              Xác nhận xuất kho
            </Button>
            <Button onClick={() => navigate(-1)}>Huỷ</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  Button, Space, Tabs, Tag, Modal, Form, Input, Select, InputNumber,
  DatePicker, message, Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { useApi } from '@shared/hooks/useApi';
import { promotionsApi } from '@api/tenant.api';

const TYPE_LABELS = {
  ORDER_DISCOUNT: 'CK Đơn hàng',
  BUY_X_GET_Y: 'Mua X Tặng Y',
  BUNDLE: 'Combo/Bundle',
};

const TYPE_OPTIONS = [
  { label: 'Chiết khấu đơn hàng', value: 'ORDER_DISCOUNT' },
  { label: 'Mua X Tặng Y', value: 'BUY_X_GET_Y' },
  { label: 'Combo / Bundle', value: 'BUNDLE' },
];

const STATUS_TAGS = {
  active:    { color: 'green',  label: 'Đang chạy' },
  upcoming:  { color: 'blue',   label: 'Sắp diễn ra' },
  ended:     { color: 'default', label: 'Đã kết thúc' },
};

function getPromoStatus(promo) {
  const today = dayjs().format('YYYY-MM-DD');
  if (promo.endDate && promo.endDate < today) return 'ended';
  if (promo.startDate && promo.startDate > today) return 'upcoming';
  return 'active';
}

function PromoStatusTag({ promo }) {
  const s = getPromoStatus(promo);
  const cfg = STATUS_TAGS[s];
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
}

export default function Promotions() {
  const [activeTab, setActiveTab] = useState('all');
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const promoType = Form.useWatch('type', form);

  const { execute: create, loading: saving } = useApi(promotionsApi.create);

  const load = async (status) => {
    setLoading(true);
    try {
      const res = await promotionsApi.list(status === 'all' ? {} : { status });
      setPromotions(res.data?.data ?? res.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(activeTab); }, [activeTab]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        name: values.name,
        type: values.type,
        priority: values.priority ?? 0,
        notes: values.notes,
        startDate: values.dates?.[0]?.format('YYYY-MM-DD'),
        endDate: values.dates?.[1]?.format('YYYY-MM-DD'),
        stackable: values.stackable ?? true,
      };

      if (values.type === 'ORDER_DISCOUNT') {
        payload.condition = { minOrderAmount: values.minOrderAmount };
        payload.discount = { type: values.discountType, value: values.discountValue };
      } else if (values.type === 'BUY_X_GET_Y') {
        payload.condition = { productId: values.buyProductId, minQty: values.minQty };
        payload.reward = { productId: values.giftProductId, giftQty: values.giftQty };
      } else if (values.type === 'BUNDLE') {
        payload.discount = { type: values.discountType, value: values.discountValue };
      }

      await create(payload);
      message.success('Tạo khuyến mãi thành công');
      form.resetFields();
      setModalOpen(false);
      load(activeTab);
    } catch {
      message.error('Tạo khuyến mãi thất bại');
    }
  };

  const columns = [
    { title: 'Tên khuyến mãi', dataIndex: 'name', key: 'name' },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (v) => TYPE_LABELS[v] ?? v,
    },
    {
      title: 'Thời gian',
      key: 'dates',
      width: 200,
      render: (_, row) => {
        const start = row.startDate ? dayjs(row.startDate).format('DD/MM/YY') : '—';
        const end = row.endDate ? dayjs(row.endDate).format('DD/MM/YY') : '—';
        return `${start} → ${end}`;
      },
    },
    {
      title: 'Lượt dùng',
      dataIndex: 'usedCount',
      key: 'used',
      width: 90,
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 130,
      render: (_, row) => <PromoStatusTag promo={row} />,
    },
  ];

  const tabItems = [
    { key: 'all', label: 'Tất cả' },
    { key: 'active', label: 'Đang chạy' },
    { key: 'upcoming', label: 'Sắp diễn ra' },
    { key: 'ended', label: 'Đã kết thúc' },
  ];

  return (
    <div>
      <PageHeader
        title="Quản lý khuyến mãi"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Tạo khuyến mãi
          </Button>
        }
      />

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      <DataTable
        columns={columns}
        dataSource={promotions}
        loading={loading}
        pagination={false}
        rowKey="id"
      />

      <Modal
        title="Tạo khuyến mãi"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={saving}
        width={640}
        okText="Tạo"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="Loại khuyến mãi" rules={[{ required: true }]}>
            <Select options={TYPE_OPTIONS} placeholder="Chọn loại" />
          </Form.Item>
          <Form.Item name="name" label="Tên khuyến mãi" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="dates" label="Thời gian áp dụng">
            <DatePicker.RangePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>

          {promoType === 'ORDER_DISCOUNT' && (
            <Space style={{ width: '100%' }} direction="vertical">
              <Form.Item name="minOrderAmount" label="Đơn hàng tối thiểu (₫)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="discountType" label="Loại chiết khấu">
                <Select options={[{ label: 'Phần trăm (%)', value: 'PERCENT' }, { label: 'Số tiền cố định', value: 'FIXED' }]} />
              </Form.Item>
              <Form.Item name="discountValue" label="Giá trị">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Space>
          )}

          {promoType === 'BUY_X_GET_Y' && (
            <Space style={{ width: '100%' }} direction="vertical">
              <Form.Item name="buyProductId" label="Sản phẩm mua (ID)">
                <Input placeholder="productId..." />
              </Form.Item>
              <Form.Item name="minQty" label="SL tối thiểu">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="giftProductId" label="Sản phẩm tặng (ID)">
                <Input placeholder="productId..." />
              </Form.Item>
              <Form.Item name="giftQty" label="SL tặng">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Space>
          )}

          {promoType === 'BUNDLE' && (
            <Space style={{ width: '100%' }} direction="vertical">
              <Form.Item name="discountType" label="Loại chiết khấu">
                <Select options={[{ label: 'Phần trăm (%)', value: 'PERCENT' }, { label: 'Số tiền cố định', value: 'FIXED' }]} />
              </Form.Item>
              <Form.Item name="discountValue" label="Giá trị">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Space>
          )}

          <Form.Item name="priority" label="Ưu tiên">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

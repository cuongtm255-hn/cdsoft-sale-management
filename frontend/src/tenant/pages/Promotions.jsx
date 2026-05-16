import { useEffect, useState } from 'react';
import {
  Button, Space, Tabs, Tag, Modal, Form, Input, Select, InputNumber,
  DatePicker, message, Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
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

export default function Promotions() {
  const { t } = useTranslation();

  const TYPE_LABELS = {
    ORDER_DISCOUNT: t('promotions.typeOrderDiscount'),
    BUY_X_GET_Y: t('promotions.typeBuyXGetY'),
    BUNDLE: t('promotions.typeBundle'),
  };

  const TYPE_OPTIONS = [
    { label: t('promotions.typeOrderDiscount'), value: 'ORDER_DISCOUNT' },
    { label: t('promotions.typeBuyXGetY'), value: 'BUY_X_GET_Y' },
    { label: t('promotions.typeBundle'), value: 'BUNDLE' },
  ];

  const STATUS_TAGS = {
    active:   { color: 'green',   label: t('promotions.active') },
    upcoming: { color: 'blue',    label: t('promotions.upcoming') },
    ended:    { color: 'default', label: t('promotions.ended') },
  };

  function PromoStatusTag({ promo }) {
    const s = getPromoStatus(promo);
    const cfg = STATUS_TAGS[s];
    return <Tag color={cfg.color}>{cfg.label}</Tag>;
  }

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
      message.success(t('promotions.createSuccess'));
      form.resetFields();
      setModalOpen(false);
      load(activeTab);
    } catch {
      message.error(t('promotions.createFailed'));
    }
  };

  const columns = [
    { title: t('promotions.name'), dataIndex: 'name', key: 'name' },
    {
      title: t('promotions.type'),
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (v) => TYPE_LABELS[v] ?? v,
    },
    {
      title: t('promotions.dates'),
      key: 'dates',
      width: 200,
      render: (_, row) => {
        const start = row.startDate ? dayjs(row.startDate).format('DD/MM/YY') : '—';
        const end = row.endDate ? dayjs(row.endDate).format('DD/MM/YY') : '—';
        return `${start} → ${end}`;
      },
    },
    {
      title: t('promotions.usedCount'),
      dataIndex: 'usedCount',
      key: 'used',
      width: 90,
    },
    {
      title: t('promotions.statusLabel'),
      key: 'status',
      width: 130,
      render: (_, row) => <PromoStatusTag promo={row} />,
    },
  ];

  const tabItems = [
    { key: 'all', label: t('promotions.all') },
    { key: 'active', label: t('promotions.active') },
    { key: 'upcoming', label: t('promotions.upcoming') },
    { key: 'ended', label: t('promotions.ended') },
  ];

  return (
    <div>
      <PageHeader
        title={t('promotions.title')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            {t('promotions.createPromotion')}
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
        title={t('promotions.createPromotion')}
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={saving}
        width={640}
        okText={t('common.create')}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="type" label={t('promotions.typeLabel')} rules={[{ required: true }]}>
            <Select options={TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="name" label={t('promotions.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="dates" label={t('promotions.dateRange')}>
            <DatePicker.RangePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>

          {promoType === 'ORDER_DISCOUNT' && (
            <Space style={{ width: '100%' }} direction="vertical">
              <Form.Item name="minOrderAmount" label={t('promotions.minOrderAmount')}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="discountType" label={t('promotions.discountType')}>
                <Select options={[{ label: t('promotions.discountPercent'), value: 'PERCENT' }, { label: t('promotions.discountFixed'), value: 'FIXED' }]} />
              </Form.Item>
              <Form.Item name="discountValue" label={t('promotions.discountValue')}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Space>
          )}

          {promoType === 'BUY_X_GET_Y' && (
            <Space style={{ width: '100%' }} direction="vertical">
              <Form.Item name="buyProductId" label={t('promotions.buyProduct')}>
                <Input placeholder="productId..." />
              </Form.Item>
              <Form.Item name="minQty" label={t('promotions.minQty')}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="giftProductId" label={t('promotions.giftProduct')}>
                <Input placeholder="productId..." />
              </Form.Item>
              <Form.Item name="giftQty" label={t('promotions.giftQty')}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Space>
          )}

          {promoType === 'BUNDLE' && (
            <Space style={{ width: '100%' }} direction="vertical">
              <Form.Item name="discountType" label={t('promotions.discountType')}>
                <Select options={[{ label: t('promotions.discountPercent'), value: 'PERCENT' }, { label: t('promotions.discountFixed'), value: 'FIXED' }]} />
              </Form.Item>
              <Form.Item name="discountValue" label={t('promotions.discountValue')}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Space>
          )}

          <Form.Item name="priority" label={t('promotions.priority')}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label={t('common.note')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

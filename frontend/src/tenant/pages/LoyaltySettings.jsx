import { useEffect, useState } from 'react';
import {
  Button, Card, Col, Divider, Form, InputNumber, Row, Space,
  Switch, Table, Typography, message, Spin, Tooltip, Alert,
} from 'antd';
import { DeleteOutlined, PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
import { loyaltyApi } from '@api/tenant.api';

const TIER_ICONS = { SILVER: '🥈', GOLD: '🥇', DIAMOND: '💎' };
const fmt = (v) => Number(v || 0).toLocaleString('vi-VN');

export default function LoyaltySettings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tiers, setTiers] = useState([]);
  const isEnabled = Form.useWatch('isEnabled', form);
  const pointsPerAmount = Form.useWatch('pointsPerAmount', form);
  const amountPerPoint = Form.useWatch('amountPerPoint', form);

  useEffect(() => {
    loyaltyApi.getConfig()
      .then((res) => {
        const cfg = res.data?.data ?? res.data;
        form.setFieldsValue({
          isEnabled: cfg.isEnabled,
          pointsPerAmount: Number(cfg.pointsPerAmount),
          amountPerPoint: Number(cfg.amountPerPoint),
          tierEvaluationPeriodDays: cfg.tierEvaluationPeriodDays,
          pointExpiryDays: cfg.pointExpiryDays,
          allowTierDowngrade: cfg.allowTierDowngrade,
        });
        setTiers(cfg.tiers ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }

    if (tiers.length === 0) {
      message.error('Cần ít nhất 1 hạng thành viên');
      return;
    }

    setSaving(true);
    try {
      await loyaltyApi.updateConfig({ ...values, tiers });
      message.success('Đã lưu cài đặt tích điểm');
    } catch {
      message.error('Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const addTier = () => {
    setTiers((prev) => [
      ...prev,
      { name: `TIER_${Date.now()}`, label: 'Hạng mới', minPoints: 0, discountPercent: 0 },
    ]);
  };

  const removeTier = (idx) => {
    if (idx === 0) { message.warning('Không thể xóa hạng đầu tiên'); return; }
    setTiers((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateTier = (idx, field, value) => {
    setTiers((prev) => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  if (loading) return <Spin style={{ margin: 40 }} />;

  const tierColumns = [
    {
      title: 'Icon',
      key: 'icon',
      width: 50,
      render: (_, row) => TIER_ICONS[row.name] ?? '⭐',
    },
    {
      title: 'Tên hạng (mã)',
      key: 'name',
      width: 160,
      render: (_, row, i) => (
        <input
          className="ant-input ant-input-sm"
          value={row.name}
          onChange={(e) => updateTier(i, 'name', e.target.value.toUpperCase().replace(/\s/g, '_'))}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Tên hiển thị',
      key: 'label',
      render: (_, row, i) => (
        <input
          className="ant-input ant-input-sm"
          value={row.label}
          onChange={(e) => updateTier(i, 'label', e.target.value)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Điểm tối thiểu',
      key: 'minPoints',
      width: 140,
      render: (_, row, i) => (
        <InputNumber
          size="small"
          min={i === 0 ? 0 : 1}
          disabled={i === 0}
          value={row.minPoints}
          onChange={(v) => updateTier(i, 'minPoints', v ?? 0)}
          style={{ width: 120 }}
        />
      ),
    },
    {
      title: 'Chiết khấu (%)',
      key: 'discount',
      width: 130,
      render: (_, row, i) => (
        <InputNumber
          size="small"
          min={0}
          max={100}
          value={row.discountPercent}
          onChange={(v) => updateTier(i, 'discountPercent', v ?? 0)}
          style={{ width: 100 }}
          addonAfter="%"
        />
      ),
    },
    {
      title: '',
      key: 'del',
      width: 40,
      render: (_, __, i) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => removeTier(i)}
          disabled={i === 0}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Cài đặt chương trình tích điểm" />

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Form form={form} layout="vertical">
            <Card size="small" style={{ marginBottom: 16 }}>
              <Form.Item name="isEnabled" valuePropName="checked" label="Bật chương trình tích điểm">
                <Switch checkedChildren="BẬT" unCheckedChildren="TẮT" />
              </Form.Item>
            </Card>

            {isEnabled && (
              <>
                <Card title="Quy tắc tích điểm" size="small" style={{ marginBottom: 16 }}>
                  <Row gutter={16} align="middle">
                    <Col>
                      <Typography.Text>Cứ mỗi</Typography.Text>
                    </Col>
                    <Col>
                      <Form.Item name="pointsPerAmount" noStyle rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: 120 }} formatter={fmt} addonAfter="₫" />
                      </Form.Item>
                    </Col>
                    <Col>
                      <Typography.Text>thanh toán thực tế → cộng <strong>1 điểm</strong></Typography.Text>
                    </Col>
                  </Row>
                </Card>

                <Card title="Quy tắc tiêu điểm" size="small" style={{ marginBottom: 16 }}>
                  <Row gutter={16} align="middle">
                    <Col>
                      <Typography.Text><strong>1 điểm</strong> = </Typography.Text>
                    </Col>
                    <Col>
                      <Form.Item name="amountPerPoint" noStyle rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: 120 }} formatter={fmt} addonAfter="₫" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>

                <Card title="Thời hạn & chu kỳ" size="small" style={{ marginBottom: 16 }}>
                  <Form.Item
                    name="pointExpiryDays"
                    label={
                      <Space>
                        Điểm hết hạn sau (ngày)
                        <Tooltip title="Kể từ ngày tích điểm">
                          <QuestionCircleOutlined style={{ color: '#8c8c8c' }} />
                        </Tooltip>
                      </Space>
                    }
                  >
                    <InputNumber min={1} style={{ width: 160 }} addonAfter="ngày" />
                  </Form.Item>
                  <Form.Item
                    name="tierEvaluationPeriodDays"
                    label="Chu kỳ xét hạng (ngày nhìn lại)"
                  >
                    <InputNumber min={1} style={{ width: 160 }} addonAfter="ngày" />
                  </Form.Item>
                  <Form.Item name="allowTierDowngrade" valuePropName="checked" label="Cho phép hạ hạng thành viên">
                    <Switch />
                  </Form.Item>
                </Card>

                <Card
                  title="Hạng thành viên"
                  size="small"
                  extra={
                    <Button size="small" icon={<PlusOutlined />} onClick={addTier}>
                      Thêm hạng
                    </Button>
                  }
                  style={{ marginBottom: 16 }}
                >
                  <Table
                    rowKey={(_, i) => i}
                    columns={tierColumns}
                    dataSource={tiers}
                    pagination={false}
                    size="small"
                    bordered
                  />
                  <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                    Hạng đầu tiên (điểm = 0) là hạng mặc định, không thể xóa.
                  </Typography.Text>
                </Card>
              </>
            )}

            <Button type="primary" loading={saving} onClick={handleSave}>
              Lưu cài đặt
            </Button>
          </Form>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Xem trước" size="small">
            {isEnabled ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Alert
                  type="info"
                  showIcon
                  message={
                    <>
                      KH thanh toán{' '}
                      <strong>{fmt(pointsPerAmount)}₫</strong> → nhận{' '}
                      <strong>1 điểm</strong>
                    </>
                  }
                />
                <Alert
                  type="success"
                  showIcon
                  message={
                    <>
                      <strong>1 điểm</strong> = <strong>{fmt(amountPerPoint)}₫</strong> giảm giá
                    </>
                  }
                />
                <Divider style={{ margin: '8px 0' }} />
                {tiers.map((t, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography.Text>{TIER_ICONS[t.name] ?? '⭐'} {t.label}</Typography.Text>
                    <Space>
                      <Typography.Text type="secondary">từ {t.minPoints.toLocaleString()} điểm</Typography.Text>
                      {t.discountPercent > 0 && (
                        <Typography.Text type="success">CK {t.discountPercent}%</Typography.Text>
                      )}
                    </Space>
                  </div>
                ))}
              </Space>
            ) : (
              <Typography.Text type="secondary">Chương trình đang tắt</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

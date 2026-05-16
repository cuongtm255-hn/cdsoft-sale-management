import { useEffect, useState } from 'react';
import {
  Button, Card, Col, Divider, Form, Input, InputNumber, Row, Space,
  Switch, Table, Typography, message, Spin, Tooltip, Alert,
} from 'antd';
import { DeleteOutlined, PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PageHeader from '@shared/components/PageHeader';
import CompactNumberInput from '@shared/components/CompactNumberInput';
import { loyaltyApi } from '@api/tenant.api';

const TIER_ICONS = { SILVER: '🥈', GOLD: '🥇', DIAMOND: '💎' };
const fmt = (v) => Number(v || 0).toLocaleString('vi-VN');
const createTierKey = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `tier_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};
const normalizeTiers = (items = []) => items.map((tier) => ({
  ...tier,
  __key: tier.__key ?? createTierKey(),
}));

export default function LoyaltySettings() {
  const { t } = useTranslation();
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
        setTiers(normalizeTiers(cfg.tiers ?? []));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }

    if (tiers.length === 0) {
      message.error(t('loyalty.minTierRequired'));
      return;
    }

    setSaving(true);
    try {
      await loyaltyApi.updateConfig({
        ...values,
        tiers: tiers.map(({ __key, ...tier }) => tier),
      });
      message.success(t('loyalty.saveSuccess'));
    } catch {
      message.error(t('loyalty.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const addTier = () => {
    setTiers((prev) => [
      ...prev,
      {
        __key: createTierKey(),
        name: `TIER_${Date.now()}`,
        label: t('loyalty.newTier'),
        minPoints: 0,
        discountPercent: 0,
      },
    ]);
  };

  const removeTier = (idx) => {
    if (idx === 0) { message.warning(t('loyalty.cannotDeleteFirstTier')); return; }
    setTiers((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateTier = (idx, field, value) => {
    setTiers((prev) => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  if (loading) return <Spin style={{ margin: 40 }} />;

  const tierColumns = [
    {
      title: '',
      key: 'icon',
      width: 50,
      render: (_, row) => TIER_ICONS[row.name] ?? '⭐',
    },
    {
      title: t('loyalty.tierCode'),
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
      title: t('loyalty.tierLabel'),
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
      title: t('loyalty.minPoints'),
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
      title: t('loyalty.discountPercent'),
      key: 'discount',
      width: 130,
      render: (_, row, i) => (
        <CompactNumberInput
          size="small"
          min={0}
          max={100}
          value={row.discountPercent}
          onChange={(v) => updateTier(i, 'discountPercent', v ?? 0)}
          style={{ width: 100 }}
          suffix="%"
          suffixWidth={40}
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
      <PageHeader title={t('loyalty.title')} />

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Form form={form} layout="vertical">
            <Card size="small" style={{ marginBottom: 16 }}>
              <Form.Item name="isEnabled" valuePropName="checked" label={t('loyalty.enableProgram')}>
                <Switch checkedChildren={t('loyalty.on')} unCheckedChildren={t('loyalty.off')} />
              </Form.Item>
            </Card>

            {isEnabled && (
              <>
                <Card title={t('loyalty.earnRules')} size="small" style={{ marginBottom: 16 }}>
                  <Row gutter={16} align="middle">
                    <Col>
                      <Typography.Text>{t('loyalty.forEvery')}</Typography.Text>
                    </Col>
                    <Col>
                      <Form.Item name="pointsPerAmount" noStyle rules={[{ required: true }]}>
                        <CompactNumberInput min={1} style={{ width: 120 }} formatGrouped suffix="₫" />
                      </Form.Item>
                    </Col>
                    <Col>
                      <Typography.Text>{t('loyalty.earnOnePoint')}</Typography.Text>
                    </Col>
                  </Row>
                </Card>

                <Card title={t('loyalty.redeemRules')} size="small" style={{ marginBottom: 16 }}>
                  <Row gutter={16} align="middle">
                    <Col>
                      <Typography.Text><strong>1 {t('loyalty.point')}</strong> = </Typography.Text>
                    </Col>
                    <Col>
                      <Form.Item name="amountPerPoint" noStyle rules={[{ required: true }]}>
                        <CompactNumberInput min={1} style={{ width: 120 }} formatGrouped suffix="₫" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>

                <Card title={t('loyalty.expiry')} size="small" style={{ marginBottom: 16 }}>
                  <Form.Item
                    name="pointExpiryDays"
                    label={
                      <Space>
                        {t('loyalty.pointExpiry')}
                        <Tooltip title={t('loyalty.pointExpiryHint')}>
                          <QuestionCircleOutlined style={{ color: '#8c8c8c' }} />
                        </Tooltip>
                      </Space>
                    }
                  >
                    <CompactNumberInput min={1} style={{ width: 160 }} suffix={t('loyalty.days')} suffixWidth={72} />
                  </Form.Item>
                  <Form.Item
                    name="tierEvaluationPeriodDays"
                    label={t('loyalty.tierEvaluation')}
                  >
                    <CompactNumberInput min={1} style={{ width: 160 }} suffix={t('loyalty.days')} suffixWidth={72} />
                  </Form.Item>
                  <Form.Item name="allowTierDowngrade" valuePropName="checked" label={t('loyalty.allowDowngrade')}>
                    <Switch />
                  </Form.Item>
                </Card>

                <Card
                  title={t('loyalty.tiers')}
                  size="small"
                  extra={
                    <Button size="small" icon={<PlusOutlined />} onClick={addTier}>
                      {t('loyalty.addTier')}
                    </Button>
                  }
                  style={{ marginBottom: 16 }}
                >
                  <Table
                    rowKey="__key"
                    columns={tierColumns}
                    dataSource={tiers}
                    pagination={false}
                    size="small"
                    bordered
                  />
                  <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                    {t('loyalty.firstTierHint')}
                  </Typography.Text>
                </Card>
              </>
            )}

            <Button type="primary" loading={saving} onClick={handleSave}>
              {t('loyalty.saveSettings')}
            </Button>
          </Form>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={t('loyalty.preview')} size="small">
            {isEnabled ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Alert
                  type="info"
                  showIcon
                  message={
                    <>
                      {t('loyalty.previewEarn', { amount: fmt(pointsPerAmount) })}
                    </>
                  }
                />
                <Alert
                  type="success"
                  showIcon
                  message={
                    <>
                      <strong>1 {t('loyalty.point')}</strong> = <strong>{fmt(amountPerPoint)}₫</strong> {t('loyalty.discount')}
                    </>
                  }
                />
                <Divider style={{ margin: '8px 0' }} />
                {tiers.map((tier) => (
                  <div key={tier.__key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography.Text>{TIER_ICONS[tier.name] ?? '⭐'} {tier.label}</Typography.Text>
                    <Space>
                      <Typography.Text type="secondary">{t('loyalty.fromPoints', { points: tier.minPoints.toLocaleString() })}</Typography.Text>
                      {tier.discountPercent > 0 && (
                        <Typography.Text type="success">{t('loyalty.discountShort')} {tier.discountPercent}%</Typography.Text>
                      )}
                    </Space>
                  </div>
                ))}
              </Space>
            ) : (
              <Typography.Text type="secondary">{t('loyalty.programDisabled')}</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

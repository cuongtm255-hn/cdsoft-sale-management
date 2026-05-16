import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Card, Col, Descriptions, Divider, Form, InputNumber,
  Modal, Row, Select, Space, Spin, Table, Tag, Typography, Popconfirm,
} from 'antd';
import {
  PlusOutlined, CheckOutlined, LoadingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import PageHeader from '@shared/components/PageHeader';
import { useApi } from '@shared/hooks/useApi';
import { inventoryApi, warehousesApi } from '@api/tenant.api';

const STATUS_COLORS = {
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'default',
};
const STATUS_LABELS = {
  IN_PROGRESS: 'Đang kiểm kê',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

function diffColor(diff) {
  if (diff > 0) return '#52c41a';
  if (diff < 0) return '#cf1322';
  return undefined;
}

export default function StocktakingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const STATUS_COLORS = {
    IN_PROGRESS: 'blue',
    COMPLETED: 'green',
    CANCELLED: 'default',
  };
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [loadingActive, setLoadingActive] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [startForm] = Form.useForm();
  const [completeForm] = Form.useForm();
  const completeItems = Form.useWatch('items', completeForm) ?? [];

  const loadSessions = () => {
    setLoadingSessions(true);
    inventoryApi.getStocktakings()
      .then((res) => {
        const list = res.data?.data ?? res.data ?? [];
        setSessions(Array.isArray(list) ? list : []);
        // Open the latest IN_PROGRESS session if any
        const inProgress = (Array.isArray(list) ? list : []).find(
          (s) => s.status === 'IN_PROGRESS',
        );
        if (inProgress) loadActiveSession(inProgress.id);
      })
      .finally(() => setLoadingSessions(false));
  };

  const loadActiveSession = (id) => {
    setLoadingActive(true);
    inventoryApi.getStocktaking(id)
      .then((res) => {
        const session = res.data?.data ?? res.data;
        setActiveSession(session);
        completeForm.setFieldValue(
          'items',
          (session?.items ?? []).map((i) => ({
            productId: i.productId,
            systemQty: Number(i.systemQty),
            actualQty: i.actualQty != null ? Number(i.actualQty) : undefined,
          })),
        );
      })
      .finally(() => setLoadingActive(false));
  };

  useEffect(() => {
    warehousesApi.list().then((res) => {
      const list = res.data?.data ?? res.data ?? [];
      setWarehouses(list.map((w) => ({ label: w.name, value: w.id })));
    });
    loadSessions();
  }, []);

  const { execute: startSession, loading: starting } = useApi(
    (data) => inventoryApi.createStocktaking(data),
    {
      successMessage: t('inventoryPage.startStocktakingSuccess'),
      onSuccess: () => {
        setStartModalOpen(false);
        startForm.resetFields();
        loadSessions();
      },
    },
  );

  const { execute: completeSession, loading: completing } = useApi(
    (data) => inventoryApi.completeStocktaking(activeSession?.id, data),
    {
      successMessage: t('inventoryPage.completeStocktakingSuccess'),
      onSuccess: () => {
        setActiveSession(null);
        loadSessions();
      },
    },
  );

  const handleStart = (values) => {
    startSession({ warehouseId: values.warehouseId, notes: values.notes });
  };

  const handleComplete = (values) => {
    const items = values.items
      .filter((i) => i.actualQty !== undefined)
      .map((i) => ({ productId: i.productId, actualQty: Number(i.actualQty) }));
    completeSession({ items });
  };

  const sessionColumns = [
    {
      title: t('common.warehouse'),
      dataIndex: 'warehouseId',
      key: 'warehouseId',
      render: (v) => warehouses.find((w) => w.value === v)?.label ?? v,
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (v) => <Tag color={STATUS_COLORS[v]}>{v === 'IN_PROGRESS' ? t('inventoryPage.statusInProgress') : v === 'COMPLETED' ? t('inventoryPage.statusCompleted') : t('status.cancelled')}</Tag>,
    },
    {
      title: t('inventoryPage.itemCount'),
      key: 'itemCount',
      width: 120,
      render: (_, row) => `${(row.items ?? []).length} ${t('inventoryPage.productItems')}`,
    },
    {
      title: t('common.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: t('inventoryPage.completedAt'),
      dataIndex: 'completedAt',
      key: 'completedAt',
      width: 160,
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—',
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_, row) =>
        row.status === 'IN_PROGRESS' ? (
          <Button
            size="small"
            type="primary"
            onClick={() => loadActiveSession(row.id)}
          >
            {t('inventoryPage.continueSession')}
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('inventoryPage.stocktakingTitle')}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setStartModalOpen(true)}
            disabled={sessions.some((s) => s.status === 'IN_PROGRESS')}
          >
            {t('inventoryPage.newStocktaking')}
          </Button>
        }
      />

      <Table
        columns={sessionColumns}
        dataSource={sessions}
        rowKey="id"
        loading={loadingSessions}
        pagination={false}
        size="small"
        style={{ marginBottom: 24 }}
      />

      {activeSession && (
        <Card
          title={
            <Space>
              {loadingActive ? <LoadingOutlined /> : null}
              <Typography.Text strong>
                {t('inventoryPage.stocktakingTitle')} — {warehouses.find((w) => w.value === activeSession.warehouseId)?.label ?? activeSession.warehouseId}
              </Typography.Text>
              <Tag color="blue">{t('inventoryPage.statusInProgress')}</Tag>
            </Space>
          }
          extra={
            <Popconfirm
              title={t('inventoryPage.completeStocktaking')}
              onConfirm={() => completeForm.submit()}
              okText={t('inventoryPage.completeStocktaking')}
              cancelText={t('common.no')}
            >
              <Button type="primary" icon={<CheckOutlined />} loading={completing}>
                {t('inventoryPage.completeStocktaking')}
              </Button>
            </Popconfirm>
          }
        >
          <Form form={completeForm} onFinish={handleComplete}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 140px 140px 120px',
                gap: 8,
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              <span>{t('inventory.product')}</span>
              <span>{t('inventoryPage.systemQty')}</span>
              <span>{t('inventoryPage.actualQty')}</span>
              <span>{t('inventoryPage.difference')}</span>
            </div>

            <Form.List name="items">
              {(fields) => (
                <>
                  {fields.map(({ key, name }) => {
                    const item = completeItems[name] ?? {};
                    const systemQty = Number(item.systemQty ?? 0);
                    const actualQty = item.actualQty !== undefined
                      ? Number(item.actualQty)
                      : undefined;
                    const diff = actualQty !== undefined ? actualQty - systemQty : undefined;

                    return (
                      <div
                        key={key}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 140px 140px 120px',
                          gap: 8,
                          marginBottom: 8,
                          alignItems: 'start',
                        }}
                      >
                        <Form.Item name={[name, 'productId']} hidden />
                        <Form.Item name={[name, 'systemQty']} hidden />
                        <div style={{ paddingTop: 4 }}>
                          <Typography.Text>{item.productId}</Typography.Text>
                        </div>
                        <div style={{ paddingTop: 4 }}>
                          <Typography.Text>{systemQty.toLocaleString('vi-VN')}</Typography.Text>
                        </div>
                        <Form.Item name={[name, 'actualQty']} style={{ margin: 0 }}>
                          <InputNumber
                            min={0}
                            style={{ width: '100%' }}
                            placeholder={t('inventoryPage.actualQty')}
                          />
                        </Form.Item>
                        <div style={{ display: 'flex', alignItems: 'center', paddingTop: 4 }}>
                          {diff !== undefined ? (
                            <Typography.Text style={{ color: diffColor(diff), fontWeight: 500 }}>
                              {diff > 0 ? `+${diff}` : diff}
                            </Typography.Text>
                          ) : (
                            <Typography.Text type="secondary">—</Typography.Text>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </Form.List>
          </Form>
        </Card>
      )}

      <Modal
        title={t('inventoryPage.stocktakingModal')}
        open={startModalOpen}
        onCancel={() => setStartModalOpen(false)}
        onOk={() => startForm.submit()}
        confirmLoading={starting}
        okText={t('inventoryPage.startBtn')}
        cancelText={t('common.cancel')}
      >
        <Form form={startForm} layout="vertical" onFinish={handleStart}>
          <Form.Item name="warehouseId" label={t('common.warehouse')} rules={[{ required: true }]}>
            <Select options={warehouses} placeholder={t('inventoryPage.warehouseSelect')} />
          </Form.Item>
          <Form.Item name="notes" label={t('common.note')}>
            <Form.Item name="notes" noStyle>
              <input
                style={{ width: '100%', border: '1px solid #d9d9d9', borderRadius: 6, padding: '4px 11px' }}
              />
            </Form.Item>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

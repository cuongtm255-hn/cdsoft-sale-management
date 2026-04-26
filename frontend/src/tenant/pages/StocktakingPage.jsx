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
      successMessage: 'Bắt đầu kiểm kê thành công',
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
      successMessage: 'Hoàn thành kiểm kê — tồn kho đã được điều chỉnh',
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
      title: 'Kho',
      dataIndex: 'warehouseId',
      key: 'warehouseId',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (v) => <Tag color={STATUS_COLORS[v]}>{STATUS_LABELS[v] ?? v}</Tag>,
    },
    {
      title: 'Số sản phẩm',
      key: 'itemCount',
      width: 120,
      render: (_, row) => `${(row.items ?? []).length} sản phẩm`,
    },
    {
      title: 'Tạo lúc',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Hoàn thành lúc',
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
            Tiếp tục
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Kiểm kê kho"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setStartModalOpen(true)}
            disabled={sessions.some((s) => s.status === 'IN_PROGRESS')}
          >
            Bắt đầu kiểm kê mới
          </Button>
        }
      />

      {/* Bảng lịch sử kiểm kê */}
      <Table
        columns={sessionColumns}
        dataSource={sessions}
        rowKey="id"
        loading={loadingSessions}
        pagination={false}
        size="small"
        style={{ marginBottom: 24 }}
      />

      {/* Active stocktaking session */}
      {activeSession && (
        <Card
          title={
            <Space>
              {loadingActive ? <LoadingOutlined /> : null}
              <Typography.Text strong>
                Kiểm kê — {activeSession.warehouseId}
              </Typography.Text>
              <Tag color="blue">Đang kiểm kê</Tag>
            </Space>
          }
          extra={
            <Popconfirm
              title={`Hệ thống sẽ tự động điều chỉnh các mặt hàng có chênh lệch. Tiếp tục?`}
              onConfirm={() => completeForm.submit()}
              okText="Hoàn thành kiểm kê"
              cancelText="Không"
            >
              <Button type="primary" icon={<CheckOutlined />} loading={completing}>
                Hoàn thành kiểm kê
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
              <span>Sản phẩm</span>
              <span>SL sổ sách</span>
              <span>SL thực tế</span>
              <span>Chênh lệch</span>
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
                            placeholder="Nhập SL thực tế"
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

      {/* Modal bắt đầu kiểm kê */}
      <Modal
        title="Bắt đầu phiên kiểm kê mới"
        open={startModalOpen}
        onCancel={() => setStartModalOpen(false)}
        onOk={() => startForm.submit()}
        confirmLoading={starting}
        okText="Bắt đầu"
        cancelText="Hủy"
      >
        <Form form={startForm} layout="vertical" onFinish={handleStart}>
          <Form.Item name="warehouseId" label="Kho kiểm kê" rules={[{ required: true }]}>
            <Select options={warehouses} placeholder="Chọn kho" />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Form.Item name="notes" noStyle>
              <input
                style={{ width: '100%', border: '1px solid #d9d9d9', borderRadius: 6, padding: '4px 11px' }}
                placeholder="Kiểm kê định kỳ tháng 4/2026"
              />
            </Form.Item>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

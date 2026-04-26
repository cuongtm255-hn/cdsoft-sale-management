import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Card, Col, Descriptions, Divider, Form,
  InputNumber, Row, Space, Spin, Table, Tooltip, Typography,
} from 'antd';
import { ArrowLeftOutlined, CheckOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import { useApi } from '@shared/hooks/useApi';
import { inventoryApi } from '@api/tenant.api';

export default function TransferReceivePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  const receivedItems = Form.useWatch('items', form) ?? [];

  useEffect(() => {
    setLoading(true);
    inventoryApi.getTransfer(id)
      .then((res) => {
        const t = res.data?.data ?? res.data;
        setTransfer(t);
        // Pre-fill form with transfer quantities
        form.setFieldValue(
          'items',
          (t?.items ?? []).map((i) => ({
            productId: i.productId,
            transferQty: Number(i.quantity),
            receivedQty: Number(i.quantity),
          })),
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  const { execute: submit, loading: submitting } = useApi(
    (data) => inventoryApi.receiveTransfer(id, data),
    {
      successMessage: 'Xác nhận nhận hàng thành công',
      onSuccess: () => navigate(`/tenant/inventory/transfers/${id}`),
    },
  );

  const handleSubmit = (values) => {
    submit({
      items: values.items.map((i) => ({
        productId: i.productId,
        receivedQty: Number(i.receivedQty ?? i.transferQty),
      })),
    });
  };

  if (loading) return <Spin style={{ display: 'block', marginTop: 80 }} />;
  if (!transfer) return null;

  return (
    <div>
      <PageHeader
        title={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              type="text"
              onClick={() => navigate(`/tenant/inventory/transfers/${id}`)}
            />
            Xác nhận nhận hàng — {transfer.fromWarehouseId} → {transfer.toWarehouseId}
          </Space>
        }
      />

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={3} size="small">
          <Descriptions.Item label="Kho đi">{transfer.fromWarehouseId}</Descriptions.Item>
          <Descriptions.Item label="Kho đến">{transfer.toWarehouseId}</Descriptions.Item>
          <Descriptions.Item label="Ngày dự kiến">
            {transfer.expectedDate ? dayjs(transfer.expectedDate).format('DD/MM/YYYY') : '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Form form={form} onFinish={handleSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 140px 140px 100px',
              gap: 8,
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            <span>Sản phẩm</span>
            <span>SL điều chuyển</span>
            <span>SL thực nhận</span>
            <span>Chênh lệch</span>
          </div>

          <Form.List name="items">
            {(fields) => (
              <>
                {fields.map(({ key, name }) => {
                  const item = receivedItems[name] ?? {};
                  const transferQty = Number(item.transferQty ?? 0);
                  const receivedQty = Number(item.receivedQty ?? transferQty);
                  const diff = receivedQty - transferQty;

                  return (
                    <div
                      key={key}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 140px 140px 100px',
                        gap: 8,
                        marginBottom: 8,
                        alignItems: 'start',
                      }}
                    >
                      <Form.Item name={[name, 'productId']} hidden />
                      <div style={{ paddingTop: 4 }}>
                        <Typography.Text>{item.productId}</Typography.Text>
                      </div>
                      <div style={{ paddingTop: 4 }}>
                        <Typography.Text>{transferQty.toLocaleString('vi-VN')}</Typography.Text>
                      </div>
                      <Form.Item name={[name, 'receivedQty']} style={{ margin: 0 }}>
                        <InputNumber
                          min={0}
                          style={{ width: '100%' }}
                          placeholder="SL thực nhận"
                        />
                      </Form.Item>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: 4 }}>
                        {diff < 0 ? (
                          <Tooltip title={`Chênh lệch ${Math.abs(diff)} sẽ được điều chỉnh tự động tại kho đi`}>
                            <Space size={4}>
                              <Typography.Text style={{ color: '#cf1322', fontWeight: 500 }}>
                                {diff}
                              </Typography.Text>
                              <WarningOutlined style={{ color: '#faad14' }} />
                            </Space>
                          </Tooltip>
                        ) : diff > 0 ? (
                          <Typography.Text style={{ color: '#52c41a', fontWeight: 500 }}>
                            +{diff}
                          </Typography.Text>
                        ) : (
                          <Typography.Text type="secondary">0</Typography.Text>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </Form.List>

          <Divider />
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<CheckOutlined />}
              loading={submitting}
            >
              Xác nhận đã nhận
            </Button>
            <Button onClick={() => navigate(-1)}>Huỷ</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}

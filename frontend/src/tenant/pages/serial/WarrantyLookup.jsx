import { useState } from 'react';
import {
  Alert, Button, Card, Col, Descriptions, Input, Progress, Row, Space, Spin, Tag, Timeline, Typography,
} from 'antd';
import { BarcodeOutlined, SearchOutlined, ToolOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import { serialApi } from '@api/tenant.api';

const { Text, Title } = Typography;

function warrantyStatus(daysRemaining) {
  if (daysRemaining === null || daysRemaining === undefined) return null;
  if (daysRemaining <= 0) return { color: 'error', label: 'Hết bảo hành', tagColor: 'red' };
  if (daysRemaining <= 30) return { color: 'exception', label: 'Sắp hết bảo hành', tagColor: 'orange' };
  if (daysRemaining <= 90) return { color: 'normal', label: 'Còn bảo hành', tagColor: 'gold' };
  return { color: 'success', label: 'Còn bảo hành', tagColor: 'green' };
}

export default function WarrantyLookup() {
  const [query, setQuery]   = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await serialApi.warrantyLookup(q);
      setResult(res.data?.data ?? res.data);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Không tìm thấy thông tin bảo hành');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') search();
  };

  const status = result ? warrantyStatus(result.warrantyDaysRemaining) : null;

  const warrantyPercent = (() => {
    if (!result?.warrantyExpiry || !result?.purchasedAt) return null;
    const total = dayjs(result.warrantyExpiry).diff(dayjs(result.purchasedAt), 'day');
    if (total <= 0) return 0;
    const remaining = result.warrantyDaysRemaining ?? 0;
    return Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));
  })();

  return (
    <div>
      <PageHeader title="Tra cứu bảo hành" />

      <Card style={{ maxWidth: 640, margin: '0 auto 24px' }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            size="large"
            placeholder="Nhập Serial Number hoặc IMEI"
            prefix={<BarcodeOutlined />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            allowClear
          />
          <Button size="large" type="primary" icon={<SearchOutlined />} onClick={search} loading={loading}>
            Tra cứu
          </Button>
        </Space.Compact>
      </Card>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" tip="Đang tra cứu..." />
        </div>
      )}

      {error && (
        <Alert
          type="error"
          message="Không tìm thấy"
          description={error}
          showIcon
          style={{ maxWidth: 640, margin: '0 auto' }}
        />
      )}

      {result && (
        <Row gutter={16} style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* Product & serial info */}
          <Col xs={24} md={14}>
            <Card
              title={
                <Space>
                  <Title level={5} style={{ margin: 0 }}>{result.product?.name}</Title>
                  <Tag color="blue">{result.product?.sku}</Tag>
                </Space>
              }
              size="small"
              style={{ marginBottom: 16 }}
            >
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Serial Number">
                  <Text strong copyable>{result.serialNumber}</Text>
                </Descriptions.Item>
                {result.imei && (
                  <Descriptions.Item label="IMEI">
                    <Text copyable>{result.imei}</Text>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Trạng thái">
                  <Tag color={
                    result.status === 'SOLD' ? 'blue'
                    : result.status === 'RETURNED' ? 'orange'
                    : result.status === 'DEFECTIVE' ? 'red'
                    : 'green'
                  }>
                    {result.status === 'IN_STOCK' ? 'Còn trong kho'
                     : result.status === 'SOLD' ? 'Đã bán'
                     : result.status === 'RETURNED' ? 'Đã trả hàng'
                     : 'Lỗi / Hỏng'}
                  </Tag>
                </Descriptions.Item>
                {result.purchasedAt && (
                  <Descriptions.Item label="Ngày bán">
                    {dayjs(result.purchasedAt).format('DD/MM/YYYY')}
                  </Descriptions.Item>
                )}
                {result.customer?.name && (
                  <Descriptions.Item label="Khách hàng">{result.customer.name}</Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          </Col>

          {/* Warranty card */}
          <Col xs={24} md={10}>
            <Card
              title={
                <Space>
                  <ToolOutlined />
                  <span>Bảo hành</span>
                </Space>
              }
              size="small"
              style={{ marginBottom: 16 }}
            >
              {result.warrantyExpiry ? (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <Tag color={status?.tagColor} style={{ fontSize: 13, padding: '4px 12px' }}>
                      {status?.label}
                    </Tag>
                  </div>

                  {warrantyPercent !== null && (
                    <Progress
                      percent={warrantyPercent}
                      status={status?.color}
                      strokeColor={
                        status?.color === 'success' ? '#52c41a'
                        : status?.color === 'normal' ? '#faad14'
                        : status?.color === 'exception' ? '#ff7a00'
                        : '#ff4d4f'
                      }
                      style={{ marginBottom: 12 }}
                    />
                  )}

                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Hết hạn bảo hành">
                      <Text strong>{dayjs(result.warrantyExpiry).format('DD/MM/YYYY')}</Text>
                    </Descriptions.Item>
                    {(result.warrantyDaysRemaining ?? 0) > 0 ? (
                      <Descriptions.Item label="Còn lại">
                        <Text type="success">{result.warrantyDaysRemaining} ngày</Text>
                      </Descriptions.Item>
                    ) : (
                      <Descriptions.Item label="Tình trạng">
                        <Text type="danger">Đã hết bảo hành</Text>
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </>
              ) : (
                <Text type="secondary">Không có thông tin bảo hành</Text>
              )}
            </Card>

            {/* Timeline */}
            {result.history?.length > 0 && (
              <Card title="Lịch sử sửa chữa" size="small">
                <Timeline
                  items={result.history.map((h) => ({
                    color: h.type === 'repair' ? 'blue' : 'green',
                    children: (
                      <>
                        <Text strong style={{ fontSize: 12 }}>{h.description}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {dayjs(h.date).format('DD/MM/YYYY')}
                        </Text>
                      </>
                    ),
                  }))}
                />
              </Card>
            )}
          </Col>
        </Row>
      )}
    </div>
  );
}

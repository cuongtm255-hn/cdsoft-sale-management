import { useEffect, useState } from 'react';
import { Card, Col, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import { serialApi, warehousesApi } from '@api/tenant.api';

const { Text } = Typography;

function urgencyColor(days) {
  if (days <= 0)  return 'red';
  if (days <= 30) return 'red';
  if (days <= 60) return 'orange';
  return 'gold';
}

export default function ExpiryAlerts() {
  const [daysAhead, setDaysAhead]   = useState(90);
  const [warehouseId, setWarehouseId] = useState(undefined);
  const [warehouses, setWarehouses] = useState([]);
  const [data, setData]             = useState([]);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    warehousesApi.list().then((res) => setWarehouses(res.data?.data ?? res.data ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    serialApi.expiryAlerts({ daysAhead, warehouseId })
      .then((res) => setData(res.data?.data ?? res.data ?? []))
      .finally(() => setLoading(false));
  }, [daysAhead, warehouseId]);

  const now       = new Date();
  const expired   = data.filter((d) => new Date(d.expiryDate) < now);
  const soon30    = data.filter((d) => { const ms = new Date(d.expiryDate) - now; return ms > 0 && ms <= 30 * 86400000; });
  const totalValue = data.reduce((s, d) => s + Number(d.remainingQty) * Number(d.costPerUnit), 0);

  const columns = [
    {
      title: 'Sản phẩm', key: 'product',
      render: (_, r) => (
        <>
          <strong>{r.product?.name}</strong>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{r.product?.sku}</Text>
        </>
      ),
    },
    { title: 'Kho', dataIndex: ['warehouse', 'name'], key: 'warehouse', width: 130 },
    {
      title: 'Số lô', dataIndex: 'batchNumber', key: 'batch', width: 130,
      render: (v) => v ?? <Text type="secondary">—</Text>,
    },
    {
      title: 'Hạn sử dụng', dataIndex: 'expiryDate', key: 'expiry', width: 160,
      sorter: (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate),
      defaultSortOrder: 'ascend',
      render: (v, r) => (
        <Space direction="vertical" size={0}>
          <Text>{dayjs(v).format('DD/MM/YYYY')}</Text>
          <Tag color={urgencyColor(r.daysUntilExpiry)}>
            {r.daysUntilExpiry <= 0 ? 'ĐÃ HẾT HẠN' : `Còn ${r.daysUntilExpiry} ngày`}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Tồn kho', dataIndex: 'remainingQty', key: 'qty', width: 100, align: 'right',
      render: (v) => <Text strong>{Number(v).toLocaleString('vi-VN')}</Text>,
    },
    {
      title: 'Giá trị', key: 'value', width: 130, align: 'right',
      render: (_, r) => `${(Number(r.costPerUnit) * Number(r.remainingQty)).toLocaleString('vi-VN')}₫`,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Hàng sắp hết hạn sử dụng"
        extra={
          <Space>
            <Select
              value={daysAhead}
              onChange={setDaysAhead}
              style={{ width: 160 }}
              options={[
                { value: 30,  label: 'Trong 30 ngày' },
                { value: 60,  label: 'Trong 60 ngày' },
                { value: 90,  label: 'Trong 90 ngày' },
                { value: 180, label: 'Trong 180 ngày' },
              ]}
            />
            <Select
              value={warehouseId}
              onChange={setWarehouseId}
              placeholder="Tất cả kho"
              allowClear
              style={{ width: 160 }}
              options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
            />
          </Space>
        }
      />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Đã hết hạn"
              value={expired.length}
              suffix="lô"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Hết hạn trong 30 ngày"
              value={soon30.length}
              suffix="lô"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Tổng giá trị sắp hết hạn"
              value={totalValue.toLocaleString('vi-VN')}
              suffix="₫"
            />
          </Card>
        </Col>
      </Row>

      <Card size="small">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 20 }}
          rowClassName={(r) => new Date(r.expiryDate) < now ? 'row-expired' : ''}
          locale={{ emptyText: 'Không có lô hàng nào sắp hết hạn' }}
        />
      </Card>
    </div>
  );
}

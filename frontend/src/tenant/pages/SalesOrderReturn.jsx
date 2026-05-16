import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Checkbox, InputNumber, Select, Typography, Divider, message, Spin, Space, Table,
} from 'antd';
import PageHeader from '@shared/components/PageHeader';
import { useApi } from '@shared/hooks/useApi';
import { salesOrdersApi, returnsApi } from '@api/tenant.api';

const fmt = (v) => Number(v || 0).toLocaleString('vi-VN') + '₫';

const REFUND_OPTIONS = [
  { label: 'Tiền mặt', value: 'CASH' },
  { label: 'Số dư tài khoản (CREDIT)', value: 'CREDIT' },
  { label: 'Cấn trừ công nợ', value: 'DEBT_OFFSET' },
];

export default function SalesOrderReturn() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState({});
  const [returnQtys, setReturnQtys] = useState({});
  const [refundMethod, setRefundMethod] = useState('CASH');

  const { execute: createReturn, loading: saving } = useApi(returnsApi.create);

  useEffect(() => {
    salesOrdersApi.get(id).then((r) => {
      const o = r.data?.data ?? r.data;
      setOrder(o);
      const qtys = {};
      (o.items ?? []).forEach((i) => { qtys[i.id] = 1; });
      setReturnQtys(qtys);
    }).finally(() => setLoading(false));
  }, [id]);

  const toggleItem = (itemId, checked) => {
    setSelectedItems((prev) => ({ ...prev, [itemId]: checked }));
  };

  const getEffectivePrice = (item) =>
    Number(item.unitPrice) * (1 - Number(item.discountPercent ?? 0) / 100);

  const totalRefund = (order?.items ?? [])
    .filter((i) => selectedItems[i.id])
    .reduce((s, i) => s + getEffectivePrice(i) * (returnQtys[i.id] ?? 0), 0);

  const handleSubmit = async () => {
    const selected = (order?.items ?? []).filter((i) => selectedItems[i.id]);
    if (selected.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 sản phẩm để trả');
      return;
    }

    const payload = {
      originalOrderId: id,
      reason: 'Trả hàng',
      refundMethod,
      items: selected.map((i) => ({
        orderItemId: i.id,
        returnQty: returnQtys[i.id] ?? 1,
      })),
    };

    try {
      await createReturn(payload);
      message.success('Đã xử lý trả hàng thành công');
      navigate(`/tenant/sales-orders/${id}`);
    } catch {
      message.error('Xử lý trả hàng thất bại');
    }
  };

  if (loading) return <Spin style={{ margin: 40 }} />;
  if (!order) return <Typography.Text type="danger">Không tìm thấy đơn hàng</Typography.Text>;

  const columns = [
    {
      title: '',
      key: 'check',
      width: 40,
      render: (_, row) => (
        <Checkbox
          checked={!!selectedItems[row.id]}
          onChange={(e) => toggleItem(row.id, e.target.checked)}
        />
      ),
    },
    { title: 'Sản phẩm', dataIndex: 'productId', key: 'product' },
    {
      title: 'SL đã mua',
      dataIndex: 'quantity',
      key: 'origQty',
      width: 110,
    },
    {
      title: 'SL trả',
      key: 'returnQty',
      width: 120,
      render: (_, row) =>
        selectedItems[row.id] ? (
          <InputNumber
            size="small"
            min={0.0001}
            max={Number(row.quantity)}
            value={returnQtys[row.id] ?? 1}
            onChange={(v) => setReturnQtys((prev) => ({ ...prev, [row.id]: v }))}
            style={{ width: 80 }}
          />
        ) : '—',
    },
    {
      title: 'Đơn giá gốc',
      key: 'price',
      width: 130,
      render: (_, row) => fmt(getEffectivePrice(row)),
    },
    {
      title: 'Thành tiền',
      key: 'total',
      width: 130,
      render: (_, row) =>
        selectedItems[row.id]
          ? <Typography.Text strong>{fmt(getEffectivePrice(row) * (returnQtys[row.id] ?? 0))}</Typography.Text>
          : '—',
    },
  ];

  return (
    <div>
      <PageHeader title={`Trả hàng — ${order.code}`} />
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        KH: <strong>{order.customer?.name ?? order.customerId}</strong>
        {' · '}Ngày mua: <strong>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</strong>
      </Typography.Text>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={order.items ?? []}
        pagination={false}
        size="small"
        bordered
      />

      <Divider />

      <Space direction="vertical">
        <div>
          <Typography.Text>Phương thức hoàn tiền: </Typography.Text>
          <Select
            value={refundMethod}
            options={REFUND_OPTIONS}
            onChange={setRefundMethod}
            style={{ width: 240 }}
          />
        </div>
        <Typography.Text strong style={{ fontSize: 16 }}>
          Tổng hoàn trả: {fmt(totalRefund)}
        </Typography.Text>
        <Space>
          <Button onClick={() => navigate(-1)}>Hủy</Button>
          <Button type="primary" loading={saving} onClick={handleSubmit}>
            Xác nhận trả hàng
          </Button>
        </Space>
      </Space>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Descriptions, Space, Spin, Table, Typography, message, Popconfirm,
} from 'antd';
import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import OrderStatusBadge from '@shared/components/OrderStatusBadge';
import { purchaseOrdersApi } from '@api/tenant.api';
import { printPurchaseOrder } from '@shared/utils/printDocument';

const fmt = (v) => Number(v ?? 0).toLocaleString('vi-VN') + ' ₫';
const PAYMENT_LABELS = { CASH: 'Tiền mặt', BANK_TRANSFER: 'Chuyển khoản', CREDIT: 'Công nợ' };

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = () => {
    setLoading(true);
    purchaseOrdersApi.get(id)
      .then((r) => setOrder(r.data?.data ?? r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleConfirm = async () => {
    setActing(true);
    try {
      await purchaseOrdersApi.confirm(id);
      message.success('Đã xác nhận đơn hàng');
      load();
    } catch { message.error('Thao tác thất bại'); }
    finally { setActing(false); }
  };

  const handleReceive = async () => {
    setActing(true);
    try {
      await purchaseOrdersApi.receive(id);
      message.success('Đã nhập hàng thành công');
      load();
    } catch { message.error('Thao tác thất bại'); }
    finally { setActing(false); }
  };

  const handleCancel = async () => {
    setActing(true);
    try {
      await purchaseOrdersApi.cancel(id, { reason: 'Hủy bởi người dùng' });
      message.success('Đã hủy đơn hàng');
      load();
    } catch { message.error('Thao tác thất bại'); }
    finally { setActing(false); }
  };

  if (loading) return <Spin style={{ display: 'block', marginTop: 80 }} />;
  if (!order) return <Typography.Text type="danger">Không tìm thấy đơn hàng</Typography.Text>;

  const isDraft = order.status === 'DRAFT';
  const isConfirmed = order.status === 'CONFIRMED';

  const columns = [
    {
      title: 'STT', key: 'idx', width: 48,
      render: (_, __, i) => i + 1,
    },
    {
      title: 'Sản phẩm', key: 'product',
      render: (_, row) => row.productName ?? row.productId,
    },
    {
      title: 'Số lượng', dataIndex: 'quantity', key: 'qty', align: 'right', width: 110,
      render: (v) => Number(v).toLocaleString('vi-VN'),
    },
    {
      title: 'Đơn giá', key: 'price', align: 'right', width: 140,
      render: (_, row) => fmt(row.unit_price ?? row.unitPrice),
    },
    {
      title: 'Thành tiền', key: 'total', align: 'right', width: 150,
      render: (_, row) => (
        <Typography.Text strong>
          {fmt(Number(row.unit_price ?? row.unitPrice) * Number(row.quantity))}
        </Typography.Text>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/tenant/purchase-orders')} />
            {order.code}
            <OrderStatusBadge status={order.status} />
          </Space>
        }
        extra={
          <Space>
            <Button icon={<PrinterOutlined />} onClick={() => printPurchaseOrder(order)}>In phiếu</Button>
            {isDraft && <Button type="primary" loading={acting} onClick={handleConfirm}>Xác nhận đơn</Button>}
            {isConfirmed && <Button loading={acting} onClick={handleReceive}>Nhập hàng</Button>}
            {(isDraft || isConfirmed) && (
              <Popconfirm title="Hủy đơn này?" onConfirm={handleCancel} okText="Hủy đơn" cancelText="Không" okButtonProps={{ danger: true }}>
                <Button danger loading={acting}>Hủy đơn</Button>
              </Popconfirm>
            )}
          </Space>
        }
      />

      <Descriptions bordered column={2} size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Nhà cung cấp">{order.supplier?.name ?? order.supplierId ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Ngày tạo">{dayjs(order.createdAt ?? order.created_at).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
        <Descriptions.Item label="Kho nhập">{order.warehouse?.name ?? order.warehouseId ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Hình thức TT">{PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod ?? '—'}</Descriptions.Item>
        {order.confirmedAt && (
          <Descriptions.Item label="Ngày xác nhận">
            {dayjs(order.confirmedAt).format('DD/MM/YYYY HH:mm')}
          </Descriptions.Item>
        )}
        {order.notes && <Descriptions.Item label="Ghi chú" span={2}>{order.notes}</Descriptions.Item>}
      </Descriptions>

      <Table
        columns={columns}
        dataSource={order.items ?? []}
        rowKey="id"
        size="small"
        pagination={false}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell colSpan={4} align="right"><strong>Tổng cộng:</strong></Table.Summary.Cell>
            <Table.Summary.Cell align="right">
              <Typography.Text strong style={{ color: '#1677ff', fontSize: 15 }}>
                {fmt(order.totalAmount ?? order.total_amount)}
              </Typography.Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </div>
  );
}

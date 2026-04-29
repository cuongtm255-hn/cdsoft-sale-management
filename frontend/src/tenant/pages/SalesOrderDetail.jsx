import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Space, Descriptions, Divider, Modal, Input, message, Spin, Typography,
} from 'antd';
import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
import OrderStatusBadge from '@shared/components/OrderStatusBadge';
import OrderItemsTable from '@shared/components/OrderItemsTable';
import OrderSummaryPanel from '@shared/components/OrderSummaryPanel';
import { useApi } from '@shared/hooks/useApi';
import { salesOrdersApi } from '@api/tenant.api';
import { printSalesOrder } from '@shared/utils/printDocument';
import dayjs from 'dayjs';

const fmt = (v) => Number(v || 0).toLocaleString('vi-VN') + '₫';

export default function SalesOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const { execute: confirm } = useApi(salesOrdersApi.confirm);
  const { execute: ship } = useApi(salesOrdersApi.ship);
  const { execute: complete } = useApi(salesOrdersApi.complete);
  const { execute: cancel } = useApi(salesOrdersApi.cancel);

  const load = async () => {
    setLoading(true);
    try {
      const res = await salesOrdersApi.get(id);
      setOrder(res.data?.data ?? res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleConfirm = async () => {
    try {
      await confirm(id);
      message.success('Đơn hàng đã được xác nhận');
      load();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.message === 'INSUFFICIENT_STOCK' || data?.items) {
        Modal.error({
          title: 'Không đủ tồn kho',
          content: (
            <ul>
              {(data.items ?? []).map((item, i) => (
                <li key={i}>
                  {item.productName}: cần {item.needed}, còn {item.available}
                </li>
              ))}
            </ul>
          ),
        });
      } else {
        message.error('Xác nhận đơn thất bại');
      }
    }
  };

  const handleShip = async () => {
    try {
      await ship(id);
      message.success('Đã chuyển sang trạng thái đang giao');
      load();
    } catch {
      message.error('Thao tác thất bại');
    }
  };

  const handleComplete = async () => {
    try {
      await complete(id);
      message.success('Đơn hàng đã hoàn thành');
      load();
    } catch {
      message.error('Thao tác thất bại');
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      message.warning('Vui lòng nhập lý do hủy');
      return;
    }
    try {
      await cancel(id, { reason: cancelReason });
      message.success('Đơn hàng đã được hủy');
      setCancelModal(false);
      load();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.message === 'ORDER_HAS_PAYMENT') {
        message.error(`Đơn hàng đã có ${fmt(data.paidAmount)} thanh toán. Vui lòng xử lý hoàn tiền trước.`);
      } else {
        message.error('Hủy đơn thất bại');
      }
    }
  };

  if (loading) return <Spin style={{ margin: 40 }} />;
  if (!order) return <Typography.Text type="danger">Không tìm thấy đơn hàng</Typography.Text>;

  const isDraft = order.status === 'DRAFT';
  const isConfirmed = order.status === 'CONFIRMED';
  const isDelivering = order.status === 'DELIVERING';
  const isDelivered = order.status === 'DELIVERED';
  const canCancel = ['DRAFT', 'CONFIRMED'].includes(order.status);

  return (
    <div>
      <PageHeader
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tenant/sales-orders')} />
            {order.code}
            <OrderStatusBadge status={order.status} />
          </Space>
        }
        extra={
          <Space>
            <Button icon={<PrinterOutlined />} onClick={() => printSalesOrder(order)}>In phiếu</Button>
            {isDraft && <Button onClick={handleConfirm} type="primary">Xác nhận</Button>}
            {isConfirmed && <Button onClick={handleShip}>Xuất kho / Giao hàng</Button>}
            {isDelivering && <Button type="primary" onClick={handleComplete}>Hoàn thành</Button>}
            {(isConfirmed || isDelivered) && (
              <Button onClick={() => navigate(`/tenant/sales-orders/${id}/return`)}>Trả hàng</Button>
            )}
            {canCancel && (
              <Button danger onClick={() => setCancelModal(true)}>Hủy đơn</Button>
            )}
          </Space>
        }
      />

      <Descriptions bordered column={2} size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Khách hàng">{order.customer?.name ?? order.customerId}</Descriptions.Item>
        <Descriptions.Item label="Ngày tạo">{dayjs(order.createdAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
        <Descriptions.Item label="NV phụ trách">{order.salesRep?.name ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Kho xuất">{order.warehouseId ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Hình thức TT">{order.paymentMethod ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Địa chỉ giao">{order.shippingAddress ?? '—'}</Descriptions.Item>
        {order.notes && <Descriptions.Item label="Ghi chú" span={2}>{order.notes}</Descriptions.Item>}
        {order.confirmedAt && (
          <Descriptions.Item label="Ngày xác nhận">
            {dayjs(order.confirmedAt).format('DD/MM/YYYY HH:mm')}
          </Descriptions.Item>
        )}
        {order.cancelReason && (
          <Descriptions.Item label="Lý do hủy" span={2}>
            <Typography.Text type="danger">{order.cancelReason}</Typography.Text>
          </Descriptions.Item>
        )}
      </Descriptions>

      <Divider orientation="left">Sản phẩm</Divider>
      <OrderItemsTable items={order.items ?? []} editable={false} />

      <Divider />
      <OrderSummaryPanel
        subtotal={order.subtotal}
        discountTotal={order.discountTotal}
        voucherDiscount={order.voucherDiscount}
        totalAmount={order.totalAmount}
      />
      {order.paidAmount > 0 && (
        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <Typography.Text>Đã thanh toán: <strong>{fmt(order.paidAmount)}</strong></Typography.Text>
          <br />
          <Typography.Text type={order.totalAmount > order.paidAmount ? 'danger' : 'success'}>
            Còn nợ: <strong>{fmt(order.totalAmount - order.paidAmount)}</strong>
          </Typography.Text>
        </div>
      )}

      <Modal
        title="Hủy đơn hàng"
        open={cancelModal}
        onOk={handleCancel}
        onCancel={() => setCancelModal(false)}
        okText="Xác nhận hủy"
        okButtonProps={{ danger: true }}
      >
        <p>Vui lòng nhập lý do hủy đơn hàng <strong>{order.code}</strong>:</p>
        <Input.TextArea
          rows={3}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Lý do hủy..."
        />
      </Modal>
    </div>
  );
}

import { Descriptions, Typography } from 'antd';

const fmt = (v) => Number(v || 0).toLocaleString('vi-VN') + '₫';

export default function OrderSummaryPanel({ subtotal = 0, discountTotal = 0, voucherDiscount = 0, totalAmount = 0 }) {
  return (
    <Descriptions column={1} size="small" style={{ maxWidth: 320, marginLeft: 'auto' }}>
      <Descriptions.Item label="Tạm tính">{fmt(subtotal)}</Descriptions.Item>
      {discountTotal > 0 && (
        <Descriptions.Item label="Chiết khấu SP">
          <Typography.Text type="danger">- {fmt(discountTotal)}</Typography.Text>
        </Descriptions.Item>
      )}
      {voucherDiscount > 0 && (
        <Descriptions.Item label="Voucher">
          <Typography.Text type="danger">- {fmt(voucherDiscount)}</Typography.Text>
        </Descriptions.Item>
      )}
      <Descriptions.Item label={<strong>Tổng cộng</strong>}>
        <Typography.Text strong style={{ fontSize: 16, color: '#1677ff' }}>
          {fmt(totalAmount)}
        </Typography.Text>
      </Descriptions.Item>
    </Descriptions>
  );
}

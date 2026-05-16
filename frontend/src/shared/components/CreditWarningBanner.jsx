import { Alert } from 'antd';

const fmt = (v) => Number(v || 0).toLocaleString('vi-VN') + '₫';

export default function CreditWarningBanner({ creditLimit, currentDebt, orderTotal }) {
  if (!creditLimit || creditLimit <= 0) return null;
  const overflow = currentDebt + orderTotal - creditLimit;
  if (overflow <= 0) return null;

  return (
    <Alert
      type="warning"
      showIcon
      style={{ marginBottom: 16 }}
      message={
        <>
          Khách hàng đang nợ <strong>{fmt(currentDebt)}</strong> / hạn mức{' '}
          <strong>{fmt(creditLimit)}</strong>.
          Đơn hàng này sẽ vượt hạn mức <strong>{fmt(overflow)}</strong>. Tiếp tục?
        </>
      }
    />
  );
}

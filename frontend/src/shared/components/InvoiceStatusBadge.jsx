import { Tag } from 'antd';

const CONFIG = {
  UNPAID:          { color: 'red',     label: 'Chưa thanh toán' },
  PARTIALLY_PAID:  { color: 'orange',  label: 'Thanh toán 1 phần' },
  PAID:            { color: 'green',   label: 'Đã thanh toán' },
  CANCELLED:       { color: 'default', label: 'Đã hủy' },
};

export default function InvoiceStatusBadge({ status }) {
  const cfg = CONFIG[status] ?? { color: 'default', label: status };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
}

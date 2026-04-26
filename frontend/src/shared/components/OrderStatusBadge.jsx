import { Tag } from 'antd';

const STATUS_CONFIG = {
  DRAFT:              { color: 'default',  label: 'Nháp' },
  CONFIRMED:          { color: 'blue',     label: 'Đã xác nhận' },
  DELIVERING:         { color: 'orange',   label: 'Đang giao' },
  DELIVERED:          { color: 'green',    label: 'Đã giao' },
  CANCELLED:          { color: 'red',      label: 'Đã hủy' },
  PARTIALLY_RETURNED: { color: 'purple',   label: 'Trả 1 phần' },
  FULLY_RETURNED:     { color: 'magenta',  label: 'Đã trả hàng' },
};

export default function OrderStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { color: 'default', label: status };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
}

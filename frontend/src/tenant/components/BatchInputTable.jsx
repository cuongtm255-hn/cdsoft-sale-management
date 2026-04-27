import { DatePicker, Input } from 'antd';
import dayjs from 'dayjs';

export default function BatchFields({ item, onChange }) {
  if (!item?.product?.trackBatch) return null;

  return (
    <>
      <Input
        placeholder="Số lô (VD: LOT-2026-04)"
        value={item.batchNumber ?? ''}
        onChange={(e) => onChange({ ...item, batchNumber: e.target.value })}
        style={{ marginBottom: 4 }}
        size="small"
      />
      <DatePicker
        placeholder="Hạn sử dụng"
        value={item.expiryDate ? dayjs(item.expiryDate) : null}
        onChange={(d) => onChange({ ...item, expiryDate: d?.format('YYYY-MM-DD') ?? null })}
        disabledDate={(d) => d && d.isBefore(dayjs())}
        style={{ width: '100%' }}
        size="small"
        format="DD/MM/YYYY"
      />
    </>
  );
}

export function validateBatchItems(items) {
  for (const item of items) {
    if (item.product?.trackBatch) {
      if (!item.batchNumber) return `Vui lòng nhập số lô cho: ${item.product.name}`;
      if (!item.expiryDate)  return `Vui lòng nhập hạn sử dụng cho: ${item.product.name}`;
    }
  }
  return null;
}

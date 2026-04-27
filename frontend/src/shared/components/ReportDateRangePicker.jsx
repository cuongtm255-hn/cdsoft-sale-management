import { DatePicker, Space } from 'antd';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const PRESETS = [
  { label: 'Tháng này',    value: [dayjs().startOf('month'), dayjs().endOf('month')] },
  { label: 'Tháng trước',  value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
  { label: 'Quý này',      value: [dayjs().startOf('quarter'), dayjs().endOf('quarter')] },
  { label: 'Quý trước',    value: [dayjs().subtract(1, 'quarter').startOf('quarter'), dayjs().subtract(1, 'quarter').endOf('quarter')] },
  { label: 'Năm nay',      value: [dayjs().startOf('year'), dayjs().endOf('year')] },
  { label: '7 ngày qua',   value: [dayjs().subtract(6, 'day'), dayjs()] },
  { label: '30 ngày qua',  value: [dayjs().subtract(29, 'day'), dayjs()] },
];

export default function ReportDateRangePicker({ value, onChange, style }) {
  return (
    <RangePicker
      value={value}
      onChange={onChange}
      format="DD/MM/YYYY"
      presets={PRESETS}
      placeholder={['Từ ngày', 'Đến ngày']}
      style={style}
      allowClear
    />
  );
}

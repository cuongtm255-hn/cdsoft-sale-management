import { Input, InputNumber, Space } from 'antd';
import { formatGroupedInput, parseGroupedInput } from '@shared/utils/numberInput';

export default function CompactNumberInput({
  suffix,
  suffixWidth = 56,
  style,
  wrapperStyle,
  formatGrouped = false,
  formatter,
  parser,
  ...props
}) {
  const resolvedFormatter = formatter ?? (formatGrouped ? formatGroupedInput : undefined);
  const resolvedParser = parser ?? (formatGrouped ? parseGroupedInput : undefined);

  return (
    <Space.Compact style={wrapperStyle}>
      <InputNumber
        {...props}
        style={style}
        formatter={resolvedFormatter}
        parser={resolvedParser}
      />
      <Input
        readOnly
        tabIndex={-1}
        value={suffix}
        style={{ width: suffixWidth, textAlign: 'center' }}
      />
    </Space.Compact>
  );
}

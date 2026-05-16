import { useRef, useState } from 'react';
import { Alert, Button, Input, Space, Tag, Typography, message } from 'antd';
import { BarcodeOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function SerialScanInput({ quantity = 0, value = [], onChange }) {
  const [input, setInput]   = useState('');
  const inputRef            = useRef();
  const isComplete          = value.length >= quantity;

  const addSerial = (sn) => {
    const trimmed = sn.trim().toUpperCase();
    if (!trimmed) return;
    if (value.includes(trimmed)) {
      message.warning(`Serial ${trimmed} đã được nhập`);
      return;
    }
    onChange([...value, trimmed]);
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      addSerial(input);
    }
  };

  const removeSerial = (sn) => onChange(value.filter((s) => s !== sn));

  return (
    <div>
      <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
        <Input
          ref={inputRef}
          placeholder="Nhập Serial hoặc scan mã vạch — Enter để xác nhận"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isComplete}
          prefix={<BarcodeOutlined />}
          suffix={
            <Text type={isComplete ? 'success' : 'secondary'}>
              {value.length}/{quantity}
            </Text>
          }
          size="small"
        />
        <Button size="small" onClick={() => addSerial(input)} disabled={isComplete}>
          Thêm
        </Button>
      </Space.Compact>

      <div
        style={{
          minHeight: 40, maxHeight: 160, overflowY: 'auto',
          border: '1px solid #d9d9d9', borderRadius: 6, padding: 8,
        }}
      >
        {value.length === 0
          ? <Text type="secondary" style={{ fontSize: 12 }}>Chưa có serial nào</Text>
          : value.map((sn) => (
            <Tag
              key={sn}
              closable
              onClose={() => removeSerial(sn)}
              style={{ marginBottom: 4 }}
              color="blue"
            >
              {sn}
            </Tag>
          ))
        }
      </div>

      {!isComplete && value.length > 0 && quantity > 0 && (
        <Alert
          type="warning"
          message={`Còn thiếu ${quantity - value.length} serial`}
          style={{ marginTop: 4 }}
          showIcon
          banner
        />
      )}
      {isComplete && quantity > 0 && (
        <Alert type="success" message="Đã nhập đủ serial" style={{ marginTop: 4 }} showIcon banner />
      )}
    </div>
  );
}

import { useState } from 'react';
import { Input, Button, Space, Typography, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { vouchersApi } from '@api/tenant.api';

const fmt = (v) => Number(v || 0).toLocaleString('vi-VN') + '₫';

export default function VoucherInput({ customerId, orderTotal, onValidated }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleApply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await vouchersApi.validate({ code: code.trim(), customerId, orderTotal });
      const data = res.data?.data ?? res.data;
      if (data.valid) {
        setResult(data);
        onValidated?.(code.trim(), data.calculatedDiscount);
      } else {
        setError(data.reason ?? 'Mã không hợp lệ hoặc đã hết hạn');
        onValidated?.(null, 0);
      }
    } catch {
      setError('Không thể kiểm tra voucher. Thử lại sau.');
      onValidated?.(null, 0);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setCode('');
    setResult(null);
    setError('');
    onValidated?.(null, 0);
  };

  return (
    <div>
      <Space.Compact style={{ width: '100%' }}>
        <Input
          placeholder="Nhập mã voucher"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onPressEnter={handleApply}
          disabled={!!result}
          style={{ maxWidth: 220 }}
        />
        {result ? (
          <Button onClick={handleClear} icon={<CloseCircleOutlined />}>Xóa</Button>
        ) : (
          <Button type="primary" loading={loading} onClick={handleApply}>Áp dụng</Button>
        )}
      </Space.Compact>

      {result && (
        <Typography.Text type="success" style={{ display: 'block', marginTop: 4 }}>
          <CheckCircleOutlined /> {code}: Giảm{' '}
          {result.voucherType === 'PERCENT' ? `${result.discountValue}%` : fmt(result.discountValue)}
          {result.maxDiscount ? ` (tối đa ${fmt(result.maxDiscount)})` : ''} — Tiết kiệm: <strong>{fmt(result.calculatedDiscount)}</strong>
        </Typography.Text>
      )}
      {error && (
        <Typography.Text type="danger" style={{ display: 'block', marginTop: 4 }}>
          <CloseCircleOutlined /> {error}
        </Typography.Text>
      )}
    </div>
  );
}

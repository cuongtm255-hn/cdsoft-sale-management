import { useState, useEffect } from 'react';
import { Checkbox, InputNumber, Typography, Space, Alert } from 'antd';
import { loyaltyApi } from '@api/tenant.api';

const fmt = (v) => Number(v || 0).toLocaleString('vi-VN') + '₫';

export default function LoyaltyPointsInput({ customerId, orderTotal = 0, onChange }) {
  const [enabled, setEnabled] = useState(false);
  const [loyalty, setLoyalty] = useState(null);
  const [config, setConfig] = useState(null);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    if (!customerId) { setLoyalty(null); setEnabled(false); return; }
    Promise.all([
      loyaltyApi.getCustomerLoyalty(customerId),
      loyaltyApi.getConfig(),
    ]).then(([lr, cr]) => {
      setLoyalty(lr.data?.data ?? lr.data);
      setConfig(cr.data?.data ?? cr.data);
    }).catch(() => {});
  }, [customerId]);

  useEffect(() => {
    if (!enabled) { onChange?.(0); setPoints(0); }
  }, [enabled]);

  const handlePointsChange = (v) => {
    const val = v ?? 0;
    setPoints(val);
    const discount = val * Number(config?.amountPerPoint ?? 0);
    onChange?.(discount);
  };

  if (!loyalty || !config?.isEnabled || !loyalty.currentPoints) return null;

  const maxByPoints = loyalty.currentPoints;
  const maxByOrder = orderTotal > 0
    ? Math.floor(orderTotal / Number(config.amountPerPoint))
    : maxByPoints;
  const maxPoints = Math.min(maxByPoints, maxByOrder);

  const discountPreview = points * Number(config.amountPerPoint);

  return (
    <div style={{ marginTop: 8, marginBottom: 8 }}>
      <Space align="center" style={{ marginBottom: 4 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Điểm tích lũy: <strong>{loyalty.currentPoints.toLocaleString()}</strong>
          {loyalty.memberTier && loyalty.memberTier !== 'NONE' && (
            <> ({loyalty.memberTier})</>
          )}
        </Typography.Text>
      </Space>

      <Space align="center" wrap>
        <Checkbox checked={enabled} onChange={(e) => setEnabled(e.target.checked)}>
          Dùng điểm
        </Checkbox>

        {enabled && (
          <>
            <InputNumber
              size="small"
              min={0}
              max={maxPoints}
              value={points}
              onChange={handlePointsChange}
              style={{ width: 100 }}
              addonAfter="điểm"
            />
            {points > 0 && (
              <Typography.Text type="success" style={{ fontSize: 12 }}>
                → giảm <strong>{fmt(discountPreview)}</strong>
              </Typography.Text>
            )}
          </>
        )}
      </Space>

      {enabled && points > maxPoints && (
        <Alert
          type="error"
          message={`Tối đa ${maxPoints.toLocaleString()} điểm cho đơn này`}
          style={{ marginTop: 4 }}
          showIcon
        />
      )}
    </div>
  );
}

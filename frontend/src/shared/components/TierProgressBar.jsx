import { Progress, Typography, Space } from 'antd';

const TIER_COLORS = {
  SILVER:  '#8c8c8c',
  GOLD:    '#faad14',
  DIAMOND: '#13c2c2',
};

export default function TierProgressBar({ currentPoints = 0, tiers = [] }) {
  const sorted = [...tiers].sort((a, b) => a.minPoints - b.minPoints);

  const currentTier = [...sorted].reverse().find((t) => currentPoints >= t.minPoints);
  const nextTier = sorted.find((t) => t.minPoints > currentPoints);

  if (!nextTier) {
    return (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        💎 Đã đạt hạng cao nhất ({currentPoints.toLocaleString()} điểm)
      </Typography.Text>
    );
  }

  const prevMin = currentTier?.minPoints ?? 0;
  const range = nextTier.minPoints - prevMin;
  const progress = currentPoints - prevMin;
  const percent = Math.min(100, Math.round((progress / range) * 100));

  return (
    <Space direction="vertical" size={2} style={{ width: '100%' }}>
      <Typography.Text style={{ fontSize: 12 }}>
        {currentTier?.label ?? '—'} → {nextTier.label}: còn{' '}
        <strong>{(nextTier.minPoints - currentPoints).toLocaleString()}</strong> điểm
      </Typography.Text>
      <Progress
        percent={percent}
        showInfo={false}
        strokeColor={TIER_COLORS[nextTier.name] ?? '#1677ff'}
        size="small"
      />
      <Typography.Text type="secondary" style={{ fontSize: 11 }}>
        {currentPoints.toLocaleString()} / {nextTier.minPoints.toLocaleString()} điểm ({percent}%)
      </Typography.Text>
    </Space>
  );
}

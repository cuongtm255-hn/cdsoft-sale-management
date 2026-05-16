import { Space, Tag, Typography } from 'antd';

const TIER_CONFIG = {
  NONE:    { icon: '—',  color: 'default', label: 'Không' },
  SILVER:  { icon: '🥈', color: 'default', label: 'Bạc' },
  GOLD:    { icon: '🥇', color: 'gold',    label: 'Vàng' },
  DIAMOND: { icon: '💎', color: 'cyan',    label: 'Kim cương' },
};

export default function TierBadge({ tier, points, showPoints = true }) {
  const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG.NONE;
  if (!tier || tier === 'NONE') return null;

  return (
    <Space size={4}>
      <Tag color={cfg.color} style={{ margin: 0 }}>
        {cfg.icon} {cfg.label}
      </Tag>
      {showPoints && points !== undefined && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {Number(points).toLocaleString()} điểm
        </Typography.Text>
      )}
    </Space>
  );
}

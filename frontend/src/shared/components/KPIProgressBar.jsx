import { Progress, Typography } from 'antd';

export default function KPIProgressBar({ achieved = 0, target = 0, showLabel = true }) {
  const pct    = target > 0 ? Math.min(Math.round((achieved / target) * 100), 999) : 0;
  const color  = pct >= 90 ? '#52c41a' : pct >= 70 ? '#faad14' : '#ff4d4f';
  const status = pct >= 100 ? 'success' : 'normal';

  return (
    <div style={{ minWidth: 120 }}>
      <Progress
        percent={Math.min(pct, 100)}
        strokeColor={color}
        status={status}
        size="small"
        format={() => showLabel ? <span style={{ color }}>{pct}%</span> : null}
      />
    </div>
  );
}

import { useMemo } from 'react';
import { Empty, Typography } from 'antd';

const CHART_HEIGHT = 200;
const BAR_COLOR    = '#1677ff';
const LINE_COLOR   = '#52c41a';

function fmtShort(v) {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'B';
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)         return (v / 1_000).toFixed(0) + 'K';
  return String(v);
}

export default function RevenueChart({ data = [], groupBy = 'month', mode = 'bar' }) {
  const max = useMemo(() => Math.max(...data.map((d) => Number(d.revenue)), 1), [data]);

  if (!data.length) return <Empty description="Không có dữ liệu" style={{ padding: 40 }} />;

  const W = 100 / data.length;

  if (mode === 'bar') {
    return (
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          width="100%"
          viewBox={`0 0 ${Math.max(data.length * 60, 400)} ${CHART_HEIGHT + 48}`}
          preserveAspectRatio="none"
          style={{ display: 'block' }}
        >
          {data.map((d, i) => {
            const x   = i * 60 + 6;
            const rev = Number(d.revenue);
            const h   = Math.max((rev / max) * CHART_HEIGHT, 1);
            const y   = CHART_HEIGHT - h;
            return (
              <g key={i}>
                <rect x={x} y={y} width={48} height={h} fill={BAR_COLOR} rx={3} opacity={0.85} />
                <text x={x + 24} y={y - 4} textAnchor="middle" fontSize={10} fill="#555">
                  {fmtShort(rev)}
                </text>
                <text x={x + 24} y={CHART_HEIGHT + 14} textAnchor="middle" fontSize={10} fill="#888">
                  {d.period}
                </text>
              </g>
            );
          })}
          <line x1={0} y1={CHART_HEIGHT} x2={data.length * 60} y2={CHART_HEIGHT} stroke="#e8e8e8" />
        </svg>
      </div>
    );
  }

  // line mode
  const pts = data.map((d, i) => {
    const x = i * 60 + 30;
    const y = CHART_HEIGHT - Math.max((Number(d.revenue) / max) * CHART_HEIGHT, 1);
    return [x, y];
  });
  const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ');

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        width="100%"
        viewBox={`0 0 ${Math.max(data.length * 60, 400)} ${CHART_HEIGHT + 48}`}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
      >
        <polyline points={polyline} fill="none" stroke={LINE_COLOR} strokeWidth={2} />
        {pts.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={4} fill={LINE_COLOR} />
            <text x={x} y={y - 8} textAnchor="middle" fontSize={10} fill="#555">
              {fmtShort(Number(data[i].revenue))}
            </text>
            <text x={x} y={CHART_HEIGHT + 14} textAnchor="middle" fontSize={10} fill="#888">
              {data[i].period}
            </text>
          </g>
        ))}
        <line x1={0} y1={CHART_HEIGHT} x2={data.length * 60} y2={CHART_HEIGHT} stroke="#e8e8e8" />
      </svg>
    </div>
  );
}

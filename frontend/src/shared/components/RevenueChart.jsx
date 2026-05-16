import { useMemo } from 'react';
import { Empty } from 'antd';

const CHART_H   = 180;
const TOP_PAD   = 24;
const BOT_PAD   = 28;
const TOTAL_H   = CHART_H + TOP_PAD + BOT_PAD;
const BAR_COLOR = '#1677ff';
const LINE_COLOR = '#52c41a';

function fmtShort(v) {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'B';
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)         return (v / 1_000).toFixed(0) + 'K';
  return String(v);
}

const GRID_RATIOS = [0.25, 0.5, 0.75, 1];

export default function RevenueChart({ data = [], mode = 'bar' }) {
  const max = useMemo(() => Math.max(...data.map((d) => Number(d.revenue)), 1), [data]);

  if (!data.length) return <Empty description="Không có dữ liệu" style={{ padding: 40 }} />;

  const n       = data.length;
  const vbW     = Math.max(n * 56, 400);
  const slotW   = vbW / n;
  const barW    = Math.min(slotW * 0.45, 32);          // max 32px, 45% of slot
  const cx      = (i) => slotW * i + slotW / 2;        // center x of slot i
  const barH    = (rev) => Math.max((Number(rev) / max) * CHART_H, 1);
  const barY    = (rev) => TOP_PAD + CHART_H - barH(rev);
  const baseY   = TOP_PAD + CHART_H;

  const gridLines = GRID_RATIOS.map((r) => (
    <line key={r} x1={0} y1={TOP_PAD + CHART_H * (1 - r)} x2={vbW} y2={TOP_PAD + CHART_H * (1 - r)}
      stroke="#f0f0f0" strokeWidth={1} />
  ));

  const svgProps = {
    width: '100%',
    height: '100%',
    viewBox: `0 0 ${vbW} ${TOTAL_H}`,
    preserveAspectRatio: 'none',
    style: { display: 'block' },
  };

  if (mode === 'bar') {
    return (
      <div style={{ width: '100%', height: 260, overflowX: 'auto' }}>
        <svg {...svgProps}>
          {gridLines}
          <line x1={0} y1={baseY} x2={vbW} y2={baseY} stroke="#d9d9d9" />
          {data.map((d, i) => {
            const rev = Number(d.revenue);
            const h   = barH(rev);
            const y   = barY(rev);
            const x   = cx(i) - barW / 2;
            return (
              <g key={i}>
                <rect x={x} y={y} width={barW} height={h} fill={BAR_COLOR} rx={2} opacity={0.82} />
                <text x={cx(i)} y={y - 4} textAnchor="middle" fontSize={9} fill="#555">
                  {fmtShort(rev)}
                </text>
                <text x={cx(i)} y={TOTAL_H - 6} textAnchor="middle" fontSize={9} fill="#888">
                  {d.period}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // line mode
  const pts      = data.map((d, i) => [cx(i), barY(Number(d.revenue))]);
  const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const areaPath = [
    `${cx(0)},${baseY}`,
    ...pts.map(([x, y]) => `${x},${y}`),
    `${cx(n - 1)},${baseY}`,
  ].join(' ');

  return (
    <div style={{ width: '100%', height: 260, overflowX: 'auto' }}>
      <svg {...svgProps}>
        {gridLines}
        <line x1={0} y1={baseY} x2={vbW} y2={baseY} stroke="#d9d9d9" />
        <polyline points={areaPath} fill={LINE_COLOR} fillOpacity={0.07} stroke="none" />
        <polyline points={polyline} fill="none" stroke={LINE_COLOR} strokeWidth={2} />
        {pts.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={3} fill={LINE_COLOR} />
            <text x={x} y={y - 8} textAnchor="middle" fontSize={9} fill="#555">
              {fmtShort(Number(data[i].revenue))}
            </text>
            <text x={x} y={TOTAL_H - 6} textAnchor="middle" fontSize={9} fill="#888">
              {data[i].period}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

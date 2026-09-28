import React from 'react';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  centerLabel?: string;
}

/** 环形分布图（纯 SVG，与原型 #donut 一致） */
const DonutChart: React.FC<DonutChartProps> = ({ data, size = 150, centerLabel = '总数' }) => {
  const total = data.reduce((a, b) => a + b.value, 0);
  const r = 56;
  const cx = 75;
  const cy = 75;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="wm-donut-wrap">
      <svg viewBox="0 0 150 150" style={{ width: size, height: size, flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-3)" strokeWidth="16" />
        {total > 0 &&
          data.map((d) => {
            const len = (d.value / total) * circ;
            const el = (
              <circle
                key={d.label}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth="16"
                strokeDasharray={`${Math.max(len - 2.5, 0)} ${circ - len + 2.5}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            );
            offset += len;
            return el;
          })}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontFamily="Chakra Petch, Noto Sans SC"
          fontSize="24"
          fontWeight="700"
          fill="#e8edf6"
        >
          {total.toLocaleString()}
        </text>
        <text x={cx} y={cy + 15} textAnchor="middle" fontSize="10" fill="#5c677d">
          {centerLabel}
        </text>
      </svg>
      <div className="wm-donut-legend">
        {data.map((d) => (
          <div className="wm-dl-item" key={d.label}>
            <span className="l">
              <i style={{ background: d.color }} />
              {d.label}
            </span>
            <span className="v">{d.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChart;

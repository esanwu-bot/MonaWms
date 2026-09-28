import React from 'react';

export interface TrendSeries {
  name: string;
  color: string;
  data: number[];
}

interface TrendChartProps {
  series: TrendSeries[];
  labels?: string[];
  height?: number;
}

/**
 * 平滑趋势面积图（纯 SVG，对应原型 #trendChart）
 * 无 CTE/窗口函数依赖，前端只做展示。
 */
const TrendChart: React.FC<TrendChartProps> = ({ series, labels, height = 250 }) => {
  const W = 560;
  const H = 230;
  const padL = 34;
  const padB = 24;
  const padT = 14;
  const padR = 8;
  const len = Math.max(...series.map((s) => s.data.length), 1);
  const max = Math.max(1, ...series.flatMap((s) => s.data)) * 1.15;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const X = (i: number) => padL + (i * iw) / Math.max(len - 1, 1);
  const Y = (v: number) => padT + ih - (v / max) * ih;

  const pathOf = (arr: number[]) => {
    if (!arr.length) return '';
    let d = `M${X(0)} ${Y(arr[0])}`;
    for (let i = 1; i < arr.length; i++) {
      const xc = (X(i - 1) + X(i)) / 2;
      d += ` C${xc} ${Y(arr[i - 1])},${xc} ${Y(arr[i])},${X(i)} ${Y(arr[i])}`;
    }
    return d;
  };

  return (
    <div style={{ width: '100%', height }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={`g${i}`} id={`wm-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={s.color} stopOpacity="0.28" />
              <stop offset="1" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {[0, 1, 2, 3, 4].map((g) => {
          const gy = padT + (ih * g) / 4;
          return (
            <g key={g}>
              <line
                x1={padL}
                y1={gy}
                x2={W - padR}
                y2={gy}
                stroke="rgba(148,163,184,.08)"
                strokeWidth="1"
              />
              <text
                x={padL - 7}
                y={gy + 4}
                fontSize="9"
                fill="#5c677d"
                textAnchor="end"
                fontFamily="JetBrains Mono, monospace"
              >
                {Math.round(max - (max * g) / 4)}
              </text>
            </g>
          );
        })}
        {series.map((s, i) => (
          <path
            key={`a${i}`}
            d={`${pathOf(s.data)} L${X(s.data.length - 1)} ${padT + ih} L${padL} ${padT + ih} Z`}
            fill={`url(#wm-grad-${i})`}
            opacity="0.9"
          />
        ))}
        {series.map((s, i) => (
          <path
            key={`l${i}`}
            d={pathOf(s.data)}
            fill="none"
            stroke={s.color}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        ))}
        {series[0]?.data.map((v, i) => (
          <circle
            key={`p${i}`}
            cx={X(i)}
            cy={Y(v)}
            r="2.6"
            fill="#0a0e16"
            stroke={series[0].color}
            strokeWidth="1.6"
          />
        ))}
        {labels?.map((l, i) =>
          i % Math.ceil(len / 8) === 0 ? (
            <text
              key={`x${i}`}
              x={X(i)}
              y={H - 6}
              fontSize="9"
              fill="#5c677d"
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
            >
              {l}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
};

export default TrendChart;

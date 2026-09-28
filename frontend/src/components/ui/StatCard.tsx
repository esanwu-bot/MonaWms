import React from 'react';

export type StatTone = 'cyan' | 'green' | 'violet' | 'amber' | 'red';

const TONE_VAR: Record<StatTone, string> = {
  cyan: 'var(--cyan)',
  green: 'var(--green)',
  violet: 'var(--violet)',
  amber: 'var(--amber)',
  red: 'var(--red)',
};

const TONE_DIM: Record<StatTone, string> = {
  cyan: 'var(--cyan-dim)',
  green: 'var(--green-dim)',
  violet: 'var(--violet-dim)',
  amber: 'var(--amber-dim)',
  red: 'var(--red-dim)',
};

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  icon?: React.ReactNode;
  tone?: StatTone;
  delta?: { value: string; up: boolean };
  vs?: string;
  spark?: number[];
  delay?: number;
}

/**
 * 统计卡：顶部渐变条 + 大号展示数字 + 变化率 + 迷你趋势线
 */
const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  icon,
  tone = 'cyan',
  delta,
  vs,
  spark,
  delay,
}) => (
  <div
    className="wm-stat-card wm-reveal in"
    style={
      {
        '--sc': TONE_VAR[tone],
        transitionDelay: delay ? `${delay}s` : undefined,
      } as React.CSSProperties
    }
  >
    <div className="wm-sc-top">
      <div className="wm-sc-label">{label}</div>
      {icon && (
        <div className="wm-sc-icon" style={{ background: TONE_DIM[tone], color: TONE_VAR[tone] }}>
          {icon}
        </div>
      )}
    </div>
    <div className="wm-sc-num">
      <span>{value}</span>
      {unit && <small>{unit}</small>}
    </div>
    {(delta || vs) && (
      <div className="wm-sc-foot">
        {delta && <span className={`wm-delta ${delta.up ? 'up' : 'down'}`}>{delta.value}</span>}
        {vs && <span className="vs">{vs}</span>}
      </div>
    )}
    {spark && spark.length > 1 && (
      <div style={{ marginTop: 14, height: 34, color: TONE_VAR[tone] }}>
        <SparkPath points={spark} color={TONE_VAR[tone]} />
      </div>
    )}
  </div>
);

/** 内联迷你趋势线（不依赖图表库，保证轻量） */
const SparkPath: React.FC<{ points: number[]; color: string }> = ({ points, color }) => {
  const w = 100;
  const h = 34;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const step = w / (points.length - 1);
  const coords = points.map((v, i) => [i * step, h - 3 - ((v - min) / (max - min || 1)) * (h - 8)]);
  const line = 'M' + coords.map((c) => `${c[0].toFixed(1)} ${c[1].toFixed(1)}`).join(' L');
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const last = coords[coords.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      <path d={area} fill={color} opacity="0.12" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill={color} />
    </svg>
  );
};

export default StatCard;

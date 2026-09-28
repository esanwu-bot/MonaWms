import React from 'react';

interface CapacityBarProps {
  label: React.ReactNode;
  percent: number;
  color?: string;
}

/** 容量条：仓库/分区占用率 */
const CapacityBar: React.FC<CapacityBarProps> = ({ label, percent, color = 'var(--cyan)' }) => {
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <div className="wm-cap-item">
      <div className="wm-cap-top">
        <span>{label}</span>
        <span className="pct">{pct}%</span>
      </div>
      <div className="wm-cap-bar">
        <div className="wm-cap-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
};

export default CapacityBar;

import React from 'react';

interface PanelProps {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  extra?: React.ReactNode;
  legend?: { color: string; label: string }[];
  flat?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * 通用面板卡片，对应原型 .card / .card-head
 */
const Panel: React.FC<PanelProps> = ({
  title,
  icon,
  extra,
  legend,
  flat,
  className = '',
  style,
  children,
}) => (
  <div className={`wm-card ${flat ? 'flat' : ''} ${className}`} style={style}>
    {(title || extra) && (
      <div className="wm-card-head">
        {title && (
          <h3>
            {icon}
            <span>{title}</span>
          </h3>
        )}
        {legend && (
          <div className="wm-legend">
            {legend.map((l) => (
              <span key={l.label}>
                <i style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        )}
        {extra}
      </div>
    )}
    {children}
  </div>
);

export default Panel;

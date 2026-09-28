import React from 'react';

interface PageHeaderProps {
  title: string;
  sub?: string;
  extra?: React.ReactNode;
  live?: boolean;
}

/**
 * 页头：沿用原型 .page-head 结构（标题色块 + 副标题 + 右侧操作区）
 */
const PageHeader: React.FC<PageHeaderProps> = ({ title, sub, extra, live }) => (
  <div className="wm-page-head">
    <div>
      <h1>
        <span className="tick" />
        <span>{title}</span>
      </h1>
      {sub && <div className="sub">{sub}</div>}
    </div>
    <div className="actions">
      {live && (
        <span className="wm-live-tag">
          <span className="wm-dot-live" />
          SYSTEM LIVE
        </span>
      )}
      {extra}
    </div>
  </div>
);

export default PageHeader;

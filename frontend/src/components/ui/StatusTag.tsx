import React from 'react';

export type StatusTone = 'pending' | 'processing' | 'done' | 'urgent' | 'violet' | 'muted';

interface StatusTagProps {
  tone: StatusTone;
  children: React.ReactNode;
}

/**
 * 状态胶囊：待处理=琥珀、处理中=青、完成=绿、紧急=红
 */
const StatusTag: React.FC<StatusTagProps> = ({ tone, children }) => (
  <span className={`wm-status ${tone}`}>{children}</span>
);

/** 单据状态 → 语义色 */
export const DOC_STATUS_MAP: Record<string, { tone: StatusTone; text: string }> = {
  draft: { tone: 'muted', text: '草稿' },
  confirmed: { tone: 'pending', text: '已确认' },
  receiving: { tone: 'processing', text: '收货中' },
  quality_check: { tone: 'processing', text: '质检中' },
  posted: { tone: 'done', text: '已过账' },
  reversed: { tone: 'urgent', text: '已红冲' },
  cancelled: { tone: 'muted', text: '已取消' },
  pending: { tone: 'pending', text: '待处理' },
  processing: { tone: 'processing', text: '处理中' },
  done: { tone: 'done', text: '已完成' },
  urgent: { tone: 'urgent', text: '紧急' },
};

export default StatusTag;

import React from 'react';

export interface FilterTabItem<T extends string = string> {
  key: T;
  label: string;
  count?: number;
}

interface FilterTabsProps<T extends string = string> {
  items: FilterTabItem<T>[];
  value: T;
  onChange: (key: T) => void;
}

/**
 * 筛选标签：原型 .filter-tabs —— 输入即筛选，不提供"查询"按钮
 */
function FilterTabs<T extends string = string>({ items, value, onChange }: FilterTabsProps<T>) {
  return (
    <div className="wm-filter-tabs">
      {items.map((it) => (
        <div
          key={it.key}
          className={`wm-ftab ${value === it.key ? 'active' : ''}`}
          onClick={() => onChange(it.key)}
        >
          {it.label}
          {it.count !== undefined && <span className="cnt">{it.count}</span>}
        </div>
      ))}
    </div>
  );
}

export default FilterTabs;

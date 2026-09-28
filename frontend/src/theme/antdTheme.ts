import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

/**
 * 与 prototype/design.md 对齐的 Ant Design 主题。
 * 使用暗色算法（深色「通信信号」视觉语言）+ 自定义令牌。
 */
export const antdTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#22d3ee',
    colorSuccess: '#34d399',
    colorWarning: '#fbbf24',
    colorError: '#f87171',
    colorInfo: '#22d3ee',

    colorBgBase: '#0a0e16',
    colorBgContainer: '#111725',
    colorBgElevated: '#161e2e',
    colorBgLayout: '#0a0e16',
    colorBorder: 'rgba(148,163,184,0.09)',
    colorBorderSecondary: 'rgba(148,163,184,0.09)',

    colorText: '#e8edf6',
    colorTextSecondary: '#9aa5bb',
    colorTextTertiary: '#5c677d',

    borderRadius: 10,
    borderRadiusLG: 14,
    fontSize: 13,

    fontFamily: "'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontFamilyCode: "'JetBrains Mono', 'Noto Sans SC', ui-monospace, monospace",

    controlHeight: 38,
    wireframe: false,
  },
  components: {
    Layout: {
      bodyBg: 'transparent',
      headerBg: 'rgba(13,18,32,0.8)',
      headerHeight: 64,
      siderBg: '#0d1220',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(34,211,238,0.12)',
      darkItemSelectedColor: '#22d3ee',
      itemBorderRadius: 10,
      itemHeight: 38,
      itemMarginInline: 0,
    },
    Card: {
      colorBgContainer: '#111725',
      headerBg: 'transparent',
      headerFontSize: 15,
    },
    Table: {
      headerBg: '#161e2e',
      headerColor: '#5c677d',
      rowHoverBg: '#161e2e',
      borderColor: 'rgba(148,163,184,0.09)',
      headerBorderRadius: 0,
    },
    Modal: {
      contentBg: '#111725',
      headerBg: 'transparent',
      titleFontSize: 18,
    },
    Button: {
      primaryShadow: '0 4px 14px rgba(34,211,238,0.25)',
      fontWeight: 600,
    },
    Tabs: {
      itemSelectedColor: '#22d3ee',
      inkBarColor: '#22d3ee',
    },
    Tag: {
      defaultBg: 'rgba(148,163,184,0.1)',
      defaultColor: '#9aa5bb',
    },
    Select: {
      optionSelectedBg: 'rgba(34,211,238,0.12)',
    },
    Input: {
      activeShadow: '0 0 0 3px rgba(34,211,238,0.08)',
    },
    Notification: {
      colorBgElevated: '#161e2e',
    },
    Message: {
      contentBg: '#161e2e',
    },
  },
};

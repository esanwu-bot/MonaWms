/**
 * 日期 / 数字格式化工具
 */

export function pad2(n) {
  return String(n).padStart(2, '0');
}

/** 2024-01-30 09:30:00 → 09:30 */
export function hm(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '--:--';
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

/** 10月5日 · 周日 · 2026 */
export function cnDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';
  const wk = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 · ${wk[d.getDay()]} · ${d.getFullYear()}`;
}

/** 2024-01-30 09:30:00 → 01-30 09:30 */
export function mdhm(str) {
  if (!str) return '—';
  const s = String(str).replace('T', ' ');
  const m = s.match(/^\d{4}-(\d{2}-\d{2})[ ]?(\d{2}:\d{2})?/);
  if (!m) return s.slice(5, 16);
  return m[1] + (m[2] ? ' ' + m[2] : '');
}

/** 2024-01-30 09:30:00 → 2024-01-30 */
export function ymd(str) {
  if (!str) return '—';
  return String(str).replace('T', ' ').slice(0, 10);
}

/** 2024-01-30T09:30 → 2024-01-30 09:30 */
export function fmtDateTime(str) {
  if (!str) return '—';
  return String(str).replace('T', ' ').slice(0, 16);
}

/** 根据当前时间返回问候语 */
export function greeting() {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

/** 千分位 */
export function thousand(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('en-US');
}

/** 数量：整数不带小数，小数保留原样（后端 bcadd 返回字符串） */
export function qty(v) {
  const n = Number(v);
  if (!isFinite(n)) return '0';
  return Number.isInteger(n) ? String(n) : String(n);
}

/** Date → YYYY-MM-DD */
export function dateToYmd(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate());
}

/** 相对时间（xx分钟前） */
export function timeAgo(str) {
  if (!str) return '';
  const d = new Date(String(str).replace('T', ' ').replace(/-/g, '/'));
  if (isNaN(d.getTime())) return String(str).slice(5, 16);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return min + ' 分钟前';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + ' 小时前';
  const day = Math.floor(hr / 24);
  if (day < 30) return day + ' 天前';
  return mdhm(str);
}

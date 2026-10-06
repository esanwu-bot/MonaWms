/**
 * Canvas 原生运行时可用性开关
 *
 * 实测结论：libcanvasnativev8.so 与 NativeScript 运行时的 V8 ABI 不兼容
 * （dlopen 报 GlobalizeReference 符号缺失）。无论在模块加载期还是视图构建期
 * 触发库加载都是致命错误：前者直接崩溃到全局错误页（ES import 无法被 try 包住），
 * 后者中断整棵渲染树（首页顶栏以下全白且任何兜底都渲染不出来）。
 * 因此本 App 彻底放弃 @nativescript/canvas：不打包、不注册、不引用，
 * 所有图表（趋势图/迷你线）一律纯布局柱状实现。
 */
let canvasUsable = false;
let disabledReason = 'libcanvasnativev8.so 与设备 V8 不兼容，Canvas 已全局禁用（图表走纯布局）';

export function markCanvasUnavailable(reason) {
  if (!canvasUsable) return;
  canvasUsable = false;
  disabledReason = String(reason || 'unknown');
  console.error('[canvasProbe] Canvas 已降级为纯布局渲染，原因: ' + disabledReason);
}

export function isCanvasUsable() {
  return canvasUsable;
}

export function canvasDisabledReason() {
  return disabledReason;
}

/** 归一化数值序列 → 柱高（px），供纯布局降级图使用 */
export function toBars(points, max, min) {
  const vals = (points || []).map(Number).filter((n) => isFinite(n));
  if (!vals.length) return [];
  const hi = Math.max(...vals);
  const lo = Math.min(...vals);
  const span = hi - lo || 1;
  return vals.map((v) => Math.round(min + ((v - lo) / span) * (max - min)));
}

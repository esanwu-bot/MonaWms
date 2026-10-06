/**
 * 全局响应式状态（会话 / UI / 徽标）
 * —— 相当于轻量 Pinia：一个 reactive 单例 + 一组 action
 */
import { reactive } from 'nativescript-vue';
import { ApplicationSettings } from '@nativescript/core';
import { DEFAULT_BASE_URL } from './config';

export const store = reactive({
  /* ---- 会话 ---- */
  baseUrl: ApplicationSettings.getString('mw_base_url', DEFAULT_BASE_URL),
  token: ApplicationSettings.getString('mw_token', ''),
  user: readUser(),
  demoMode: false,
  loggedIn: !!ApplicationSettings.getString('mw_token', '') || false,

  /* ---- UI ---- */
  tab: 'home', // home | inbound | outbound | devices | mine
  subView: null, // logs | warehouse | scrap | reports | scan | stocktake | stocktake-exec
  subPayload: null,
  sheet: null, // new-inbound | new-outbound | new-device | device-detail | order-detail
  sheetPayload: null,
  toast: { visible: false, msg: '', icon: 'check' },

  /* ---- 角标 ---- */
  pendingBadges: { inbound: 0, outbound: 0 },

  /* ---- 数据刷新信号：任何增改操作后 +1，列表页监听重载 ---- */
  refreshTick: 0,

  /* ---- 全局错误通道：没有 logcat 时让异常显示在屏幕上 ---- */
  globalError: null, // { source, msg, time }
});

/** 当前包构建标记，用于确认手机上装的是哪一版 APK */
export const BUILD = '1006-B';

export function reportGlobalError(source, err) {
  const msg = String((err && err.message) || err || '未知错误');
  store.globalError = { source: String(source || 'app'), msg, time: new Date().toLocaleTimeString() };
  console.error('[globalError][' + store.globalError.source + '] ' + msg);
  return msg;
}

export function clearGlobalError() {
  store.globalError = null;
}

export function bumpRefresh() {
  store.refreshTick++;
}

function readUser() {
  try {
    const raw = ApplicationSettings.getString('mw_user', '');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setBaseUrl(url) {
  store.baseUrl = String(url || '').trim().replace(/\/+$/, '');
  ApplicationSettings.setString('mw_base_url', store.baseUrl);
}

export function setSession(token, user) {
  store.token = token;
  store.user = user || null;
  store.loggedIn = true;
  ApplicationSettings.setString('mw_token', token);
  ApplicationSettings.setString('mw_user', JSON.stringify(user || {}));
}

export function logout() {
  store.token = '';
  store.user = null;
  store.loggedIn = false;
  store.demoMode = false;
  store.tab = 'home';
  store.subView = null;
  store.sheet = null;
  ApplicationSettings.remove('mw_token');
  ApplicationSettings.remove('mw_user');
}

/** 进入离线演示模式（原型内置数据） */
export function enterDemo() {
  store.demoMode = true;
  store.loggedIn = true;
  store.user = { username: 'demo', role_text: '超级管理员' };
  resetMockState();
}

/* ---------------- UI actions ---------------- */

let toastTimer = null;
export function showToast(msg, icon = 'check') {
  store.toast = { visible: true, msg, icon };
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    store.toast = { ...store.toast, visible: false };
  }, 2200);
}

export function switchTab(name) {
  store.sheet = null;
  store.sheetPayload = null;
  store.subView = null;
  store.tab = name;
}

export function openSub(name, payload = null) {
  store.subPayload = payload;
  store.subView = name;
}

export function openSheet(name, payload = null) {
  store.sheetPayload = payload;
  store.sheet = name;
}

/* 关闭动画由 SheetHost / SubViewHost 接管，这里注册钩子 */
let sheetCloseHook = null;
let subCloseHook = null;
export function registerSheetClose(fn) {
  sheetCloseHook = fn;
}
export function registerSubClose(fn) {
  subCloseHook = fn;
}
export function closeSheet() {
  if (sheetCloseHook) sheetCloseHook();
  else {
    store.sheet = null;
    store.sheetPayload = null;
  }
}
export function closeSub() {
  if (subCloseHook) subCloseHook();
  else store.subView = null;
}

/* ---------------- mock 状态复位（避免循环依赖，延迟引用） ---------------- */
let resetMockState = () => {};
export function bindMockReset(fn) {
  resetMockState = fn;
}

/**
 * HTTP 封装（基于 @nativescript/core 内置 Http 模块）
 * —— 对齐 backend_tp6 的响应格式 { code, message, data, timestamp }
 */
import { Http } from '@nativescript/core';
import { store, logout } from './store';

export class ApiError extends Error {
  constructor(message, code = 0) {
    super(message);
    this.code = code;
  }
}

function buildQuery(params) {
  if (!params) return '';
  const parts = [];
  Object.keys(params).forEach((k) => {
    const v = params[k];
    if (v === undefined || v === null || v === '') return;
    parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
  });
  return parts.join('&');
}

/**
 * 发起请求并解包 data
 * @param {'GET'|'POST'|'PUT'|'DELETE'} method
 * @param {string} path 以 / 开头，如 /inbound-orders
 */
export async function request(method, path, { params, body, timeout = 15000 } = {}) {
  let url = store.baseUrl.replace(/\/+$/, '') + path;
  const q = buildQuery(params);
  if (q) url += (url.includes('?') ? '&' : '?') + q;

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (store.token) headers['Authorization'] = 'Bearer ' + store.token;

  let res;
  try {
    res = await Http.request({
      url,
      method,
      headers,
      content: body !== undefined ? JSON.stringify(body) : undefined,
      timeout,
    });
  } catch (e) {
    throw new ApiError('无法连接服务器：' + (e && e.message ? e.message : e));
  }

  const text = res.content ? res.content.toString() : '';
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (e) {
    throw new ApiError('响应解析失败（HTTP ' + res.statusCode + '）');
  }

  // 401：登录过期
  if (res.statusCode === 401 || (json && json.code === 401)) {
    logout();
    throw new ApiError((json && json.message) || '登录已过期，请重新登录', 401);
  }

  if (json && typeof json.code !== 'undefined' && json.code !== 200) {
    throw new ApiError(json.message || '请求失败（' + json.code + '）', json.code);
  }
  if (res.statusCode >= 400) {
    throw new ApiError((json && json.message) || 'HTTP ' + res.statusCode, res.statusCode);
  }
  return json ? json.data : null;
}

export const get = (path, params) => request('GET', path, { params });
export const post = (path, body) => request('POST', path, { body });
export const put = (path, body) => request('PUT', path, { body });
export const del = (path) => request('DELETE', path);

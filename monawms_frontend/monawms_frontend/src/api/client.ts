import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';

/**
 * axios 实例
 *
 * 关键约定：所有业务请求自动注入 warehouse_id，
 * 由请求拦截器从 useWarehouseStore 读取当前仓库，业务代码不要手动拼。
 *
 * 为什么用 zustand 的 getState() 而不是 hook：
 * 拦截器不在 React 组件树里，拿不到 hook，只能读 store 快照。
 */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

/** 统一响应结构，与后端 Result 对应 */
export interface ApiResp<T = unknown> {
  code: number | string;
  message: string;
  data: T;
  trace_id?: string;
}

// 延迟注入，避免与 store 相互 import 造成循环依赖
let warehouseIdGetter: (() => number | null) | null = null;
export function setWarehouseIdGetter(fn: () => number | null) {
  warehouseIdGetter = fn;
}

let tokenGetter: (() => string | null) | null = null;
export function setTokenGetter(fn: () => string | null) {
  tokenGetter = fn;
}

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenGetter?.();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const warehouseId = warehouseIdGetter?.();
  if (warehouseId) {
    // GET 走 query，其他走 body；同时塞 header 兜底
    config.headers['X-Warehouse-Id'] = String(warehouseId);

    if (config.method?.toLowerCase() === 'get') {
      config.params = { ...(config.params ?? {}), warehouse_id: warehouseId };
    } else if (config.data && typeof config.data === 'object' && !Array.isArray(config.data)) {
      config.data = { ...config.data, warehouse_id: warehouseId };
    }
  }

  return config;
});

http.interceptors.response.use(
  (resp) => resp,
  (error: AxiosError<ApiResp>) => {
    const resp = error.response;
    const data = resp?.data;

    if (resp?.status === 401) {
      message.error('登录已过期，请重新登录');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (resp?.status === 403) {
      // 区分两种 403，给用户的提示更准确
      if (data?.code === 'WAREHOUSE_NOT_GRANTED') {
        message.error('你没有该仓库的权限，请联系管理员授权');
      } else {
        message.error(data?.message || '没有操作权限');
      }
      return Promise.reject(error);
    }

    message.error(data?.message || error.message || '请求失败');
    return Promise.reject(error);
  },
);

/** 取 data 字段，业务层少写一层 .data.data */
export async function unwrap<T>(promise: Promise<{ data: ApiResp<T> }>): Promise<T> {
  const resp = await promise;
  const body = resp.data;
  if (body.code !== 0) {
    throw new Error(body.message || '请求失败');
  }
  return body.data;
}

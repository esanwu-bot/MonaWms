import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiResponse, ErrorResponse } from '../types/api';
import { useAuthStore } from '../store/authStore';

// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加认证token
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // FormData 请求让浏览器自动设置 Content-Type（含 boundary）
    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }

    // 注入当前仓库ID（从仓库持久化存储读取）
    try {
      const raw = localStorage.getItem('warehouse-storage');
      if (raw) {
        const parsed = JSON.parse(raw);
        const warehouseId = parsed?.state?.currentWarehouse?.id;
        if (warehouseId && config.headers) {
          config.headers['X-Warehouse-Id'] = String(warehouseId);
        }
      }
    } catch {
      // 解析失败时静默忽略，避免阻断请求
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 用于防止多次刷新token的标志
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    // 检查响应数据中的code字段
    if (response.data && response.data.code === 401) {
      // 使用authStore的forceLogout方法
      const { forceLogout } = useAuthStore.getState();
      forceLogout();
      return Promise.reject(new Error('Token无效或已过期'));
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // 处理401未授权错误
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 如果正在刷新token，将请求加入队列
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        try {
          // 尝试刷新token
          const response = await apiClient.post('/auth/refresh', {
            refreshToken,
          });
          
          const { token: newToken, refreshToken: newRefreshToken } = response.data.data;
          localStorage.setItem('token', newToken);
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }
          
          // 更新默认请求头
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          
          processQueue(null, newToken);
          
          return apiClient(originalRequest);
        } catch (refreshError) {
          // 刷新token失败，使用authStore的forceLogout方法
          processQueue(refreshError, null);
          const { forceLogout } = useAuthStore.getState();
          forceLogout();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // 没有refreshToken，使用authStore的forceLogout方法
        const { forceLogout } = useAuthStore.getState();
        forceLogout();
      }
    }
    
    // 处理其他错误
    const errorResponse: ErrorResponse = {
      success: false,
      message: error.response?.data?.message || error.message || '请求失败',
      error: error.response?.data?.error,
      details: error.response?.data?.details,
      timestamp: new Date().toISOString(),
    };
    
    return Promise.reject(errorResponse);
  }
);

// API请求方法
export const api = {
  // GET请求
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> => {
    return apiClient.get(url, config);
  },
  
  // POST请求
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> => {
    return apiClient.post(url, data, config);
  },

  // POST FormData 请求（文件上传）
  postForm: <T = any>(url: string, data: FormData, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> => {
    return apiClient.post(url, data, config);
  },

  // PUT请求
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> => {
    return apiClient.put(url, data, config);
  },
  
  // PATCH请求
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> => {
    return apiClient.patch(url, data, config);
  },
  
  // DELETE请求
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> => {
    return apiClient.delete(url, config);
  },
};

export default apiClient;
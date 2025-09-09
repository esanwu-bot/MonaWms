import { api } from './api';
import type { LoginRequest, LoginResponse, User } from '../types/api';

// 认证服务
export const authService = {
  // 用户登录
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    const { user, token, refreshToken } = response.data.data;
    
    // 保存到本地存储
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    
    return response.data.data;
  },
  
  // 用户注册
  register: async (userData: {
    username: string;
    email: string;
    password: string;
    fullName: string;
  }): Promise<User> => {
    const response = await api.post<User>('/auth/register', userData);
    return response.data.data;
  },
  
  // 用户登出
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // 即使请求失败也要清除本地存储
      console.error('Logout request failed:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },
  
  // 刷新token
  refreshToken: async (): Promise<string> => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await api.post<{ token: string; refreshToken: string }>('/auth/refresh', {
      refreshToken,
    });
    
    const { token: newToken, refreshToken: newRefreshToken } = response.data.data;
    localStorage.setItem('token', newToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    
    return newToken;
  },
  
  // 获取当前用户信息
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data.data;
  },
  
  // 修改密码
  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> => {
    await api.post('/auth/change-password', data);
  },
  
  // 检查是否已登录
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },
  
  // 获取本地存储的用户信息
  getStoredUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Failed to parse stored user:', error);
      return null;
    }
  },
  
  // 获取本地存储的token
  getStoredToken: (): string | null => {
    return localStorage.getItem('token');
  },
};
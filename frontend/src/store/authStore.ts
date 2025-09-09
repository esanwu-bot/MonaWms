import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/api';
import { authService } from '../services/authService';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forceLogout: () => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  clearError: () => void;
  initializeAuth: () => void;
  refreshUserInfo: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // 状态
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // 登录
      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { user, token } = await authService.login({ username, password });
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || '登录失败',
          });
          throw error;
        }
      },

      // 登出
      logout: async () => {
        set({ isLoading: true });
        try {
          await authService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      // 强制登出（用于token失效等情况）
      forceLogout: () => {
        // 清除localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        // 清除状态
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        
        // 跳转到登录页
        window.location.href = '/login';
      },

      // 设置用户
      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      // 设置token
      setToken: (token: string | null) => {
        set({ token });
      },

      // 清除错误
      clearError: () => {
        set({ error: null });
      },

      // 初始化认证状态
      initializeAuth: () => {
        set({ isLoading: true });
        
        const storedUser = authService.getStoredUser();
        const storedToken = authService.getStoredToken();
        
        if (storedUser && storedToken) {
          set({
            user: storedUser,
            token: storedToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          // 如果没有有效的认证信息，确保状态被清除
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      // 刷新用户信息
      refreshUserInfo: async () => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) return;

        try {
          const user = await authService.getCurrentUser();
          set({ user });
          // 更新本地存储
          localStorage.setItem('user', JSON.stringify(user));
        } catch (error) {
          console.error('Failed to refresh user info:', error);
          // 如果获取用户信息失败，可能token已过期，执行登出
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
      onRehydrateStorage: () => (state) => {
         if (state) {
           // 重新水化后重新计算认证状态
           const isAuth = !!(state.user && state.token);
           state.isAuthenticated = isAuth;
           state.isLoading = false;
         }
       },
    }
  )
);
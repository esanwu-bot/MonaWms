import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AuthUser } from '../types/grant';
import { setTokenGetter } from '../api/client';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      clear: () => set({ user: null, token: null }),
    }),
    { name: 'monawms-auth' },
  ),
);

// 把 token 读取能力交给 axios 拦截器
setTokenGetter(() => useAuthStore.getState().token);

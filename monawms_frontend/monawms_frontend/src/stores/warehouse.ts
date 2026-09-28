import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { GrantRole, GrantedWarehouse } from '../types/grant';
import { setWarehouseIdGetter } from '../api/client';

interface WarehouseState {
  /** 当前选中的仓库 */
  currentId: number | null;
  /** 已授权仓库列表（登录/切换账号后由 /api/grants/user/:id 拉取） */
  list: GrantedWarehouse[];
  loading: boolean;

  setList: (list: GrantedWarehouse[]) => void;
  setCurrent: (id: number | null) => void;
  setLoading: (v: boolean) => void;
  /** 当前仓库的授权角色 */
  currentGrantRole: () => GrantRole | null;
  reset: () => void;
}

export const useWarehouseStore = create<WarehouseState>()(
  persist(
    (set, get) => ({
      currentId: null,
      list: [],
      loading: false,

      /**
       * 设置已授权仓库列表
       *
       * 关键：如果当前选中的仓库已不在授权列表里（被撤销授权），
       * 必须立刻清空，否则前端会继续拿旧 warehouse_id 请求，后端返回 403，
       * 用户看到的是一堆莫名其妙的「没有权限」。
       */
      setList: (list) => {
        const currentId = get().currentId;
        const stillValid = list.some((w) => w.warehouseId === currentId);
        set({
          list,
          currentId: stillValid ? currentId : (list[0]?.warehouseId ?? null),
        });
      },

      setCurrent: (id) => set({ currentId: id }),
      setLoading: (v) => set({ loading: v }),

      currentGrantRole: () => {
        const { currentId, list } = get();
        return list.find((w) => w.warehouseId === currentId)?.grantRole ?? null;
      },

      reset: () => set({ currentId: null, list: [], loading: false }),
    }),
    {
      name: 'monawms-warehouse',
      // 只持久化当前仓库选择，列表每次登录后重新拉，避免缓存了已撤销的授权
      partialize: (state) => ({ currentId: state.currentId }) as never,
    },
  ),
);

// 把 warehouse_id 读取能力交给 axios 拦截器
setWarehouseIdGetter(() => useWarehouseStore.getState().currentId);

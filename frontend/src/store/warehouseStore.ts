import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Warehouse } from '../types/api';
import { grantService } from '../services/grantService';

interface WarehouseState {
  currentWarehouse: Warehouse | null;
  warehouses: Warehouse[];
  isLoading: boolean;
  error: string | null;
}

interface WarehouseActions {
  setCurrentWarehouse: (warehouse: Warehouse | null) => void;
  fetchWarehouses: (userId: number) => Promise<void>;
  clear: () => void;
}

type WarehouseStore = WarehouseState & WarehouseActions;

const STORAGE_KEY = 'warehouse-storage';

export const useWarehouseStore = create<WarehouseStore>()(
  persist(
    (set, get) => ({
      currentWarehouse: null,
      warehouses: [],
      isLoading: false,
      error: null,

      setCurrentWarehouse: (warehouse) => {
        set({ currentWarehouse: warehouse });
      },

      fetchWarehouses: async (userId: number) => {
        set({ isLoading: true, error: null });
        try {
          const warehouses = await grantService.getUserGrants(userId);
          const active = warehouses.filter((w) => w.status === 'active');
          set({ warehouses: active, isLoading: false });

          const current = get().currentWarehouse;
          if (!current || !active.some((w) => w.id === current.id)) {
            set({ currentWarehouse: active[0] ?? null });
          }
        } catch (error: any) {
          set({ error: error.message || '加载仓库失败', isLoading: false });
        }
      },

      clear: () => {
        set({ currentWarehouse: null, warehouses: [], isLoading: false, error: null });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ currentWarehouse: state.currentWarehouse }),
    }
  )
);

import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import type { PlusRouteRecordRaw } from "plus-pro-components";
import {
  House,
  Box,
  Download,
  Upload,
  Checked,
} from "@element-plus/icons-vue";

import LoginView from "@/views/LoginView.vue";
import MainLayout from "@/views/MainLayout.vue";
import DashboardView from "@/views/DashboardView.vue";
import InventoryView from "@/views/InventoryView.vue";
import InboundView from "@/views/InboundView.vue";
import OutboundView from "@/views/OutboundView.vue";
import StocktakeView from "@/views/StocktakeView.vue";

/**
 * 主框架下的业务路由。
 * 同时作为 PlusSidebar 的菜单数据：meta.title 显示菜单名，meta.icon 显示菜单图标。
 */
export const menuRoutes: PlusRouteRecordRaw[] = [
  {
    path: "/dashboard",
    name: "dashboard",
    component: DashboardView,
    meta: { title: "工作台", icon: House },
  },
  {
    path: "/inventory",
    name: "inventory",
    component: InventoryView,
    meta: { title: "库存管理", icon: Box },
  },
  {
    path: "/inbound",
    name: "inbound",
    component: InboundView,
    meta: { title: "入库管理", icon: Download },
  },
  {
    path: "/outbound",
    name: "outbound",
    component: OutboundView,
    meta: { title: "出库管理", icon: Upload },
  },
  {
    path: "/stocktake",
    name: "stocktake",
    component: StocktakeView,
    meta: { title: "盘点对账", icon: Checked },
  },
];

const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "login",
    component: LoginView,
    meta: { title: "登录", hideInMenu: true },
  },
  {
    path: "/",
    component: MainLayout,
    redirect: "/dashboard",
    children: menuRoutes as unknown as RouteRecordRaw[],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 未登录时跳转登录页（演示：本地会话标记）
router.beforeEach((to) => {
  const logged = localStorage.getItem("monawms_logged") === "1";
  if (!logged && to.path !== "/login") {
    return { path: "/login" };
  }
  if (logged && to.path === "/login") {
    return { path: "/dashboard" };
  }
  return true;
});

export default router;

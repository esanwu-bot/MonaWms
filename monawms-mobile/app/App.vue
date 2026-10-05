<template>
  <Page actionBarHidden="true" statusBarStyle="light" class="app-page" @loaded="onPageLoaded">
    <GridLayout>
      <!-- ===== 登录后主界面 ===== -->
      <GridLayout v-if="store.loggedIn" rows="*,auto">
        <!-- 五个 Tab 视图（v-show 保持状态） -->
        <HomeView row="0" v-show="store.tab === 'home'" />
        <InboundView row="0" v-show="store.tab === 'inbound'" />
        <OutboundView row="0" v-show="store.tab === 'outbound'" />
        <DevicesView row="0" v-show="store.tab === 'devices'" />
        <MineView row="0" v-show="store.tab === 'mine'" />

        <!-- FAB -->
        <FabButton row="0" />

        <!-- 自定义 Tab Bar -->
        <TabBar row="1" />

        <!-- 二级页覆盖层（盖住 TabBar，右滑入） -->
        <SubViewHost row="0" rowSpan="2" />
      </GridLayout>

      <!-- ===== 未登录 ===== -->
      <LoginView v-else />

      <!-- 底部抽屉 -->
      <SheetHost />

      <!-- Toast -->
      <ToastHost />
    </GridLayout>
  </Page>
</template>

<script setup>
/**
 * 应用根组件（对应原型 .app 容器）
 * - Tab 主界面 + 二级页覆盖层 + 底部抽屉 + Toast + FAB 统一编排
 * - Android 物理返回键：先关抽屉 → 关二级页 → 回首页
 */
import { onMounted, onBeforeUnmount } from 'nativescript-vue';
import { Application, AndroidApplication } from '@nativescript/core';
import { store, closeSheet, closeSub, switchTab } from './services/store';

import HomeView from './views/HomeView.vue';
import InboundView from './views/InboundView.vue';
import OutboundView from './views/OutboundView.vue';
import DevicesView from './views/DevicesView.vue';
import MineView from './views/MineView.vue';
import LoginView from './views/LoginView.vue';
import TabBar from './components/TabBar.vue';
import FabButton from './components/FabButton.vue';
import SheetHost from './components/SheetHost.vue';
import SubViewHost from './components/SubViewHost.vue';
import ToastHost from './components/ToastHost.vue';

function onPageLoaded() {
  // 预留：页面级初始化钩子
}

function onBackPressed(args) {
  if (store.sheet) {
    args.cancel = true;
    closeSheet();
  } else if (store.subView) {
    args.cancel = true;
    closeSub();
  } else if (store.tab !== 'home') {
    args.cancel = true;
    switchTab('home');
  }
}

onMounted(() => {
  if (global.isAndroid) {
    Application.android.on(AndroidApplication.activityBackPressedEvent, onBackPressed);
  }
});

onBeforeUnmount(() => {
  if (global.isAndroid) {
    Application.android.off(AndroidApplication.activityBackPressedEvent, onBackPressed);
  }
});
</script>

<style>
.app-page {
  background-color: #0a0e16;
}
</style>

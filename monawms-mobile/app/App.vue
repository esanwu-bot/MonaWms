<template>
  <Page actionBarHidden="true" statusBarStyle="light" class="app-page" @loaded="onPageLoaded">
    <GridLayout>
      <!-- ===== 登录后主界面 ===== -->
      <GridLayout v-if="store.loggedIn" rows="*,auto">
        <!-- 五个 Tab 视图：首次访问才挂载（v-if），之后用 v-show 保持状态。
             避免某个隐藏视图渲染抛错连累首页与 TabBar 一起失效。 -->
        <HomeView v-if="visited.home" row="0" v-show="store.tab === 'home'" />
        <InboundView v-if="visited.inbound" row="0" v-show="store.tab === 'inbound'" />
        <OutboundView v-if="visited.outbound" row="0" v-show="store.tab === 'outbound'" />
        <DevicesView v-if="visited.devices" row="0" v-show="store.tab === 'devices'" />
        <MineView v-if="visited.mine" row="0" v-show="store.tab === 'mine'" />

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

      <!-- 全局错误横幅：任何组件树里的异常都显示在这里，永远在最上层 -->
      <StackLayout v-if="store.globalError" class="err-banner" verticalAlignment="top">
        <Label :text="errTitle" class="eb-title" />
        <Label :text="store.globalError.msg" class="eb-msg font-mono" textWrap="true" />
        <Label :text="errMeta" class="eb-meta font-mono" textWrap="true" />
        <FlexboxLayout flexDirection="row" alignItems="center">
          <Label text="重载数据" class="eb-btn" @tap="retryData" />
          <Label text="关闭" class="eb-btn eb-btn-ghost" @tap="closeError" />
        </FlexboxLayout>
      </StackLayout>
    </GridLayout>
  </Page>
</template>

<script setup>
/**
 * 应用根组件（对应原型 .app 容器）
 * - Tab 主界面 + 二级页覆盖层 + 底部抽屉 + Toast + FAB 统一编排
 * - Android 物理返回键：先关抽屉 → 关二级页 → 回首页
 * - 全局错误可见化：子树抛错时显示横幅，不再整屏空白
 */
import { reactive, computed, watch, onMounted, onBeforeUnmount, onErrorCaptured } from 'nativescript-vue';
import { Application, AndroidApplication } from '@nativescript/core';
import {
  store,
  closeSheet,
  closeSub,
  switchTab,
  bumpRefresh,
  reportGlobalError,
  clearGlobalError,
  BUILD,
} from './services/store';

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

/* 只挂载当前访问过的 Tab，坏掉的视图不再连累其它 Tab */
const visited = reactive({ home: true });
watch(
  () => store.tab,
  (t) => {
    if (t) visited[t] = true;
  },
  { immediate: true }
);

const errTitle = computed(
  () => '界面异常 · ' + (store.globalError ? store.globalError.source : '') + ' @' + BUILD
);
const errMeta = computed(() => {
  const g = store.globalError;
  return (g ? g.time + ' · ' : '') + '接口 ' + store.baseUrl + (store.demoMode ? ' · 演示模式' : '');
});

function retryData() {
  clearGlobalError();
  bumpRefresh(); // 通知所有列表页重新拉数据
}

function closeError() {
  clearGlobalError();
}

onErrorCaptured((err, instance, info) => {
  const name = (instance && instance.type && (instance.type.__name || instance.type.name)) || 'unknown';
  reportGlobalError('component:' + name + '@' + (info || '?'), err);
  return false; // 阻止错误继续向上传播，保住其余界面
});

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

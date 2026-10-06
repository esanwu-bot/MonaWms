<template>
  <ScrollView class="view-scroll" scrollBarEnabled="false">
    <StackLayout paddingBottom="40">
      <!-- 页头 -->
      <StackLayout class="pagehead">
        <Label text="我的" class="pagehead-title font-disp-b" />
        <Label text="个人中心与系统功能" class="pagehead-sub" />
      </StackLayout>

      <!-- 名片 -->
      <FlexboxLayout class="me-card" flexDirection="row" alignItems="center">
        <GridLayout class="me-avatar no-shrink">
          <Image :src="avatarUrl" stretch="aspectFill" class="me-avatar-img" />
        </GridLayout>
        <StackLayout flexGrow="1" flexShrink="1">
          <Label :text="displayName" class="me-name" />
          <FlexboxLayout flexDirection="row" alignItems="center" marginTop="3">
            <StackLayout class="me-dot" />
            <Label :text="roleText + ' · 在线'" class="me-role" />
          </FlexboxLayout>
        </StackLayout>
      </FlexboxLayout>

      <!-- 三宫格统计 -->
      <GridLayout class="hpad-12" rows="auto" columns="*,*,*">
        <StackLayout v-for="(m, i) in meStats" :key="m.k" class="me-stat" :col="i">
          <Label :text="m.v" class="me-stat-v font-disp-b" />
          <Label :text="m.k" class="me-stat-k" />
        </StackLayout>
      </GridLayout>

      <!-- 菜单 -->
      <StackLayout class="menu-card">
        <FlexboxLayout
          v-for="(it, i) in menus"
          :key="it.title"
          class="mitem pressable"
          :class="i < menus.length - 1 ? 'divider-b' : ''"
          flexDirection="row"
          alignItems="center"
          @tap="it.go()"
        >
          <GridLayout :class="['mitem-icon-wrap', 'no-shrink', it.bg]">
            <MiIcon :name="it.icon" :size="16" :color="it.color" />
          </GridLayout>
          <Label :text="it.title" class="mitem-title" />
          <MiIcon name="chevron_right" :size="16" color="#5c677d" iconClass="mitem-arr" />
        </FlexboxLayout>
      </StackLayout>

      <Label :text="'通信设备WMS · MOBILE v1.0 · build ' + BUILD" class="version-text font-mono" />
      <Label v-if="store.demoMode" text="离线演示模式 · 数据仅存于本机" class="version-note font-mono" />
    </StackLayout>
  </ScrollView>
</template>

<script setup>
/** 我的（对应原型 #view-mine） */
import { computed, onMounted, ref } from 'nativescript-vue';
import { confirm } from '@nativescript/core';
import { store, openSub, showToast, logout, BUILD } from '../services/store';
import { api } from '../services/api';
import { C } from '../services/theme';
import { demoMe } from '../services/mock';
import MiIcon from '../components/MiIcon.vue';

const avatarUrl = 'https://picsum.photos/seed/wms-admin-avatar/120/120';
const me = ref(null);

const displayName = computed(() => {
  if (store.demoMode) return '设备WMS管理员';
  return (store.user && (store.user.real_name || store.user.username)) || '管理员';
});

const roleText = computed(() => {
  if (store.demoMode) return '超级管理员';
  return (store.user && store.user.role_text) || '管理员';
});

const meStats = computed(() => {
  const m = me.value || (store.demoMode ? demoMe : { handled: '—', pending: '—', accuracy: '—' });
  return [
    { v: String(m.handled), k: '本月经手' },
    { v: String(m.pending), k: '待办单据' },
    { v: String(m.accuracy), k: '准确率' },
  ];
});

const menus = [
  { title: '扫码查询', icon: 'qr_code_scanner', bg: 'qi-cyan', color: C.cyan, go: () => openSub('scan') },
  { title: '盘点管理', icon: 'fact_check', bg: 'qi-violet', color: C.violet, go: () => openSub('stocktake') },
  { title: '仓库管理', icon: 'home_work', bg: 'qi-green', color: C.green, go: () => openSub('warehouse') },
  { title: '报废管理', icon: 'delete', bg: 'qi-slate', color: '#94a3b8', go: () => openSub('scrap') },
  { title: '报表统计', icon: 'insert_chart', bg: 'qi-red', color: C.red, go: () => openSub('reports') },
  { title: '操作日志', icon: 'description', bg: 'qi-violet', color: C.violet, go: () => openSub('logs') },
  { title: '系统设置', icon: 'settings', bg: 'qi-cyan', color: C.cyan, go: () => showToast('设置功能开发中') },
  {
    title: '退出登录',
    icon: 'logout',
    bg: 'qi-red',
    color: C.red,
    go: async () => {
      const ok = await confirm({
        title: '退出登录',
        message: store.demoMode ? '将退出演示模式并返回登录页' : '确定要退出当前账号吗？',
        okButtonText: '退出',
        cancelButtonText: '取消',
      });
      if (ok) logout();
    },
  },
];

onMounted(() => {
  me.value = api.me();
});
</script>

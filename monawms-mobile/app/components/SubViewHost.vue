<template>
  <GridLayout ref="host" v-show="shown" class="sub-page">
    <component :is="current" v-if="store.subView" @back="close" />
  </GridLayout>
</template>

<script setup>
/**
 * 二级页宿主（对应原型 .subview：自右侧滑入的全屏覆盖层）
 */
import { ref, computed, watch, nextTick, onMounted } from 'nativescript-vue';
import { Screen } from '@nativescript/core';
import { store, registerSubClose } from '../services/store';

import LogsView from '../views/LogsView.vue';
import WarehouseView from '../views/WarehouseView.vue';
import ScrapView from '../views/ScrapView.vue';
import ReportsView from '../views/ReportsView.vue';
import ScanView from '../views/ScanView.vue';
import StocktakeView from '../views/StocktakeView.vue';
import StocktakeExecView from '../views/StocktakeExecView.vue';

const MAP = {
  logs: LogsView,
  warehouse: WarehouseView,
  scrap: ScrapView,
  reports: ReportsView,
  scan: ScanView,
  stocktake: StocktakeView,
  'stocktake-exec': StocktakeExecView,
};

const shown = ref(false);
const host = ref(null);
let closing = false;

const current = computed(() => MAP[store.subView] || null);

function open() {
  closing = false;
  shown.value = true;
  nextTick(() => {
    setTimeout(() => {
      const el = host.value;
      if (el) {
        const w = Screen.mainScreen.widthDIPs;
        el.translateX = w;
        el.animate({ translate: { x: 0, y: 0 }, duration: 380, curve: 'easeOut' }).catch(() => {});
      }
    }, 16);
  });
}

function close() {
  if (closing || !store.subView) return;
  closing = true;
  const finish = () => {
    store.subView = null;
    store.subPayload = null;
    shown.value = false;
    closing = false;
  };
  const el = host.value;
  if (el) {
    const w = Screen.mainScreen.widthDIPs;
    el.animate({ translate: { x: w, y: 0 }, duration: 300, curve: 'easeIn' }).then(finish).catch(finish);
  } else finish();
}

watch(
  () => store.subView,
  (v) => {
    if (v && !shown.value) open();
  }
);

onMounted(() => {
  registerSubClose(close);
  if (store.subView) open();
});
</script>

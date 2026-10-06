<template>
  <GridLayout v-show="shown">
    <!-- 遮罩：点击关闭 -->
    <GridLayout ref="dimEl" class="sheet-dim" opacity="0" @tap="close" />
    <!-- 面板：自底部滑入 -->
    <ScrollView ref="panelEl" verticalAlignment="bottom" scrollBarEnabled="false">
      <StackLayout class="sheet-panel">
        <StackLayout class="sheet-handle" />
        <component :is="current" v-if="store.sheet" />
      </StackLayout>
    </ScrollView>
  </GridLayout>
</template>

<script setup>
/**
 * 底部抽屉宿主（对应原型 .sheet-ov + .sheet）
 * - 遮罩淡入 + 面板上滑（380ms ease-out）
 * - store.sheet 决定内容组件；closeSheet() 全局可调
 */
import { ref, computed, watch, nextTick, onMounted } from 'nativescript-vue';
import { store, registerSheetClose } from '../services/store';

import NewInboundSheet from '../sheets/NewInboundSheet.vue';
import NewOutboundSheet from '../sheets/NewOutboundSheet.vue';
import NewDeviceSheet from '../sheets/NewDeviceSheet.vue';
import DeviceDetailSheet from '../sheets/DeviceDetailSheet.vue';
import OrderDetailSheet from '../sheets/OrderDetailSheet.vue';

const MAP = {
  'new-inbound': NewInboundSheet,
  'new-outbound': NewOutboundSheet,
  'new-device': NewDeviceSheet,
  'device-detail': DeviceDetailSheet,
  'order-detail': OrderDetailSheet,
};

const shown = ref(false);
const dimEl = ref(null);
const panelEl = ref(null);
let closing = false;

const current = computed(() => MAP[store.sheet] || null);

function open() {
  closing = false;
  shown.value = true;
  nextTick(() => {
    setTimeout(() => {
      const p = panelEl.value;
      const d = dimEl.value;
      if (p) {
        p.translateY = 800;
        p.animate({ translate: { x: 0, y: 0 }, duration: 380, curve: 'easeOut' }).catch(() => {});
      }
      if (d) d.animate({ opacity: 1, duration: 250 }).catch(() => {});
    }, 16);
  });
}

function close() {
  if (closing || !store.sheet) return;
  closing = true;
  const p = panelEl.value;
  const d = dimEl.value;
  const finish = () => {
    store.sheet = null;
    store.sheetPayload = null;
    shown.value = false;
    closing = false;
  };
  if (d) d.animate({ opacity: 0, duration: 250 }).catch(() => {});
  if (p) {
    const h = (p.getActualSize && p.getActualSize().height) || 600;
    p.animate({ translate: { x: 0, y: h + 60 }, duration: 300, curve: 'easeIn' })
      .then(finish)
      .catch(finish);
  } else {
    finish();
  }
}

watch(
  () => store.sheet,
  (v) => {
    if (v && !shown.value) open();
  }
);

onMounted(() => {
  registerSheetClose(close);
  if (store.sheet) open();
});
</script>

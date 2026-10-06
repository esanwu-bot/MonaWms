<template>
  <GridLayout ref="fabEl" v-show="visible" class="fab pressable" @tap="onTap">
    <MiIcon name="add" :size="24" color="#04222b" />
  </GridLayout>
</template>

<script setup>
/** FAB 悬浮按钮（对应原型 .fab：入库/出库/设备三个 Tab 显示） */
import { ref, computed, watch, nextTick } from 'nativescript-vue';
import { store, openSheet } from '../services/store';
import MiIcon from './MiIcon.vue';

const fabEl = ref(null);

const TARGETS = {
  inbound: 'new-inbound',
  outbound: 'new-outbound',
  devices: 'new-device',
};

const visible = computed(() => !!TARGETS[store.tab]);

watch(visible, (v) => {
  nextTick(() => {
    const el = fabEl.value;
    if (!el) return;
    if (v) {
      el.scaleX = 0.6;
      el.scaleY = 0.6;
      el.opacity = 0;
      el.animate({ scale: { x: 1, y: 1 }, opacity: 1, duration: 300, curve: 'easeOut' }).catch(() => {});
    } else {
      el.animate({ scale: { x: 0.6, y: 0.6 }, opacity: 0, duration: 200, curve: 'easeIn' }).catch(() => {});
    }
  });
});

function onTap() {
  const sheet = TARGETS[store.tab];
  if (sheet) openSheet(sheet);
}
</script>

<template>
  <FlexboxLayout
    ref="wrap"
    v-show="store.toast.visible"
    class="toast-wrap"
    flexDirection="row"
    alignItems="center"
    opacity="0"
  >
    <FlexboxLayout class="toast" flexDirection="row" alignItems="center">
      <MiIcon :name="store.toast.icon || 'check'" :size="14" :color="iconColor" iconClass="toast-tick" />
      <Label :text="store.toast.msg" class="toast-msg" />
    </FlexboxLayout>
  </FlexboxLayout>
</template>

<script setup>
/** Toast 提示（对应原型 #toast：底部居中，2.2s 自动消失） */
import { ref, computed, watch, nextTick } from 'nativescript-vue';
import { store } from '../services/store';
import MiIcon from './MiIcon.vue';

const wrap = ref(null);

const iconColor = computed(() => {
  const ic = store.toast.icon;
  if (ic === 'warning' || ic === 'error') return '#fbbf24';
  if (ic === 'close') return '#f87171';
  return '#34d399';
});

watch(
  () => store.toast,
  (t) => {
    nextTick(() => {
      const el = wrap.value;
      if (!el) return;
      if (t.visible) {
        el.translateY = 20;
        el.animate({ opacity: 1, translate: { x: 0, y: 0 }, duration: 280, curve: 'easeOut' }).catch(() => {});
      } else {
        el.animate({ opacity: 0, translate: { x: 0, y: 20 }, duration: 240, curve: 'easeIn' }).catch(() => {});
      }
    });
  },
  { deep: true }
);
</script>

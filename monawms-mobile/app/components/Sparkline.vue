<template>
  <FlexboxLayout class="spark" flexDirection="row" alignItems="flex-end">
    <StackLayout
      v-for="(b, i) in bars"
      :key="i"
      class="spark-bar"
      :height="b.h"
      :backgroundColor="b.c"
    />
  </FlexboxLayout>
</template>

<script setup>
/**
 * 迷你趋势线（对应原型 .stat .spark 内联 SVG）
 *
 * 刻意用纯布局柱状而非 <Canvas>：统计卡是首页顶栏之后第一块渲染内容，
 * 老机型上 Canvas 原生库一旦不可用，<Canvas> 会把整棵首页子树带崩。
 */
import { computed } from 'nativescript-vue';
import { toBars } from '../services/canvasProbe';

const props = defineProps({
  points: { type: Array, default: () => [] },
  color: { type: String, default: '#22d3ee' },
});

function hexToRgba(hex, a) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const bars = computed(() => {
  const hs = toBars(props.points, 26, 4);
  const last = hs.length - 1;
  return hs.map((h, i) => ({ h, c: hexToRgba(props.color, i === last ? 1 : 0.32) }));
});
</script>

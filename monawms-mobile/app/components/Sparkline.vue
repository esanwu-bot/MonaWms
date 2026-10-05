<template>
  <Canvas class="spark" @ready="onReady" width="100%" height="30" />
</template>

<script setup>
/**
 * 迷你趋势线（对应原型 .stat .spark 内联 SVG）
 * 使用 @nativescript/canvas 2D 上下文绘制：面积 + 折线 + 端点
 */
import { watch } from 'nativescript-vue';
import { Screen } from '@nativescript/core';

const props = defineProps({
  points: { type: Array, default: () => [] },
  color: { type: String, default: '#22d3ee' },
});

let cv = null;

function hexToRgba(hex, a) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function draw() {
  if (!cv) return;
  try {
    const scale = Screen.mainScreen.scale || 2;
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    if (!w || !h) return;
    cv.width = w * scale;
    cv.height = h * scale;
    const ctx = cv.getContext('2d');
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const pts = (props.points || []).map(Number).filter((n) => isFinite(n));
    if (pts.length < 2) return;
    const mx = Math.max(...pts);
    const mn = Math.min(...pts);
    const step = w / (pts.length - 1);
    const co = pts.map((v, i) => [i * step, h - 3 - ((v - mn) / (mx - mn || 1)) * (h - 8)]);

    // 面积
    ctx.beginPath();
    ctx.moveTo(co[0][0], co[0][1]);
    for (let i = 1; i < co.length; i++) ctx.lineTo(co[i][0], co[i][1]);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(props.color, 0.13);
    ctx.fill();

    // 折线
    ctx.beginPath();
    ctx.moveTo(co[0][0], co[0][1]);
    for (let i = 1; i < co.length; i++) ctx.lineTo(co[i][0], co[i][1]);
    ctx.strokeStyle = props.color;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 端点
    const last = co[co.length - 1];
    ctx.beginPath();
    ctx.arc(last[0] - 1.5, last[1], 2.2, 0, Math.PI * 2);
    ctx.fillStyle = props.color;
    ctx.fill();
  } catch (e) {
    console.error('[Sparkline] draw failed:', e);
  }
}

function onReady(args) {
  cv = args.object;
  draw();
}

watch(() => props.points, () => draw(), { deep: true });

defineExpose({ redraw: draw });
</script>

<template>
  <!-- 纯布局柱状趋势图：Canvas 已全局禁用（libcanvasnativev8.so 与设备 V8 不兼容，加载即致命崩溃） -->
  <FlexboxLayout class="trend-fb" flexDirection="row" alignItems="flex-end">
    <StackLayout
      v-for="(p, i) in pairs"
      :key="i"
      class="trend-fb-group"
      flexDirection="row"
      alignItems="flex-end"
    >
      <StackLayout class="trend-fb-bar" :height="p.inH" backgroundColor="#22d3ee" />
      <StackLayout class="trend-fb-bar" :height="p.outH" backgroundColor="#fbbf24" />
    </StackLayout>
  </FlexboxLayout>
</template>

<script setup>
/**
 * 出入库趋势图（对应原型 #trend SVG 折线图）
 * 双线（入库=青 / 出库=琥珀）+ 入库线下渐变面积 + 网格与 Y 轴刻度。
 * Canvas 原生不可用时降级为青/琥珀双色柱状，保证首页这一屏永远有内容。
 */
import { ref, computed, watch } from 'nativescript-vue';
import { Screen } from '@nativescript/core';
import { isCanvasUsable, markCanvasUnavailable } from '../services/canvasProbe';

const props = defineProps({
  inbound: { type: Array, default: () => [] },
  outbound: { type: Array, default: () => [] },
  labels: { type: Array, default: () => [] },
});

const broken = ref(false);
const useCanvas = computed(() => isCanvasUsable() && !broken.value);

let cv = null;

function fallBack(reason) {
  broken.value = true;
  markCanvasUnavailable(reason);
}

function smoothPath(ctx, co) {
  // 与原型一致的三次贝塞尔平滑
  ctx.moveTo(co[0][0], co[0][1]);
  for (let i = 1; i < co.length; i++) {
    const xc = (co[i - 1][0] + co[i][0]) / 2;
    ctx.bezierCurveTo(xc, co[i - 1][1], xc, co[i][1], co[i][0], co[i][1]);
  }
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

    const inb = (props.inbound || []).map(Number);
    const out = (props.outbound || []).map(Number);
    if (inb.length < 2) return;

    const pl = 26, pr = 4, pt = 10, pb = 18;
    const iw = w - pl - pr;
    const ih = h - pt - pb;
    const rawMax = Math.max(...inb, ...out, 1);
    const mx = Math.ceil(rawMax / 12) * 12;

    const X = (i) => pl + i * (iw / (inb.length - 1));
    const Y = (v) => pt + ih - (v / mx) * ih;

    // 网格 + Y 刻度
    ctx.font = '8px monospace';
    ctx.textAlign = 'right';
    for (let g = 0; g <= 3; g++) {
      const gy = pt + (ih * g) / 3;
      ctx.beginPath();
      ctx.moveTo(pl, gy);
      ctx.lineTo(w - pr, gy);
      ctx.strokeStyle = 'rgba(148,163,184,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#5c677d';
      ctx.fillText(String(Math.round(mx - (mx * g) / 3)), pl - 5, gy + 3);
    }

    const coIn = inb.map((v, i) => [X(i), Y(v)]);
    const coOut = out.map((v, i) => [X(i), Y(v)]);

    // 入库面积渐变
    try {
      const grad = ctx.createLinearGradient(0, pt, 0, pt + ih);
      grad.addColorStop(0, 'rgba(34,211,238,0.3)');
      grad.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.beginPath();
      smoothPath(ctx, coIn);
      ctx.lineTo(coIn[coIn.length - 1][0], pt + ih);
      ctx.lineTo(pl, pt + ih);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    } catch (e) { /* 渐变不可用时跳过面积 */ }

    // 出库线（琥珀）
    ctx.beginPath();
    smoothPath(ctx, coOut);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 入库线（青）
    ctx.beginPath();
    smoothPath(ctx, coIn);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.stroke();

    // X 轴首尾标签
    const labs = props.labels || [];
    if (labs.length) {
      ctx.fillStyle = '#5c677d';
      ctx.textAlign = 'left';
      ctx.fillText(String(labs[0]), pl, h - 5);
      ctx.textAlign = 'right';
      ctx.fillText(String(labs[labs.length - 1]), w - pr, h - 5);
    }
  } catch (e) {
    fallBack('绘制异常: ' + (e && e.message));
  }
}

function onReady(args) {
  try {
    cv = args.object;
    if (!cv || typeof cv.getContext !== 'function') {
      fallBack('Canvas 原生实例不可用');
      return;
    }
    draw();
  } catch (e) {
    fallBack('ready 阶段异常: ' + (e && e.message));
  }
}

/* ---- 纯布局降级：青/琥珀成对柱 ---- */
const pairs = computed(() => {
  const inb = (props.inbound || []).map(Number).filter(isFinite);
  const out = (props.outbound || []).map(Number).filter(isFinite);
  const mx = Math.max(1, ...inb, ...out);
  const n = Math.min(inb.length, out.length);
  const arr = [];
  for (let i = 0; i < n; i++) {
    arr.push({
      inH: Math.max(3, Math.round((inb[i] / mx) * 118)),
      outH: Math.max(3, Math.round((out[i] / mx) * 118)),
    });
  }
  return arr;
});

watch(() => [props.inbound, props.outbound], () => draw(), { deep: true });

defineExpose({ redraw: draw });
</script>

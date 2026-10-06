<template>
  <StackLayout class="stat-card">
    <StackLayout :class="['stat-accent', stat.accent]" />
    <FlexboxLayout class="stat-k-row" flexDirection="row" alignItems="center">
      <MiIcon :name="stat.icon" :size="13" :color="toneColor" iconClass="stat-k-icon" />
      <Label :text="stat.label" class="stat-k" />
    </FlexboxLayout>
    <FlexboxLayout class="stat-n-row" flexDirection="row" alignItems="center">
      <Label :text="thousand(display)" class="stat-n font-disp-b" />
      <Label :text="' ' + stat.unit" class="stat-n-unit" />
    </FlexboxLayout>
    <Label :text="stat.delta.text" :class="['delta', 'font-mono', deltaClass]" />
    <Sparkline :points="stat.spark || []" :color="toneColor" />
  </StackLayout>
</template>

<script setup>
import { computed } from 'nativescript-vue';
import { C } from '../services/theme';
import { thousand } from '../utils/format';
import MiIcon from './MiIcon.vue';
import Sparkline from './Sparkline.vue';

const props = defineProps({
  stat: { type: Object, required: true },
  display: { type: Number, default: 0 }, // 由父组件驱动的滚动数字
});

const toneColor = computed(() => C[props.stat.color] || C.cyan);
const deltaClass = computed(() =>
  props.stat.delta.dir === 'up' ? 'delta-up' : props.stat.delta.dir === 'down' ? 'delta-down' : 'delta-flat'
);
</script>

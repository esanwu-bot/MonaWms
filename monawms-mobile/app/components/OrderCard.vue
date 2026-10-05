<template>
  <StackLayout class="order-cell">
    <StackLayout class="order-card">
      <!-- 单号 + 状态 -->
      <FlexboxLayout flexDirection="row" justifyContent="space-between" alignItems="flex-start">
        <StackLayout flexGrow="1" flexShrink="1">
          <Label :text="order.no" class="o-id font-mono-m" />
          <Label :text="order.date" class="o-date font-mono" />
        </StackLayout>
        <Label :text="'● ' + badgeText" :class="['badge', badgeCls, 'no-shrink']" />
      </FlexboxLayout>

      <!-- 元信息 2x2 -->
      <GridLayout columns="*,*" rows="auto,auto" class="o-meta-grid">
        <StackLayout
          v-for="(m, i) in order.metas"
          :key="i"
          :row="Math.floor(i / 2)"
          :col="i % 2"
          class="meta-cell"
        >
          <Label :text="m.k" class="meta-k" />
          <Label :text="m.v" :class="['meta-v', m.red ? 'meta-v-red' : '']" textWrap="true" />
        </StackLayout>
      </GridLayout>

      <!-- 进度 -->
      <StackLayout v-if="order.progress">
        <FlexboxLayout class="prog-row" flexDirection="row" justifyContent="space-between">
          <Label :text="kind === 'in' ? '入库进度' : '出库进度'" class="prog-label" />
          <Label :text="order.progress.done + '/' + order.progress.total" class="prog-num font-mono" />
        </FlexboxLayout>
        <GridLayout class="prog-track">
          <StackLayout
            :class="['prog-fill', order.status === 'done' ? 'prog-fill-done' : '']"
            :width="order.progress.pct + '%'"
          />
        </GridLayout>
      </StackLayout>

      <!-- 操作 -->
      <FlexboxLayout class="o-actions" flexDirection="row">
        <StackLayout class="btn btn-primary pressable" @tap="$emit('primary', order)">
          <Label :text="primaryText" class="btn-label btn-primary-label" />
        </StackLayout>
        <StackLayout class="btn btn-ghost pressable" @tap="$emit('detail', order)">
          <Label text="详情" class="btn-label btn-ghost-label" />
        </StackLayout>
      </FlexboxLayout>
    </StackLayout>
  </StackLayout>
</template>

<script setup>
import { computed } from 'nativescript-vue';

const props = defineProps({
  order: { type: Object, required: true },
  kind: { type: String, default: 'in' }, // in=入库 out=出库 scrap=报废
});
defineEmits(['primary', 'detail']);

const badgeText = computed(() => {
  const o = props.order;
  if (o.urgent && o.status === 'pending') return '紧急';
  return o.statusText;
});
const badgeCls = computed(() => {
  const o = props.order;
  if (o.urgent && o.status === 'pending') return 'badge-urgent';
  const map = { pending: 'badge-pending', processing: 'badge-processing', done: 'badge-done', cancelled: 'badge-muted' };
  return map[o.status] || 'badge-pending';
});
const primaryText = computed(() => {
  const o = props.order;
  if (o.primaryText) return o.primaryText;
  if (props.kind === 'scrap') return o.status === 'pending' ? '审批' : '打印凭证';
  if (props.kind === 'in') {
    if (o.status === 'pending') return '开始入库';
    if (o.status === 'processing') return '继续入库';
    return '打印标签';
  }
  if (o.status === 'pending') return '开始出库';
  if (o.status === 'processing') return '继续出库';
  return '打印单据';
});
</script>

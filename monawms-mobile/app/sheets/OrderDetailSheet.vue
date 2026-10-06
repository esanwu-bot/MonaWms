<template>
  <StackLayout v-if="order">
    <SheetHead :title="(kind === 'scrap' ? '报废单 ' : kind === 'in' ? '入库单 ' : '出库单 ') + order.no" />

    <FlexboxLayout flexDirection="row" alignItems="center" marginTop="10" marginBottom="6">
      <Label :text="'● ' + order.statusText" :class="['badge', badgeCls]" />
      <Label :text="order.date" class="o-date font-mono" marginLeft="10" />
    </FlexboxLayout>

    <!-- 元信息 -->
    <StackLayout marginTop="8">
      <FlexboxLayout v-for="(m, i) in order.metas" :key="'m' + i" class="dd-row divider-b" flexDirection="row" justifyContent="space-between">
        <Label :text="m.k" class="dd-k no-shrink" />
        <Label :text="m.v" :class="['dd-v', m.red ? 'meta-v-red' : '']" textWrap="true" marginLeft="20" />
      </FlexboxLayout>

      <!-- 进度 -->
      <StackLayout v-if="order.progress" class="dd-row">
        <FlexboxLayout class="prog-row" flexDirection="row" justifyContent="space-between">
          <Label :text="kind === 'out' ? '出库进度' : '入库进度'" class="prog-label" />
          <Label :text="order.progress.done + '/' + order.progress.total" class="prog-num font-mono" />
        </FlexboxLayout>
        <GridLayout class="prog-track">
          <StackLayout :class="['prog-fill', order.status === 'done' ? 'prog-fill-done' : '']" :width="order.progress.pct + '%'" />
        </GridLayout>
      </StackLayout>
    </StackLayout>

    <!-- 明细 -->
    <Label text="单据明细" class="fg-label" marginTop="10" />
    <StackLayout v-if="items.length">
      <FlexboxLayout v-for="(it, i) in items" :key="'i' + i" class="dd-item-row divider-b" flexDirection="row" justifyContent="space-between">
        <Label :text="it.name" class="dd-v" textWrap="true" flexGrow="1" flexShrink="1" />
        <Label :text="'×' + it.qty" class="dd-v font-mono c-cyan no-shrink" marginLeft="12" />
      </FlexboxLayout>
    </StackLayout>
    <Label v-else-if="loading" text="加载中…" class="log-bottom-item" marginTop="6" />
    <Label v-else text="暂无明细（可在 Web 端查看完整单据）" class="log-bottom-item" marginTop="6" />

    <FlexboxLayout class="sheet-foot" flexDirection="row">
      <StackLayout class="btn btn-ghost pressable" @tap="closeSheet">
        <Label text="关闭" class="btn-label btn-ghost-label" />
      </StackLayout>
    </FlexboxLayout>
  </StackLayout>
</template>

<script setup>
/** 单据详情抽屉（入库/出库/报废共用） */
import { ref, computed, onMounted } from 'nativescript-vue';
import { store, closeSheet } from '../services/store';
import { get } from '../services/http';
import { qty } from '../utils/format';
import SheetHead from '../components/SheetHead.vue';

const order = computed(() => (store.sheetPayload && store.sheetPayload.order) || null);
const kind = computed(() => (store.sheetPayload && store.sheetPayload.kind) || 'in');

const items = ref((order.value && order.value.demoItems) || []);
const loading = ref(false);

const badgeCls = computed(() => {
  const o = order.value;
  if (!o) return 'badge-muted';
  if (o.urgent && o.status === 'pending') return 'badge-urgent';
  const map = { pending: 'badge-pending', processing: 'badge-processing', done: 'badge-done', cancelled: 'badge-muted' };
  return map[o.status] || 'badge-pending';
});

onMounted(async () => {
  if (store.demoMode || !order.value || order.value.__demo) return;
  loading.value = true;
  try {
    const base = kind.value === 'out' ? '/outbound-orders/' : kind.value === 'scrap' ? '/scrap/' : '/inbound-orders/';
    const data = await get(base + order.value.id);
    const list = (data && (data.items || (data.detail && data.detail.items))) || [];
    items.value = (Array.isArray(list) ? list : []).map((it) => ({
      name:
        (it.product && (it.product.name || it.product.product_name)) ||
        it.product_name ||
        it.device_name ||
        '物料 #' + (it.product_id || ''),
      qty: qty(it.quantity != null ? it.quantity : it.count),
    }));
  } catch (e) {
    console.error('[OrderDetailSheet]', e && e.message);
  } finally {
    loading.value = false;
  }
});
</script>

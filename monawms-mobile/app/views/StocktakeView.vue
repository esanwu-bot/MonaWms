<template>
  <GridLayout rows="auto,auto,*" class="sub-page">
    <FlexboxLayout row="0" class="sub-head" flexDirection="row" alignItems="center" justifyContent="space-between">
      <FlexboxLayout flexDirection="row" alignItems="center">
        <GridLayout class="back-btn pressable" @tap="$emit('back')">
          <MiIcon name="chevron_left" :size="17" color="#e8edf6" />
        </GridLayout>
        <Label text="盘点管理" class="sub-title font-disp-b" />
      </FlexboxLayout>
      <GridLayout class="icbtn pressable" @tap="doCreate">
        <MiIcon name="add" :size="18" color="#e8edf6" />
      </GridLayout>
    </FlexboxLayout>

    <ChipRow row="1" :items="chips" v-model="filter" />

    <ScrollView row="2" scrollBarEnabled="false">
      <StackLayout paddingBottom="40">
        <StackLayout v-for="s in filtered" :key="s.id" class="order-cell">
          <StackLayout class="order-card">
            <FlexboxLayout flexDirection="row" justifyContent="space-between" alignItems="flex-start">
              <StackLayout flexGrow="1" flexShrink="1">
                <Label :text="s.no" class="o-id font-mono-m" />
                <Label :text="s.date" class="o-date font-mono" />
              </StackLayout>
              <Label :text="'● ' + s.statusText" :class="['badge', badgeCls(s.status), 'no-shrink']" />
            </FlexboxLayout>

            <GridLayout columns="*,*" rows="auto,auto" class="o-meta-grid">
              <StackLayout v-for="(m, i) in s.metas" :key="i" :row="Math.floor(i / 2)" :col="i % 2" class="meta-cell">
                <Label :text="m.k" class="meta-k" />
                <Label :text="m.v" class="meta-v" textWrap="true" />
              </StackLayout>
            </GridLayout>

            <StackLayout>
              <FlexboxLayout class="prog-row" flexDirection="row" justifyContent="space-between">
                <Label text="盘点进度" class="prog-label" />
                <Label :text="s.summary.counted + '/' + s.summary.total" class="prog-num font-mono" />
              </FlexboxLayout>
              <GridLayout class="prog-track">
                <StackLayout
                  :class="['prog-fill', s.status === 'completed' ? 'prog-fill-done' : s.status === 'pending_review' ? 'prog-fill-violet' : '']"
                  :width="stkPct(s) + '%'"
                />
              </GridLayout>
            </StackLayout>

            <FlexboxLayout class="o-actions" flexDirection="row">
              <StackLayout class="btn btn-primary pressable" @tap="onPrimary(s)">
                <Label :text="s.primaryText" class="btn-label btn-primary-label" />
              </StackLayout>
              <StackLayout class="btn btn-ghost pressable" @tap="openExec(s)">
                <Label text="明细" class="btn-label btn-ghost-label" />
              </StackLayout>
            </FlexboxLayout>
          </StackLayout>
        </StackLayout>

        <GridLayout v-if="!loading && !filtered.length" class="empty-box">
          <StackLayout horizontalAlignment="center">
            <MiIcon name="fact_check" :size="34" color="#2a3448" />
            <Label text="暂无相关盘点单" class="empty-text" />
          </StackLayout>
        </GridLayout>
        <ActivityIndicator v-if="loading && !items.length" busy="true" color="#22d3ee" margin="50" />
      </StackLayout>
    </ScrollView>
  </GridLayout>
</template>

<script setup>
/**
 * 盘点管理列表（P10：盘点单状态机 draft→counting→pending_review→completed）
 */
import { ref, computed, onMounted, watch } from 'nativescript-vue';
import { action, confirm } from '@nativescript/core';
import { store, openSub, showToast, bumpRefresh } from '../services/store';
import { api } from '../services/api';
import MiIcon from '../components/MiIcon.vue';
import ChipRow from '../components/ChipRow.vue';

defineEmits(['back']);

const items = ref([]);
const counts = ref({ all: 0, draft: 0, counting: 0, pending_review: 0, completed: 0 });
const filter = ref('all');
const loading = ref(false);

const chips = computed(() => [
  { key: 'all', label: '全部', count: counts.value.all },
  { key: 'draft', label: '草稿', count: counts.value.draft },
  { key: 'counting', label: '盘点中', count: counts.value.counting },
  { key: 'pending_review', label: '待审核', count: counts.value.pending_review },
  { key: 'completed', label: '已完成', count: counts.value.completed },
]);

const filtered = computed(() =>
  filter.value === 'all' ? items.value : items.value.filter((s) => s.status === filter.value)
);

function badgeCls(status) {
  return (
    { draft: 'badge-muted', counting: 'badge-processing', pending_review: 'badge-pending', completed: 'badge-done', cancelled: 'badge-muted' }[status] ||
    'badge-muted'
  );
}
function stkPct(s) {
  if (!s.summary.total) return 0;
  return Math.min(100, Math.round((s.summary.counted / s.summary.total) * 100));
}

async function load() {
  loading.value = true;
  try {
    const d = await api.listStocktakes();
    items.value = d.items;
    counts.value = d.counts;
  } catch (e) {
    showToast((e && e.message) || '盘点单加载失败', 'close');
  } finally {
    loading.value = false;
  }
}

async function doCreate() {
  try {
    if (store.demoMode) {
      await api.createStocktake(null, 'A区 · 核心网络');
      showToast('盘点单已创建（账面快照已生成）');
      await load();
      bumpRefresh();
      return;
    }
    const opts = await api.options();
    if (!opts.warehouses.length) return showToast('暂无可用仓库', 'warning');
    const picked = await action({
      title: '选择盘点仓库（全盘）',
      cancelButtonText: '取消',
      actions: opts.warehouses.map((w) => w.name),
    });
    const wh = opts.warehouses.find((w) => w.name === picked);
    if (!wh) return;
    await api.createStocktake(wh.id, wh.name);
    showToast('盘点单已创建（账面快照已生成）');
    await load();
    bumpRefresh();
  } catch (e) {
    if (!(e && e.cancelled)) showToast((e && e.message) || '创建失败', 'close');
  }
}

async function onPrimary(s) {
  if (s.status === 'draft') {
    const ok = await confirm({
      title: '开始盘点',
      message: '开始后该仓库出入库将被冻结，确定开始？',
      okButtonText: '开始',
      cancelButtonText: '取消',
    });
    if (!ok) return;
    try {
      await api.stocktakeStart(s.id);
      showToast('盘点已开始，仓库出入库已冻结');
      await load();
      openExec(s);
    } catch (e) {
      showToast((e && e.message) || '开始盘点失败', 'close');
    }
  } else {
    openExec(s);
  }
}

function openExec(s) {
  openSub('stocktake-exec', { id: s.id, no: s.no });
}

onMounted(load);
watch(() => store.refreshTick, load);
</script>

<template>
  <GridLayout rows="auto,auto,*">
    <!-- 页头 -->
    <FlexboxLayout row="0" class="pagehead" flexDirection="row" justifyContent="space-between" alignItems="center">
      <StackLayout>
        <Label text="出库管理" class="pagehead-title font-disp-b" />
        <Label text="部门领用 · 拣货 · 发放" class="pagehead-sub" />
      </StackLayout>
      <FlexboxLayout flexDirection="row" alignItems="center">
        <GridLayout class="icbtn pressable" marginRight="10" @tap="load">
          <MiIcon name="refresh" :size="17" color="#9aa5bb" />
        </GridLayout>
        <GridLayout class="icbtn pressable" @tap="openSheet('new-outbound')">
          <MiIcon name="add" :size="18" color="#e8edf6" />
        </GridLayout>
      </FlexboxLayout>
    </FlexboxLayout>

    <!-- 筛选 -->
    <ChipRow row="1" :items="chips" v-model="filter" />

    <!-- 列表 -->
    <ScrollView row="2" scrollBarEnabled="false">
      <StackLayout paddingBottom="100">
        <OrderCard
          v-for="o in filtered"
          :key="o.id"
          :order="o"
          kind="out"
          @primary="onPrimary"
          @detail="onDetail"
        />
        <GridLayout v-if="!loading && !filtered.length" class="empty-box">
          <StackLayout horizontalAlignment="center">
            <MiIcon name="local_shipping" :size="34" color="#2a3448" />
            <Label text="暂无相关出库单" class="empty-text" />
          </StackLayout>
        </GridLayout>
        <ActivityIndicator v-if="loading && !items.length" busy="true" color="#22d3ee" margin="50" />
      </StackLayout>
    </ScrollView>
  </GridLayout>
</template>

<script setup>
/** 出库管理（对应原型 #view-outbound） */
import { ref, computed, onMounted, watch } from 'nativescript-vue';
import { store, openSheet, showToast, bumpRefresh } from '../services/store';
import { api } from '../services/api';
import MiIcon from '../components/MiIcon.vue';
import ChipRow from '../components/ChipRow.vue';
import OrderCard from '../components/OrderCard.vue';

const items = ref([]);
const counts = ref({ all: 0, pending: 0, processing: 0, done: 0 });
const filter = ref('all');
const loading = ref(false);
const busyId = ref(null);

const chips = computed(() => [
  { key: 'all', label: '全部', count: counts.value.all },
  { key: 'pending', label: '待处理', count: counts.value.pending },
  { key: 'processing', label: '处理中', count: counts.value.processing },
  { key: 'done', label: '已完成', count: counts.value.done },
]);

const filtered = computed(() =>
  filter.value === 'all' ? items.value : items.value.filter((o) => o.status === filter.value)
);

async function load() {
  loading.value = true;
  try {
    const d = await api.listOutbound();
    items.value = d.items;
    counts.value = d.counts;
    store.pendingBadges = { ...store.pendingBadges, outbound: d.counts.pending };
  } catch (e) {
    showToast((e && e.message) || '出库单加载失败', 'close');
  } finally {
    loading.value = false;
  }
}

async function onPrimary(o) {
  if (o.status === 'done') return showToast('单据打印请在 Web 端执行');
  if (busyId.value) return;
  busyId.value = o.id;
  try {
    await api.outboundAction(o, o.status === 'pending' ? 'start' : 'continue');
    showToast(o.status === 'pending' ? '已开始拣货' : '出库进度已更新');
    await load();
    bumpRefresh();
  } catch (e) {
    showToast((e && e.message) || '操作失败', 'close');
  } finally {
    busyId.value = null;
  }
}

function onDetail(o) {
  openSheet('order-detail', { order: o, kind: 'out' });
}

onMounted(load);
watch(() => store.refreshTick, load);
watch(
  () => store.tab,
  (t) => {
    if (t === 'outbound') load();
  }
);
</script>

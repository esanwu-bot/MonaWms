<template>
  <GridLayout rows="auto,auto,*">
    <!-- 页头 -->
    <FlexboxLayout row="0" class="pagehead" flexDirection="row" justifyContent="space-between" alignItems="center">
      <StackLayout>
        <Label text="设备登记" class="pagehead-title font-disp-b" />
        <Label text="序列号级台账追踪" class="pagehead-sub" />
      </StackLayout>
      <FlexboxLayout flexDirection="row" alignItems="center">
        <GridLayout class="icbtn pressable" marginRight="10" @tap="openSub('scan')">
          <MiIcon name="qr_code_scanner" :size="17" color="#9aa5bb" />
        </GridLayout>
        <GridLayout class="icbtn pressable" @tap="openSheet('new-device')">
          <MiIcon name="add" :size="18" color="#e8edf6" />
        </GridLayout>
      </FlexboxLayout>
    </FlexboxLayout>

    <!-- 筛选 -->
    <ChipRow row="1" :items="chips" v-model="filter" />

    <!-- 列表 -->
    <ScrollView row="2" scrollBarEnabled="false">
      <StackLayout paddingBottom="100">
        <DeviceCard v-for="d in filtered" :key="d.id" :device="d" @open="onOpen" />
        <GridLayout v-if="!loading && !filtered.length" class="empty-box">
          <StackLayout horizontalAlignment="center">
            <MiIcon name="devices" :size="34" color="#2a3448" />
            <Label text="暂无相关设备" class="empty-text" />
          </StackLayout>
        </GridLayout>
        <ActivityIndicator v-if="loading && !items.length" busy="true" color="#22d3ee" margin="50" />
      </StackLayout>
    </ScrollView>
  </GridLayout>
</template>

<script setup>
/** 设备登记（对应原型 #view-devices，序列号台账） */
import { ref, computed, onMounted, watch } from 'nativescript-vue';
import { store, openSheet, openSub, showToast } from '../services/store';
import { api } from '../services/api';
import MiIcon from '../components/MiIcon.vue';
import ChipRow from '../components/ChipRow.vue';
import DeviceCard from '../components/DeviceCard.vue';

const items = ref([]);
const counts = ref({ all: 0, avail: 0, inuse: 0, maint: 0 });
const filter = ref('all');
const loading = ref(false);

const chips = computed(() => [
  { key: 'all', label: '全部', count: counts.value.all },
  { key: 'avail', label: '可用', count: counts.value.avail },
  { key: 'inuse', label: '使用中', count: counts.value.inuse },
  { key: 'maint', label: '维护中', count: counts.value.maint },
]);

const filtered = computed(() =>
  filter.value === 'all' ? items.value : items.value.filter((d) => d.status === filter.value)
);

async function load() {
  loading.value = true;
  try {
    const d = await api.listDevices();
    items.value = d.items;
    counts.value = d.counts;
  } catch (e) {
    showToast((e && e.message) || '设备列表加载失败', 'close');
  } finally {
    loading.value = false;
  }
}

function onOpen(device) {
  openSheet('device-detail', device);
}

onMounted(load);
watch(() => store.refreshTick, load);
watch(
  () => store.tab,
  (t) => {
    if (t === 'devices') load();
  }
);
</script>

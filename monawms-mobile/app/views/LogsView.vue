<template>
  <GridLayout rows="auto,auto,*" class="sub-page">
    <!-- 头部 -->
    <FlexboxLayout row="0" class="sub-head" flexDirection="row" alignItems="center">
      <GridLayout class="back-btn pressable" @tap="$emit('back')">
        <MiIcon name="chevron_left" :size="17" color="#e8edf6" />
      </GridLayout>
      <Label text="操作日志" class="sub-title font-disp-b" />
    </FlexboxLayout>

    <!-- 筛选 -->
    <ChipRow row="1" :items="chips" v-model="filter" />

    <!-- 日志列表 -->
    <ScrollView row="2" scrollBarEnabled="false">
      <StackLayout paddingBottom="40">
        <StackLayout v-for="(l, i) in filtered" :key="i" class="log-cell">
          <StackLayout class="log-card">
            <FlexboxLayout flexDirection="row" justifyContent="space-between" alignItems="center">
              <Label :text="l.time" class="log-time font-mono" />
              <Label :text="l.type" :class="['log-type', l.tone]" />
            </FlexboxLayout>
            <Label :text="l.content" class="log-content" textWrap="true" />
            <FlexboxLayout flexDirection="row" justifyContent="space-between" alignItems="center">
              <Label :text="l.user" class="log-bottom-item" />
              <Label :text="l.result" :class="['log-bottom-item', l.resultTone]" />
            </FlexboxLayout>
          </StackLayout>
        </StackLayout>

        <GridLayout v-if="!loading && !filtered.length" class="empty-box">
          <StackLayout horizontalAlignment="center">
            <MiIcon name="fact_check" :size="34" color="#2a3448" />
            <Label text="暂无相关日志" class="empty-text" />
          </StackLayout>
        </GridLayout>
        <ActivityIndicator v-if="loading && !logs.length" busy="true" color="#22d3ee" margin="50" />
      </StackLayout>
    </ScrollView>
  </GridLayout>
</template>

<script setup>
/** 操作日志（对应原型 #sub-logs） */
import { ref, computed, onMounted, watch } from 'nativescript-vue';
import { store, showToast } from '../services/store';
import { api } from '../services/api';
import MiIcon from '../components/MiIcon.vue';
import ChipRow from '../components/ChipRow.vue';

defineEmits(['back']);

const logs = ref([]);
const filter = ref('all');
const loading = ref(false);

const chips = [
  { key: 'all', label: '全部' },
  { key: 'success', label: '成功' },
  { key: 'warn', label: '警告' },
  { key: 'error', label: '错误' },
  { key: 'info', label: '信息' },
];

const filtered = computed(() =>
  filter.value === 'all' ? logs.value : logs.value.filter((l) => l.cat === filter.value)
);

async function load() {
  loading.value = true;
  try {
    logs.value = await api.listLogs();
  } catch (e) {
    showToast((e && e.message) || '日志加载失败', 'close');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(() => store.refreshTick, load);
</script>

<template>
  <GridLayout rows="auto,*" class="sub-page">
    <FlexboxLayout row="0" class="sub-head" flexDirection="row" alignItems="center">
      <GridLayout class="back-btn pressable" @tap="$emit('back')">
        <MiIcon name="chevron_left" :size="17" color="#e8edf6" />
      </GridLayout>
      <Label text="报表统计" class="sub-title font-disp-b" />
    </FlexboxLayout>

    <ScrollView row="1" scrollBarEnabled="false">
      <StackLayout class="pad-18" paddingBottom="40">
        <!-- 月度出入库对比 -->
        <StackLayout class="trend-card">
          <FlexboxLayout class="trend-head" flexDirection="row" justifyContent="space-between" alignItems="center">
            <Label text="月度出入库对比" class="trend-t" />
            <FlexboxLayout flexDirection="row" alignItems="center">
              <StackLayout class="legend-dot ld-cyan" />
              <Label text="入库" class="legend-text" />
              <StackLayout class="legend-dot ld-amber" />
              <Label text="出库" class="legend-text" />
            </FlexboxLayout>
          </FlexboxLayout>
          <FlexboxLayout class="bars-wrap" flexDirection="row" alignItems="flex-end">
            <StackLayout v-for="(b, i) in bars" :key="i" class="bar-col">
              <FlexboxLayout class="bar-pair" flexDirection="row" alignItems="flex-end" horizontalAlignment="center">
                <StackLayout class="bar bar-in" :height="barIn(i) + '%'" />
                <StackLayout class="bar bar-out" :height="barOut(i) + '%'" />
              </FlexboxLayout>
              <Label :text="b.label" class="bar-label font-mono" />
            </StackLayout>
          </FlexboxLayout>
        </StackLayout>

        <!-- 供应商占比 -->
        <SectionTitle title="供应商占比" />
        <StackLayout class="trend-card">
          <StackLayout v-for="(s, i) in suppliers" :key="i" :class="i < suppliers.length - 1 ? 'sup-row' : ''">
            <FlexboxLayout flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="6">
              <Label :text="s.name" class="sup-name" />
              <Label :text="s.pct + '%'" class="sup-pct font-mono" />
            </FlexboxLayout>
            <GridLayout class="prog-track">
              <StackLayout :class="['prog-fill', s.fill || '']" :width="s.pct + '%'" />
            </GridLayout>
          </StackLayout>
        </StackLayout>

        <ActivityIndicator v-if="loading" busy="true" color="#22d3ee" margin="30" />
      </StackLayout>
    </ScrollView>
  </GridLayout>
</template>

<script setup>
/** 报表统计（对应原型 #sub-reports：月度柱状 + 供应商占比） */
import { ref, onMounted, watch } from 'nativescript-vue';
import { store, showToast } from '../services/store';
import { api } from '../services/api';
import MiIcon from '../components/MiIcon.vue';
import SectionTitle from '../components/SectionTitle.vue';

defineEmits(['back']);

const bars = ref([]);
const suppliers = ref([]);
const loading = ref(false);
const grown = ref(false); // 入场：柱条从 0 生长

function barIn(i) {
  return grown.value ? Math.max(3, bars.value[i].in) : 0;
}
function barOut(i) {
  return grown.value ? Math.max(3, bars.value[i].out) : 0;
}

async function load() {
  loading.value = true;
  try {
    const d = await api.reports();
    bars.value = d.bars;
    suppliers.value = d.suppliers;
    grown.value = false;
    setTimeout(() => (grown.value = true), 120);
  } catch (e) {
    showToast((e && e.message) || '报表加载失败', 'close');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(() => store.refreshTick, load);
</script>

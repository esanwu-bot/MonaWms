<template>
  <GridLayout rows="auto,*" class="sub-page">
    <FlexboxLayout row="0" class="sub-head" flexDirection="row" alignItems="center">
      <GridLayout class="back-btn pressable" @tap="$emit('back')">
        <MiIcon name="chevron_left" :size="17" color="#e8edf6" />
      </GridLayout>
      <Label text="仓库管理" class="sub-title font-disp-b" />
    </FlexboxLayout>

    <ScrollView row="1" scrollBarEnabled="false">
      <StackLayout paddingBottom="40">
        <StackLayout v-for="(z, i) in zones" :key="i" class="zone-cell">
          <StackLayout class="zone-card">
            <FlexboxLayout flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="8">
              <Label :text="z.name" class="zone-name font-disp-b" textWrap="true" flexGrow="1" flexShrink="1" />
              <Label :text="z.pct + '%'" :class="['badge', zoneTone(z), 'no-shrink']" marginLeft="10" />
            </FlexboxLayout>
            <Label class="zone-info" textWrap="true">
              <FormattedString>
                <Span text="库位 " />
                <Span :text="z.used + '/' + z.cap" class="zone-info-b font-mono" />
                <Span text=" · 设备 " />
                <Span :text="String(z.devices)" class="zone-info-b font-mono" />
                <Span text=" 台" />
              </FormattedString>
            </Label>
            <GridLayout class="prog-track">
              <StackLayout :class="['prog-fill', z.fill || '']" :width="z.pct + '%'" />
            </GridLayout>
          </StackLayout>
        </StackLayout>

        <GridLayout v-if="!loading && !zones.length" class="empty-box">
          <StackLayout horizontalAlignment="center">
            <MiIcon name="home_work" :size="34" color="#2a3448" />
            <Label text="暂无仓库数据" class="empty-text" />
          </StackLayout>
        </GridLayout>
        <ActivityIndicator v-if="loading && !zones.length" busy="true" color="#22d3ee" margin="50" />
      </StackLayout>
    </ScrollView>
  </GridLayout>
</template>

<script setup>
/** 仓库管理（对应原型 #sub-warehouse：分区容量卡） */
import { ref, onMounted, watch } from 'nativescript-vue';
import { store, showToast } from '../services/store';
import { api } from '../services/api';
import MiIcon from '../components/MiIcon.vue';

defineEmits(['back']);

const zones = ref([]);
const loading = ref(false);

function zoneTone(z) {
  if (String(z.name).includes('维修')) return 'badge-urgent';
  if (z.pct >= 85) return 'badge-processing';
  return 'badge-done';
}

async function load() {
  loading.value = true;
  try {
    zones.value = await api.listZones();
  } catch (e) {
    showToast((e && e.message) || '仓库数据加载失败', 'close');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(() => store.refreshTick, load);
</script>

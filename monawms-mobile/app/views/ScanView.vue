<template>
  <GridLayout rows="auto,*" class="sub-page">
    <FlexboxLayout row="0" class="sub-head" flexDirection="row" alignItems="center">
      <GridLayout class="back-btn pressable" @tap="$emit('back')">
        <MiIcon name="chevron_left" :size="17" color="#e8edf6" />
      </GridLayout>
      <Label text="扫码查询" class="sub-title font-disp-b" />
    </FlexboxLayout>

    <ScrollView row="1" scrollBarEnabled="false">
      <StackLayout class="pad-18" paddingBottom="40">
        <!-- Hero -->
        <StackLayout class="scan-hero">
          <MiIcon name="qr_code_scanner" :size="64" color="#22d3ee" />
          <Label text="对准设备条码 / 序列号标签" class="scan-desc" marginTop="10" />
          <Label :text="store.demoMode ? '演示模式：手动输入码串' : 'camera + /api/barcode/recognize'" class="scan-hint font-mono" marginTop="4" />
        </StackLayout>

        <!-- 操作 -->
        <StackLayout class="btn btn-primary btn-big pressable" marginTop="16" @tap="doScan">
          <FlexboxLayout flexDirection="row" justifyContent="center" alignItems="center">
            <MiIcon name="qr_code_scanner" :size="18" color="#04222b" iconClass="btn-ic-left" />
            <Label :text="busy ? '识别中…' : '开始扫码'" class="btn-label btn-primary-label btn-big-label" />
          </FlexboxLayout>
        </StackLayout>

        <FlexboxLayout flexDirection="row" marginTop="12" alignItems="flex-start">
          <StackLayout flexGrow="1" flexShrink="1" class="frow-item">
            <TextField v-model="manual" hint="或手动输入条码 / SN" class="input font-mono" autocorrect="false" autocapitalizationType="none" returnKeyType="search" @returnPress="doQuery(manual)" />
          </StackLayout>
          <StackLayout class="btn btn-ghost no-shrink" @tap="doQuery(manual)">
            <Label text="查询" class="btn-label btn-ghost-label" />
          </StackLayout>
        </FlexboxLayout>

        <!-- 结果 -->
        <StackLayout v-if="result" class="trend-card" marginTop="18">
          <FlexboxLayout flexDirection="row" justifyContent="space-between" alignItems="center">
            <Label text="识别结果" class="trend-t" />
            <Label :text="result.code" class="o-id font-mono-m" textWrap="true" />
          </FlexboxLayout>

          <StackLayout v-if="result.device" marginTop="12">
            <DeviceCard :device="result.device" @open="openDetail" />
          </StackLayout>
          <StackLayout v-else-if="result.raw" marginTop="10">
            <Label :text="'命中产品档案：' + ((result.raw.product && result.raw.product.name) || (result.raw.info && result.raw.info.name) || '—')" class="log-content" textWrap="true" />
          </StackLayout>
          <FlexboxLayout v-else flexDirection="row" alignItems="center" marginTop="10">
            <MiIcon name="warning" :size="15" color="#fbbf24" iconClass="no-shrink" />
            <Label text=" 台账中未找到该码串对应记录" class="log-content" textWrap="true" />
          </FlexboxLayout>
        </StackLayout>

        <!-- 历史 -->
        <SectionTitle v-if="history.length" title="本次会话记录" />
        <StackLayout v-if="history.length" class="trend-card">
          <FlexboxLayout
            v-for="(h, i) in history"
            :key="i"
            class="hist-row divider-b pressable"
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            @tap="doQuery(h.code)"
          >
            <Label :text="h.code" class="hist-code font-mono" textWrap="true" />
            <Label :text="h.time" class="hist-time font-mono" />
          </FlexboxLayout>
        </StackLayout>
      </StackLayout>
    </ScrollView>
  </GridLayout>
</template>

<script setup>
/**
 * 扫码查询页
 * 真机：@nativescript/camera 拍照 → POST /api/barcode/recognize（multipart）→ GET /api/serial-numbers/query-by-barcode
 * 演示：手动录入码串 → 本地台账匹配
 */
import { ref } from 'nativescript-vue';
import { store, openSheet, showToast } from '../services/store';
import { api } from '../services/api';
import { scanCode } from '../services/scan';
import { hm } from '../utils/format';
import MiIcon from '../components/MiIcon.vue';
import SectionTitle from '../components/SectionTitle.vue';
import DeviceCard from '../components/DeviceCard.vue';

defineEmits(['back']);

const busy = ref(false);
const manual = ref('');
const result = ref(null);
const history = ref([]);

async function doScan() {
  if (busy.value) return;
  busy.value = true;
  try {
    const pool = store.demoMode ? (await api.listDevices()).items.map((d) => d.sn) : [];
    const code = await scanCode(pool);
    await doQuery(code);
  } catch (e) {
    if (!(e && e.cancelled)) showToast((e && e.message) || '扫码失败', 'close');
  } finally {
    busy.value = false;
  }
}

async function doQuery(code) {
  const c = String(code || '').trim();
  if (!c) return showToast('请输入或扫描码串', 'warning');
  manual.value = c;
  busy.value = true;
  try {
    const r = await api.queryByBarcode(c);
    result.value = r;
    history.value.unshift({ code: c, time: hm() });
    if (history.value.length > 8) history.value.pop();
  } catch (e) {
    showToast((e && e.message) || '查询失败', 'close');
  } finally {
    busy.value = false;
  }
}

function openDetail(device) {
  openSheet('device-detail', device);
}
</script>

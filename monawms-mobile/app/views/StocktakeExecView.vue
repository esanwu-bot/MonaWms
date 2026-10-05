<template>
  <GridLayout rows="auto,*" class="sub-page">
    <!-- 头部 -->
    <FlexboxLayout row="0" class="sub-head" flexDirection="row" alignItems="center" justifyContent="space-between">
      <FlexboxLayout flexDirection="row" alignItems="center">
        <GridLayout class="back-btn pressable" @tap="backToList">
          <MiIcon name="chevron_left" :size="17" color="#e8edf6" />
        </GridLayout>
        <StackLayout>
          <Label :text="order ? order.no : '盘点执行'" class="sub-title font-disp-b" />
          <Label v-if="order" :text="order.statusText + (order.warehouse ? ' · ' + order.warehouse : '')" class="pagehead-sub" />
        </StackLayout>
      </FlexboxLayout>
      <GridLayout class="icbtn pressable" @tap="load">
        <MiIcon name="refresh" :size="17" color="#9aa5bb" />
      </GridLayout>
    </FlexboxLayout>

    <ScrollView row="1" scrollBarEnabled="false">
      <StackLayout class="pad-18" paddingBottom="40">
        <ActivityIndicator v-if="!order" busy="true" color="#22d3ee" margin="50" />

        <StackLayout v-if="order">
          <!-- 汇总卡 -->
          <StackLayout class="trend-card">
            <GridLayout columns="*,*,*" rows="auto">
              <StackLayout col="0">
                <Label :text="String(summary.counted_rows || 0)" class="stk-num font-disp-b c-cyan" />
                <Label text="已盘行" class="stk-k" />
              </StackLayout>
              <StackLayout col="1">
                <Label :text="String(summary.pending_rows || 0)" class="stk-num font-disp-b" />
                <Label text="未盘行" class="stk-k" />
              </StackLayout>
              <StackLayout col="2">
                <Label :text="String(summary.diff_rows || 0)" class="stk-num font-disp-b c-red" />
                <Label text="差异行" class="stk-k" />
              </StackLayout>
            </GridLayout>
            <StackLayout marginTop="12">
              <FlexboxLayout class="prog-row" flexDirection="row" justifyContent="space-between">
                <Label text="盘点进度" class="prog-label" />
                <Label :text="(summary.counted_rows || 0) + '/' + (summary.total_rows || 0)" class="prog-num font-mono" />
              </FlexboxLayout>
              <GridLayout class="prog-track">
                <StackLayout class="prog-fill" :width="pct + '%'" />
              </GridLayout>
            </StackLayout>
          </StackLayout>

          <!-- 操作区 -->
          <FlexboxLayout flexDirection="row" marginTop="14">
            <StackLayout v-if="order.status === 'counting'" class="btn btn-primary pressable" @tap="doScan">
              <Label :text="scanning ? '扫码中…' : '扫 SN 盘'" class="btn-label btn-primary-label" />
            </StackLayout>
            <StackLayout v-if="order.status === 'counting'" class="btn btn-ghost pressable" @tap="doRecord">
              <Label text="录实盘" class="btn-label btn-ghost-label" />
            </StackLayout>
          </FlexboxLayout>
          <FlexboxLayout flexDirection="row" marginTop="10">
            <StackLayout v-if="order.status === 'counting'" class="btn btn-primary pressable" @tap="doSubmit">
              <Label text="提交盘点结果" class="btn-label btn-primary-label" />
            </StackLayout>
            <StackLayout v-if="order.status === 'pending_review'" class="btn btn-primary pressable" @tap="doReview">
              <Label text="差异审核过账" class="btn-label btn-primary-label" />
            </StackLayout>
            <StackLayout v-if="order.status === 'completed'" class="btn btn-ghost pressable" @tap="noop">
              <Label text="已完成 · 调整单已生成" class="btn-label btn-ghost-label" />
            </StackLayout>
          </FlexboxLayout>

          <!-- 明细 -->
          <SectionTitle title="盘点明细" :note="'盲盘：执行页不展示账面数'" />
          <StackLayout class="trend-card">
            <FlexboxLayout
              v-for="(it, i) in items"
              :key="it.id"
              :class="['item-row', i < items.length - 1 ? 'divider-b' : '', 'pressable']"
              flexDirection="row"
              alignItems="center"
              @tap="tapItem(it)"
            >
              <MiIcon
                :name="it.status === 'counted' ? 'check_circle' : 'circle'"
                :size="16"
                :color="it.status === 'counted' ? '#34d399' : '#3a465e'"
                iconClass="no-shrink"
              />
              <StackLayout flexGrow="1" flexShrink="1" marginLeft="10">
                <Label :text="it.name" class="item-name" textWrap="true" />
                <Label :text="(it.sn ? it.sn + ' · ' : '') + (it.loc || '—')" class="item-sn font-mono" />
              </StackLayout>
              <Label
                v-if="it.status === 'counted'"
                :text="'实盘 ' + it.counted + (it.diff && Number(it.diff) !== 0 ? ' (差 ' + it.diff + ')' : '')"
                :class="['item-count', 'font-mono', it.diff && Number(it.diff) !== 0 ? 'c-red' : 'c-green']"
              />
              <Label v-else text="未盘" class="item-count font-mono text-3" />
            </FlexboxLayout>
            <Label v-if="!items.length" text="暂无明细" class="empty-text" />
          </StackLayout>
        </StackLayout>
      </StackLayout>
    </ScrollView>
  </GridLayout>
</template>

<script setup>
/**
 * 盘点执行页（P10）
 * - counting：扫 SN（盲盘）/ 录实盘（明盘）/ 提交
 * - pending_review：差异审核过账（生成盘盈盘亏调整单）
 */
import { ref, computed, onMounted, watch } from 'nativescript-vue';
import { action, prompt, confirm, inputType } from '@nativescript/core';
import { store, openSub, showToast, bumpRefresh } from '../services/store';
import { api } from '../services/api';
import { scanCode } from '../services/scan';
import MiIcon from '../components/MiIcon.vue';
import SectionTitle from '../components/SectionTitle.vue';

const order = ref(null);
const items = ref([]);
const summary = ref({});
const scanning = ref(false);

const id = computed(() => (store.subPayload && store.subPayload.id) || null);

const pct = computed(() => {
  const t = Number(summary.value.total_rows) || 0;
  const c = Number(summary.value.counted_rows) || 0;
  return t ? Math.min(100, Math.round((c / t) * 100)) : 0;
});

async function load() {
  if (!id.value) return;
  try {
    const d = await api.stocktakeDetail(id.value);
    order.value = d.order;
    items.value = d.items;
    summary.value = d.summary || {};
  } catch (e) {
    showToast((e && e.message) || '盘点明细加载失败', 'close');
  }
}

function backToList() {
  openSub('stocktake');
}

async function doScan() {
  if (scanning.value) return;
  scanning.value = true;
  try {
    const sn = await scanCode([]);
    const r = await api.stocktakeScan(id.value, sn);
    showToast((r && r.message) || '已盘：' + sn);
    await load();
    bumpRefresh();
  } catch (e) {
    if (!(e && e.cancelled)) showToast((e && e.message) || '扫码失败', 'close');
  } finally {
    scanning.value = false;
  }
}

async function doRecord() {
  const pending = items.value.filter((i) => i.status !== 'counted');
  if (!pending.length) return showToast('所有明细均已盘点');
  const names = pending.map((i) => i.name + (i.sn ? ' · ' + i.sn : ''));
  const picked = await action({ title: '选择录盘明细', cancelButtonText: '取消', actions: names });
  const idx = names.indexOf(picked);
  if (idx < 0) return;
  const item = pending[idx];
  const r = await prompt({
    title: '实盘数量 · ' + item.name,
    message: '录入实际盘点数量（明盘）',
    inputType: inputType.number,
    okButtonText: '保存',
    cancelButtonText: '取消',
    defaultText: item.counted || '',
  });
  if (!r.result || String(r.text).trim() === '') return;
  try {
    await api.stocktakeRecord(id.value, item.id, Number(String(r.text).trim()));
    showToast('已记录实盘数量');
    await load();
    bumpRefresh();
  } catch (e) {
    showToast((e && e.message) || '录盘失败', 'close');
  }
}

async function doSubmit() {
  const ok = await confirm({
    title: '提交盘点结果',
    message: '提交后进入差异审核（冻结保持），确定提交？',
    okButtonText: '提交',
    cancelButtonText: '取消',
  });
  if (!ok) return;
  try {
    await api.stocktakeSubmit(id.value);
    showToast('盘点结果已提交，待差异审核');
    await load();
    bumpRefresh();
  } catch (e) {
    showToast((e && e.message) || '提交失败', 'close');
  }
}

async function doReview() {
  const ok = await confirm({
    title: '差异审核过账',
    message: '审核通过后将按差异生成盘盈/盘亏调整单并过账，确定？',
    okButtonText: '审核通过',
    cancelButtonText: '取消',
  });
  if (!ok) return;
  try {
    const r = await api.stocktakeReview(id.value);
    showToast('审核通过' + (r && r.adjustment_number ? '，调整单 ' + r.adjustment_number : ''));
    await load();
    bumpRefresh();
  } catch (e) {
    showToast((e && e.message) || '审核失败', 'close');
  }
}

function tapItem(it) {
  if (order.value && order.value.status === 'counting' && it.status !== 'counted') doRecordFor(it);
}

async function doRecordFor(item) {
  const r = await prompt({
    title: '实盘数量 · ' + item.name,
    message: '录入实际盘点数量',
    inputType: inputType.number,
    okButtonText: '保存',
    cancelButtonText: '取消',
  });
  if (!r.result || String(r.text).trim() === '') return;
  try {
    await api.stocktakeRecord(id.value, item.id, Number(String(r.text).trim()));
    showToast('已记录实盘数量');
    await load();
    bumpRefresh();
  } catch (e) {
    showToast((e && e.message) || '录盘失败', 'close');
  }
}

function noop() {}

onMounted(load);
watch(() => store.refreshTick, load);
</script>

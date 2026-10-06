<template>
  <StackLayout v-if="dev">
    <SheetHead :title="dev.name" />

    <!-- Hero 图 + 状态角标 -->
    <GridLayout class="dd-hero" marginTop="12">
      <Image v-if="heroImg" :src="heroImg" stretch="aspectFill" class="dd-hero dd-hero-img" />
      <MiIcon v-else name="router" :size="40" color="#3a465e" />
      <Label :text="'● ' + dev.statusText" :class="['badge', badgeCls, 'dd-hero-badge']" />
    </GridLayout>

    <!-- 台账行 -->
    <StackLayout>
      <FlexboxLayout class="dd-row divider-b" flexDirection="row" justifyContent="space-between">
        <Label text="设备型号" class="dd-k" />
        <Label :text="dev.model || '—'" class="dd-v font-mono" textWrap="true" />
      </FlexboxLayout>
      <FlexboxLayout class="dd-row divider-b" flexDirection="row" justifyContent="space-between">
        <Label text="序列号" class="dd-k" />
        <Label :text="dev.sn || '—'" class="dd-v font-mono" textWrap="true" />
      </FlexboxLayout>
      <FlexboxLayout class="dd-row divider-b" flexDirection="row" justifyContent="space-between">
        <Label text="位置 / 部门" class="dd-k" />
        <Label :text="dev.loc || '—'" class="dd-v font-mono" textWrap="true" />
      </FlexboxLayout>
      <FlexboxLayout class="dd-row" flexDirection="row" justifyContent="space-between">
        <Label text="备注" class="dd-k" />
        <Label :text="dev.extra || '—'" class="dd-v font-mono" textWrap="true" />
      </FlexboxLayout>
    </StackLayout>

    <FlexboxLayout class="sheet-foot" flexDirection="row">
      <StackLayout class="btn btn-ghost pressable" @tap="closeSheet">
        <Label text="关闭" class="btn-label btn-ghost-label" />
      </StackLayout>
      <StackLayout class="btn btn-primary pressable" @tap="doAction">
        <Label text="执行操作" class="btn-label btn-primary-label" />
      </StackLayout>
    </FlexboxLayout>
  </StackLayout>
</template>

<script setup>
/** 设备详情抽屉（对应原型 #sh-detail） */
import { computed } from 'nativescript-vue';
import { store, closeSheet, showToast } from '../services/store';
import SheetHead from '../components/SheetHead.vue';
import MiIcon from '../components/MiIcon.vue';

const dev = computed(() => store.sheetPayload || null);

const heroImg = computed(() => {
  const d = dev.value;
  if (!d) return '';
  return d.hero || (d.img ? String(d.img).replace('/120/120', '/600/300') : '');
});

const badgeCls = computed(() => {
  const s = dev.value && dev.value.status;
  if (s === 'avail') return 'badge-done';
  if (s === 'inuse') return 'badge-processing';
  if (s === 'maint') return 'badge-urgent';
  return 'badge-muted';
});

function doAction() {
  closeSheet();
  showToast('已发起操作');
}
</script>

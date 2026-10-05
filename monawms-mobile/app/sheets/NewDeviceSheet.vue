<template>
  <StackLayout>
    <SheetHead title="📱 新增设备" />
    <Label text="录入设备台账信息（序列号级登记）" class="sheet-sub" />

    <FlexboxLayout flexDirection="row">
      <StackLayout class="frow-item">
        <StackLayout class="fg">
          <FlexboxLayout flexDirection="row">
            <Label text="设备名称" class="fg-label" /><Label text="*" class="fg-req" />
          </FlexboxLayout>
          <TextField v-model="form.name" hint="如：华为路由器" class="input" autocorrect="false" />
        </StackLayout>
      </StackLayout>
      <StackLayout class="frow-item frow-item-last">
        <StackLayout class="fg">
          <FlexboxLayout flexDirection="row">
            <Label text="设备型号" class="fg-label" /><Label text="*" class="fg-req" />
          </FlexboxLayout>
          <TextField v-model="form.model" hint="如：AR2220-S" class="input" autocorrect="false" />
        </StackLayout>
      </StackLayout>
    </FlexboxLayout>

    <StackLayout class="fg">
      <FlexboxLayout flexDirection="row">
        <Label text="序列号" class="fg-label" /><Label text="*" class="fg-req" />
      </FlexboxLayout>
      <FlexboxLayout flexDirection="row" alignItems="center">
        <StackLayout class="frow-item">
          <TextField v-model="form.sn" hint="唯一序列号" class="input font-mono" autocorrect="false" autocapitalizationType="none" />
        </StackLayout>
        <GridLayout class="icbtn pressable no-shrink" @tap="scanSn">
          <MiIcon name="qr_code_scanner" :size="17" color="#9aa5bb" />
        </GridLayout>
      </FlexboxLayout>
    </StackLayout>

    <PickerField label="设备类型" :options="types" v-model="form.type" placeholder="请选择设备类型" />

    <FlexboxLayout flexDirection="row">
      <StackLayout class="frow-item">
        <StackLayout class="fg">
          <Label text="供应商" class="fg-label" />
          <TextField v-model="form.supplier" hint="供应商名称" class="input" autocorrect="false" />
        </StackLayout>
      </StackLayout>
      <StackLayout class="frow-item frow-item-last">
        <StackLayout class="fg">
          <Label text="存放位置" class="fg-label" />
          <TextField v-model="form.loc" hint="如：A区-01-05" class="input" autocorrect="false" />
        </StackLayout>
      </StackLayout>
    </FlexboxLayout>

    <FlexboxLayout class="sheet-foot" flexDirection="row">
      <StackLayout class="btn btn-ghost pressable" @tap="closeSheet">
        <Label text="取消" class="btn-label btn-ghost-label" />
      </StackLayout>
      <StackLayout class="btn btn-primary pressable" @tap="submit">
        <Label :text="busy ? '提交中…' : '确认添加'" class="btn-label btn-primary-label" />
      </StackLayout>
    </FlexboxLayout>
  </StackLayout>
</template>

<script setup>
import { reactive, ref, onMounted } from 'nativescript-vue';
import { store, closeSheet, showToast, bumpRefresh } from '../services/store';
import { api } from '../services/api';
import { scanCode } from '../services/scan';
import { demoOptions } from '../services/mock';
import SheetHead from '../components/SheetHead.vue';
import PickerField from '../components/PickerField.vue';

const types = demoOptions.deviceTypes.map((t, i) => ({ id: i + 1, name: t }));

const form = reactive({ name: '', model: '', sn: '', type: null, supplier: '', loc: '' });
const busy = ref(false);
let products = [];

async function scanSn() {
  try {
    const code = await scanCode([]);
    form.sn = code;
    showToast('已填入扫码结果');
  } catch (e) {
    if (!(e && e.cancelled)) showToast((e && e.message) || '扫码失败', 'close');
  }
}

onMounted(async () => {
  if (!store.demoMode) {
    try {
      const o = await api.options();
      products = o.products || [];
    } catch (e) {
      console.error('[NewDeviceSheet] products load failed:', e && e.message);
    }
  }
});

async function submit() {
  if (busy.value) return;
  if (!form.name) return showToast('请填写设备名称', 'warning');
  if (!form.model) return showToast('请填写设备型号', 'warning');
  if (!form.sn) return showToast('请填写序列号', 'warning');

  busy.value = true;
  try {
    if (store.demoMode) {
      await api.createDevice({
        name: form.name,
        model: form.model,
        sn: form.sn,
        type: form.type ? form.type.name : '',
        supplier: form.supplier,
        loc: form.loc || '待上架',
      });
    } else {
      // 真实模式：register-device 需要产品档案 ID —— 按名称/型号匹配
      const match = products.find(
        (p) =>
          String(p.name || '').trim() === String(form.name).trim() ||
          String(p.extra || '').trim() === String(form.model).trim()
      );
      if (!match) {
        showToast('产品档案中无「' + form.name + '」，请先在 Web 端建档产品', 'warning');
        return;
      }
      await api.createDevice({
        serial_number: form.sn,
        product_id: match.id,
        location: form.loc,
        notes: [form.type ? '类型：' + form.type.name : '', form.supplier ? '供应商：' + form.supplier : ''].filter(Boolean).join('；'),
      });
    }
    closeSheet();
    showToast('设备已添加至台账');
    bumpRefresh();
  } catch (e) {
    showToast(e && e.message ? e.message : '添加失败', 'close');
  } finally {
    busy.value = false;
  }
}
</script>

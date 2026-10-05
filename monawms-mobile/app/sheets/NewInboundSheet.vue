<template>
  <StackLayout>
    <SheetHead title="📥 新建入库单" />
    <Label text="填写供应商到货信息，创建后进入待处理队列" class="sheet-sub" />

    <!-- 真实模式：后端必填的仓库/产品 -->
    <PickerField v-if="!store.demoMode" label="入库仓库" required :options="opts.warehouses" v-model="form.warehouse" placeholder="请选择仓库" />
    <PickerField label="供应商" required :options="opts.suppliers" v-model="form.supplier" placeholder="请选择供应商" />

    <FlexboxLayout flexDirection="row">
      <StackLayout class="frow-item">
        <DateField label="预计到货" required v-model="form.expected" />
      </StackLayout>
      <StackLayout class="frow-item frow-item-last">
        <StackLayout class="fg">
          <FlexboxLayout flexDirection="row">
            <Label text="设备数量" class="fg-label" /><Label text="*" class="fg-req" />
          </FlexboxLayout>
          <TextField v-model="form.qty" hint="台" keyboardType="number" class="input" autocorrect="false" />
        </StackLayout>
      </StackLayout>
    </FlexboxLayout>

    <PickerField v-if="!store.demoMode" label="入库产品" required :options="opts.products" v-model="form.product" placeholder="请选择产品" />
    <PickerField label="负责人" :required="store.demoMode" :options="store.demoMode ? demoOwners : opts.users" v-model="form.owner" placeholder="请选择负责人" />

    <StackLayout class="fg">
      <Label text="备注" class="fg-label" />
      <TextView v-model="form.notes" hint="到货批次、特殊要求…" class="input textarea" />
    </StackLayout>

    <FlexboxLayout class="sheet-foot" flexDirection="row">
      <StackLayout class="btn btn-ghost pressable" @tap="closeSheet">
        <Label text="取消" class="btn-label btn-ghost-label" />
      </StackLayout>
      <StackLayout class="btn btn-primary pressable" @tap="submit">
        <Label :text="busy ? '创建中…' : '确认创建'" class="btn-label btn-primary-label" />
      </StackLayout>
    </FlexboxLayout>
  </StackLayout>
</template>

<script setup>
import { reactive, ref, onMounted } from 'nativescript-vue';
import { store, closeSheet, showToast, bumpRefresh } from '../services/store';
import { api } from '../services/api';
import { dateToYmd } from '../utils/format';
import SheetHead from '../components/SheetHead.vue';
import PickerField from '../components/PickerField.vue';
import DateField from '../components/DateField.vue';

const opts = reactive({ warehouses: [], suppliers: [], users: [], products: [] });
const demoOwners = [
  { id: 1, name: '张三' }, { id: 2, name: '李四' }, { id: 3, name: '王五' }, { id: 4, name: '赵六' },
];

const form = reactive({
  warehouse: null,
  supplier: null,
  product: null,
  owner: null,
  expected: dateToYmd(new Date(Date.now() + 86400000)),
  qty: '',
  notes: '',
});
const busy = ref(false);

onMounted(async () => {
  try {
    const o = await api.options();
    Object.assign(opts, o);
  } catch (e) {
    console.error('[NewInboundSheet] options load failed:', e && e.message);
  }
});

async function submit() {
  if (busy.value) return;
  if (!form.supplier) return showToast('请选择供应商', 'warning');
  if (!form.expected) return showToast('请选择预计到货日期', 'warning');
  if (!form.qty || Number(form.qty) <= 0) return showToast('请填写设备数量', 'warning');
  if (!store.demoMode) {
    if (!form.warehouse) return showToast('请选择入库仓库', 'warning');
    if (!form.product) return showToast('请选择入库产品', 'warning');
  } else if (!form.owner) {
    return showToast('请选择负责人', 'warning');
  }

  busy.value = true;
  try {
    if (store.demoMode) {
      await api.createInbound({
        supplier: form.supplier.name,
        expected: form.expected,
        qty: Number(form.qty),
        owner: form.owner.name,
        notes: form.notes,
      });
    } else {
      await api.createInbound({
        warehouse_id: form.warehouse.id,
        supplier_id: form.supplier.id,
        type: 'purchase',
        source: 'purchase',
        expected_date: form.expected,
        notes: form.notes,
        items: [{ product_id: form.product.id, quantity: Number(form.qty) }],
      });
    }
    closeSheet();
    showToast('入库单已创建，进入待处理队列');
    bumpRefresh();
  } catch (e) {
    showToast(e && e.message ? e.message : '创建失败', 'close');
  } finally {
    busy.value = false;
  }
}
</script>

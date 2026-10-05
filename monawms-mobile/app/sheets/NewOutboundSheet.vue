<template>
  <StackLayout>
    <SheetHead title="📤 新建出库单" />
    <Label text="填写部门领用申请信息" class="sheet-sub" />

    <PickerField v-if="!store.demoMode" label="出库仓库" required :options="opts.warehouses" v-model="form.warehouse" placeholder="请选择仓库" />
    <PickerField label="申请部门" required :options="deptOptions" v-model="form.dept" placeholder="请选择申请部门" />

    <FlexboxLayout flexDirection="row">
      <StackLayout class="frow-item">
        <StackLayout class="fg">
          <FlexboxLayout flexDirection="row">
            <Label text="申请人" class="fg-label" /><Label text="*" class="fg-req" />
          </FlexboxLayout>
          <TextField v-model="form.applicant" hint="姓名" class="input" autocorrect="false" />
        </StackLayout>
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

    <FlexboxLayout flexDirection="row">
      <StackLayout class="frow-item">
        <PickerField label="紧急程度" :options="priorities" v-model="form.priority" placeholder="普通" />
      </StackLayout>
      <StackLayout class="frow-item frow-item-last">
        <DateField label="预计出库" v-model="form.expected" placeholder="选择日期" />
      </StackLayout>
    </FlexboxLayout>

    <PickerField v-if="!store.demoMode" label="出库产品" required :options="opts.products" v-model="form.product" placeholder="请选择产品" />

    <StackLayout class="fg">
      <Label text="用途说明" class="fg-label" />
      <TextView v-model="form.notes" hint="领用用途…" class="input textarea" />
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
import { reactive, ref, computed, onMounted } from 'nativescript-vue';
import { store, closeSheet, showToast, bumpRefresh } from '../services/store';
import { api } from '../services/api';
import { get } from '../services/http';
import { dateToYmd } from '../utils/format';
import { demoOptions } from '../services/mock';
import SheetHead from '../components/SheetHead.vue';
import PickerField from '../components/PickerField.vue';
import DateField from '../components/DateField.vue';

const opts = reactive({ warehouses: [], customers: [], products: [] });
const priorities = [
  { id: 'normal', name: '普通' },
  { id: 'urgent', name: '紧急' },
  { id: 'urgent2', name: '非常紧急' },
];

const deptOptions = computed(() =>
  store.demoMode
    ? demoOptions.departments.map((d, i) => ({ id: i + 1, name: d }))
    : opts.customers.length
      ? opts.customers
      : demoOptions.departments.map((d, i) => ({ id: null, name: d }))
);

const form = reactive({
  warehouse: null,
  dept: null,
  product: null,
  applicant: '',
  qty: '',
  priority: null,
  expected: dateToYmd(new Date(Date.now() + 86400000)),
  notes: '',
});
const busy = ref(false);

onMounted(async () => {
  try {
    const o = await api.options();
    opts.warehouses = o.warehouses;
    opts.products = o.products;
    if (!store.demoMode) {
      const customers = await get('/customers/options').catch(() => null);
      const list = (customers && (customers.list || customers)) || [];
      opts.customers = (Array.isArray(list) ? list : []).map((c) => ({ id: c.id, name: c.name || c.customer_name }));
    }
  } catch (e) {
    console.error('[NewOutboundSheet] options load failed:', e && e.message);
  }
});

async function submit() {
  if (busy.value) return;
  if (!form.dept) return showToast('请选择申请部门', 'warning');
  if (!form.applicant) return showToast('请填写申请人', 'warning');
  if (!form.qty || Number(form.qty) <= 0) return showToast('请填写设备数量', 'warning');
  if (!store.demoMode) {
    if (!form.warehouse) return showToast('请选择出库仓库', 'warning');
    if (!form.product) return showToast('请选择出库产品', 'warning');
  }

  const prioName = form.priority ? form.priority.name : '普通';
  const prioKey = !form.priority || form.priority.id === 'normal' ? 'normal' : 'urgent';

  busy.value = true;
  try {
    if (store.demoMode) {
      await api.createOutbound({
        dept: form.dept.name,
        applicant: form.applicant,
        qty: Number(form.qty),
        priority: prioName,
        expected: form.expected,
        notes: form.notes,
      });
    } else {
      await api.createOutbound({
        warehouse_id: form.warehouse.id,
        customer_id: form.dept.id || undefined,
        receiver_unit: form.dept.name,
        receiver_name: form.applicant,
        type: 'other',
        priority: prioKey,
        expected_date: form.expected,
        notes: form.notes,
        items: [{ product_id: form.product.id, quantity: Number(form.qty) }],
      });
    }
    closeSheet();
    showToast('出库单已创建，等待审批');
    bumpRefresh();
  } catch (e) {
    showToast(e && e.message ? e.message : '创建失败', 'close');
  } finally {
    busy.value = false;
  }
}
</script>

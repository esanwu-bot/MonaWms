<script setup lang="ts">
import { ref, h } from "vue";
import { ElMessage, ElTag } from "element-plus";
import type { PlusColumn } from "plus-pro-components";
import { fetchOutbound } from "@/api/mock";

const typeOptions = [
  { label: "领用出库", value: "领用出库" },
  { label: "调拨出库", value: "调拨出库" },
  { label: "借用出库", value: "借用出库" },
  { label: "盘亏出库", value: "盘亏出库" },
];

const statusMap: Record<string, { label: string; type: string }> = {
  草稿: { label: "草稿", type: "info" },
  已确认: { label: "已确认", type: "primary" },
  已过账: { label: "已过账", type: "success" },
  已作废: { label: "已作废", type: "danger" },
};

const statusOptions = Object.values(statusMap).map((s) => ({
  label: s.label,
  value: s.label,
}));

const columns: PlusColumn[] = [
  {
    label: "出库单号",
    prop: "orderNo",
    width: 175,
    valueType: "input",
    fieldProps: { placeholder: "输入单号" },
  },
  {
    label: "类型",
    prop: "type",
    width: 100,
    valueType: "select",
    options: typeOptions,
  },
  {
    label: "物料编码",
    prop: "materialCode",
    width: 130,
    valueType: "input",
    fieldProps: { placeholder: "输入物料编码" },
  },
  { label: "物料名称", prop: "materialName", minWidth: 180 },
  { label: "数量", prop: "quantity", width: 90 },
  { label: "单位", prop: "unit", width: 70 },
  { label: "领用人", prop: "recipient", width: 100 },
  { label: "仓库", prop: "warehouse", width: 110 },
  {
    label: "状态",
    prop: "status",
    width: 90,
    valueType: "select",
    options: statusOptions,
    render: (value: string) => {
      const item = statusMap[value] ?? { label: value, type: "info" };
      return h(ElTag, { type: item.type as any }, () => item.label);
    },
  },
  { label: "创建时间", prop: "createTime", width: 160 },
];

const createVisible = ref(false);
const createColumns: PlusColumn[] = [
  {
    label: "出库类型",
    prop: "type",
    valueType: "select",
    options: typeOptions,
    formItemProps: { rules: [{ required: true, message: "请选择出库类型" }] },
  },
  {
    label: "物料编码",
    prop: "materialCode",
    fieldProps: { placeholder: "扫描或输入物料编码" },
    formItemProps: { rules: [{ required: true, message: "请输入物料编码" }] },
  },
  { label: "物料名称", prop: "materialName", fieldProps: { placeholder: "物料名称" } },
  {
    label: "数量",
    prop: "quantity",
    fieldProps: { type: "number", min: 1 },
    formItemProps: { rules: [{ required: true, message: "请输入数量" }] },
  },
  { label: "领用人", prop: "recipient", fieldProps: { placeholder: "领用人姓名" } },
  {
    label: "仓库",
    prop: "warehouse",
    valueType: "select",
    options: [
      { label: "A-01 主仓", value: "A-01 主仓" },
      { label: "A-02 备件仓", value: "A-02 备件仓" },
      { label: "B-03 无线仓", value: "B-03 无线仓" },
    ],
  },
];

function handleCreate(values: Record<string, any>) {
  ElMessage.success(`出库单已创建：${values.type} · ${values.materialCode} × ${values.quantity}`);
  createVisible.value = false;
}
</script>

<template>
  <div class="page-pad">
    <PlusPage
      title="出库管理"
      :columns="columns"
      :request="fetchOutbound"
      :search="{}"
    >
      <template #toolbar>
        <el-button type="primary" @click="createVisible = true">新建出库单</el-button>
      </template>
    </PlusPage>

    <PlusDialogForm
      v-model:visible="createVisible"
      title="新建出库单"
      :columns="createColumns"
      @confirm="handleCreate"
    />
  </div>
</template>

<style scoped>
.page-pad {
  padding: 16px;
}
</style>

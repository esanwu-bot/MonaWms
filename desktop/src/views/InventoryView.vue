<script setup lang="ts">
import { ref, h } from "vue";
import { ElMessage, ElTag } from "element-plus";
import type { PlusColumn } from "plus-pro-components";
import { fetchInventory } from "@/api/mock";

const statusMap: Record<string, { label: string; type: string }> = {
  充足: { label: "充足", type: "success" },
  正常: { label: "正常", type: "primary" },
  待补货: { label: "待补货", type: "warning" },
  低库存: { label: "低库存", type: "danger" },
};

const statusOptions = Object.values(statusMap).map((s) => ({
  label: s.label,
  value: s.label,
}));

const columns: PlusColumn[] = [
  {
    label: "物料编码",
    prop: "materialCode",
    width: 150,
    valueType: "input",
    fieldProps: { placeholder: "输入物料编码" },
  },
  {
    label: "物料名称",
    prop: "name",
    minWidth: 190,
    valueType: "input",
    fieldProps: { placeholder: "输入物料名称" },
  },
  { label: "规格型号", prop: "spec", minWidth: 120 },
  { label: "单位", prop: "unit", width: 70 },
  { label: "库存数量", prop: "quantity", width: 100 },
  { label: "安全库存", prop: "safeStock", width: 100 },
  { label: "仓库", prop: "warehouse", width: 110 },
  { label: "库位", prop: "location", width: 110 },
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
];

const createVisible = ref(false);
const createColumns: PlusColumn[] = [
  {
    label: "物料编码",
    prop: "materialCode",
    fieldProps: { placeholder: "如 GYTA-24" },
    formItemProps: { rules: [{ required: true, message: "请输入物料编码" }] },
  },
  {
    label: "物料名称",
    prop: "name",
    fieldProps: { placeholder: "如 光缆 GYTA-24 24芯" },
    formItemProps: { rules: [{ required: true, message: "请输入物料名称" }] },
  },
  { label: "规格型号", prop: "spec", fieldProps: { placeholder: "规格/型号" } },
  {
    label: "单位",
    prop: "unit",
    valueType: "select",
    options: [
      { label: "米", value: "米" },
      { label: "只", value: "只" },
      { label: "条", value: "条" },
      { label: "台", value: "台" },
      { label: "个", value: "个" },
      { label: "卷", value: "卷" },
    ],
  },
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
  { label: "安全库存", prop: "safeStock", fieldProps: { type: "number", min: 0 } },
];

function handleCreate(values: Record<string, any>) {
  ElMessage.success(`新建物料成功：${values.materialCode} ${values.name}`);
  createVisible.value = false;
}
</script>

<template>
  <div class="page-pad">
    <PlusPage
      title="库存管理"
      :columns="columns"
      :request="fetchInventory"
      :search="{}"
    >
      <template #toolbar>
        <el-button type="primary" @click="createVisible = true">新建物料</el-button>
      </template>
    </PlusPage>

    <PlusDialogForm
      v-model:visible="createVisible"
      title="新建物料"
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

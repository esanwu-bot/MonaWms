<script setup lang="ts">
import { h } from "vue";
import { ElTag } from "element-plus";
import type { PlusColumn } from "plus-pro-components";
import { fetchStocktake } from "@/api/mock";

const statusMap: Record<string, { label: string; type: string }> = {
  进行中: { label: "进行中", type: "primary" },
  待审核: { label: "待审核", type: "warning" },
  已审核: { label: "已审核", type: "success" },
  已完成: { label: "已完成", type: "info" },
};

const statusOptions = Object.values(statusMap).map((s) => ({
  label: s.label,
  value: s.label,
}));

const columns: PlusColumn[] = [
  { label: "盘点单号", prop: "orderNo", width: 170 },
  {
    label: "物料编码",
    prop: "materialCode",
    width: 130,
    valueType: "input",
    fieldProps: { placeholder: "输入物料编码" },
  },
  { label: "物料名称", prop: "materialName", minWidth: 180 },
  { label: "账面数量", prop: "bookQty", width: 100 },
  { label: "实盘数量", prop: "realQty", width: 100 },
  {
    label: "差异",
    prop: "diffQty",
    width: 90,
    render: (value: number) => {
      if (value === 0) return h(ElTag, { type: "success" }, () => "平");
      if (value > 0) return h(ElTag, { type: "warning" }, () => `+${value}`);
      return h(ElTag, { type: "danger" }, () => `${value}`);
    },
  },
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
</script>

<template>
  <div class="page-pad">
    <PlusPage
      title="盘点对账"
      :columns="columns"
      :request="fetchStocktake"
      :search="{}"
    />
  </div>
</template>

<style scoped>
.page-pad {
  padding: 16px;
}
</style>

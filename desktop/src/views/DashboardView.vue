<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import type { PlusColumn } from "plus-pro-components";
import { fetchDashboard } from "@/api/mock";
import { invoke } from "@tauri-apps/api/core";

const stats = ref({
  skuCount: 0,
  stockAmount: 0,
  todayInbound: 0,
  todayOutbound: 0,
  lowStock: 0,
});

const flows = ref<Record<string, any>[]>([]);
const barcodeResult = ref("");

const flowColumns: PlusColumn[] = [
  { label: "时间", prop: "time", width: 150 },
  { label: "类型", prop: "type", width: 80, render: (v) => (v === "入库" ? "入库" : "出库") },
  { label: "物料编码", prop: "code", width: 120 },
  { label: "物料名称", prop: "name", minWidth: 180 },
  { label: "数量", prop: "qty", width: 90 },
  { label: "操作人", prop: "operator", width: 90 },
];

async function load() {
  const data = await fetchDashboard();
  stats.value = data;
  flows.value = data.recentFlows;
}

async function scanFromRust() {
  try {
    barcodeResult.value = await invoke<string>("scan_barcode");
    ElMessage.success(`Rust 端扫码：${barcodeResult.value}`);
  } catch {
    ElMessage.warning("当前为 Web 预览模式，仅桌面端可用");
  }
}

onMounted(load);
</script>

<template>
  <div class="dashboard">
    <el-row :gutter="16">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat">
            <div class="stat-num">{{ stats.skuCount }}</div>
            <div class="stat-label">在库物资（SKU）</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat">
            <div class="stat-num primary">¥ {{ (stats.stockAmount / 10000).toFixed(1) }} 万</div>
            <div class="stat-label">库存金额</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat">
            <div class="stat-num success">+{{ stats.todayInbound }}</div>
            <div class="stat-label">今日入库</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat">
            <div class="stat-num warning">-{{ stats.todayOutbound }}</div>
            <div class="stat-label">今日出库 · 低库存 {{ stats.lowStock }} 项</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="flow-card" header="近期出入库流水">
      <div class="flow-toolbar">
        <el-input
          v-model="barcodeResult"
          placeholder="桌面端可在此接收条码枪输入"
          style="width: 320px"
        >
          <template #append>
            <el-button @click="scanFromRust">Rust 扫码</el-button>
          </template>
        </el-input>
      </div>
      <PlusTable :columns="flowColumns" :data="flows" :pagination="false" />
    </el-card>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 16px;
}

.stat {
  text-align: center;
  padding: 6px 0;
}

.stat-num {
  font-size: 26px;
  font-weight: 700;
  color: #303133;
}

.stat-num.primary {
  color: #0e8fb8;
}

.stat-num.success {
  color: #67c23a;
}

.stat-num.warning {
  color: #e6a23c;
}

.stat-label {
  margin-top: 6px;
  font-size: 13px;
  color: #909399;
}

.flow-card {
  margin-top: 16px;
}

.flow-toolbar {
  margin-bottom: 12px;
}
</style>

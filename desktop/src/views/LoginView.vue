<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { invoke } from "@tauri-apps/api/core";

const router = useRouter();

const form = ref({ username: "admin", password: "password", barcode: "" });
const loading = ref(false);
const appInfo = ref("");

async function loadAppInfo() {
  try {
    const info = await invoke<{ version: string; os: string; arch: string }>("app_info");
    appInfo.value = `MonaWMS Desktop v${info.version} · ${info.os} ${info.arch}`;
  } catch {
    // Web 预览模式（vite dev 非 Tauri 环境）
    appInfo.value = "MonaWMS Desktop（Web 预览模式）";
  }
}

async function scanBarcode() {
  try {
    const code = await invoke<string>("scan_barcode");
    form.value.barcode = code;
    ElMessage.success(`扫码结果：${code}`);
  } catch {
    ElMessage.warning("当前为 Web 预览模式，条码扫描仅桌面端可用");
  }
}

function submit() {
  loading.value = true;
  setTimeout(() => {
    loading.value = false;
    if (form.value.username && form.value.password) {
      localStorage.setItem("monawms_logged", "1");
      ElMessage.success("登录成功");
      router.replace("/dashboard");
    } else {
      ElMessage.error("请输入用户名和密码");
    }
  }, 400);
}

onMounted(loadAppInfo);
</script>

<template>
  <div class="login-wrap">
    <el-card class="login-card" shadow="always">
      <div class="login-head">
        <div class="logo">
          <svg width="34" height="34" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#0E8FB8"></rect>
            <path d="M7 24 L12 8 L16 18 L20 8 L25 24" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
          <h1>Mona<b>WMS</b></h1>
        </div>
        <p class="sub">通信代维物资仓储管理系统 · 桌面客户端</p>
      </div>

      <el-form :model="form" label-position="top" size="large" @submit.prevent="submit">
        <el-form-item label="用户名">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" />
        </el-form-item>
        <el-form-item label="条码（可选，演示扫码枪）">
          <el-input v-model="form.barcode" placeholder="点击右侧「扫码」模拟条码枪输入">
            <template #append>
              <el-button @click="scanBarcode">扫码</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="submit">
          登 录
        </el-button>
      </el-form>

      <div class="login-tip">演示账号：admin / password · operator / password</div>
      <div class="login-info">{{ appInfo }}</div>
    </el-card>
  </div>
</template>

<style scoped>
.login-wrap {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #0e8fb8 0%, #0b5f7a 60%, #0a3d4e 100%);
}

.login-card {
  width: 400px;
  border-radius: 12px;
  padding: 8px 4px;
}

.login-head {
  text-align: center;
  margin-bottom: 18px;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.logo h1 {
  font-size: 26px;
  margin: 0;
  color: #0e8fb8;
}

.sub {
  color: #8a8f99;
  font-size: 13px;
  margin: 8px 0 0;
}

.login-btn {
  width: 100%;
  margin-top: 6px;
}

.login-tip {
  margin-top: 14px;
  font-size: 12px;
  color: #9aa0aa;
  text-align: center;
}

.login-info {
  margin-top: 10px;
  font-size: 12px;
  color: #b8bdc7;
  text-align: center;
}
</style>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { menuRoutes } from "@/router";

const route = useRoute();
const router = useRouter();

const sidebarProps = {
  routes: menuRoutes,
  defaultActive: computed(() => route.path),
};

const headerProps = {
  title: "MonaWMS 桌面客户端",
};

function logout() {
  localStorage.removeItem("monawms_logged");
  router.replace("/login");
}
</script>

<template>
  <PlusLayout :sidebar-props="sidebarProps" :header-props="headerProps">
    <template #header-right>
      <div class="header-right">
        <span class="user-name">admin</span>
        <el-button link type="primary" @click="logout">退出登录</el-button>
      </div>
    </template>
    <router-view />
  </PlusLayout>
</template>

<style scoped>
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-name {
  font-size: 13px;
  color: #606266;
}
</style>

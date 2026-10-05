<template>
  <GridLayout class="view-scroll">
    <ScrollView scrollBarEnabled="false">
      <StackLayout verticalAlignment="center" padding="20 0 40 0">
        <!-- Logo -->
        <GridLayout class="login-logo" marginTop="46">
          <MiIcon name="swap_vert" :size="34" color="#04222b" />
        </GridLayout>
        <Label text="通信设备WMS" class="login-title font-disp-b" />
        <Label text="MONAWMS · MOBILE CONSOLE" class="login-sub font-mono" />

        <!-- 登录卡 -->
        <StackLayout class="login-card">
          <StackLayout class="login-fg">
            <Label text="服务器地址" class="login-field-label" />
            <TextField
              v-model="baseUrlInput"
              hint="http://192.168.x.x:8000/api"
              class="input font-mono"
              keyboardType="url"
              autocorrect="false"
              autocapitalizationType="none"
              returnKeyType="next"
            />
          </StackLayout>
          <StackLayout class="login-fg">
            <Label text="用户名" class="login-field-label" />
            <TextField
              v-model="username"
              hint="请输入用户名"
              class="input"
              autocorrect="false"
              autocapitalizationType="none"
              returnKeyType="next"
            />
          </StackLayout>
          <StackLayout class="login-fg">
            <Label text="密码" class="login-field-label" />
            <TextField
              v-model="password"
              hint="请输入密码"
              secure="true"
              class="input"
              autocorrect="false"
              autocapitalizationType="none"
              returnKeyType="done"
              @returnPress="doLogin"
            />
          </StackLayout>

          <StackLayout class="btn btn-primary btn-big pressable" marginTop="8" @tap="doLogin">
            <Label :text="busy ? '登录中…' : '登 录'" class="btn-label btn-primary-label btn-big-label" />
          </StackLayout>

          <Label text="或以离线演示模式浏览原型 →" class="demo-link pressable" @tap="doDemo" />
        </StackLayout>

        <Label text="MonaWMS Mobile v1.0 · NativeScript-Vue 3" class="login-foot font-mono" />
      </StackLayout>
    </ScrollView>
  </GridLayout>
</template>

<script setup>
/** 登录页：JWT 认证（对接 backend_tp6 /api/auth/login），支持一键离线演示 */
import { ref } from 'nativescript-vue';
import { store, setBaseUrl, setSession, enterDemo, showToast } from '../services/store';
import { api } from '../services/api';
import MiIcon from '../components/MiIcon.vue';

const baseUrlInput = ref(store.baseUrl);
const username = ref('');
const password = ref('');
const busy = ref(false);

async function doLogin() {
  if (busy.value) return;
  if (!baseUrlInput.value) return showToast('请填写服务器地址', 'warning');
  if (!username.value) return showToast('请填写用户名', 'warning');
  if (!password.value) return showToast('请填写密码', 'warning');

  busy.value = true;
  setBaseUrl(baseUrlInput.value);
  try {
    const r = await api.login(username.value.trim(), password.value);
    setSession(r.token, r.user);
    showToast('登录成功');
  } catch (e) {
    showToast((e && e.message) || '登录失败', 'close');
  } finally {
    busy.value = false;
  }
}

function doDemo() {
  enterDemo();
  showToast('已进入演示模式');
}
</script>

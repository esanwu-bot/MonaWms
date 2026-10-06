import { createApp } from 'nativescript-vue';
import { Application } from '@nativescript/core';
import App from './App.vue';
import { reportGlobalError } from './services/store';

const app = createApp(App);

// Vue 组件树里（渲染 / 生命周期 / watch）抛出的错误全部走这里，
// 屏幕上没有 logcat 可用，所以把错误交给 store.globalError 由 App.vue 显示成横幅。
app.config.errorHandler = (err, instance, info) => {
  const name = (instance && instance.type && (instance.type.__name || instance.type.name)) || 'unknown';
  reportGlobalError('component:' + name + '@' + (info || '?'), err);
};

// 注意：不注册 @nativescript/canvas —— 目标机型实测 libcanvasnativev8.so 与运行时
// V8 ABI 不兼容，加载即致命崩溃（详见 services/canvasProbe.js）。趋势图走纯布局柱状。

try {
  app.start();
} catch (e) {
  // 启动即抛错说明根模板坏了；此时横幅已无从渲染，只能依赖控制台输出
  reportGlobalError('app.start', e);
}

// NativeScript 层的未捕获错误（事件回调里抛出的）在崩溃前留一次痕迹
try {
  Application.on(Application.uncaughtErrorEvent || 'uncaughtError', (args) => {
    reportGlobalError('native', args && args.error);
  });
} catch (e) {
  /* 平台不支持该事件时忽略 */
}

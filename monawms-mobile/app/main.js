import { createApp } from 'nativescript-vue';
import Canvas from '@nativescript/canvas/vue';

import App from './App.vue';

const app = createApp(App);

// 注册 <Canvas> 元素（首页迷你趋势线 / 出入库趋势图绘制）
app.use(Canvas);

app.start();

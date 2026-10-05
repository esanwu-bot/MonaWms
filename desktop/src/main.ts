import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import PlusProComponents from "plus-pro-components";
import "plus-pro-components/index.css";
import "./styles/global.css";

const app = createApp(App);

app.use(router);
// 注意顺序：Element Plus 样式在前，ProUI 样式在后，避免样式冲突
app.use(ElementPlus, { locale: zhCn });
app.use(PlusProComponents);

app.mount("#app");

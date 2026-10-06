# MonaWMS 移动端 · NativeScript-Vue 3

通信设备仓库管理系统（[MonaWMS](https://github.com/esanwu-bot/MonaWms)）的**原生移动端**，基于 **NativeScript 9 + NativeScript-Vue 3.1 + Vue 3.5**，按仓库原型 `prototype/mobile.html`（随附于 `docs/prototype-mobile.html`）1:1 还原暗色科技风视觉与交互，并对接 `backend_tp6`（ThinkPHP 6）REST API。

> 与仓库内 `uniapp_frontend`（H5/小程序向）互补：本工程产出 **iOS / Android 原生 App**（原生视图渲染，非 WebView）。

---

## 一、功能与原型对照

| 原型区块 | 本工程实现 | 说明 |
|---|---|---|
| 状态条/机身框 | 系统状态栏 + 深色主题 | `statusBarStyle="light"`，Android 主题 `#05070D` |
| 首页 `#view-home` | `views/HomeView.vue` | 日期/问候语**解码动画**、4 张统计卡（数字滚动 + Canvas 迷你趋势线）、六宫格快捷操作、出入库趋势图（Canvas 双贝塞尔曲线 + 渐变面积）、待办横滚、最近活动流 |
| 入库 `#view-inbound` | `views/InboundView.vue` | chips 状态筛选（含计数）、单据卡（状态徽标 / 2×2 元信息 / 进度条 / 操作按钮）、FAB 新建 |
| 出库 `#view-outbound` | `views/OutboundView.vue` | 同上，含「紧急」红色徽标与优先级映射 |
| 设备 `#view-devices` | `views/DevicesView.vue` | 序列号级台账卡（缩略图 / 状态点 / SN / 库位），点击开详情抽屉 |
| 我的 `#view-mine` | `views/MineView.vue` | 名片、三宫格统计、功能菜单（含退出登录） |
| 二级页 `#sub-logs` | `views/LogsView.vue` | 操作日志：成功/警告/错误/信息筛选，右滑入覆盖层 |
| 二级页 `#sub-warehouse` | `views/WarehouseView.vue` | 仓库分区容量卡（进度条 + 阈值色） |
| 二级页 `#sub-scrap` | `views/ScrapView.vue` | 报废申请审批 / 凭证 |
| 二级页 `#sub-reports` | `views/ReportsView.vue` | 月度出入库分组柱状 + 供应商占比 |
| 抽屉 `#sh-in / #sh-out / #sh-dev / #sh-detail` | `sheets/*.vue` | 底部抽屉（遮罩淡入 + 面板上滑动画）：新建入库/出库/设备、设备详情、单据详情 |
| FAB `.fab` | `components/FabButton.vue` | 入库/出库/设备 Tab 弹性缩放出现 |
| Tab Bar `.tabbar` | `components/TabBar.vue` | 自定义 5 Tab（指示条 + 待办红徽标） |
| Toast `#toast` | `components/ToastHost.vue` | 底部居中提示，2.2s 自动消失 |
| 登录页 | `views/LoginView.vue` | JWT 登录 + **一键离线演示模式** |
| 扫码查询 | `views/ScanView.vue` | `@nativescript/camera` 拍照 → `POST /api/barcode/recognize`（multipart）→ `GET /api/serial-numbers/query-by-barcode` 台账回显 + 会话历史 |
| 盘点管理 | `views/StocktakeView.vue` | 盘点单状态机列表（草稿/盘点中/待审核/已完成）+ 创建全盘单 |
| 盘点执行 | `views/StocktakeExecView.vue` | 盲盘扫 SN / 明盘录实盘 / 提交 / 差异审核过账（生成盘盈盘亏调整单），执行页隐藏账面数 |
| 设备抽屉扫码 | `sheets/NewDeviceSheet.vue` | 序列号字段旁扫码按钮，识别结果直接填单 |

### 交互动效（原生动画 API 实现）
- 统计数字 1.3s easeOutCubic 滚动、问候语乱码解码
- Tab 切换即时态、chips/卡片按压 `:highlighted` 反馈
- 二级页右滑入/出、抽屉上滑/下滑、FAB 弹性缩放、Toast 浮入

---

## 二、技术栈

| 层 | 选型 |
|---|---|
| 运行时 | NativeScript 9.1（`@nativescript/core ~9.1`） |
| 框架 | `nativescript-vue ^3.1.2`（Vue 3.5，`<script setup>`） |
| 图表 | `@nativescript/canvas ^2.1`（Canvas 2D：迷你趋势线、出入库趋势图） |
| 扫码 | `@nativescript/camera ^7.0`（拍照 → ImageSource → multipart 上传识别） |
| HTTP | `@nativescript/core` 内置 `Http`（零额外依赖） |
| 状态 | 单例 `reactive` store（`services/store.js`），无需 Pinia |
| 样式 | NativeScript CSS 子集 + 全局主题表 `app/app.css` |
| 字体 | Chakra Petch（OFL）、JetBrains Mono（OFL）、Material Icons（Apache-2.0），位于 `app/fonts/` |

---

## 三、目录结构

```
monawms-mobile/
├── nativescript.config.js      # 工程配置（appId: com.monawms.mobile）
├── webpack.config.js           # @nativescript/webpack（vue flavor）
├── package.json
├── App_Resources/              # 图标（已换品牌暗色图标）/ 主题 / Info.plist(ATS)
├── docs/
│   └── prototype-mobile.html   # 设计原型（浏览器可直接打开对照）
└── app/
    ├── main.js                 # createApp + 注册 <Canvas>
    ├── App.vue                 # 根容器：Tab 主界面 / 二级页 / 抽屉 / Toast / 返回键
    ├── app.css                 # 全局暗色主题样式表
    ├── fonts/                  # ChakraPetch / JetBrainsMono / MaterialIcons
    ├── components/             # TabBar、SheetHost、SubViewHost、Canvas 图表、卡片等
    ├── views/                  # 5 个 Tab 页 + 登录页 + 4 个二级页
    ├── sheets/                 # 5 个底部抽屉表单/详情
    ├── services/
    │   ├── config.js           # 后端地址默认值
    │   ├── http.js             # 请求封装（Bearer / 统一解包 / 401 登出）
    │   ├── api.js              # API 层：真实请求 + 归一化；演示模式读 mock
    │   ├── mock.js             # 原型内置演示数据（可本地增改）
    │   ├── store.js            # 全局状态与 UI action
    │   └── theme.js            # 主题色常量（Canvas 用）
    └── utils/                  # 图标码点表、日期/数字格式化
```

---

## 四、快速开始

### 环境要求
- Node.js ≥ 18（推荐 20 LTS）
- [NativeScript CLI](https://docs.nativescript.org/) ≥ 9：`npm install -g nativescript`
- Android：Android Studio（JDK 17 + SDK 34+）；iOS：macOS + Xcode

### 运行

```bash
npm install

# 真机/模拟器运行
npm run android        # = ns run android
npm run ios            # = ns run ios

# 仅打包
npm run build:android  # 产物 platforms/android/app/build/outputs/apk/...
npm run build:ios
```

### 两种使用模式

1. **离线演示模式（默认推荐先体验）**
   登录页点击「以离线演示模式浏览原型」→ 使用原型内置数据（与 `mobile.html` 完全一致），新建单据/审批等操作会在本机演示库生效，首页角标、待办、日志联动更新。

2. **连接 MonaWMS 后端**
   - 登录页填写服务器地址，默认 `http://localhost:8000/api`：
     - Android 模拟器：`http://10.0.2.2:8000/api`
     - 真机：`http://<电脑局域网IP>:8000/api`（后端需监听 0.0.0.0）
   - 账号为 `backend_tp6` 的 users 表账号（默认 admin 账号见仓库文档/SQL 快照）。
   - Android 已配置 cleartext（`network_security.xml`）；iOS 已放开 ATS（Info.plist），生产环境请改 HTTPS 并收紧。

---

## 五、后端 API 对接一览（backend_tp6）

统一响应 `{ code, message, data, timestamp }`；分页 `data:{list,pagination}`。

| 移动端能力 | 接口 |
|---|---|
| 登录 / 登出 / 资料 | `POST /api/auth/login`、`POST /api/auth/logout`、`GET /api/auth/profile` |
| 首页聚合 | `GET /api/reports/dashboard` + `GET /api/serial-numbers`（total/in_stock/repairing 计数）+ `GET /api/inventory-transactions/recent` |
| 入库单 | `GET/POST /api/inbound-orders`、`POST /api/inbound-orders/:id/start-receiving|complete`、`GET :id` |
| 出库单 | `GET/POST /api/outbound-orders`、`POST /api/outbound-orders/:id/start-picking|deliver`、`GET :id` |
| 设备台账 | `GET /api/serial-numbers`、`POST /api/serial-numbers/register-device` |
| 仓库分区 | `GET /api/warehouses`（+statistics 兜底） |
| 操作日志 | `GET /api/logs` |
| 报废管理 | `GET /api/scrap`、`POST /api/scrap/:id/approve` |
| 报表 | `GET /api/reports/dashboard`（monthly_trends → 柱状图） |
| 扫码 | `POST /api/barcode/recognize`（multipart `barcode_image`）、`GET /api/serial-numbers/query-by-barcode?barcode=` |
| 盘点 P10 | `GET/POST /api/stocktakes`、`GET :id`、`GET :id/items`、`POST :id/start|scan|record|submit|review|cancel` |
| 表单选项 | `GET /api/warehouses/options`、`/suppliers/options`、`/users/options`、`/products/options`、`/customers/options` |

状态映射：入库 `pending/receiving/completed` → 待处理/处理中/已完成；出库 `pending/picking/packed/shipped/delivered` → 待处理/处理中/已送达，`priority=urgent` → 红色「紧急」；序列号 `in_stock/in_use|sold/repairing|to_scrap` → 可用/使用中/维护中。

---

## 六、主题与资源

- 色板：背景 `#0a0e16`、卡片 `#111725`、描边 `rgba(148,163,184,.09)`、主色青 `#22d3ee`、琥珀 `#fbbf24`、绿 `#34d399`、红 `#f87171`、紫 `#a78bfa`（与原型 CSS 变量一致）。
- 字体：数字/标题 Chakra Petch、等宽 JetBrains Mono、图标 Material Icons（码点表 `app/fonts/MaterialIcons.codepoints` → `utils/icons.js`）。中文回退系统字体（Android Noto / iOS PingFang）。
- 字体与图标许可证：OFL-1.1 / Apache-2.0，可随 App 分发。

## 七、构建校验（已在沙箱执行）

- `@vue/compiler-sfc` 全量编译 46 个 SFC/JS：**全部通过**
- `@nativescript/webpack`（vue flavor, platform=android）完整 bundle：**compiled successfully**（vendor 4.29MB + bundle 550KB + 字体资源拷贝）
- 真机/模拟器运行需本地 JDK + Android SDK（`ns run android`），本沙箱无 SDK 故止于 bundle 校验。

## 八、已知限制

- Canvas 趋势图在部分低端 Android 设备首帧可能空白，切 Tab 回首页会自动重绘。
- 「系统设置」为占位（与原型一致）；报表「供应商占比」真实模式暂用示例值（后端无对应聚合接口）。
- 打印类操作（标签/单据/凭证）提示至 Web 端执行。
- 后端 `/api/barcode/recognize` 内置 OCR 为演示实现（返回模拟码串）；生产请在 `BarcodeController::simpleOCR` 接入 ZXing/云端 OCR，移动端上传链路无需改动。
- 扫码需相机权限（Android 清单与 iOS Info.plist 已声明，运行时经 `@nativescript-community/perms` 请求）。

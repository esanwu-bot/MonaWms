# MonaWMS 桌面客户端

基于 **Tauri 2 + Vue 3 + TypeScript + ProUI (plus-pro-components) + Element Plus** 的跨平台桌面客户端，用于通信代维物资仓储管理（库存、入库、出库、盘点）。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端框架 | Vue 3.5 + TypeScript |
| 组件库 | plus-pro-components 0.1（ProUI，100% 兼容 Element Plus） |
| 路由 | vue-router 4 |
| 桌面框架 | Tauri 2（Rust 后端，WebView2 渲染） |
| Rust 工具链 | stable 1.99（已安装至 `D:\Program Files (x86)\rust`） |

## 环境要求

- **Rust**：已安装至 `D:\Program Files (x86)\rust`（CARGO_HOME/RUSTUP_HOME 已指向该目录，cargo\bin 已加入用户 PATH）
- **MSVC Build Tools**：本机已装 VS 2022 Build Tools（Tauri 编译需要 `link.exe`）
- **Node.js + npm**：前端构建需要

## 常用命令

```bash
# 安装前端依赖
npm install

# 前端开发（浏览器预览，Tauri 命令会降级为 Web 预览模式）
npm run dev

# 桌面端开发（热更新，打开原生窗口）
npm run tauri dev

# 前端类型检查 + 构建
npm run build

# 桌面端打包安装包（输出到 src-tauri/target/release/bundle/）
npm run tauri build

# 仅编译 Rust 后端（debug）
cd src-tauri && cargo build

# 启动编译产物
src-tauri\target\debug\mona-wms-desktop.exe
```

## 目录结构

```
desktop/
├── src/                      # Vue 前端
│   ├── api/mock.ts           # Mock 数据层（替换为真实后端时保持签名不变）
│   ├── router/index.ts       # 路由 + 侧边菜单（meta.title/icon 生成菜单）
│   ├── styles/global.css
│   └── views/
│       ├── LoginView.vue     # 登录页（含 Rust 扫码演示、系统信息）
│       ├── MainLayout.vue    # PlusLayout 主布局
│       ├── DashboardView.vue # 工作台（统计卡片 + 流水）
│       ├── InventoryView.vue # 库存管理（PlusPage + PlusTable + 新建）
│       ├── InboundView.vue   # 入库管理
│       ├── OutboundView.vue  # 出库管理
│       └── StocktakeView.vue # 盘点对账
├── src-tauri/                # Rust 后端
│   ├── src/lib.rs            # Tauri 命令：app_info / scan_barcode / greet
│   └── tauri.conf.json       # 窗口、产物配置
```

## 已接入的桌面原生能力

- `invoke("app_info")`：登录页展示应用版本与系统架构
- `invoke("scan_barcode")`：模拟条码扫描枪（生产环境替换为串口/HID 实现）
- 登录状态本地持久化（localStorage），带路由守卫

## 后续规划

- [ ] 接入真实后端 API（替换 `src/api/mock.ts` 中的函数实现）
- [ ] 条码扫描枪硬件对接（串口 / 键盘楔入）
- [ ] 标签打印机（ZPL / 热敏）与导出报表
- [ ] 离线数据缓冲（`tauri-plugin-store`，网络恢复后同步）
- [ ] 按需引入 Element Plus / ProUI 组件，减小打包体积（当前全量引入约 1.17MB JS）

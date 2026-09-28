# MonaWMS 前端授权模块（React 18 + Ant Design 5）

账号 × 仓库 独立授权的前端实现：**默认无权限，仓库切换器只显示已授权仓库**。

## 技术栈（与你现有 package.json 对齐）

React 18 + TypeScript + Vite 4 + Ant Design 5 + @tanstack/react-query 5 + Zustand 5 +
react-router-dom 7 + axios + dayjs（recharts / react-hook-form / zod 已在依赖里，本模块未强依赖）

## 文件清单

| 文件 | 作用 |
|---|---|
| `src/types/grant.ts` | 授权相关 TS 类型 |
| `src/api/permission.ts` | 权限常量（与后端 `config/permission.php` 一一对应） |
| `src/api/client.ts` | axios 实例 + 拦截器（自动注入 token 与 warehouse_id） |
| `src/api/grants.ts` | 授权接口封装 |
| `src/hooks/usePermission.ts` | 权限判定纯函数 `can()` |
| `src/stores/auth.ts` | Zustand：用户 / token（persist） |
| `src/stores/warehouse.ts` | Zustand：当前仓库 + 已授权仓库列表 |
| `src/components/Permission.tsx` | 按钮级权限组件（hide / disable 两种模式） |
| `src/components/WarehouseSwitcher.tsx` | 顶栏仓库切换器 |
| `src/components/BasicLayout.tsx` | 主布局（菜单按权限过滤 + 顶栏） |
| `src/pages/grant/Matrix.tsx` | **授权矩阵页**（行=账号，列=仓库） |
| `src/router/PermissionRoute.tsx` | 路由级权限守卫 |
| `src/router/index.tsx` | 路由表 + 菜单定义 |
| `src/main.tsx` | 入口（QueryClient + ConfigProvider） |

## 安装

```bash
cp -r src/*  <frontend>/src/
```

确保 `main.tsx` 里已挂载 `QueryClientProvider` 与 `ConfigProvider`（示例已给）。

## 核心机制

### 1. warehouse_id 自动注入

业务代码**不要手动拼 warehouse_id**，axios 请求拦截器统一处理：

```ts
// src/stores/warehouse.ts
setWarehouseIdGetter(() => useWarehouseStore.getState().currentId);

// src/api/client.ts 拦截器
if (GET)  config.params = { ...params, warehouse_id }
else      config.data   = { ...data, warehouse_id }
config.headers['X-Warehouse-Id'] = warehouseId;  // 兜底，后端优先读这个
```

为什么用 `getState()` 而不是 hook：拦截器不在 React 组件树里，拿不到 hook。

### 2. 授权被撤销时的处理

`useWarehouseStore.setList()` 里有个关键逻辑：如果当前选中的仓库已经不在授权列表里，立刻清空或切到第一个可用仓库。

不做这个处理，用户会卡在一个 403 的仓库里，看到满屏"没有权限"却不知道发生了什么——代维方被换掉时这个体验尤其糟糕。

```ts
setList: (list) => {
  const stillValid = list.some(w => w.warehouseId === get().currentId);
  set({ list, currentId: stillValid ? currentId : (list[0]?.warehouseId ?? null) });
}
```

另外 persist 只持久化 `currentId`，**列表每次登录重新拉**，避免缓存了已撤销的授权。

### 3. 三层权限控制

```
菜单级   BasicLayout 按 can() 过滤 menuItems         → 看不到入口
路由级   PermissionRoute action="grant:manage"       → 输 URL 也进不去
按钮级   <Permission action="inbound:post" mode="disable"> → 置灰 + tooltip
```

以上都是**体验层**，后端 `WarehouseScope` 中间件 + Service trait 才是真正的闸门。

### 4. 两种 403 的区分

后端返回两种 403，前端提示要分开，否则用户不知道该找谁：

```ts
if (data?.code === 'WAREHOUSE_NOT_GRANTED')
  message.error('你没有该仓库的权限，请联系管理员授权');
else
  message.error(data?.message || '没有操作权限');
```

## 用法示例

### 按钮权限

```tsx
// 过账按钮：录入员看不到（默认 hide）
<Permission action="inbound:post">
  <Button type="primary">过账</Button>
</Permission>

// 推荐 mode="disable"：让用户知道有这个功能、为什么不能点
<Permission action="stocktake:post" mode="disable" tip="需仓库管理员操作">
  <Button type="primary">盘点过账</Button>
</Permission>
```

### 路由权限

```tsx
{
  element: <PermissionRoute action="inbound:write" requireWarehouse />,
  children: [{ path: 'inbound', element: <InboundList /> }],
}
```

`requireWarehouse`：需要仓库上下文的页面，没选仓库会提示先切换。

### 业务列表页

```tsx
const currentId = useWarehouseStore(s => s.currentId);

const { data } = useQuery({
  queryKey: ['inbound-list', currentId],   // 切换仓库自动重新请求
  queryFn: () => fetchInboundList(params), // warehouse_id 由拦截器注入
  enabled: !!currentId,
});
```

`queryKey` 里带上 `currentId`，切换仓库时 React Query 自动重新拉取，不用手写 useEffect。

## 授权矩阵页

行 = 账号，列 = 仓库，交叉点用 AntD `Table` 动态列渲染：

- **空白单元格** → 虚线"授予"按钮（点一下授予为录入员）
- **角色标签** → 带 ⇄ 图标，点击在「仓库管理员 / 录入员」间切换
- **撤销** → Popconfirm 二次确认，确认文案明确写"撤销后该账号立即失去此仓库的所有访问与操作权限"

顶部支持：按代维方筛选、搜索账号、"仅看已授权"开关、批量授权弹窗、按代维方整体收回。

批量授权弹窗专门给"新增/更换代维方"场景：多选账号 × 多选仓库 × 统一角色，一次提交。

## 权限判定公式（与后端一致）

```
有效权限 = 全局角色 ∩ 仓库授权

系统级动作（grant:manage / user:manage / product:write ...）
  → 只看 users.role = admin

仓库级动作（inbound:post / stocktake:post / doc:reverse ...）
  → 先查有没有该仓库授权（没有 → 无权限）
  → 再看 grant_role 是不是 manager
```

**不能放大**：`SYSTEM_ACTIONS` 里列出的动作只认全局 admin，所以全局录入员被授予某仓库"仓库管理员"后，依然进不了授权管理页。这条前端后端各自实现一遍，不互相依赖。

## 还没做的

- `/api/vendors` 代维方主数据接口（矩阵页的代维方下拉目前是硬编码示例，需替换）
- 登录页 `src/pages/Login.tsx`（登录后调 `useAuthStore.setAuth()` 并拉取 `fetchMyWarehouses`）
- 授权有效期（valid_from / valid_until）的 UI
- 授权变更的实时推送（当前靠 invalidateQueries 刷新，多管理员同时操作时可加 WebSocket）

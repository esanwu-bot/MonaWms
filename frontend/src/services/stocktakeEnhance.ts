/**
 * 盘点/对账「移动+代维」场景增强层（mock，localStorage 持久化）
 *
 * TODO(backend): 后端 ThinkPHP 尚无以下契约，本层先 mock 落地：
 * - stocktake_orders 增加 vendor_id/vendor_keeper/cmcc_supervisor/blind_flag/双签/驳回字段
 * - rejected 状态流转（驳回→counting）与双签服务端校验
 * - 审核通过生成 type=SURPLUS_IN 其他入库单 / type=DEFICIT_OUT 其他出库单并回写 adjustment_number
 * - reconcile_snapshots 表（run_at/operator/三规则结果）
 * - 无归属 SN 明细与批量绑定接口、借出超 30 天状态差异（R3）
 * 后端落地后，本层函数改为透传适配，页面无需改动。
 */
import type { ReconcileDiff, StocktakeOrder, StocktakeStatus } from './stocktakeService';

// ==================== 类型定义 ====================

/** 代维公司（字典） */
export interface VendorCompany {
  id: number;
  name: string;
}

/** 盘点单增强字段（代维 + 双签 + 驳回 + 状态覆盖） */
export interface StocktakeEnhanceMeta {
  order_id: number;
  /** 有效状态（含驳回后回 counting 的流转；后端单以此覆盖后端状态） */
  status: StocktakeStatus;
  vendor_id?: number;
  vendor_name?: string;
  /** 代维负责人 */
  vendor_keeper?: string;
  /** 移动主管 */
  cmcc_supervisor?: string;
  /** 盲盘开关：代维场景强制 1 */
  blind_flag: 0 | 1;
  /** 代维负责人签字时间 */
  keeper_sign_at?: string;
  /** 移动主管签字时间 */
  supervisor_sign_at?: string;
  submitted_at?: string;
  rejected_at?: string;
  reject_notes?: string;
  reviewed_at?: string;
  review_notes?: string;
  /** 审核通过回写的调整单号（替换 "-"） */
  adjustment_number?: string;
  cancel_reason?: string;
}

/** 盘点明细行（增强层统一结构：普件 SN / 散料卷号） */
export interface EnhanceStocktakeItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  /** 计量单位：台/米等 */
  unit: string;
  /** count 普件 / length 散料（米） */
  measure_type: 'count' | 'length';
  /** sn 普件 SN 行 / batch 散料卷号行 */
  row_type: 'sn' | 'batch';
  /** 普件 SN（散料空） */
  sn: string;
  /** 散料卷号（普件空） */
  batch_no: string;
  /** 账面数量（盲盘不渲染，服务层比对用） */
  book_qty: string;
  /** 实盘数量（null=未盘） */
  counted_qty?: string | null;
  /** 盘点时间 */
  counted_at?: string;
  /** 盘点设备标识/操作人 */
  counted_by?: string;
  diff_qty?: string;
  reason?: string;
}

/** mock 盘点单（内置示例 + 纯 mock 新建；字段对齐后端 StocktakeOrder） */
export interface MockStocktakeOrder {
  id: number;
  order_number: string;
  warehouse_id: number;
  warehouse_name: string;
  type: 'full' | 'partial' | 'dynamic';
  scope_type: 'all' | 'category' | 'location';
  scope_value: string;
  status: StocktakeStatus;
  status_text: string;
  keeper_name: string;
  snapshot_at: string;
  total_snapshot_qty: string;
  total_counted_qty: string;
  total_diff_qty: string;
  item_total: number;
  item_counted: number;
  item_diff: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  is_mock: true;
}

/** 审核通过生成的调整单（盘盈→其他入库 / 盘亏→其他出库） */
export interface StocktakeAdjustmentOrder {
  id: string;
  order_number: string;
  type: 'SURPLUS_IN' | 'DEFICIT_OUT';
  stocktake_order_id: number;
  stocktake_order_number: string;
  warehouse_id: number;
  warehouse_name: string;
  created_at: string;
  created_by: string;
  items: Array<{
    sn_or_batch: string;
    product_name: string;
    qty: string;
    unit: string;
    reason?: string;
  }>;
}

/** 无归属 SN（R2：在库但缺 warehouse_id） */
export interface OrphanSn {
  sn: string;
  product_name: string;
  sku: string;
  status: string;
  /** 绑定后写入的仓库（null=未绑定） */
  bound_warehouse_id?: number | null;
  bound_warehouse_name?: string | null;
  bound_at?: string | null;
}

/** 状态差异行（R3：在库但借出/在站超 30 天未还） */
export interface StatusDiffRow {
  sn: string;
  product_name: string;
  warehouse_name: string;
  issue: string;
  days_over: number;
  last_out_at: string;
}

/** 对账快照（B1/B5：reconcile_snapshots 的 mock） */
export interface ReconcileSnapshot {
  run_at: string;
  operator: string;
  checked: number;
  diff_count: number;
  is_balanced: boolean;
  orphan_sn: number;
  /** R1 总账 vs 明细差异 */
  r1_diffs: ReconcileDiff[];
  /** R3 状态差异 */
  status_diffs: StatusDiffRow[];
}

/** 增强层操作日志（mock operation_log） */
export interface EnhanceOperationLog {
  id: number;
  action: string;
  detail: string;
  operator: string;
  created_at: string;
}

// ==================== 常量 ====================

/** 代维公司字典（TODO(backend): 落库为 vendor 字典） */
export const vendorCompanies: VendorCompany[] = [
  { id: 1, name: '中移铁通代维' },
  { id: 2, name: '通宇代维公司' },
  { id: 3, name: '华讯代维公司' },
];

export const DIFF_REASON_OPTIONS = [
  '录入错误',
  '遗失',
  '损坏',
  '自然损耗',
  '借出未还',
  '其他',
];

/** 差异率阈值：>3% 时差异原因必填 */
export const DIFF_REASON_RATE_THRESHOLD = 0.03;

// ==================== 存储 ====================

interface EnhanceStore {
  orders: Record<number, MockStocktakeOrder>;
  meta: Record<number, StocktakeEnhanceMeta>;
  items: Record<number, EnhanceStocktakeItem[]>;
  adjustments: StocktakeAdjustmentOrder[];
  orphan_sns: OrphanSn[];
  status_diffs: StatusDiffRow[];
  reconcile_snapshot: ReconcileSnapshot | null;
  operation_logs: EnhanceOperationLog[];
  seq: number;
}

const STORAGE_KEY = 'stocktake-enhance-v1';

function nowStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function seedStore(): EnhanceStore {
  // ---- 内置示例盘点单 900001：待审核 + 带差异（差异率>3% 行演示原因必填） ----
  const demoOrderId = 900001;
  const demoItems: EnhanceStocktakeItem[] = [
    { id: 1, order_id: demoOrderId, product_id: 101, product_name: 'RRU 远端单元', product_sku: 'CMCC-RRU-44', unit: '台', measure_type: 'count', row_type: 'sn', sn: 'SN-CMCC-RRU-0007', batch_no: '', book_qty: '1.0000', counted_qty: '1.0000', counted_at: '2026-09-28 15:12:03', counted_by: '张伟(代维-PDA-01)', diff_qty: '0.0000' },
    { id: 2, order_id: demoOrderId, product_id: 101, product_name: 'RRU 远端单元', product_sku: 'CMCC-RRU-44', unit: '台', measure_type: 'count', row_type: 'sn', sn: 'SN-CMCC-RRU-0008', batch_no: '', book_qty: '1.0000', counted_qty: '1.0000', counted_at: '2026-09-28 15:12:40', counted_by: '张伟(代维-PDA-01)', diff_qty: '0.0000' },
    { id: 3, order_id: demoOrderId, product_id: 101, product_name: 'RRU 远端单元', product_sku: 'CMCC-RRU-44', unit: '台', measure_type: 'count', row_type: 'sn', sn: 'SN-CMCC-RRU-0009', batch_no: '', book_qty: '1.0000', counted_qty: '0.0000', counted_at: '2026-09-28 15:13:02', counted_by: '张伟(代维-PDA-01)', diff_qty: '-1.0000', reason: '遗失' },
    { id: 4, order_id: demoOrderId, product_id: 103, product_name: 'OLT 交换机', product_sku: 'CMCC-OLT-16', unit: '台', measure_type: 'count', row_type: 'sn', sn: 'SN-CMCC-OU-0301', batch_no: '', book_qty: '1.0000', counted_qty: '1.0000', counted_at: '2026-09-28 15:14:11', counted_by: '张伟(代维-PDA-01)', diff_qty: '0.0000' },
    { id: 5, order_id: demoOrderId, product_id: 201, product_name: '馈线电缆 1/2"', product_sku: 'CMCC-WIRE-F12', unit: '米', measure_type: 'length', row_type: 'batch', sn: '', batch_no: 'ROL-WIRE-2026A', book_qty: '500.0000', counted_qty: '498.5000', counted_at: '2026-09-28 15:20:35', counted_by: '张伟(代维-PDA-01)', diff_qty: '-1.5000' },
    { id: 6, order_id: demoOrderId, product_id: 202, product_name: '光纤跳线', product_sku: 'CMCC-WIRE-JMP', unit: '米', measure_type: 'length', row_type: 'batch', sn: '', batch_no: 'ROL-WIRE-2026B', book_qty: '120.0000', counted_qty: '100.0000', counted_at: '2026-09-28 15:22:48', counted_by: '张伟(代维-PDA-01)', diff_qty: '-20.0000' },
  ];
  const demoMeta: StocktakeEnhanceMeta = {
    order_id: demoOrderId,
    status: 'pending_review',
    vendor_id: 1,
    vendor_name: '中移铁通代维',
    vendor_keeper: '张伟',
    cmcc_supervisor: '李明（移动）',
    blind_flag: 1,
    keeper_sign_at: '2026-09-28 15:08:20',
    supervisor_sign_at: '2026-09-28 15:09:02',
    submitted_at: '2026-09-28 15:25:44',
  };

  // ---- R2：≥3 条无归属 SN ----
  const orphanSns: OrphanSn[] = [
    { sn: 'SN-ORPHAN-0001', product_name: 'AAU 有源天线', sku: 'CMCC-AAU-64R', status: 'in_stock', bound_warehouse_id: null },
    { sn: 'SN-ORPHAN-0002', product_name: 'BBU 基带单元', sku: 'CMCC-BBU-5900', status: 'in_stock', bound_warehouse_id: null },
    { sn: 'SN-ORPHAN-0003', product_name: '微波回传设备', sku: 'CMCC-MW-AP', status: 'in_stock', bound_warehouse_id: null },
  ];

  // ---- R3：≥1 条状态差异（借出超 30 天未还） ----
  const statusDiffs: StatusDiffRow[] = [
    { sn: 'SN-CMCC-RRU-0005', product_name: 'RRU 远端单元', warehouse_name: '主仓库', issue: '借出超期未还', days_over: 45, last_out_at: '2026-08-15 09:30:00' },
    { sn: 'SN-CMCC-BBU-0012', product_name: 'BBU 基带单元', warehouse_name: '主仓库', issue: '在站超期未归还', days_over: 62, last_out_at: '2026-07-29 14:05:00' },
  ];

  return {
    orders: {
      900001: {
        id: 900001,
        order_number: 'PD202609280009',
        warehouse_id: 1,
        warehouse_name: '主仓库',
        type: 'full',
        scope_type: 'all',
        scope_value: '',
        status: 'pending_review',
        status_text: '待审核',
        keeper_name: '张伟',
        snapshot_at: '2026-09-28 15:05:00',
        total_snapshot_qty: '505.0000',
        total_counted_qty: '482.5000',
        total_diff_qty: '-22.5000',
        item_total: demoItems.length,
        item_counted: demoItems.length,
        item_diff: 3,
        notes: '月度全仓盘点（代维）',
        created_at: '2026-09-28 15:04:30',
        updated_at: '2026-09-28 15:25:44',
        is_mock: true,
      },
    },
    meta: { 900001: demoMeta },
    items: { 900001: demoItems },
    adjustments: [],
    orphan_sns: orphanSns,
    status_diffs: statusDiffs,
    reconcile_snapshot: null,
    operation_logs: [],
    seq: 100,
  };
}

function loadStore(): EnhanceStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as EnhanceStore;
      if (parsed && parsed.meta && parsed.items) return parsed;
    }
  } catch {
    // 解析失败重建
  }
  const seeded = seedStore();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  } catch {
    // 忽略持久化失败
  }
  return seeded;
}

function saveStore(store: EnhanceStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // 忽略持久化失败
  }
}

function pushLog(store: EnhanceStore, action: string, detail: string, operator: string): void {
  store.operation_logs.push({
    id: store.seq++,
    action,
    detail,
    operator,
    created_at: nowStr(),
  });
}

/** 后端单据快照（用于合并展示；列表合并时发现新后端单会自动登记 meta） */
export interface BackendOrderLike {
  id: number;
  order_number: string;
  warehouse_id: number;
  warehouse_name?: string;
  type: string;
  scope_type: string;
  status: string;
  keeper_name?: string;
  snapshot_at?: string | null;
  total_snapshot_qty?: string;
  total_counted_qty?: string;
  total_diff_qty?: string;
  item_total?: number;
  item_counted?: number;
  item_diff?: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
  scope_value?: string;
}

// ==================== 服务 ====================

function num(v: string | number | null | undefined): number {
  return Number(v ?? 0) || 0;
}

/** 差异率 = |diff| / 账面（账面为 0 时视为 100%） */
export function diffRate(bookQty: string, diffQty: string): number {
  const book = num(bookQty);
  const diff = Math.abs(num(diffQty));
  if (book <= 0) return diff > 0 ? 1 : 0;
  return diff / book;
}

export const stocktakeEnhance = {
  // ---------- 基础 ----------

  getVendorCompanies(): VendorCompany[] {
    return vendorCompanies;
  },

  /** mock 单列表 */
  listMockOrders(): MockStocktakeOrder[] {
    const store = loadStore();
    return Object.values(store.orders).sort((a, b) => b.id - a.id);
  },

  /** 后端单 + mock 单合并，返回带增强字段与有效状态的列表（新后端单自动登记 meta） */
  mergeWithBackend(backendOrders: BackendOrderLike[]): Array<StocktakeOrder & { vendor_name?: string; blind_flag?: 0 | 1; is_mock?: boolean }> {
    const store = loadStore();
    let dirty = false;
    const merged: Array<StocktakeOrder & { vendor_name?: string; blind_flag?: 0 | 1; is_mock?: boolean }> = [];

    for (const o of backendOrders) {
      if (!store.meta[o.id]) {
        // 首次见到的后端单：登记 meta（状态以后端为准；代维场景默认盲盘）
        store.meta[o.id] = {
          order_id: o.id,
          status: (o.status as StocktakeStatus) || 'draft',
          blind_flag: 1,
        };
        dirty = true;
      }
      const meta = store.meta[o.id];
      merged.push({
        ...o,
        type: o.type as StocktakeOrder['type'],
        scope_type: o.scope_type as StocktakeOrder['scope_type'],
        status: meta.status,
        status_text: meta.status,
        warehouse_name: o.warehouse_name ?? '',
        keeper_name: o.keeper_name ?? '',
        snapshot_at: o.snapshot_at ?? undefined,
        total_snapshot_qty: o.total_snapshot_qty ?? '0',
        total_counted_qty: o.total_counted_qty ?? '0',
        total_diff_qty: o.total_diff_qty ?? '0',
        item_total: o.item_total ?? 0,
        item_counted: o.item_counted ?? 0,
        item_diff: o.item_diff ?? 0,
        notes: o.notes,
        scope_value: o.scope_value ?? '',
        updated_at: o.updated_at ?? o.created_at,
        adjustment_number: meta.adjustment_number,
        vendor_name: meta.vendor_name,
        blind_flag: meta.blind_flag,
      });
    }

    for (const m of Object.values(store.orders)) {
      const meta = store.meta[m.id];
      merged.push({
        ...m,
        status: meta?.status ?? m.status,
        adjustment_number: meta?.adjustment_number,
        vendor_name: meta?.vendor_name,
        blind_flag: meta?.blind_flag,
        is_mock: true,
      });
    }

    if (dirty) saveStore(store);
    return merged.sort((a, b) => num(b.id) - num(a.id));
  },

  /** 登记后端创建成功的单（增强字段落库） */
  registerBackendOrder(orderId: number, fields: Partial<StocktakeEnhanceMeta>): void {
    const store = loadStore();
    const existing = store.meta[orderId];
    store.meta[orderId] = {
      ...existing,
      order_id: orderId,
      status: existing?.status ?? 'draft',
      blind_flag: fields.blind_flag ?? 1,
      ...fields,
    };
    pushLog(store, 'stocktake.create', `盘点单 #${orderId} 创建（代维：${fields.vendor_name ?? '-'}）`, fields.vendor_keeper ?? '-');
    saveStore(store);
  },

  /** 纯 mock 创建（后端不可达时的兜底） */
  createMockOrder(fields: {
    warehouse_id: number;
    warehouse_name?: string;
    type: string;
    scope_type: string;
    scope_value?: string;
    notes?: string;
    vendor_id?: number;
    vendor_name?: string;
    vendor_keeper?: string;
    cmcc_supervisor?: string;
    blind_flag?: 0 | 1;
  }): MockStocktakeOrder {
    const store = loadStore();
    const id = 910000 + store.seq++;
    const now = nowStr();
    const order: MockStocktakeOrder = {
      id,
      order_number: `PD${now.replace(/[-: ]/g, '').slice(0, 8)}${String(id).slice(-4)}`,
      warehouse_id: fields.warehouse_id,
      warehouse_name: fields.warehouse_name ?? '',
      type: (fields.type as MockStocktakeOrder['type']) ?? 'full',
      scope_type: (fields.scope_type as MockStocktakeOrder['scope_type']) ?? 'all',
      scope_value: fields.scope_value ?? '',
      status: 'draft',
      status_text: '草稿',
      keeper_name: fields.vendor_keeper ?? '',
      snapshot_at: now,
      total_snapshot_qty: '0.0000',
      total_counted_qty: '0.0000',
      total_diff_qty: '0.0000',
      item_total: 0,
      item_counted: 0,
      item_diff: 0,
      notes: fields.notes,
      created_at: now,
      updated_at: now,
      is_mock: true,
    };
    store.orders[id] = order;
    store.meta[id] = {
      order_id: id,
      status: 'draft',
      vendor_id: fields.vendor_id,
      vendor_name: fields.vendor_name,
      vendor_keeper: fields.vendor_keeper,
      cmcc_supervisor: fields.cmcc_supervisor,
      blind_flag: fields.blind_flag ?? 1,
    };
    pushLog(store, 'stocktake.create', `mock 盘点单 ${order.order_number} 创建`, fields.vendor_keeper ?? '-');
    saveStore(store);
    return order;
  },

  // ---------- 状态机 ----------

  getMeta(orderId: number): StocktakeEnhanceMeta | undefined {
    return loadStore().meta[orderId];
  },

  getMockOrder(orderId: number): MockStocktakeOrder | undefined {
    return loadStore().orders[orderId];
  },

  /** draft → counting */
  startCounting(orderId: number, operator: string): void {
    const store = loadStore();
    const meta = store.meta[orderId];
    if (!meta) throw new Error('盘点单不存在');
    if (meta.status !== 'draft') throw new Error('只有草稿状态的盘点单才能开始盘点');
    meta.status = 'counting';
    if (store.orders[orderId]) store.orders[orderId].status = 'counting';
    pushLog(store, 'stocktake.start', `盘点单 #${orderId} 开始盘点（冻结账面）`, operator);
    saveStore(store);
  },

  /** 任意非 completed → cancelled（录原因） */
  cancelOrder(orderId: number, reason: string, operator: string): void {
    const store = loadStore();
    const meta = store.meta[orderId];
    if (!meta) throw new Error('盘点单不存在');
    if (meta.status === 'completed') throw new Error('已完成的盘点单不可取消');
    meta.status = 'cancelled';
    meta.cancel_reason = reason;
    if (store.orders[orderId]) store.orders[orderId].status = 'cancelled';
    pushLog(store, 'stocktake.cancel', `盘点单 #${orderId} 取消：${reason || '-'}`, operator);
    saveStore(store);
  },

  /** 双签（mock 手写签：确认弹窗由页面负责，此处落时间戳） */
  signOrder(orderId: number, role: 'keeper' | 'supervisor', operator: string): void {
    const store = loadStore();
    const meta = store.meta[orderId];
    if (!meta) throw new Error('盘点单不存在');
    if (role === 'keeper') {
      meta.keeper_sign_at = nowStr();
    } else {
      meta.supervisor_sign_at = nowStr();
    }
    pushLog(store, 'stocktake.sign', `盘点单 #${orderId} ${role === 'keeper' ? '代维负责人' : '移动主管'}签字`, operator);
    saveStore(store);
  },

  /** 后端单的盘点明细登记（首次进入执行页时，把后端 items 转换入增强层统一结构） */
  ensureItemsFromBackend(
    orderId: number,
    backendItems: Array<{
      id: number;
      product_id: number;
      product_name?: string;
      product_sku?: string;
      unit?: string;
      measure_type?: string;
      serial_number?: string;
      batch_no?: string;
      snapshot_qty?: string;
    }>
  ): EnhanceStocktakeItem[] {
    const store = loadStore();
    if (!store.items[orderId] || store.items[orderId].length === 0) {
      store.items[orderId] = backendItems.map((it, idx) => ({
        id: it.id || idx + 1,
        order_id: orderId,
        product_id: it.product_id,
        product_name: it.product_name ?? `产品#${it.product_id}`,
        product_sku: it.product_sku ?? '',
        unit: it.unit ?? (it.measure_type === 'length' ? '米' : '台'),
        measure_type: (it.measure_type === 'length' ? 'length' : 'count'),
        row_type: it.serial_number ? 'sn' : 'batch',
        sn: it.serial_number ?? '',
        batch_no: it.batch_no ?? '',
        book_qty: it.snapshot_qty ?? '0.0000',
        counted_qty: null,
      }));
      saveStore(store);
    }
    return store.items[orderId];
  },

  getItems(orderId: number): EnhanceStocktakeItem[] {
    return loadStore().items[orderId] ?? [];
  },

  /** 普件扫码：命中清单→计 1；已盘→报错（重复提交）；不在清单→报错 */
  scanSn(orderId: number, sn: string, operator: string, device = 'PC'): { result: 'matched' | 'duplicate' | 'unknown'; message: string } {
    const store = loadStore();
    const items = store.items[orderId] ?? [];
    const item = items.find((i) => i.sn === sn);
    if (!item) {
      return { result: 'unknown', message: `SN ${sn} 不在本次盘点范围清单中` };
    }
    if (item.counted_qty != null) {
      return { result: 'duplicate', message: `SN ${sn} 已提交过实盘，请勿重复提交` };
    }
    item.counted_qty = '1.0000';
    item.counted_at = nowStr();
    item.counted_by = `${operator}(${device})`;
    saveStore(store);
    return { result: 'matched', message: `SN ${sn} 已盘` };
  },

  /** 录入实盘数量（SN 行已盘重复提交报错；散料按卷号录米数） */
  recordCounted(orderId: number, itemId: number, countedQty: string, operator: string, device = 'PC'): EnhanceStocktakeItem {
    const store = loadStore();
    const items = store.items[orderId] ?? [];
    const item = items.find((i) => i.id === itemId);
    if (!item) throw new Error('盘点明细不存在');
    if (item.row_type === 'sn' && item.counted_qty != null) {
      throw new Error(`SN ${item.sn} 已提交过实盘，请勿重复提交`);
    }
    const qty = Number(countedQty);
    if (!(qty >= 0)) throw new Error('实盘数量不能为负');
    if (item.measure_type === 'count' && !Number.isInteger(qty)) throw new Error('计件物资实盘数量必须为整数');
    item.counted_qty = qty.toFixed(4);
    item.counted_at = nowStr();
    item.counted_by = `${operator}(${device})`;
    saveStore(store);
    return item;
  },

  /** 提交盘点：双签齐全才允许；服务层比对生成 diff_qty；counting → pending_review */
  submitCounting(orderId: number, operator: string): { missing_sign: string[] } {
    const store = loadStore();
    const meta = store.meta[orderId];
    if (!meta) throw new Error('盘点单不存在');
    if (meta.status !== 'counting') throw new Error('盘点单不在盘点中状态，无法提交');
    const missing: string[] = [];
    if (!meta.keeper_sign_at) missing.push('代维负责人签字');
    if (!meta.supervisor_sign_at) missing.push('移动主管签字');
    if (missing.length > 0) {
      throw Object.assign(new Error(`双签未齐全（缺：${missing.join('、')}），不能提交审核`), { missing_sign: missing });
    }
    const items = store.items[orderId] ?? [];
    for (const item of items) {
      if (item.counted_qty == null) {
        // 盲盘口径：普件未扫到 → 实盘 0（盘亏）；散料未录 → 与账面一致
        item.counted_qty = item.row_type === 'sn' ? '0.0000' : item.book_qty;
        item.counted_at = item.counted_at ?? nowStr();
      }
      item.diff_qty = (num(item.counted_qty) - num(item.book_qty)).toFixed(4);
    }
    meta.status = 'pending_review';
    meta.submitted_at = nowStr();
    const order = store.orders[orderId];
    if (order) {
      order.status = 'pending_review';
      order.item_total = items.length;
      order.item_counted = items.length;
      order.item_diff = items.filter((i) => num(i.diff_qty) !== 0).length;
      order.total_snapshot_qty = items.reduce((s, i) => s + num(i.book_qty), 0).toFixed(4);
      order.total_counted_qty = items.reduce((s, i) => s + num(i.counted_qty), 0).toFixed(4);
      order.total_diff_qty = items.reduce((s, i) => s + num(i.diff_qty), 0).toFixed(4);
    }
    pushLog(store, 'stocktake.submit', `盘点单 #${orderId} 提交实盘（差异行 ${items.filter((i) => num(i.diff_qty) !== 0).length}）`, operator);
    saveStore(store);
    return { missing_sign: [] };
  },

  /** 差异原因暂存（待审核页） */
  setReason(orderId: number, itemId: number, reason: string): void {
    const store = loadStore();
    const item = (store.items[orderId] ?? []).find((i) => i.id === itemId);
    if (item) {
      item.reason = reason;
      saveStore(store);
    }
  },

  /**
   * 审核通过：差异率>3% 行原因必填；
   * 盘盈 → 其他入库单(SURPLUS_IN)，盘亏 → 其他出库单(DEFICIT_OUT)，调整单号回写盘点单
   */
  reviewOrder(
    orderId: number,
    operator: string,
    notes: string
  ): { adjustment_number: string; surplus_order?: StocktakeAdjustmentOrder; deficit_order?: StocktakeAdjustmentOrder } {
    const store = loadStore();
    const meta = store.meta[orderId];
    if (!meta) throw new Error('盘点单不存在');
    if (meta.status !== 'pending_review') throw new Error('盘点单不在待审核状态');
    const items = store.items[orderId] ?? [];

    // 差异率>3% 的差异行原因必填
    const missing = items.filter(
      (i) => num(i.diff_qty) !== 0 && !i.reason?.trim() && diffRate(i.book_qty, i.diff_qty ?? '0') > DIFF_REASON_RATE_THRESHOLD
    );
    if (missing.length > 0) {
      throw Object.assign(
        new Error(`存在差异率>3%但未填差异原因的行：${missing.map((i) => i.sn || i.batch_no).join('、')}`),
        { missing_reason: missing.map((i) => i.sn || i.batch_no) }
      );
    }

    const orderNumber = store.orders[orderId]?.order_number ?? `#${orderId}`;
    const warehouseId = store.orders[orderId]?.warehouse_id ?? 1;
    const warehouseName = store.orders[orderId]?.warehouse_name ?? '';
    const dateTag = nowStr().replace(/[-: ]/g, '').slice(0, 8);
    const numbers: string[] = [];

    const surplusItems = items.filter((i) => num(i.diff_qty) > 0);
    const deficitItems = items.filter((i) => num(i.diff_qty) < 0);

    let surplusOrder: StocktakeAdjustmentOrder | undefined;
    let deficitOrder: StocktakeAdjustmentOrder | undefined;

    if (surplusItems.length > 0) {
      surplusOrder = {
        id: `mock-sur-${orderId}`,
        order_number: `SUR-${dateTag}-${String(orderId).slice(-3)}`,
        type: 'SURPLUS_IN',
        stocktake_order_id: orderId,
        stocktake_order_number: orderNumber,
        warehouse_id: warehouseId,
        warehouse_name: warehouseName,
        created_at: nowStr(),
        created_by: operator,
        items: surplusItems.map((i) => ({
          sn_or_batch: i.sn || i.batch_no,
          product_name: i.product_name,
          qty: i.diff_qty ?? '0',
          unit: i.unit,
          reason: i.reason,
        })),
      };
      store.adjustments.push(surplusOrder);
      numbers.push(surplusOrder.order_number);
    }
    if (deficitItems.length > 0) {
      deficitOrder = {
        id: `mock-def-${orderId}`,
        order_number: `DEF-${dateTag}-${String(orderId).slice(-3)}`,
        type: 'DEFICIT_OUT',
        stocktake_order_id: orderId,
        stocktake_order_number: orderNumber,
        warehouse_id: warehouseId,
        warehouse_name: warehouseName,
        created_at: nowStr(),
        created_by: operator,
        items: deficitItems.map((i) => ({
          sn_or_batch: i.sn || i.batch_no,
          product_name: i.product_name,
          qty: (i.diff_qty ?? '0').replace('-', ''),
          unit: i.unit,
          reason: i.reason,
        })),
      };
      store.adjustments.push(deficitOrder);
      numbers.push(deficitOrder.order_number);
    }

    meta.status = 'completed';
    meta.reviewed_at = nowStr();
    meta.review_notes = notes;
    meta.adjustment_number = numbers.join(',') || '-';
    const order = store.orders[orderId];
    if (order) order.status = 'completed';
    pushLog(store, 'stocktake.review', `盘点单 #${orderId} 审核通过，生成调整单 ${meta.adjustment_number}`, operator);
    saveStore(store);
    return { adjustment_number: meta.adjustment_number, surplus_order: surplusOrder, deficit_order: deficitOrder };
  },

  /** 审核驳回：pending_review → counting，留驳回备注 */
  rejectOrder(orderId: number, notes: string, operator: string): void {
    const store = loadStore();
    const meta = store.meta[orderId];
    if (!meta) throw new Error('盘点单不存在');
    if (meta.status !== 'pending_review') throw new Error('盘点单不在待审核状态，无法驳回');
    meta.status = 'counting';
    meta.rejected_at = nowStr();
    meta.reject_notes = notes;
    // 驳回回盘点中：清差异原因，保留实盘数据待修正
    for (const item of store.items[orderId] ?? []) {
      item.reason = undefined;
      item.diff_qty = undefined;
    }
    const order = store.orders[orderId];
    if (order) order.status = 'counting';
    pushLog(store, 'stocktake.reject', `盘点单 #${orderId} 审核驳回：${notes}`, operator);
    saveStore(store);
  },

  // ---------- 调整单（入库/出库管理合并展示用） ----------

  getAdjustmentOrdersByType(type: 'SURPLUS_IN' | 'DEFICIT_OUT'): StocktakeAdjustmentOrder[] {
    return loadStore().adjustments.filter((a) => a.type === type);
  },

  getAdjustmentOrder(id: string): StocktakeAdjustmentOrder | undefined {
    return loadStore().adjustments.find((a) => a.id === id);
  },

  // ---------- 对账（B1/B2/B5） ----------

  getReconcileSnapshot(): ReconcileSnapshot | null {
    return loadStore().reconcile_snapshot;
  },

  /** 重新对账：合并后端 R1 结果（不可达时用内置样例），更新快照时间戳 */
  runReconcile(
    operator: string,
    realResult?: { checked: number; diff_count: number; is_balanced: boolean; orphan_sn: number; diffs: ReconcileDiff[] } | null
  ): ReconcileSnapshot {
    const store = loadStore();
    const r1: ReconcileDiff[] =
      realResult?.diffs && realResult.diffs.length > 0
        ? realResult.diffs
        : [
            { product_id: 301, product_name: 'AAU 有源天线', sku: 'CMCC-AAU-64R', warehouse_id: 1, ledger_type: 'sn', inventory_qty: '12.0000', detail_qty: '11.0000', diff: '1.0000' },
            { product_id: 302, product_name: '馈线电缆 1/2"', sku: 'CMCC-WIRE-F12', warehouse_id: 1, ledger_type: 'batch', inventory_qty: '3000.0000', detail_qty: '2960.0000', diff: '40.0000' },
          ];
    const snapshot: ReconcileSnapshot = {
      run_at: nowStr(),
      operator,
      checked: realResult?.checked ?? r1.length,
      diff_count: realResult?.diff_count ?? r1.length,
      is_balanced: realResult ? realResult.is_balanced && store.status_diffs.length === 0 : false,
      orphan_sn: store.orphan_sns.filter((s) => !s.bound_warehouse_id).length,
      r1_diffs: r1,
      status_diffs: store.status_diffs,
    };
    store.reconcile_snapshot = snapshot;
    pushLog(store, 'reconcile.run', `重新对账：差异数 ${snapshot.diff_count}`, operator);
    saveStore(store);
    return snapshot;
  },

  /** R2：无归属 SN 明细（未绑定） */
  getOrphanSns(): OrphanSn[] {
    return loadStore().orphan_sns.filter((s) => !s.bound_warehouse_id);
  },

  /** 批量绑定仓库：写 warehouse_id + 操作日志，返回剩余未绑定数 */
  bindOrphanSns(sns: string[], warehouseId: number, warehouseName: string, operator: string): number {
    const store = loadStore();
    let bound = 0;
    for (const sn of store.orphan_sns) {
      if (sns.includes(sn.sn) && !sn.bound_warehouse_id) {
        sn.bound_warehouse_id = warehouseId;
        sn.bound_warehouse_name = warehouseName;
        sn.bound_at = nowStr();
        bound++;
      }
    }
    if (bound > 0) {
      pushLog(store, 'reconcile.bind', `批量绑定 ${bound} 条无归属SN → ${warehouseName}`, operator);
      saveStore(store);
    }
    return store.orphan_sns.filter((s) => !s.bound_warehouse_id).length;
  },

  /** R3：状态差异行（借出/在站超 30 天未还） */
  getStatusDiffs(): StatusDiffRow[] {
    return loadStore().status_diffs;
  },

  /** 增强层操作日志 */
  getOperationLogs(): EnhanceOperationLog[] {
    return loadStore().operation_logs.slice().reverse();
  },

  /** 导出差异明细 CSV：reconcile_diff_YYYYMMDDHHmm.csv */
  exportReconcileCsv(warehouseLabel: string): string {
    const store = loadStore();
    const snapshot = store.reconcile_snapshot;
    const runAt = snapshot?.run_at ?? nowStr();
    const header = ['快照时间', '规则类型', 'SN或商品', '仓库', '总账', '明细', '差异', '处理状态'];
    const rows: string[][] = [];

    (snapshot?.r1_diffs ?? []).forEach((d) => {
      rows.push([
        runAt,
        'R1 总账vs明细',
        d.product_name,
        warehouseLabel,
        d.inventory_qty,
        d.detail_qty,
        d.diff,
        '待盘点消化',
      ]);
    });
    store.orphan_sns.forEach((s) => {
      rows.push([
        runAt,
        'R2 归属完整性',
        s.sn,
        s.bound_warehouse_name ?? '无归属',
        '-',
        '-',
        s.bound_warehouse_id ? '0' : '1',
        s.bound_warehouse_id ? `已绑定 ${s.bound_warehouse_name}` : '待绑定仓库',
      ]);
    });
    store.status_diffs.forEach((d) => {
      rows.push([
        runAt,
        'R3 状态一致',
        d.sn,
        d.warehouse_name,
        '在库',
        d.issue,
        `超${d.days_over}天`,
        '待核实归还',
      ]);
    });

    const esc = (v: string | number) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = '\ufeff' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    const filename = `reconcile_diff_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}.csv`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return filename;
  },
};

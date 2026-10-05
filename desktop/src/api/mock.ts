/**
 * MonaWMS 桌面客户端 —— Mock 数据层
 *
 * 桌面端 MVP 阶段先用本地数据驱动页面；接入真实后端时，
 * 只需将下面的函数替换为 fetch / Tauri invoke 调用，签名保持不变。
 */

export interface PageResult {
  data: Record<string, any>[];
  total: number;
}

type Pager = { page?: number; pageSize?: number } & Record<string, any>;

function paginate<T>(list: T[], params: Pager): PageResult {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const start = (page - 1) * pageSize;
  return {
    data: (list as Record<string, any>[]).slice(start, start + pageSize),
    total: list.length,
  };
}

const MATERIALS = [
  { code: "GYTA-24", name: "光缆 GYTA-24 24芯", spec: "GYTA-24", unit: "米" },
  { code: "GYTS-48", name: "光缆 GYTS-48 48芯", spec: "GYTS-48", unit: "米" },
  { code: "FBT-1x8", name: "分光器 1:8", spec: "PLC-1x8", unit: "只" },
  { code: "FBT-1x16", name: "分光器 1:16", spec: "PLC-1x16", unit: "只" },
  { code: "SC-LC-3m", name: "光纤跳线 SC-LC 3m", spec: "单模双芯", unit: "条" },
  { code: "SC-SC-5m", name: "光纤跳线 SC-SC 5m", spec: "单模双芯", unit: "条" },
  { code: "FUS-60S", name: "光纤熔接机 60S", spec: "FITEL-60S", unit: "台" },
  { code: "OTDR-3500", name: "OTDR 测试仪", spec: "3500", unit: "台" },
  { code: "ODF-48", name: "ODF 配线架 48芯", spec: "机架式", unit: "个" },
  { code: "ODF-96", name: "ODF 配线架 96芯", spec: "机架式", unit: "个" },
  { code: "SPL-BOX", name: "分纤箱 24芯", spec: "挂墙式", unit: "个" },
  { code: "PIG-250m", name: "皮线光缆 250m", spec: "G.657A2", unit: "卷" },
  { code: "MUX-8E1", name: "光端机 8E1", spec: "PDH-8E1", unit: "台" },
  { code: "SW-8P", name: "交换机 8口千兆", spec: "千兆非网管", unit: "台" },
  { code: "UPS-1K", name: "UPS 电源 1KVA", spec: "在线式", unit: "台" },
] as const;

const WAREHOUSES = ["A-01 主仓", "A-02 备件仓", "B-03 无线仓"];
const LOCATIONS = ["A-01-01-01", "A-02-03-02", "B-03-01-05"];
const STATUS = ["充足", "正常", "待补货", "低库存"] as const;

function seedInventory(): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  MATERIALS.forEach((m, i) => {
    const status = STATUS[i % STATUS.length];
    rows.push({
      id: i + 1,
      materialCode: m.code,
      name: m.name,
      spec: m.spec,
      unit: m.unit,
      quantity: Math.floor(Math.random() * 800) + 10,
      safeStock: 100,
      warehouse: WAREHOUSES[i % WAREHOUSES.length],
      location: LOCATIONS[i % LOCATIONS.length],
      status,
    });
  });
  // 加量到 60 行便于演示分页
  for (let i = MATERIALS.length; i < 60; i++) {
    const m = MATERIALS[i % MATERIALS.length];
    rows.push({
      id: i + 1,
      materialCode: `${m.code}-${Math.floor(i / MATERIALS.length) + 2}`,
      name: m.name,
      spec: m.spec,
      unit: m.unit,
      quantity: Math.floor(Math.random() * 800) + 10,
      safeStock: 100,
      warehouse: WAREHOUSES[i % WAREHOUSES.length],
      location: LOCATIONS[i % LOCATIONS.length],
      status: STATUS[i % STATUS.length],
    });
  }
  return rows;
}

const inventoryRows = seedInventory();

export function fetchInventory(params: Pager): Promise<PageResult> {
  const keyword = String(params.keyword ?? "").trim();
  const status = params.status ? String(params.status) : "";
  let list = inventoryRows;
  if (keyword) {
    list = list.filter(
      (r) =>
        r.materialCode.includes(keyword) ||
        r.name.includes(keyword) ||
        r.spec.includes(keyword),
    );
  }
  if (status) list = list.filter((r) => r.status === status);
  return Promise.resolve(paginate(list, params));
}

/* ---------------- 入库单 ---------------- */

const INBOUND_TYPES = ["采购入库", "调拨入库", "归还入库", "盘盈入库"] as const;
const INBOUND_STATUS = ["草稿", "已确认", "已过账", "已作废"] as const;

function seedInbound(): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  for (let i = 1; i <= 45; i++) {
    const m = MATERIALS[i % MATERIALS.length];
    rows.push({
      id: i,
      orderNo: `IN-20261005-${String(i).padStart(4, "0")}`,
      type: INBOUND_TYPES[i % INBOUND_TYPES.length],
      materialCode: m.code,
      materialName: m.name,
      quantity: Math.floor(Math.random() * 200) + 5,
      unit: m.unit,
      warehouse: WAREHOUSES[i % WAREHOUSES.length],
      operator: i % 3 === 0 ? "operator" : "admin",
      status: INBOUND_STATUS[i % INBOUND_STATUS.length],
      createTime: `2026-10-${String((i % 28) + 1).padStart(2, "0")} 10:2${i % 10}:00`,
    });
  }
  return rows;
}

const inboundRows = seedInbound();

export function fetchInbound(params: Pager): Promise<PageResult> {
  const keyword = String(params.keyword ?? "").trim();
  const status = params.status ? String(params.status) : "";
  let list = inboundRows;
  if (keyword) {
    list = list.filter(
      (r) => r.orderNo.includes(keyword) || r.materialCode.includes(keyword),
    );
  }
  if (status) list = list.filter((r) => r.status === status);
  return Promise.resolve(paginate(list, params));
}

/* ---------------- 出库单 ---------------- */

const OUTBOUND_TYPES = ["领用出库", "调拨出库", "借用出库", "盘亏出库"] as const;
const OUTBOUND_STATUS = ["草稿", "已确认", "已过账", "已作废"] as const;

function seedOutbound(): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  for (let i = 1; i <= 45; i++) {
    const m = MATERIALS[i % MATERIALS.length];
    rows.push({
      id: i,
      orderNo: `OUT-20261005-${String(i).padStart(4, "0")}`,
      type: OUTBOUND_TYPES[i % OUTBOUND_TYPES.length],
      materialCode: m.code,
      materialName: m.name,
      quantity: Math.floor(Math.random() * 80) + 1,
      unit: m.unit,
      recipient: `员工${(i % 8) + 1}`,
      warehouse: WAREHOUSES[i % WAREHOUSES.length],
      status: OUTBOUND_STATUS[i % OUTBOUND_STATUS.length],
      createTime: `2026-10-${String((i % 28) + 1).padStart(2, "0")} 14:3${i % 10}:00`,
    });
  }
  return rows;
}

const outboundRows = seedOutbound();

export function fetchOutbound(params: Pager): Promise<PageResult> {
  const keyword = String(params.keyword ?? "").trim();
  const status = params.status ? String(params.status) : "";
  let list = outboundRows;
  if (keyword) {
    list = list.filter(
      (r) => r.orderNo.includes(keyword) || r.materialCode.includes(keyword),
    );
  }
  if (status) list = list.filter((r) => r.status === status);
  return Promise.resolve(paginate(list, params));
}

/* ---------------- 盘点单 ---------------- */

const STOCKTAKE_STATUS = ["进行中", "待审核", "已审核", "已完成"] as const;

function seedStocktake(): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  for (let i = 1; i <= 30; i++) {
    const m = MATERIALS[i % MATERIALS.length];
    rows.push({
      id: i,
      orderNo: `ST-2026W${String(((i % 4) + 40)).padStart(2, "0")}-${String(i).padStart(3, "0")}`,
      materialCode: m.code,
      materialName: m.name,
      bookQty: Math.floor(Math.random() * 500) + 20,
      realQty: Math.floor(Math.random() * 500) + 20,
      diffQty: 0,
      warehouse: WAREHOUSES[i % WAREHOUSES.length],
      status: STOCKTAKE_STATUS[i % STOCKTAKE_STATUS.length],
      createTime: `2026-10-${String((i % 28) + 1).padStart(2, "0")} 09:0${i % 10}:00`,
    });
    rows[i - 1].diffQty = rows[i - 1].realQty - rows[i - 1].bookQty;
  }
  return rows;
}

const stocktakeRows = seedStocktake();

export function fetchStocktake(params: Pager): Promise<PageResult> {
  const status = params.status ? String(params.status) : "";
  let list = stocktakeRows;
  if (status) list = list.filter((r) => r.status === status);
  return Promise.resolve(paginate(list, params));
}

/* ---------------- 仪表盘 ---------------- */

export function fetchDashboard() {
  return Promise.resolve({
    skuCount: 1284,
    stockAmount: 8624000,
    todayInbound: 126,
    todayOutbound: 98,
    lowStock: 12,
    recentFlows: [
      { id: 1, time: "2026-10-05 09:12", type: "入库", code: "GYTA-24", name: "光缆 GYTA-24 24芯", qty: 500, operator: "admin" },
      { id: 2, time: "2026-10-05 09:30", type: "出库", code: "FBT-1x8", name: "分光器 1:8", qty: 30, operator: "operator" },
      { id: 3, time: "2026-10-05 10:05", type: "入库", code: "SC-LC-3m", name: "光纤跳线 SC-LC 3m", qty: 200, operator: "admin" },
      { id: 4, time: "2026-10-05 10:41", type: "出库", code: "FUS-60S", name: "光纤熔接机 60S", qty: 2, operator: "operator" },
      { id: 5, time: "2026-10-05 11:20", type: "入库", code: "ODF-48", name: "ODF 配线架 48芯", qty: 8, operator: "admin" },
      { id: 6, time: "2026-10-05 13:02", type: "出库", code: "PIG-250m", name: "皮线光缆 250m", qty: 15, operator: "operator" },
    ],
  });
}

/** 生成演示用 Excel 导出文件名（前端导出后续可接后端报表接口） */
export function exportFileName(prefix: string): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${prefix}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.xlsx`;
}

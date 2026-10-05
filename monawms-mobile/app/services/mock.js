/**
 * 离线演示数据 —— 与 prototype/mobile.html 原型完全一致
 * mockState 为可变副本：演示模式下的新建/操作会直接改写它，让原型"活"起来
 */

export const demoStats = {
  totalDevices: { value: 1258, delta: '▲ +5%', dir: 'up' },
  inStock: { value: 856, delta: '92% 占用', dir: 'flat' },
  monthIn: { value: 142, delta: '▲ +12%', dir: 'up' },
  monthOut: { value: 98, delta: '▼ -3%', dir: 'down' },
};

export const demoSparks = {
  total: [30, 42, 38, 50, 45, 60, 55, 68, 62, 75],
  inStock: [60, 55, 62, 58, 64, 60, 66, 63, 68, 65],
  monthIn: [20, 35, 28, 42, 38, 50, 46, 58, 52, 64],
  monthOut: [50, 45, 52, 48, 40, 44, 38, 42, 36, 40],
};

export const demoTrend = {
  inbound: [12, 18, 14, 22, 19, 26, 24, 30, 27, 34, 31, 38, 35, 42],
  outbound: [8, 11, 9, 14, 12, 16, 15, 19, 17, 22, 20, 24, 22, 26],
};

export const demoTodos = [
  { label: '待处理入库', value: '2', sub: 'IN001 · IN004', warn: true, tab: 'inbound' },
  { label: '待处理出库', value: '2', sub: 'OUT001 · OUT004', warn: true, tab: 'outbound' },
  { label: '维护中设备', value: '1', sub: '思科 ASA5506', warn: false, tab: 'devices' },
  { label: 'A区容量', value: '92%', sub: '接近阈值', warn: false, tone: 'cyan', sub2: 'warehouse' },
];

export const demoActivities = [
  { icon: 'add', tone: 'green', title: '新增华为 5G 基站设备', meta: '2 分钟前 · 张三' },
  { icon: 'create', tone: 'cyan', title: '更新中兴光纤设备库存', meta: '15 分钟前 · 李四' },
  { icon: 'delete', tone: 'red', title: '删除报废设备记录', meta: '1 小时前 · 王五' },
];

export const demoMe = { handled: '240', pending: '18', accuracy: '99.2%' };

export const demoInbound = [
  {
    id: 'IN202401001', no: 'IN202401001', date: '2024-01-30 09:30', status: 'pending',
    supplier: '华为技术有限公司', total: 25, done: 0, expected: '2024-01-30', owner: '张三',
    items: [{ name: '华为 5G 基站 AAU5613', qty: 25 }],
  },
  {
    id: 'IN202401002', no: 'IN202401002', date: '2024-01-29 14:20', status: 'processing',
    supplier: '中兴通讯股份', total: 18, done: 12, expected: '2024-01-29', owner: '李四',
    items: [{ name: '中兴光纤传输 C600-8', qty: 18 }],
  },
  {
    id: 'IN202401003', no: 'IN202401003', date: '2024-01-28 11:15', status: 'done',
    supplier: '思科系统公司', total: 32, done: 32, expected: '2024-01-28', owner: '王五', finished: '01-28 16:45',
    items: [{ name: '思科防火墙 ASA5506-X', qty: 32 }],
  },
  {
    id: 'IN202401004', no: 'IN202401004', date: '2024-01-30 16:00', status: 'pending',
    supplier: 'TP-Link 技术', total: 15, done: 0, expected: '2024-01-31', owner: '赵六',
    items: [{ name: 'TP-Link 无线AP EAP245', qty: 15 }],
  },
];

export const demoOutbound = [
  {
    id: 'OUT202401001', no: 'OUT202401001', date: '2024-01-30 10:15', status: 'pending', urgent: false,
    dept: '网络运维部', total: 8, done: 0, applicant: '张三', priority: '普通',
    items: [{ name: '华为路由器 AR2220', qty: 8 }],
  },
  {
    id: 'OUT202401002', no: 'OUT202401002', date: '2024-01-29 15:30', status: 'processing', urgent: false,
    dept: '技术支持部', total: 12, done: 7, applicant: '李四', priority: '普通',
    items: [{ name: '中兴交换机 ZXR10', qty: 12 }],
  },
  {
    id: 'OUT202401003', no: 'OUT202401003', date: '2024-01-28 09:45', status: 'done', urgent: false,
    dept: '项目实施部', total: 15, done: 15, applicant: '王五', priority: '普通', finished: '01-28 14:20',
    items: [{ name: '华为 5G 基站 AAU', qty: 15 }],
  },
  {
    id: 'OUT202401004', no: 'OUT202401004', date: '2024-01-30 16:20', status: 'pending', urgent: true,
    dept: '客户服务部', total: 6, done: 0, applicant: '赵六', priority: '紧急',
    items: [{ name: 'TP-Link 无线AP', qty: 6 }],
  },
];

export const demoDevices = [
  {
    id: 'D1', name: '华为路由器 AR2220', model: 'AR2220-S', sn: 'HW2220001', loc: 'A区-01-05',
    status: 'avail', statusText: '可用', extra: '入库日期 · 2024-01-15', img: 'https://picsum.photos/seed/huawei-router-network/120/120',
    hero: 'https://picsum.photos/seed/huawei-router-network/600/300',
  },
  {
    id: 'D2', name: '中兴交换机 ZXR10', model: 'ZXR10-5960', sn: 'ZTE5960002', loc: 'B区-02-10',
    status: 'inuse', statusText: '使用中', extra: '使用部门 · 网络部', img: 'https://picsum.photos/seed/zte-switch-server/120/120',
    hero: 'https://picsum.photos/seed/zte-switch-server/600/300',
  },
  {
    id: 'D3', name: '思科防火墙 ASA5506', model: 'ASA5506-X', sn: 'CISCO5506003', loc: '维修区-01',
    status: 'maint', statusText: '维护中', extra: '维护原因 · 端口故障', img: 'https://picsum.photos/seed/cisco-firewall-security/120/120',
    hero: 'https://picsum.photos/seed/cisco-firewall-security/600/300',
  },
  {
    id: 'D4', name: 'TP-Link 无线AP', model: 'EAP245', sn: 'TPLINK245004', loc: 'C区-03-15',
    status: 'avail', statusText: '可用', extra: '入库日期 · 2024-01-25', img: 'https://picsum.photos/seed/tplink-wireless-ap/120/120',
    hero: 'https://picsum.photos/seed/tplink-wireless-ap/600/300',
  },
  {
    id: 'D5', name: '华为 5G 基站 AAU', model: 'AAU5613', sn: 'HW5613005', loc: 'A区-02-08',
    status: 'avail', statusText: '可用', extra: '入库日期 · 2024-01-29', img: 'https://picsum.photos/seed/huawei-5g-basestation/120/120',
    hero: 'https://picsum.photos/seed/huawei-5g-basestation/600/300',
  },
  {
    id: 'D6', name: '中兴光纤传输 OLT', model: 'C600-8', sn: 'ZTEC600006', loc: '传输部',
    status: 'inuse', statusText: '使用中', extra: '出库日期 · 2024-01-22', img: 'https://picsum.photos/seed/fiber-optic-olt/120/120',
    hero: 'https://picsum.photos/seed/fiber-optic-olt/600/300',
  },
];

export const demoLogs = [
  { time: '01-30 16:22', type: '新增', tone: 'lt-add', content: '新增华为 5G 基站设备入库登记', user: '张三 · 设备登记', result: '成功', resultTone: 'log-ok', cat: 'success' },
  { time: '01-30 16:07', type: '更新', tone: 'lt-update', content: '更新中兴光纤设备库存数量 128→134', user: '李四 · 库存管理', result: '成功', resultTone: 'log-ok', cat: 'success' },
  { time: '01-30 15:41', type: '删除', tone: 'lt-delete', content: '删除报废设备记录 SCRAP-0892', user: '王五 · 报废管理', result: '成功', resultTone: 'log-ok', cat: 'success' },
  { time: '01-30 14:55', type: '警告', tone: 'lt-warn', content: 'A区-01-05 库位容量超过 90% 阈值', user: '系统 · 仓库管理', result: '提醒', resultTone: 'log-warn', cat: 'warn' },
  { time: '01-30 13:30', type: '出库', tone: 'lt-out', content: '出库单 OUT202401002 进度更新 7/12', user: '李四 · 出库管理', result: '成功', resultTone: 'log-ok', cat: 'info' },
  { time: '01-29 17:48', type: '错误', tone: 'lt-delete', content: '序列号 ZTE5960099 扫码校验失败', user: '赵六 · 设备登记', result: '失败', resultTone: 'log-fail', cat: 'error' },
];

export const demoZones = [
  { name: 'A区 · 核心网络', pct: 92, used: 184, cap: 200, devices: 412, fill: '' },
  { name: 'B区 · 传输接入', pct: 78, used: 156, cap: 200, devices: 356, fill: 'prog-fill-done' },
  { name: 'C区 · 无线终端', pct: 64, used: 128, cap: 200, devices: 218, fill: 'prog-fill-violet' },
  { name: '维修区', pct: 30, used: 24, cap: 80, devices: 32, fill: 'prog-fill-red' },
];

export const demoScrap = [
  {
    id: 'S1', no: 'SCRAP-0901', date: '2024-01-30 14:00', status: 'pending', statusText: '待审批',
    metas: [
      { k: '设备', v: '老旧交换机 ×6' }, { k: '原因', v: '超出年限' },
      { k: '申请人', v: '王五' }, { k: '残值', v: '¥1,200' },
    ],
  },
  {
    id: 'S2', no: 'SCRAP-0898', date: '2024-01-28 10:20', status: 'done', statusText: '已处置',
    metas: [
      { k: '设备', v: '故障光模块 ×14' }, { k: '原因', v: '无法修复' },
      { k: '处置方式', v: '环保回收' }, { k: '处置日期', v: '2024-01-29' },
    ],
  },
];

export const demoReportBars = [
  { label: '9月', in: 55, out: 40 },
  { label: '10月', in: 70, out: 52 },
  { label: '11月', in: 48, out: 60 },
  { label: '12月', in: 82, out: 66 },
  { label: '1月', in: 95, out: 72 },
];

export const demoSuppliers = [
  { name: '华为技术', pct: 38, fill: '' },
  { name: '中兴通讯', pct: 27, fill: 'prog-fill-done' },
  { name: '思科系统', pct: 18, fill: 'prog-fill-violet' },
  { name: 'TP-Link', pct: 11, fill: 'prog-fill-amber' },
];

export const demoOptions = {
  suppliers: ['华为技术有限公司', '中兴通讯股份', '思科系统公司', 'TP-Link技术', '其他'],
  operators: ['张三', '李四', '王五', '赵六'],
  departments: ['网络运维部', '技术支持部', '项目实施部', '客户服务部', '其他'],
  priorities: ['普通', '紧急', '非常紧急'],
  deviceTypes: ['路由器', '交换机', '防火墙', '无线AP', '服务器', '其他'],
  warehouses: ['A区 · 核心网络', 'B区 · 传输接入', 'C区 · 无线终端', '维修区'],
};

/* 盘点演示数据：必须声明在 mockState 之前（mockState 初始化引用 demoStocktakes，
 * 而 ST1 的 items 由 demoDevices 生成——禁止回引 mockState，否则 TDZ 循环引用崩溃） */
function stkItemsFromDevices() {
  return demoDevices.slice(0, 6).map((d, i) => ({
    id: 'sti-' + (i + 1),
    name: d.name,
    sn: d.sn,
    snapshot: '1',
    counted: null,
    diff: null,
    status: 'pending',
    loc: d.loc,
  }));
}

export const demoStocktakes = [
  {
    id: 'ST1', no: 'ST2026-0102', date: '2026-01-30 09:00', status: 'draft',
    warehouse: 'A区 · 核心网络', type: 'full', creator: '张三',
    items: stkItemsFromDevices(),
  },
  {
    id: 'ST2', no: 'ST2026-0101', date: '2026-01-29 14:20', status: 'counting',
    warehouse: 'B区 · 传输接入', type: 'partial', creator: '李四',
    items: [
      { id: 'sti-11', name: '中兴交换机 ZXR10', sn: 'ZTE5960002', snapshot: '1', counted: '1', diff: '0', status: 'counted', loc: 'B区-02-10' },
      { id: 'sti-12', name: '中兴光纤传输 OLT', sn: 'ZTEC600006', snapshot: '1', counted: null, diff: null, status: 'pending', loc: '传输部' },
      { id: 'sti-13', name: '华为路由器 AR2220', sn: 'HW2220001', snapshot: '1', counted: null, diff: null, status: 'pending', loc: 'A区-01-05' },
    ],
  },
  {
    id: 'ST3', no: 'ST2026-0098', date: '2026-01-27 10:00', status: 'pending_review',
    warehouse: 'C区 · 无线终端', type: 'full', creator: '王五',
    items: [
      { id: 'sti-21', name: 'TP-Link 无线AP', sn: 'TPLINK245004', snapshot: '1', counted: '1', diff: '0', status: 'counted', loc: 'C区-03-15' },
      { id: 'sti-22', name: '华为 5G 基站 AAU', sn: 'HW5613005', snapshot: '1', counted: '0', diff: '-1', status: 'counted', loc: 'A区-02-08' },
    ],
  },
  {
    id: 'ST4', no: 'ST2026-0090', date: '2026-01-20 16:30', status: 'completed',
    warehouse: '维修区', type: 'full', creator: '赵六',
    items: [
      { id: 'sti-31', name: '思科防火墙 ASA5506', sn: 'CISCO5506003', snapshot: '1', counted: '1', diff: '0', status: 'counted', loc: '维修区-01' },
    ],
  },
];

/**
 * 可变演示库：demo 模式下所有增改都发生在这里
 */
export const mockState = {
  inbound: JSON.parse(JSON.stringify(demoInbound)),
  outbound: JSON.parse(JSON.stringify(demoOutbound)),
  devices: JSON.parse(JSON.stringify(demoDevices)),
  logs: JSON.parse(JSON.stringify(demoLogs)),
  scrap: JSON.parse(JSON.stringify(demoScrap)),
  stocktakes: JSON.parse(JSON.stringify(demoStocktakes)),
  seq: 100,
};

export function resetMockState() {
  mockState.inbound = JSON.parse(JSON.stringify(demoInbound));
  mockState.outbound = JSON.parse(JSON.stringify(demoOutbound));
  mockState.devices = JSON.parse(JSON.stringify(demoDevices));
  mockState.logs = JSON.parse(JSON.stringify(demoLogs));
  mockState.scrap = JSON.parse(JSON.stringify(demoScrap));
  mockState.stocktakes = JSON.parse(JSON.stringify(demoStocktakes));
  mockState.seq = 100;
}

function nextNo(prefix) {
  mockState.seq += 1;
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${prefix}${ymd}${String(mockState.seq).padStart(3, '0')}`;
}

function nowStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function mockCreateInbound({ supplier, expected, qty, owner, notes }) {
  const order = {
    id: 'demo-in-' + Date.now(),
    no: nextNo('IN'),
    date: nowStr(),
    status: 'pending',
    supplier: supplier || '—',
    total: Number(qty) || 0,
    done: 0,
    expected: expected || nowStr().slice(0, 10),
    owner: owner || '—',
    notes: notes || '',
    items: [{ name: supplier + ' 设备', qty: Number(qty) || 0 }],
  };
  mockState.inbound.unshift(order);
  mockLog('新增', 'lt-add', `创建入库单 ${order.no}（${order.supplier} ×${order.total}）`, '当前用户 · 入库管理', '成功', 'log-ok', 'success');
  return order;
}

export function mockCreateOutbound({ dept, applicant, qty, priority, expected, notes }) {
  const order = {
    id: 'demo-out-' + Date.now(),
    no: nextNo('OUT'),
    date: nowStr(),
    status: 'pending',
    urgent: priority === '紧急' || priority === '非常紧急',
    dept: dept || '—',
    total: Number(qty) || 0,
    done: 0,
    applicant: applicant || '—',
    priority: priority || '普通',
    expected: expected || nowStr().slice(0, 10),
    notes: notes || '',
    items: [{ name: dept + ' 领用设备', qty: Number(qty) || 0 }],
  };
  mockState.outbound.unshift(order);
  mockLog('出库', 'lt-out', `创建出库单 ${order.no}（${order.dept} ×${order.total}）`, '当前用户 · 出库管理', '成功', 'log-ok', 'success');
  return order;
}

export function mockCreateDevice({ name, model, sn, type, supplier, loc }) {
  const dev = {
    id: 'demo-dev-' + Date.now(),
    name: name || '新设备',
    model: model || '—',
    sn: sn || 'SN' + Date.now(),
    loc: loc || '待上架',
    status: 'avail',
    statusText: '可用',
    extra: (type ? '类型 · ' + type : '') + (supplier ? ' · ' + supplier : ''),
    img: '',
    hero: '',
  };
  mockState.devices.unshift(dev);
  mockLog('新增', 'lt-add', `新增设备 ${dev.name}（SN ${dev.sn}）`, '当前用户 · 设备登记', '成功', 'log-ok', 'success');
  return dev;
}

export function mockAdvanceInbound(id) {
  const o = mockState.inbound.find((x) => x.id === id);
  if (!o) return null;
  if (o.status === 'pending') {
    o.status = 'processing';
    mockLog('更新', 'lt-update', `入库单 ${o.no} 开始收货`, '当前用户 · 入库管理', '成功', 'log-ok', 'success');
  } else if (o.status === 'processing') {
    o.done = o.total;
    o.status = 'done';
    o.finished = nowStr().slice(5, 16);
    mockLog('更新', 'lt-update', `入库单 ${o.no} 收货完成 ${o.done}/${o.total}`, '当前用户 · 入库管理', '成功', 'log-ok', 'success');
  }
  return o;
}

export function mockAdvanceOutbound(id) {
  const o = mockState.outbound.find((x) => x.id === id);
  if (!o) return null;
  if (o.status === 'pending') {
    o.status = 'processing';
    mockLog('出库', 'lt-out', `出库单 ${o.no} 开始拣货`, '当前用户 · 出库管理', '成功', 'log-ok', 'success');
  } else if (o.status === 'processing') {
    o.done = o.total;
    o.status = 'done';
    o.finished = nowStr().slice(5, 16);
    mockLog('出库', 'lt-out', `出库单 ${o.no} 发放完成 ${o.done}/${o.total}`, '当前用户 · 出库管理', '成功', 'log-ok', 'success');
  }
  return o;
}

export function mockApproveScrap(id) {
  const s = mockState.scrap.find((x) => x.id === id);
  if (!s) return null;
  s.status = 'done';
  s.statusText = '已处置';
  mockLog('更新', 'lt-update', `报废申请 ${s.no} 审批通过`, '当前用户 · 报废管理', '成功', 'log-ok', 'success');
  return s;
}

export function mockLog(type, tone, content, user, result, resultTone, cat) {
  mockState.logs.unshift({ time: nowStr().slice(5, 16), type, tone, content, user, result, resultTone, cat });
  if (mockState.logs.length > 50) mockState.logs.pop();
}

/* ================= 盘点（P10）演示数据与状态机 ================= */

export const STK_STATUS_TEXT = {
  draft: '草稿',
  counting: '盘点中',
  pending_review: '待审核',
  completed: '已完成',
  cancelled: '已取消',
};

export function mockStkSummary(st) {
  const total = st.items.length;
  const counted = st.items.filter((i) => i.status === 'counted').length;
  const diffs = st.items.filter((i) => i.status === 'counted' && Number(i.diff) !== 0).length;
  return { total_rows: total, counted_rows: counted, diff_rows: diffs, pending_rows: total - counted };
}

export function mockStartStocktake(id) {
  const st = mockState.stocktakes.find((s) => s.id === id);
  if (!st) throw new Error('盘点单不存在');
  if (st.status !== 'draft') throw new Error('只有草稿状态的盘点单才能开始盘点');
  st.status = 'counting';
  mockLog('更新', 'lt-update', `盘点单 ${st.no} 开始盘点（仓库冻结）`, '当前用户 · 盘点管理', '成功', 'log-ok', 'success');
  return st;
}

export function mockScanStocktake(id, sn) {
  const st = mockState.stocktakes.find((s) => s.id === id);
  if (!st) throw new Error('盘点单不存在');
  if (st.status !== 'counting') throw new Error('盘点单不在盘点中状态，无法扫码');
  const item = st.items.find((i) => i.sn === sn);
  if (!item) throw new Error('SN ' + sn + ' 不在本盘点单范围内');
  if (item.status === 'counted') return { message: '重复扫描：' + sn + ' 已盘过' };
  item.counted = '1';
  item.diff = '0';
  item.status = 'counted';
  mockLog('更新', 'lt-update', `盘点单 ${st.no} 扫盘 SN ${sn}`, '当前用户 · 盘点管理', '成功', 'log-ok', 'success');
  return { message: '已盘：' + item.name };
}

export function mockRecordStocktake(id, itemId, qty) {
  const st = mockState.stocktakes.find((s) => s.id === id);
  if (!st) throw new Error('盘点单不存在');
  if (st.status !== 'counting') throw new Error('盘点单不在盘点中状态，无法录盘');
  const item = st.items.find((i) => i.id === itemId);
  if (!item) throw new Error('明细不存在');
  item.counted = String(qty);
  item.diff = String(Number(qty) - Number(item.snapshot));
  item.status = 'counted';
  mockLog('更新', 'lt-update', `盘点单 ${st.no} 录盘 ${item.name} ×${qty}`, '当前用户 · 盘点管理', '成功', 'log-ok', 'success');
  return item;
}

export function mockSubmitStocktake(id) {
  const st = mockState.stocktakes.find((s) => s.id === id);
  if (!st) throw new Error('盘点单不存在');
  if (st.status !== 'counting') throw new Error('盘点单不在盘点中状态，无法提交');
  st.status = 'pending_review';
  mockLog('更新', 'lt-update', `盘点单 ${st.no} 提交盘点结果`, '当前用户 · 盘点管理', '成功', 'log-ok', 'success');
  return st;
}

export function mockReviewStocktake(id) {
  const st = mockState.stocktakes.find((s) => s.id === id);
  if (!st) throw new Error('盘点单不存在');
  if (st.status !== 'pending_review') throw new Error('盘点单不在待审核状态');
  st.status = 'completed';
  mockLog('更新', 'lt-update', `盘点单 ${st.no} 差异审核过账`, '当前用户 · 盘点管理', '成功', 'log-ok', 'success');
  return { adjustment_number: 'ADJ' + String(Date.now()).slice(-6) };
}

export function mockCreateStocktake(warehouse) {
  const st = {
    id: 'ST-demo-' + Date.now(),
    no: 'ST' + String(Date.now()).slice(-6),
    date: new Date().toISOString().slice(0, 16).replace('T', ' '),
    status: 'draft',
    warehouse: warehouse || 'A区 · 核心网络',
    type: 'full',
    creator: '当前用户',
    items: stkItemsFromDevices(),
  };
  mockState.stocktakes.unshift(st);
  mockLog('新增', 'lt-add', `创建盘点单 ${st.no}（账面快照）`, '当前用户 · 盘点管理', '成功', 'log-ok', 'success');
  return st;
}

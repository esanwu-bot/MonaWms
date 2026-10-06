/**
 * API 数据访问层
 * —— 真实模式：请求 backend_tp6 REST API（/api/...），并归一化为 UI 形状
 * —— 演示模式：读取 mock.js（原型 mobile.html 内置数据），支持本地增改
 *
 * 后端响应格式：{ code, message, data, timestamp }；分页 data: { list, pagination }
 */
import { store, bindMockReset } from './store';
import { get, post } from './http';
import * as mock from './mock';
import { mdhm, ymd, fmtDateTime, timeAgo, qty } from '../utils/format';

bindMockReset(mock.resetMockState);

/* ================= 归一化工具 ================= */

const IN_STATUS_MAP = {
  pending: { key: 'pending', text: '待处理' },
  receiving: { key: 'processing', text: '处理中' },
  completed: { key: 'done', text: '已完成' },
  cancelled: { key: 'cancelled', text: '已取消' },
};

const OUT_STATUS_MAP = {
  pending: { key: 'pending', text: '待处理' },
  picking: { key: 'processing', text: '拣货中' },
  packed: { key: 'processing', text: '已打包' },
  shipped: { key: 'processing', text: '已发货' },
  delivered: { key: 'done', text: '已送达' },
  completed: { key: 'done', text: '已完成' },
  cancelled: { key: 'cancelled', text: '已取消' },
};

const DEV_STATUS_MAP = {
  in_stock: { key: 'avail', text: '可用', cls: 'dev-st-avail' },
  in_use: { key: 'inuse', text: '使用中', cls: 'dev-st-inuse' },
  sold: { key: 'inuse', text: '已出库', cls: 'dev-st-inuse' },
  repairing: { key: 'maint', text: '维护中', cls: 'dev-st-maint' },
  to_scrap: { key: 'maint', text: '待报废', cls: 'dev-st-scrap' },
  lost: { key: 'maint', text: '盘亏遗失', cls: 'dev-st-scrap' },
};

const num = (v, d = 0) => {
  const n = Number(v);
  return isFinite(n) ? n : d;
};

function pct(done, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

function inboundToUI(o) {
  if (o.__demo) return o; // 演示数据已构造好
  const st = IN_STATUS_MAP[o.status] || { key: 'cancelled', text: o.status_text || o.status };
  const stat = o.statistics || {};
  const total = num(stat.total_quantity);
  const done = num(stat.received_quantity);
  return {
    id: o.id,
    no: o.order_number || '—',
    date: fmtDateTime(o.created_at),
    status: st.key,
    statusText: st.text,
    metas: [
      { k: '供应商', v: o.supplier_name || '—' },
      { k: '设备数量', v: qty(total) + ' 台' },
      o.status === 'completed'
        ? { k: '完成时间', v: mdhm(o.updated_at || o.created_at) }
        : { k: '预计到货', v: ymd(o.expected_date) },
      { k: '负责人', v: o.operator_name || '—' },
    ],
    progress: { done, total, pct: pct(done, total) },
    raw: o,
  };
}

function outboundToUI(o) {
  if (o.__demo) return o;
  const st = OUT_STATUS_MAP[o.status] || { key: 'cancelled', text: o.status_text || o.status };
  const stat = o.statistics || {};
  const total = num(stat.total_quantity);
  const done = num(stat.picked_quantity);
  const urgent = o.priority === 'urgent';
  return {
    id: o.id,
    no: o.order_number || '—',
    date: fmtDateTime(o.created_at),
    status: st.key,
    statusText: st.text,
    urgent,
    metas: [
      { k: '申请部门', v: o.customer_name || o.receiver_unit || '—' },
      { k: '设备数量', v: qty(total) + ' 台' },
      { k: '申请人', v: o.receiver_name || o.creator_name || '—' },
      urgent
        ? { k: '紧急程度', v: '紧急', red: true }
        : { k: '紧急程度', v: { low: '低', normal: '普通', high: '较高', urgent: '紧急' }[o.priority] || '普通' },
    ],
    progress: { done, total, pct: pct(done, total) },
    raw: o,
  };
}

function deviceToUI(d) {
  if (d.__demo) return d;
  const st = DEV_STATUS_MAP[d.status] || { key: 'maint', text: d.status_text || d.status, cls: 'dev-st-scrap' };
  return {
    id: d.id,
    name: d.product_name || '未知设备',
    model: d.product_model || d.product_sku || '—',
    sn: d.serial_number || '—',
    loc: d.location || '—',
    status: st.key,
    statusText: st.text,
    statusCls: st.cls,
    extra: '登记时间 · ' + ymd(d.created_at),
    img: (d.product && (d.product.image_url || d.product.image)) || '',
    hero: (d.product && (d.product.image_url || d.product.image)) || '',
    raw: d,
  };
}

/* 演示数据 → UI 形状 */
function demoInboundToUI(o) {
  const stMap = { pending: ['pending', '待处理'], processing: ['processing', '处理中'], done: ['done', '已完成'] };
  const st = stMap[o.status] || ['done', '已完成'];
  return {
    id: o.id, no: o.no, date: o.date, status: st[0], statusText: st[1],
    metas: [
      { k: '供应商', v: o.supplier },
      { k: '设备数量', v: o.total + ' 台' },
      o.status === 'done' ? { k: '完成时间', v: o.finished || '—' } : { k: '预计到货', v: o.expected },
      { k: '负责人', v: o.owner },
    ],
    progress: { done: o.done, total: o.total, pct: pct(o.done, o.total) },
    demoItems: o.items,
    __demo: true, _raw: o,
  };
}

function demoOutboundToUI(o) {
  const stMap = { pending: ['pending', '待处理'], processing: ['processing', '处理中'], done: ['done', '已完成'] };
  const st = stMap[o.status] || ['done', '已完成'];
  return {
    id: o.id, no: o.no, date: o.date, status: st[0], statusText: st[1], urgent: !!o.urgent,
    metas: [
      { k: '申请部门', v: o.dept },
      { k: '设备数量', v: o.total + ' 台' },
      { k: '申请人', v: o.applicant },
      { k: '紧急程度', v: o.priority || '普通', red: !!o.urgent },
    ],
    progress: { done: o.done, total: o.total, pct: pct(o.done, o.total) },
    demoItems: o.items,
    __demo: true, _raw: o,
  };
}

function demoDeviceToUI(d) {
  const clsMap = { avail: 'dev-st-avail', inuse: 'dev-st-inuse', maint: 'dev-st-maint' };
  return { ...d, statusCls: clsMap[d.status] || 'dev-st-scrap', __demo: true, _raw: d };
}

/* ================= 对外 API ================= */

export const api = {
  /* ---- 认证 ---- */
  async login(username, password) {
    const data = await post('/auth/login', { username, password });
    return { token: data.token, refreshToken: data.refreshToken, user: data.user };
  },

  /* ---- 首页聚合 ---- */
  async dashboard() {
    if (store.demoMode) return demoDashboard();

    const [dash, snAll, snStock, maintSn, recent] = await Promise.all([
      get('/reports/dashboard').catch(() => null),
      get('/serial-numbers', { page: 1, limit: 1 }).catch(() => null),
      get('/serial-numbers', { page: 1, limit: 1, status: 'in_stock' }).catch(() => null),
      get('/serial-numbers', { page: 1, limit: 1, status: 'repairing' }).catch(() => null),
      get('/inventory-transactions/recent', { limit: 5 }).catch(() => null),
    ]);

    const stats = (dash && dash.stats) || {};
    const trends = (dash && dash.monthly_trends) || [];
    const last = trends.length ? trends[trends.length - 1] : { inbound: 0, outbound: 0 };
    const prev = trends.length > 1 ? trends[trends.length - 2] : last;

    const totalDevices = snAll && snAll.pagination ? num(snAll.pagination.total) : num(stats.total_products);
    const inStock = snStock && snStock.pagination ? num(snStock.pagination.total) : num(stats.total_inventory);
    const maintCount = maintSn && maintSn.pagination ? num(maintSn.pagination.total) : 0;

    const delta = (cur, pre) => {
      if (!pre) return { text: '—', dir: 'flat' };
      const p = Math.round(((cur - pre) / pre) * 100);
      return p >= 0 ? { text: `▲ +${p}%`, dir: 'up' } : { text: `▼ ${p}%`, dir: 'down' };
    };

    const sparkFrom = (arr) => (arr.length >= 2 ? arr.slice(-10).map((x) => num(x.inbound)) : mock.demoSparks.total);
    const sparkOut = (arr) => (arr.length >= 2 ? arr.slice(-10).map((x) => num(x.outbound)) : mock.demoSparks.monthOut);

    // 近14天趋势：dashboard 给的是月度，退化为最近 N 个月的趋势
    const trendLabels = trends.map((t) => String(t.month || '').slice(2));

    const acts = (recent && (recent.list || recent)) || [];
    const activities = (Array.isArray(acts) ? acts : []).slice(0, 4).map((t) => ({
      icon: t.transaction_type === 'outbound' ? 'north' : t.transaction_type === 'inbound' ? 'south' : 'swap_vert',
      tone: t.transaction_type === 'outbound' ? 'amber' : t.transaction_type === 'inbound' ? 'green' : 'cyan',
      title: `${t.transaction_type_text || t.transaction_type || '库存变动'}${t.product_name ? ' · ' + t.product_name : ''} ×${qty(t.quantity)}`,
      meta: timeAgo(t.created_at) + (t.operator_name ? ' · ' + t.operator_name : ''),
    }));

    return {
      stats: [
        { key: 'total', label: '总设备数', unit: '台', icon: 'desktop_windows', color: 'cyan', accent: 'accent-cyan',
          value: totalDevices, delta: delta(last.inbound + last.outbound, prev.inbound + prev.outbound), spark: sparkFrom(trends) },
        { key: 'stock', label: '在库设备', unit: '台', icon: 'home_work', color: 'green', accent: 'accent-green',
          value: inStock, delta: { text: totalDevices ? Math.round((inStock / totalDevices) * 100) + '% 占比' : '—', dir: 'flat' }, spark: mock.demoSparks.inStock },
        { key: 'in', label: '本月入库', unit: '台', icon: 'south', color: 'violet', accent: 'accent-violet',
          value: num(last.inbound), delta: delta(last.inbound, prev.inbound), spark: sparkFrom(trends) },
        { key: 'out', label: '本月出库', unit: '台', icon: 'north', color: 'amber', accent: 'accent-amber',
          value: num(last.outbound), delta: delta(last.outbound, prev.outbound), spark: sparkOut(trends) },
      ],
      trend: {
        labels: trendLabels,
        inbound: trends.map((t) => num(t.inbound)),
        outbound: trends.map((t) => num(t.outbound)),
      },
      todos: [
        { label: '待处理入库', value: String(num(stats.pending_inbound)), sub: '点击查看', warn: num(stats.pending_inbound) > 0, tab: 'inbound' },
        { label: '待处理出库', value: String(num(stats.pending_outbound)), sub: '点击查看', warn: num(stats.pending_outbound) > 0, tab: 'outbound' },
        { label: '维护中设备', value: String(maintCount), sub: '点击查看', warn: false, tab: 'devices' },
        { label: '低库存预警', value: String(num(stats.low_stock_count)), sub: '库存报表', warn: num(stats.low_stock_count) > 0, tone: 'cyan', sub2: 'reports' },
      ],
      activities: activities.length ? activities : mock.demoActivities,
      badges: { inbound: num(stats.pending_inbound), outbound: num(stats.pending_outbound) },
    };
  },

  /* ---- 入库 ---- */
  async listInbound() {
    if (store.demoMode) {
      const items = mock.mockState.inbound.map(demoInboundToUI);
      return { items, counts: countBy(items) };
    }
    const data = await get('/inbound-orders', { page: 1, limit: 50 });
    const items = ((data && data.list) || []).map(inboundToUI);
    return { items, counts: countBy(items) };
  },

  async inboundAction(order, kind) {
    // kind: start | continue | complete
    if (order.__demo) {
      mock.mockAdvanceInbound(order.id);
      return;
    }
    if (order.status === 'pending' || kind === 'start') {
      await post(`/inbound-orders/${order.id}/start-receiving`, {});
    } else if (kind === 'complete') {
      await post(`/inbound-orders/${order.id}/complete`, {});
    } else {
      await post(`/inbound-orders/${order.id}/start-receiving`, {}).catch(() => {});
    }
  },

  async createInbound(payload) {
    if (store.demoMode) {
      mock.mockCreateInbound(payload);
      return { no: 'demo' };
    }
    return post('/inbound-orders', payload);
  },

  /* ---- 出库 ---- */
  async listOutbound() {
    if (store.demoMode) {
      const items = mock.mockState.outbound.map(demoOutboundToUI);
      return { items, counts: countBy(items) };
    }
    const data = await get('/outbound-orders', { page: 1, limit: 50 });
    const items = ((data && data.list) || []).map(outboundToUI);
    return { items, counts: countBy(items) };
  },

  async outboundAction(order, kind) {
    if (order.__demo) {
      mock.mockAdvanceOutbound(order.id);
      return;
    }
    if (order.status === 'pending' || kind === 'start') {
      await post(`/outbound-orders/${order.id}/start-picking`, {});
    } else if (kind === 'deliver') {
      await post(`/outbound-orders/${order.id}/deliver`, {});
    } else {
      await post(`/outbound-orders/${order.id}/start-picking`, {}).catch(() => {});
    }
  },

  async createOutbound(payload) {
    if (store.demoMode) {
      mock.mockCreateOutbound(payload);
      return { no: 'demo' };
    }
    return post('/outbound-orders', payload);
  },

  /* ---- 设备（序列号台账） ---- */
  async listDevices() {
    if (store.demoMode) {
      const items = mock.mockState.devices.map(demoDeviceToUI);
      return { items, counts: countDev(items) };
    }
    const data = await get('/serial-numbers', { page: 1, limit: 100 });
    const items = ((data && data.list) || []).map(deviceToUI);
    return { items, counts: countDev(items) };
  },

  async createDevice(payload) {
    if (store.demoMode) {
      mock.mockCreateDevice(payload);
      return { sn: payload.serial_number };
    }
    return post('/serial-numbers/register-device', payload);
  },

  /* ---- 仓库分区 ---- */
  async listZones() {
    if (store.demoMode) return mock.demoZones.map((z) => ({ ...z }));
    const data = await get('/warehouses', { page: 1, limit: 50 }).catch(() => null);
    const list = (data && (data.list || data)) || [];
    if (!Array.isArray(list) || !list.length) return mock.demoZones.map((z) => ({ ...z }));
    const fills = ['', 'prog-fill-done', 'prog-fill-violet', 'prog-fill-amber', 'prog-fill-red'];
    return list.map((w, i) => {
      const cap = num(w.capacity || w.location_capacity || 0);
      const used = num(w.used_capacity || w.location_count || w.used || 0);
      const p = cap ? Math.round((used / cap) * 100) : num(w.utilization || 0);
      return {
        name: (w.name || w.warehouse_name || '仓库') + (w.code ? ' · ' + w.code : ''),
        pct: p,
        used: used || p,
        cap: cap || 100,
        devices: num(w.inventory_count ?? w.device_count ?? w.total_quantity ?? 0),
        fill: fills[i % fills.length],
      };
    });
  },

  /* ---- 操作日志 ---- */
  async listLogs() {
    if (store.demoMode) return mock.mockState.logs.map((l) => ({ ...l }));
    const data = await get('/logs', { page: 1, limit: 50 }).catch(() => null);
    const list = (data && (data.list || data)) || [];
    if (!Array.isArray(list) || !list.length) return mock.demoLogs.map((l) => ({ ...l }));
    return list.map((l) => {
      const action = String(l.action || '');
      let type = '操作', tone = 'lt-update', cat = 'info';
      if (/create|add|新增|store/i.test(action)) { type = '新增'; tone = 'lt-add'; cat = 'success'; }
      else if (/delete|remove|删除/i.test(action)) { type = '删除'; tone = 'lt-delete'; cat = 'success'; }
      else if (/update|edit|更新/i.test(action)) { type = '更新'; tone = 'lt-update'; cat = 'success'; }
      else if (/warn|警告/i.test(action)) { type = '警告'; tone = 'lt-warn'; cat = 'warn'; }
      else if (/error|fail|失败/i.test(action)) { type = '错误'; tone = 'lt-delete'; cat = 'error'; }
      const failed = l.status === 'failed' || l.result === 'failed';
      return {
        time: mdhm(l.created_at),
        type,
        tone,
        content: l.description || l.detail || `${action} ${l.target_type || ''}${l.target_id ? ' #' + l.target_id : ''}`,
        user: (l.operator_name || l.operator || '系统') + (l.target_type ? ' · ' + l.target_type : ''),
        result: failed ? '失败' : '成功',
        resultTone: failed ? 'log-fail' : 'log-ok',
        cat,
      };
    });
  },

  /* ---- 报废 ---- */
  async listScrap() {
    if (store.demoMode) return mock.mockState.scrap.map((s) => ({ ...s }));
    const data = await get('/scrap', { page: 1, limit: 50 }).catch(() => null);
    const list = (data && (data.list || data)) || [];
    if (!Array.isArray(list) || !list.length) return mock.demoScrap.map((s) => ({ ...s }));
    return list.map((s) => {
      const done = s.status === 'completed' || s.status === 'approved';
      return {
        id: s.id,
        no: s.application_number || s.scrap_number || 'SCRAP-' + s.id,
        date: fmtDateTime(s.created_at),
        status: done ? 'done' : s.status === 'rejected' ? 'cancelled' : 'pending',
        statusText: done ? '已处置' : s.status === 'rejected' ? '已拒绝' : s.status === 'approved' ? '已审核' : '待审批',
        metas: [
          { k: '设备', v: (s.device && (s.device.product_name || s.device.name)) || s.device_name || '—' },
          { k: '原因', v: s.reason_type_text || s.reason || '—' },
          { k: '申请人', v: (s.applicant && s.applicant.username) || s.applicant_name || '—' },
          { k: '残值', v: s.residual_value != null ? '¥' + num(s.residual_value).toLocaleString() : '—' },
        ],
        raw: s,
      };
    });
  },

  async approveScrap(item) {
    if (!item || item.__demo || store.demoMode) {
      if (item) mock.mockApproveScrap(item.id);
      return;
    }
    await post(`/scrap/${item.id}/approve`, { status: 'approved', remark: '移动端审批通过' });
  },

  /* ---- 报表 ---- */
  async reports() {
    if (store.demoMode) {
      return { bars: mock.demoReportBars.map((b) => ({ ...b })), suppliers: mock.demoSuppliers.map((s) => ({ ...s })) };
    }
    const dash = await get('/reports/dashboard').catch(() => null);
    const trends = (dash && dash.monthly_trends) || [];
    let bars = mock.demoReportBars.map((b) => ({ ...b }));
    if (trends.length >= 2) {
      const last5 = trends.slice(-5);
      const max = Math.max(1, ...last5.flatMap((t) => [num(t.inbound), num(t.outbound)]));
      bars = last5.map((t) => ({
        label: String(t.month || '').replace(/^\d{4}-0?/, '').replace(/^(\d+)$/, '$1月'),
        in: Math.round((num(t.inbound) / max) * 100),
        out: Math.round((num(t.outbound) / max) * 100),
      }));
    }
    return { bars, suppliers: mock.demoSuppliers.map((s) => ({ ...s })) };
  },

  /* ---- 下拉选项（表单用） ---- */
  async options() {
    if (store.demoMode) {
      return {
        warehouses: mock.demoOptions.warehouses.map((n, i) => ({ id: i + 1, name: n })),
        suppliers: mock.demoOptions.suppliers.map((n, i) => ({ id: i + 1, name: n })),
        users: mock.demoOptions.operators.map((n, i) => ({ id: i + 1, name: n })),
        products: mock.demoDevices.map((d, i) => ({ id: i + 1, name: d.name, model: d.model })),
      };
    }
    const pick = (data, nameKey = 'name') => {
      const list = (data && (data.list || data)) || [];
      return (Array.isArray(list) ? list : []).map((x) => ({
        id: x.id ?? x.value,
        name: x[nameKey] || x.label || x.username || x.warehouse_name || String(x.id ?? ''),
        extra: x.model_number || x.sku || '',
      }));
    };
    const [wh, sup, users, products] = await Promise.all([
      get('/warehouses/options').catch(() => null),
      get('/suppliers/options').catch(() => null),
      get('/users/options').catch(() => null),
      get('/products/options').catch(() => null),
    ]);
    return {
      warehouses: pick(wh),
      suppliers: pick(sup),
      users: pick(users, 'username'),
      products: pick(products),
    };
  },

  /* ---- 个人中心 ---- */
  me() {
    if (store.demoMode) return { ...mock.demoMe };
    return { handled: '—', pending: '—', accuracy: '—' };
  },

  /* ---- 扫码查询：码串 → 台账 ---- */
  async queryByBarcode(code) {
    if (store.demoMode) {
      const dev = mock.mockState.devices.find((d) => d.sn === code);
      if (dev) return { type: 'serial_number', device: demoDeviceToUI(dev), code };
      return { type: 'none', code };
    }
    const data = await get('/serial-numbers/query-by-barcode', { barcode: code });
    if (!data) return { type: 'none', code };
    if (data.type === 'serial_number') {
      return {
        type: 'serial_number',
        code,
        device: deviceToUI({
          ...(data.info || {}),
          product_name: (data.product && data.product.name) || data.info?.product_name,
          product_model: (data.product && data.product.model_number) || data.info?.product_model,
          status_text: data.status_text,
        }),
      };
    }
    return { type: data.type || 'product', code, raw: data };
  },

  /* ---- 盘点（P10） ---- */
  async listStocktakes() {
    if (store.demoMode) {
      const items = mock.mockState.stocktakes.map(demoStkToUI);
      return { items, counts: countStk(items) };
    }
    const data = await get('/stocktakes', { page: 1, limit: 50 });
    const items = ((data && data.list) || []).map((o) => {
      const total = num(o.total_rows ?? (o.summary && o.summary.total_rows));
      const counted = num(o.counted_rows ?? (o.summary && o.summary.counted_rows));
      return {
        id: o.id,
        no: o.order_number || 'ST-' + o.id,
        date: fmtDateTime(o.created_at),
        status: o.status,
        statusText: o.status_text || mock.STK_STATUS_TEXT[o.status] || o.status,
        metas: [
          { k: '仓库', v: o.warehouse_name || (o.warehouse && o.warehouse.name) || '—' },
          { k: '类型', v: { full: '全盘', partial: '抽盘', dynamic: '动碰盘点' }[o.type] || o.type || '—' },
          { k: '进度', v: counted + '/' + total },
          { k: '创建人', v: o.creator_name || o.keeper_name || '—' },
        ],
        summary: { counted, total },
        primaryText: { draft: '开始盘点', counting: '进入盘点', pending_review: '查看差异', completed: '查看结果', cancelled: '查看' }[o.status] || '查看',
        raw: o,
      };
    });
    return { items, counts: countStk(items) };
  },

  async stocktakeDetail(id) {
    if (store.demoMode) {
      const st = mock.mockState.stocktakes.find((s) => s.id === id);
      if (!st) throw new Error('盘点单不存在');
      return { order: demoStkToUI(st), items: st.items.map((i) => ({ ...i })), summary: mock.mockStkSummary(st) };
    }
    const [order, itemsData] = await Promise.all([
      get('/stocktakes/' + id),
      get('/stocktakes/' + id + '/items', { page: 1, limit: 200 }),
    ]);
    const o = order || {};
    return {
      order: {
        id: o.id,
        no: o.order_number || 'ST-' + o.id,
        date: fmtDateTime(o.created_at),
        status: o.status,
        statusText: o.status_text || mock.STK_STATUS_TEXT[o.status] || o.status,
        warehouse: o.warehouse_name || (o.warehouse && o.warehouse.name) || '—',
        type: { full: '全盘', partial: '抽盘', dynamic: '动碰盘点' }[o.type] || o.type || '—',
        creator: o.creator_name || '—',
        notes: o.notes || '',
      },
      items: ((itemsData && itemsData.list) || []).map((it) => ({
        id: it.id,
        name: it.product_name || (it.product && it.product.name) || '物料 #' + (it.product_id || ''),
        sn: it.serial_number || (it.serial && it.serial.serial_number) || '',
        snapshot: it.snapshot_qty != null ? String(it.snapshot_qty) : '—',
        counted: it.counted_qty != null ? String(it.counted_qty) : null,
        diff: it.diff_qty != null ? String(it.diff_qty) : null,
        status: it.status,
        loc: it.location_name || (it.location && it.location.code) || '',
      })),
      summary: (itemsData && itemsData.summary) || {},
    };
  },

  async stocktakeStart(id) {
    if (store.demoMode) return mock.mockStartStocktake(id);
    return post('/stocktakes/' + id + '/start', {});
  },

  async stocktakeScan(id, sn) {
    if (store.demoMode) return mock.mockScanStocktake(id, sn);
    return post('/stocktakes/' + id + '/scan', { sn });
  },

  async stocktakeRecord(id, itemId, qty, reason = '') {
    if (store.demoMode) return mock.mockRecordStocktake(id, itemId, qty);
    return post('/stocktakes/' + id + '/record', { item_id: itemId, counted_qty: String(qty), reason });
  },

  async stocktakeSubmit(id) {
    if (store.demoMode) return mock.mockSubmitStocktake(id);
    return post('/stocktakes/' + id + '/submit', {});
  },

  async stocktakeReview(id, notes = '移动端差异审核') {
    if (store.demoMode) return mock.mockReviewStocktake(id);
    return post('/stocktakes/' + id + '/review', { notes });
  },

  async createStocktake(warehouseId, warehouseName) {
    if (store.demoMode) return mock.mockCreateStocktake(warehouseName);
    return post('/stocktakes', { warehouse_id: warehouseId, type: 'full', scope_type: 'all' });
  },
};

/* ================= 内部工具 ================= */

function countBy(items) {
  const c = { all: items.length, pending: 0, processing: 0, done: 0 };
  items.forEach((it) => {
    if (it.status === 'pending') c.pending++;
    else if (it.status === 'processing') c.processing++;
    else if (it.status === 'done') c.done++;
  });
  return c;
}

function countDev(items) {
  const c = { all: items.length, avail: 0, inuse: 0, maint: 0 };
  items.forEach((it) => {
    if (it.status === 'avail') c.avail++;
    else if (it.status === 'inuse') c.inuse++;
    else if (it.status === 'maint') c.maint++;
  });
  return c;
}

function demoStkToUI(st) {
  const sum = mock.mockStkSummary(st);
  return {
    id: st.id,
    no: st.no,
    date: st.date,
    status: st.status,
    statusText: mock.STK_STATUS_TEXT[st.status] || st.status,
    metas: [
      { k: '仓库', v: st.warehouse },
      { k: '类型', v: { full: '全盘', partial: '抽盘', dynamic: '动碰盘点' }[st.type] || st.type },
      { k: '进度', v: sum.counted_rows + '/' + sum.total_rows },
      { k: '创建人', v: st.creator },
    ],
    summary: { counted: sum.counted_rows, total: sum.total_rows },
    primaryText: { draft: '开始盘点', counting: '进入盘点', pending_review: '查看差异', completed: '查看结果', cancelled: '查看' }[st.status] || '查看',
    __demo: true,
    _raw: st,
  };
}

function countStk(items) {
  const c = { all: items.length, draft: 0, counting: 0, pending_review: 0, completed: 0 };
  items.forEach((it) => {
    if (c[it.status] !== undefined) c[it.status]++;
  });
  return c;
}

function demoDashboard() {
  const d = mock.demoStats;
  // 待办/角标跟随演示库实时状态（新建单据后首页同步变化）
  const pendIn = mock.mockState.inbound.filter((o) => o.status === 'pending');
  const pendOut = mock.mockState.outbound.filter((o) => o.status === 'pending');
  const maint = mock.mockState.devices.filter((x) => x.status === 'maint');
  const joinNos = (arr) => arr.slice(0, 2).map((o) => o.no.slice(-3)).join(' · ') || '—';
  return {
    stats: [
      { key: 'total', label: '总设备数', unit: '台', icon: 'desktop_windows', color: 'cyan', accent: 'accent-cyan',
        value: d.totalDevices.value, delta: { text: d.totalDevices.delta, dir: d.totalDevices.dir }, spark: mock.demoSparks.total },
      { key: 'stock', label: '在库设备', unit: '台', icon: 'home_work', color: 'green', accent: 'accent-green',
        value: d.inStock.value, delta: { text: d.inStock.delta, dir: d.inStock.dir }, spark: mock.demoSparks.inStock },
      { key: 'in', label: '本月入库', unit: '台', icon: 'south', color: 'violet', accent: 'accent-violet',
        value: d.monthIn.value, delta: { text: d.monthIn.delta, dir: d.monthIn.dir }, spark: mock.demoSparks.monthIn },
      { key: 'out', label: '本月出库', unit: '台', icon: 'north', color: 'amber', accent: 'accent-amber',
        value: d.monthOut.value, delta: { text: d.monthOut.delta, dir: d.monthOut.dir }, spark: mock.demoSparks.monthOut },
    ],
    trend: {
      labels: last14Labels(),
      inbound: mock.demoTrend.inbound.slice(),
      outbound: mock.demoTrend.outbound.slice(),
    },
    todos: [
      { label: '待处理入库', value: String(pendIn.length), sub: joinNos(pendIn), warn: pendIn.length > 0, tab: 'inbound' },
      { label: '待处理出库', value: String(pendOut.length), sub: joinNos(pendOut), warn: pendOut.length > 0, tab: 'outbound' },
      { label: '维护中设备', value: String(maint.length), sub: maint.length ? maint[0].name : '—', warn: false, tab: 'devices' },
      { label: 'A区容量', value: '92%', sub: '接近阈值', warn: false, tone: 'cyan', sub2: 'warehouse' },
    ],
    activities: mock.demoActivities.map((a) => ({ ...a })),
    badges: { inbound: pendIn.length, outbound: pendOut.length },
  };
}

function last14Labels() {
  const arr = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    arr.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }
  return arr;
}

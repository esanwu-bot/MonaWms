import { api } from './api';

// 盘点单状态
export type StocktakeStatus =
  | 'draft'
  | 'counting'
  | 'pending_review'
  | 'completed'
  | 'cancelled';

// 盘点类型
export type StocktakeType = 'full' | 'partial' | 'dynamic';

// 盘点范围类型
export type StocktakeScopeType = 'all' | 'category' | 'location';

// 盘点单行类型（由后端 formatItem 返回）
export type StocktakeRowType = 'sn' | 'piece_remainder' | 'batch';

// 盘点单摘要
export interface StocktakeSummary {
  total_rows: number;
  counted_rows: number;
  diff_rows: number;
  pending_rows: number;
  snapshot_qty: string;
  counted_qty: string;
  diff_qty: string;
}

// 盘点单
export interface StocktakeOrder {
  id: number;
  order_number: string;
  warehouse_id: number;
  warehouse_name?: string;
  type: StocktakeType;
  scope_type: StocktakeScopeType;
  scope_value: string;
  status: StocktakeStatus;
  status_text: string;
  keeper_id?: number;
  keeper_name?: string;
  reviewer_id?: number;
  reviewer_name?: string;
  snapshot_at?: string;
  submitted_at?: string;
  reviewed_at?: string;
  review_notes?: string;
  adjustment_number?: string;
  total_snapshot_qty: string;
  total_counted_qty: string;
  total_diff_qty: string;
  item_total: number;
  item_counted: number;
  item_diff: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  summary?: StocktakeSummary;
}

// 盘点明细行
export interface StocktakeItem {
  id: number;
  stocktake_order_id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  unit: string;
  measure_type: string;
  location_id?: number;
  location_code?: string;
  warehouse_id: number;
  is_piece: number;
  serial_number: string;
  batch_no: string;
  snapshot_qty: string;
  counted_qty?: string | null;
  diff_qty: string;
  reason?: string;
  status: 'pending' | 'counted';
  is_surplus: number;
  counted_by?: number;
  counted_at?: string;
  row_type: StocktakeRowType;
}

// 列表查询参数
export interface StocktakeListParams {
  page?: number;
  limit?: number;
  order_number?: string;
  warehouse_id?: number | string;
  status?: StocktakeStatus | '';
  type?: StocktakeType | '';
}

// 创建盘点单请求
export interface CreateStocktakeRequest {
  warehouse_id: number;
  type?: StocktakeType;
  scope_type?: StocktakeScopeType;
  scope_value?: string;
  keeper_id?: number;
  notes?: string;
}

// 扫码结果
export interface ScanSnResult {
  result: 'matched' | 'duplicate' | 'surplus' | string;
  message: string;
  item?: StocktakeItem;
  need_product?: boolean;
}

// 差异审核结果
export interface ReviewStocktakeResult {
  adjustment_number: string;
  adjusted_groups: number;
  sn_lost: number;
  sn_gain: number;
  batch_touched: number;
}

// 对账差异
export interface ReconcileDiff {
  product_id: number;
  product_name: string;
  sku: string;
  warehouse_id: number;
  ledger_type: 'sn' | 'batch';
  inventory_qty: string;
  detail_qty: string;
  diff: string;
}

// 对账结果
export interface ReconcileResult {
  checked: number;
  diff_count: number;
  is_balanced: boolean;
  orphan_sn: number;
  diffs: ReconcileDiff[];
}

const STATUS_TEXTS: Record<StocktakeStatus, string> = {
  draft: '草稿',
  counting: '盘点中',
  pending_review: '待审核',
  completed: '已完成',
  cancelled: '已取消',
};

export function getStocktakeStatusText(status: string): string {
  return STATUS_TEXTS[status as StocktakeStatus] ?? status;
}

// 辅助：将对象序列化为 FormData（后端 $request->post() 可解析 multipart/form-data）
function toFormData(data: Record<string, any>): FormData {
  const form = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    form.append(key, String(value));
  });
  return form;
}

// 盘点服务
export const stocktakeService = {
  // 获取盘点单列表
  getStocktakes: (params: StocktakeListParams = {}) => {
    return api.get<{ list: StocktakeOrder[]; pagination: { total: number; page: number; limit: number } }>(
      '/stocktakes',
      { params }
    );
  },

  // 获取盘点单详情
  getStocktake: (id: number | string) => {
    return api.get<StocktakeOrder>(`/stocktakes/${id}`);
  },

  // 获取盘点明细
  getItems: (
    id: number | string,
    params: {
      page?: number;
      limit?: number;
      keyword?: string;
      status?: 'pending' | 'counted' | '';
      diff_only?: number | boolean;
    } = {}
  ) => {
    return api.get<{
      list: StocktakeItem[];
      total: number;
      page: number;
      limit: number;
      summary: StocktakeSummary;
    }>(`/stocktakes/${id}/items`, { params });
  },

  // 创建盘点单（生成快照）
  createStocktake: (data: CreateStocktakeRequest) => {
    return api.postForm<StocktakeOrder>('/stocktakes', toFormData(data));
  },

  // 开始盘点
  startStocktake: (id: number | string) => {
    return api.postForm<StocktakeOrder>(`/stocktakes/${id}/start`, new FormData());
  },

  // 扫码盘点（普件）
  scanSn: (
    id: number | string,
    sn: string,
    productId?: number | string,
    locationId?: number | string
  ) => {
    const form = new FormData();
    form.append('sn', sn);
    if (productId !== undefined && productId !== null && productId !== '') {
      form.append('product_id', String(productId));
    }
    if (locationId !== undefined && locationId !== null && locationId !== '') {
      form.append('location_id', String(locationId));
    }
    return api.postForm<ScanSnResult>(`/stocktakes/${id}/scan`, form);
  },

  // 录入实盘数量（散料/余数行）
  recordCounted: (
    id: number | string,
    itemId: number | string,
    countedQty: string | number,
    reason?: string
  ) => {
    const form = new FormData();
    form.append('item_id', String(itemId));
    form.append('counted_qty', String(countedQty));
    if (reason) {
      form.append('reason', reason);
    }
    return api.postForm<StocktakeItem>(`/stocktakes/${id}/record`, form);
  },

  // 提交盘点结果
  submitStocktake: (id: number | string) => {
    return api.postForm<StocktakeOrder>(`/stocktakes/${id}/submit`, new FormData());
  },

  // 差异审核过账
  reviewStocktake: (
    id: number | string,
    notes?: string,
    reasons: Record<number | string, string> = {}
  ) => {
    const form = new FormData();
    if (notes) {
      form.append('notes', notes);
    }
    Object.entries(reasons).forEach(([itemId, reason]) => {
      if (reason) {
        form.append(`reasons[${itemId}]`, reason);
      }
    });
    return api.postForm<ReviewStocktakeResult>(`/stocktakes/${id}/review`, form);
  },

  // 取消盘点
  cancelStocktake: (id: number | string, reason?: string) => {
    const form = new FormData();
    if (reason) {
      form.append('reason', reason);
    }
    return api.postForm<StocktakeOrder>(`/stocktakes/${id}/cancel`, form);
  },

  // 库存对账
  reconcile: (warehouseId?: number | string) => {
    const params: Record<string, string> = {};
    if (warehouseId !== undefined && warehouseId !== null && warehouseId !== '') {
      params.warehouse_id = String(warehouseId);
    }
    return api.get<ReconcileResult>('/inventory/reconcile', { params });
  },
};

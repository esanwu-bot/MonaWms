import { api } from './api';

export interface BOM {
  id: number;
  bom_code: string;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  version: string;
  description: string;
  status: string;
  status_text: string;
  created_at: string;
  updated_at: string;
  items?: BOMItem[];
}

export interface BOMItem {
  id: number;
  bom_header_id: number;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  product_unit?: string;
  quantity: number;
  unit: string;
  notes: string;
}

export interface CreateBOMRequest {
  bom_code: string;
  product_id: number;
  version: string;
  description: string;
  status: string;
  items: {
    product_id: number;
    quantity: number;
    unit: string;
    notes: string;
  }[];
}

export interface UpdateBOMRequest extends Partial<CreateBOMRequest> {}

export interface BOMListParams {
  page?: number;
  limit?: number;
  bom_code?: string;
  product_id?: number;
  status?: string;
}

export interface BOMListResponse {
  list: BOM[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

// 获取BOM列表
export const getBOMs = async (params: BOMListParams = {}): Promise<BOMListResponse> => {
  const response = await api.get('/bom', { params });
  return response.data.data;
};

// 获取BOM详情
export const getBOM = async (id: number): Promise<BOM> => {
  const response = await api.get(`/bom/${id}`);
  return response.data.data;
};

// 创建BOM
export const createBOM = async (data: CreateBOMRequest): Promise<BOM> => {
  const response = await api.post('/bom', data);
  return response.data.data;
};

// 更新BOM
export const updateBOM = async (id: number, data: UpdateBOMRequest): Promise<BOM> => {
  const response = await api.put(`/bom/${id}`, data);
  return response.data.data;
};

// 删除BOM
export const deleteBOM = async (id: number): Promise<void> => {
  await api.delete(`/bom/${id}`);
};

// 复制BOM
export const copyBOM = async (id: number, data: { bom_code: string; version: string }): Promise<BOM> => {
  const response = await api.post(`/bom/${id}/copy`, data);
  return response.data.data;
};

// 展开BOM
export const explodeBOM = async (id: number, quantity: number): Promise<{
  bom_id: number;
  bom_code: string;
  product_name: string;
  production_quantity: number;
  items: {
    product_id: number;
    product_name: string;
    product_sku: string;
    unit_quantity: number;
    total_quantity: number;
    unit: string;
    notes: string;
  }[];
}> => {
  const response = await api.get(`/bom/${id}/explode`, { params: { quantity } });
  return response.data.data;
};
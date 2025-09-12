import { api } from './api';

export interface Project {
  id: number;
  project_code: string;
  project_name: string;
  description: string;
  manager: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  status: string;
  status_text: string;
  budget: number;
  start_date: string;
  end_date: string;
  reservation_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectInventory {
  product_id: number;
  product_name: string;
  product_sku: string;
  product_unit: string;
  reserved_quantity: number;
  notes: string;
  reserved_at: string;
}

export interface CreateProjectRequest {
  project_code: string;
  project_name: string;
  description: string;
  manager: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  status: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {}

export interface ProjectListParams {
  page?: number;
  limit?: number;
  project_code?: string;
  project_name?: string;
  status?: string;
  manager?: string;
}

export interface ProjectListResponse {
  data: Project[];
  total: number;
  page: number;
  limit: number;
}

export interface ReserveInventoryRequest {
  project_id: number;
  product_id: number;
  quantity: number;
  notes?: string;
}

export interface CancelReservationRequest {
  project_id: number;
  product_id: number;
}

// 获取项目列表
export const getProjects = async (params: ProjectListParams = {}): Promise<ProjectListResponse> => {
  const response = await api.get('/projects', { params });
  return response.data.data;
};

// 获取项目详情
export const getProject = async (id: number): Promise<Project> => {
  const response = await api.get(`/projects/${id}`);
  return response.data.data;
};

// 创建项目
export const createProject = async (data: CreateProjectRequest): Promise<Project> => {
  const response = await api.post('/projects', data);
  return response.data.data;
};

// 更新项目
export const updateProject = async (id: number, data: UpdateProjectRequest): Promise<Project> => {
  const response = await api.put(`/projects/${id}`, data);
  return response.data.data;
};

// 删除项目
export const deleteProject = async (id: number): Promise<void> => {
  await api.delete(`/projects/${id}`);
};

// 获取项目库存
export const getProjectInventory = async (id: number): Promise<{
  project_id: number;
  project_code: string;
  project_name: string;
  inventory: ProjectInventory[];
}> => {
  const response = await api.get(`/projects/${id}/inventory`);
  return response.data.data;
};

// 库存预留
export const reserveInventory = async (data: ReserveInventoryRequest): Promise<{
  project_id: number;
  product_id: number;
  quantity: number;
  available_quantity: number;
  reserved_quantity: number;
}> => {
  const response = await api.post('/projects/reserve-inventory', data);
  return response.data.data;
};

// 取消预留
export const cancelReservation = async (data: CancelReservationRequest): Promise<{
  project_id: number;
  product_id: number;
  released_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
}> => {
  const response = await api.post('/projects/cancel-reservation', data);
  return response.data.data;
};
import { api } from './api';

// 报废申请接口类型定义
export interface ScrapApplication {
  id: string;
  scrapNumber: string;
  deviceInfo: {
    id: number;
    name: string;
    serialNumber: string;
    model: string;
    category?: string;
  };
  reason: string;
  reasonType: 'damage' | 'obsolete' | 'expired' | 'other';
  description: string;
  images?: string[];
  estimatedLoss: number;
  actualLoss?: number;
  applicant: {
    id: number;
    name: string;
  };
  approver?: {
    id: number;
    name: string;
  };
  processor?: {
    id: number;
    name: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  statusText: string;
  createdAt: string;
  approvedAt?: string;
  processedAt?: string;
  approvalNotes?: string;
  processingNotes?: string;
}

export interface CreateScrapRequest {
  deviceId: number;
  reasonType: 'damage' | 'obsolete' | 'expired' | 'other';
  description: string;
  estimatedLoss: number;
  images?: File[];
}

export interface ScrapListParams {
  page?: number;
  limit?: number;
  keyword?: string;
  status?: string;
  reasonType?: string;
  dateRange?: [string, string];
}

export interface ScrapStatistics {
  pending: number;
  approved: number;
  completed: number;
  rejected: number;
  totalEstimatedLoss: number;
  totalActualLoss: number;
  reasonBreakdown: Array<{
    reasonType: string;
    count: number;
    totalLoss: number;
  }>;
}

export interface AvailableDevice {
  value: number;
  label: string;
  name: string;
  serialNumber: string;
  model: string;
  category: string;
}

export interface ApproveScrapRequest {
  action: 'approve' | 'reject';
  notes?: string;
}

export interface ProcessScrapRequest {
  actualLoss: number;
  notes?: string;
}

// 报废管理服务
export const scrapService = {
  // 获取报废申请列表
  getScrapApplications: (params: ScrapListParams = {}) => {
    return api.get('/scrap', { params });
  },

  // 获取报废申请详情
  getScrapApplication: (id: string) => {
    return api.get(`/scrap/${id}`);
  },

  // 创建报废申请（支持多图上传）
  createScrapApplication: (data: CreateScrapRequest) => {
    const formData = new FormData();
    formData.append('device_id', String(data.deviceId));
    formData.append('reason_type', data.reasonType);
    formData.append('description', data.description);
    formData.append('estimated_loss', String(data.estimatedLoss));

    if (data.images && data.images.length > 0) {
      data.images.forEach((file) => {
        formData.append('images', file);
      });
    }

    return api.postForm('/scrap', formData);
  },

  // 审核报废申请
  approveScrapApplication: (id: string, data: ApproveScrapRequest) => {
    return api.post(`/scrap/${id}/approve`, data);
  },

  // 处理报废申请
  processScrapApplication: (id: string, data: ProcessScrapRequest) => {
    return api.post(`/scrap/${id}/process`, data);
  },

  // 获取报废统计数据
  getScrapStatistics: (dateRange?: [string, string]) => {
    const params = dateRange ? { date_range: dateRange } : {};
    return api.get('/scrap/statistics', { params });
  },

  // 获取可报废的设备列表
  getAvailableDevices: (keyword?: string) => {
    const params = keyword ? { keyword } : {};
    return api.get('/scrap/available-devices', { params });
  },
};
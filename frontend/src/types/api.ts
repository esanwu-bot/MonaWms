// API响应基础类型
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  details?: any;
  timestamp: string;
}

// 查询参数类型
export interface QueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 用户相关类型
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// 仓库相关类型
export interface Warehouse {
  id: string;
  code: string;
  name: string;
  description?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseRequest {
  code: string;
  name: string;
  description?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
}

export interface UpdateWarehouseRequest extends Partial<CreateWarehouseRequest> {}

// 分类相关类型
export interface Category {
  id: string;
  code: string;
  name: string;
  description?: string;
  parentId?: string;
  level: number;
  path: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  children?: Category[];
  parent?: Category;
}

export interface CreateCategoryRequest {
  code: string;
  name: string;
  description?: string;
  parentId?: string;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {}

// 产品相关类型
export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  deviceType?: string;       // 设备类型(如：基站、路由器、光模块)
  modelNumber?: string;      // 具体型号(如：HUAWEI MA5683T)
  frequencyProtocol?: string; // 频段/协议(如：5G 700MHz, WiFi 6)
  firmwareVersion?: string;  // 固件版本
  categoryId: string;
  category?: Category;
  unit: string;
  unitPrice: number;
  minStock: number;
  maxStock: number;
  barcode?: string;
  projectId?: string;        // 所属项目ID
  project?: Project;         // 所属项目
  specifications?: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  sku: string;
  name: string;
  description?: string;
  deviceType?: string;
  modelNumber?: string;
  frequencyProtocol?: string;
  firmwareVersion?: string;
  categoryId: string;
  unit: string;
  unitPrice: number;
  minStock: number;
  maxStock: number;
  barcode?: string;
  projectId?: string;
  specifications?: Record<string, any>;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

// 库存相关类型
export interface Inventory {
  id: string;
  productId: string;
  product?: Product;
  warehouseId: string;
  warehouse?: Warehouse;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  location?: string;
  batchNumber?: string;
  expiryDate?: string;
  lastUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
}

// 入库单相关类型
export interface InboundOrder {
  id: string;
  orderNumber: string;
  warehouseId: string;
  warehouse?: Warehouse;
  supplierId?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  totalQuantity: number;
  totalAmount: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items: InboundOrderItem[];
}

export interface InboundOrderItem {
  id: string;
  inboundOrderId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  batchNumber?: string;
  expiryDate?: string;
  location?: string;
  receivedQuantity: number;
  status: 'PENDING' | 'PARTIAL' | 'COMPLETED';
}

// 项目相关类型
export interface Project {
  id: string;
  projectCode: string;
  name: string;
  description?: string;
  customerId?: string;
  customer?: any;
  managerId?: string;
  manager?: User;
  location?: string;
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled';
  budget?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  projectCode: string;
  name: string;
  description?: string;
  customerId?: string;
  managerId?: string;
  location?: string;
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled';
  budget?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {}

// 出库单相关类型
export interface OutboundOrder {
  id: string;
  orderNumber: string;
  warehouseId: string;
  warehouse?: Warehouse;
  customerId?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  totalQuantity: number;
  totalAmount: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items: OutboundOrderItem[];
}

export interface OutboundOrderItem {
  id: string;
  outboundOrderId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  batchNumber?: string;
  location?: string;
  pickedQuantity: number;
  status: 'PENDING' | 'PARTIAL' | 'COMPLETED';
}

// 仪表板统计类型
export interface DashboardStats {
  stats: {
    total_warehouses: number;
    total_products: number;
    total_inventory: number;
    low_stock_count: number;
    pending_inbound: number;
    pending_outbound: number;
  };
  daily_orders: {
    inbound_orders: number;
    outbound_orders: number;
    completed_inbound: number;
    completed_outbound: number;
  };
  monthly_trends: Array<{
    month: string;
    inbound: number;
    outbound: number;
  }>;
  low_stock_products: any[];
  popular_products: any[];
  warehouse_utilization: any[];
  recent_transactions: any[];
}
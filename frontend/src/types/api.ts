// API响应基础类型
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  pagination: Pagination;
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
  created_at: string;
  updated_at: string;
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
  id: number;
  code: string;
  name: string;
  description?: string;
  address?: string;
  manager_id?: number | null;
  manager_name?: string;
  manager?: {
    id: number;
    username: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
    updated_at: string;
  };
  status: 'active' | 'inactive';
  status_text: string;
  contact_person?: string;
  contact_phone?: string;
  created_at: string;
  updated_at?: string;
  // P7 仓库授权角色（仅前端从授权列表转换而来）
  grant_role?: GrantRole;
  statistics?: {
    zones_count: number;
    products_count: number;
    inventory_count: number;
    inbound_orders_count: number;
    outbound_orders_count: number;
  };
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

// 供应商相关类型
export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  isActive: boolean;
  status_text: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierRequest {
  code: string;
  name: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
}

export interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> {}

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
  status_text: '启用' | '禁用';
  created_at: string;
  updated_at: string;
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
  device_type?: string;       // 设备类型(如：基站、路由器、光模块)
  model_number?: string;      // 具体型号(如：HUAWEI MA5683T)
  frequency_protocol?: string; // 频段/协议(如：5G 700MHz, WiFi 6)
  firmware_version?: string;  // 固件版本
  category_id: string;
  category?: Category;
  unit: string;
  price: number;              // API返回的是price字段
  unitPrice?: number;         // 保持兼容性
  min_stock: number;
  max_stock: number;
  barcode?: string;
  project_id?: string;        // 所属项目ID
  project?: Project;         // 所属项目
  specifications?: Record<string, any>;
  status: 'active' | 'inactive';  // API返回的状态字段
  status_text?: string;       // API返回的状态文本
  category_name?: string;     // API返回的分类名称
  total_stock?: number;       // API返回的总库存
  available_stock?: number;   // API返回的可用库存
  stock_status?: string;      // API返回的库存状态
  stock_status_text?: string; // API返回的库存状态文本
  weight?: number;
  volume?: number;
  length?: number;
  width?: number;
  height?: number;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
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
  unitPrice?: number;
  totalValue?: number;
  lastUpdatedAt: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryAdjustmentRequest {
  productId: string;
  warehouseId: string;
  adjustmentType: 'increase' | 'decrease';
  quantity: number;
  reason: string;
  location?: string;
  batchNumber?: string;
  notes?: string;
}

export interface InventoryTransferRequest {
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  reason: string;
  fromLocation?: string;
  toLocation?: string;
  batchNumber?: string;
  notes?: string;
}

export interface InventoryQueryParams extends QueryParams {
  warehouseId?: string;
  productId?: string;
  categoryId?: string;
  lowStock?: boolean;
  stockStatus?: string;
  location?: string;
  batchNumber?: string;
}

// 入库单相关类型
export interface InboundOrder {
  id: string;
  orderNumber: string;
  warehouseId: string;
  warehouse?: Warehouse;
  supplierId?: string;
  status_text: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  totalQuantity: number;
  totalAmount: number;
  notes?: string;
  createdBy: string;
  created_at: string;
  updated_at: string;
  items: InboundOrderItem[];
  /** 归档标记（软删除）：后端 index 注入，用于「已归档」Tag */
  is_archived?: boolean;
  archived_at?: string | null;
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
  status_text: 'PENDING' | 'PARTIAL' | 'COMPLETED';
}

export interface CreateInboundOrderRequest {
  warehouseId: string;
  supplierId?: string;
  notes?: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    batchNumber?: string;
    expiryDate?: string;
    location?: string;
  }[];
}

export interface UpdateInboundOrderRequest extends Partial<CreateInboundOrderRequest> {}

export interface InboundOrderQueryParams extends QueryParams {
  page?: number;
  limit?: number;
  order_number?: string;
  warehouse_id?: string;
  supplier_id?: string;
  status?: string;
  archived?: '' | 'archived' | 'all';
  operator_id?: number;
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
  status_text: 'planning' | 'in_progress' | 'completed' | 'cancelled';
  budget?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectRequest {
  projectCode: string;
  name: string;
  description?: string;
  customerId?: string;
  managerId?: string;
  location?: string;
  status_text: 'planning' | 'in_progress' | 'completed' | 'cancelled';
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
  status_text: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  totalQuantity: number;
  totalAmount: number;
  notes?: string;
  expectedDate?: string;
  contactPerson?: string;
  contactPhone?: string;
  remark?: string;
  createdBy: string;
  created_at: string;
  updated_at: string;
  items: OutboundOrderItem[];
  /** 归档标记（软删除）：后端 index 注入，用于「已归档」Tag */
  is_archived?: boolean;
  archived_at?: string | null;
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
  requestedQuantity?: number;
  status_text: 'PENDING' | 'PARTIAL' | 'COMPLETED';
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  isActive: boolean;
  status_text: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface CreateOutboundOrderRequest {
  warehouseId: string;
  customerId?: string;
  notes?: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    batchNumber?: string;
    location?: string;
  }[];
}

export interface UpdateOutboundOrderRequest extends Partial<CreateOutboundOrderRequest> {}

export interface OutboundOrderQueryParams extends QueryParams {
  page?: number;
  limit?: number;
  order_number?: string;
  warehouse_id?: string;
  customer_id?: string;
  status?: string;
  archived?: '' | 'archived' | 'all';
  operator_id?: number;
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

// 无线备件相关类型
export interface WirelessSparePart {
  id: string;
  code: string;
  partName: string;
  model?: string;
  serialNumber?: string;
  type: '5G' | '4G' | '3G' | '2G' | 'other';
  quantity: number;
  operator: string;
  date: string;
  status: 'inbound' | 'outbound' | 'returned';
  status_text: string;
  project?: string;
  isActive: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWirelessSparePartRequest {
  code: string;
  partName: string;
  model?: string;
  serialNumber?: string;
  type: '5G' | '4G' | '3G' | '2G' | 'other';
  quantity: number;
  operator: string;
  project?: string;
  status: 'inbound' | 'outbound' | 'returned';
}

export interface UpdateWirelessSparePartRequest extends Partial<CreateWirelessSparePartRequest> {}

// 序列号相关类型
export interface SerialNumber {
  id: string;
  serialNumber: string;
  productId: string;
  product?: Product;
  productName?: string;
  productSku?: string;
  productModel?: string;
  manufactureDate?: string;
  warrantyPeriod?: number;
  warrantyEndDate?: string;
  status: 'in_stock' | 'sold' | 'scrapped';
  status_text: string;
  location?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSerialNumberRequest {
  serialNumber: string;
  productId: string;
  manufactureDate?: string;
  warrantyPeriod?: number;
  status?: 'in_stock' | 'sold' | 'scrapped';
  location?: string;
  notes?: string;
}

export interface UpdateSerialNumberRequest extends Partial<CreateSerialNumberRequest> {}

export interface QueryByBarcodeResponse {
  type: 'serial_number' | 'product';
  info: SerialNumber | Product;
  product?: Product;
  status_text: string;
}

// P7 仓库授权类型
export type GrantRole = 'manager' | 'operator';

export interface WarehouseGrant {
  id?: number;
  user_id?: number;
  username?: string;
  global_role?: string;
  warehouse_id: number;
  warehouse_code?: string;
  warehouse_name?: string;
  grant_role: GrantRole;
  status: 'active' | 'revoked';
  granted_at?: string;
  revoked_at?: string;
  remark?: string;
}

export interface GrantCell {
  grant_role: GrantRole;
  status: 'active' | 'revoked';
  granted_at?: string;
  revoked_at?: string;
  granted_by?: number;
  remark?: string;
}

export interface GrantMatrixUser {
  user_id: number;
  username: string;
  global_role: string;
  vendor_id?: number | null;
}

export interface GrantMatrixWarehouse {
  id: number;
  code: string;
  name: string;
}

export interface GrantMatrixCell {
  warehouse_id: number;
  grant_role: GrantRole | null;
}

export interface GrantMatrixRow {
  user_id: number;
  username: string;
  global_role: string;
  vendor_id: number | null;
  cells: GrantMatrixCell[];
}

export interface GrantMatrix {
  warehouses: GrantMatrixWarehouse[];
  rows: GrantMatrixRow[];
}

// P7 操作日志类型
export interface OperationLog {
  id: number;
  operator_id: number;
  operator_name: string;
  action: string;
  target_type: string;
  target_id: number;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  ip: string;
  created_at: string;
}

export interface OperationLogQueryParams extends QueryParams {
  limit?: number;
  operator_id?: number;
  action?: string;
  target_type?: string;
  target_id?: number;
  start_time?: string;
  end_time?: string;
}
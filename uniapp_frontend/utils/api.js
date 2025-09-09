// API配置和请求工具
import { request, get, post, put, delete as del, upload, BASE_URL } from './request.js'

// API接口定义
const api = {
  // 用户认证相关
  auth: {
    // 用户登录
    login: (data) => post('/auth/login', data),
    
    // 用户注册
    register: (data) => post('/auth/register', data),
    
    // 获取用户信息
    getUserInfo: () => get('/auth/user'),
    
    // 刷新token
    refreshToken: () => post('/auth/refresh'),
    
    // 用户登出
    logout: () => post('/auth/logout')
  },
  
  // 库存管理相关
  inventory: {
    // 获取库存列表
    getList: (params) => get('/inventory', params),
    
    // 获取库存详情
    getDetail: (id) => get(`/inventory/${id}`),
    
    // 更新库存
    update: (id, data) => put(`/inventory/${id}`, data),
    
    // 库存盘点
    stocktake: (data) => post('/inventory/stocktake', data)
  },
  
  // 入库管理相关
  inbound: {
    // 获取入库订单列表
    getOrders: (params) => get('/inbound-orders', params),
    
    // 获取入库订单详情
    getOrderDetail: (id) => get(`/inbound-orders/${id}`),
    
    // 创建入库订单
    createOrder: (data) => post('/inbound-orders', data),
    
    // 更新入库订单
    updateOrder: (id, data) => put(`/inbound-orders/${id}`, data),
    
    // 确认入库
    confirmInbound: (id, data) => post(`/inbound-orders/${id}/confirm`, data)
  },
  
  // 出库管理相关
  outbound: {
    // 获取出库订单列表
    getOrders: (params) => get('/outbound-orders', params),
    
    // 获取出库订单详情
    getOrderDetail: (id) => get(`/outbound-orders/${id}`),
    
    // 创建出库订单
    createOrder: (data) => post('/outbound-orders', data),
    
    // 更新出库订单
    updateOrder: (id, data) => put(`/outbound-orders/${id}`, data),
    
    // 确认出库
    confirmOutbound: (id, data) => post(`/outbound-orders/${id}/confirm`, data)
  },
  
  // 产品管理相关
  product: {
    // 获取产品列表
    getList: (params) => get('/products', params),
    
    // 获取产品详情
    getDetail: (id) => get(`/products/${id}`),
    
    // 创建产品
    create: (data) => post('/products', data),
    
    // 更新产品
    update: (id, data) => put(`/products/${id}`, data),
    
    // 删除产品
    delete: (id) => del(`/products/${id}`),
    
    // 根据条码搜索产品
    searchByBarcode: (barcode) => get('/products/search', { barcode })
  },
  
  // 仓库管理相关
  warehouse: {
    // 获取仓库列表
    getList: () => get('/warehouses'),
    
    // 获取仓库详情
    getDetail: (id) => get(`/warehouses/${id}`),
    
    // 获取仓库库位
    getLocations: (warehouseId) => get(`/warehouses/${warehouseId}/locations`)
  },
  
  // 库存事务相关
  transaction: {
    // 获取库存事务列表
    getList: (params) => get('/inventory-transactions', params),
    
    // 获取库存事务详情
    getDetail: (id) => get(`/inventory-transactions/${id}`)
  },
  
  // 仪表盘相关
  dashboard: {
    // 获取仪表盘统计数据
    getStats: () => get('/reports/dashboard'),
    
    // 获取最近活动
    getRecentActivities: (params) => get('/inventory-transactions/recent', params),
    
    // 获取待办事项列表
    getTodoList: (params) => get('/reports/dashboard', params)
  }
}

export default api
export { BASE_URL, request }
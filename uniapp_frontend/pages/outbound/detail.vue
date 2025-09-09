<template>
  <view class="outbound-detail">
    <!-- 头部信息 -->
    <view class="header-info">
      <view class="order-header">
        <text class="order-no">{{ orderInfo.orderNo }}</text>
        <view class="status-badge" :class="getStatusClass(orderInfo.status)">
          {{ getStatusText(orderInfo.status) }}
        </view>
      </view>
      <text class="create-time">创建时间: {{ formatDateTime(orderInfo.createTime) }}</text>
    </view>

    <!-- 客户信息 -->
    <view class="section customer-section">
      <view class="section-header">
        <uni-icons type="person" size="20" color="#007AFF"></uni-icons>
        <text class="section-title">客户信息</text>
      </view>
      <view class="customer-info">
        <view class="info-row">
          <text class="info-label">客户名称:</text>
          <text class="info-value">{{ orderInfo.customerName }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">联系电话:</text>
          <text class="info-value">{{ orderInfo.customerPhone }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">收货地址:</text>
          <text class="info-value">{{ orderInfo.deliveryAddress }}</text>
        </view>
      </view>
    </view>

    <!-- 出库详情 -->
    <view class="section outbound-section">
      <view class="section-header">
        <uni-icons type="list" size="20" color="#007AFF"></uni-icons>
        <text class="section-title">出库详情</text>
      </view>
      <view class="outbound-info">
        <view class="info-row">
          <text class="info-label">出库仓库:</text>
          <text class="info-value">{{ orderInfo.warehouseName }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">预计出库时间:</text>
          <text class="info-value">{{ formatDateTime(orderInfo.expectedTime) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">实际出库时间:</text>
          <text class="info-value">{{ orderInfo.actualTime ? formatDateTime(orderInfo.actualTime) : '未完成' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">备注信息:</text>
          <text class="info-value">{{ orderInfo.remark || '无' }}</text>
        </view>
      </view>
    </view>

    <!-- 进度统计 -->
    <view class="section progress-section">
      <view class="section-header">
        <uni-icons type="bars" size="20" color="#007AFF"></uni-icons>
        <text class="section-title">拣货进度</text>
      </view>
      <view class="progress-stats">
        <view class="stat-item">
          <text class="stat-number">{{ progressInfo.totalProducts }}</text>
          <text class="stat-label">商品种类</text>
        </view>
        <view class="stat-item">
          <text class="stat-number">{{ progressInfo.expectedQuantity }}</text>
          <text class="stat-label">预计数量</text>
        </view>
        <view class="stat-item">
          <text class="stat-number picked">{{ progressInfo.pickedQuantity }}</text>
          <text class="stat-label">已拣数量</text>
        </view>
        <view class="stat-item">
          <text class="stat-number progress">{{ progressPercent }}%</text>
          <text class="stat-label">完成进度</text>
        </view>
      </view>
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
      </view>
    </view>

    <!-- 商品清单 -->
    <view class="section product-section">
      <view class="section-header">
        <uni-icons type="gift" size="20" color="#007AFF"></uni-icons>
        <text class="section-title">商品清单</text>
        <text class="product-count">({{ productList.length }}种商品)</text>
      </view>
      <view class="product-list">
        <view class="product-item" v-for="product in productList" :key="product.id">
          <image class="product-image" :src="product.image || '/static/default-product.png'" mode="aspectFill"></image>
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <text class="product-sku">SKU: {{ product.sku }}</text>
            <text class="product-spec">规格: {{ product.specification }}</text>
          </view>
          <view class="quantity-info">
            <view class="quantity-row">
              <text class="quantity-label">预计:</text>
              <text class="quantity-value">{{ product.expectedQuantity }}</text>
            </view>
            <view class="quantity-row">
              <text class="quantity-label">已拣:</text>
              <text class="quantity-value picked">{{ product.pickedQuantity }}</text>
            </view>
            <view class="quantity-row">
              <text class="quantity-label">待拣:</text>
              <text class="quantity-value pending">{{ product.expectedQuantity - product.pickedQuantity }}</text>
            </view>
          </view>
          <view class="product-status">
            <view class="status-badge" :class="getProductStatusClass(product)">
              {{ getProductStatusText(product) }}
            </view>
            <view class="mini-progress">
              <view class="mini-progress-fill" :style="{ width: getProductProgress(product) + '%' }"></view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 操作记录 -->
    <view class="section record-section">
      <view class="section-header">
        <uni-icons type="clock" size="20" color="#007AFF"></uni-icons>
        <text class="section-title">操作记录</text>
      </view>
      <view class="record-list">
        <view class="record-item" v-for="record in operationRecords" :key="record.id">
          <view class="record-dot" :class="getRecordDotClass(record.action)"></view>
          <view class="record-content">
            <view class="record-header">
              <text class="record-action">{{ getActionText(record.action) }}</text>
              <text class="record-time">{{ formatDateTime(record.time) }}</text>
            </view>
            <text class="record-detail">{{ record.detail }}</text>
            <text class="record-operator">操作人: {{ record.operator }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作按钮 -->
    <view class="bottom-actions">
      <button 
        class="action-btn secondary" 
        v-if="canCancel"
        @click="cancelOrder"
      >
        取消出库
      </button>
      <button 
        class="action-btn primary" 
        v-if="canStartPick"
        @click="startPick"
      >
        开始拣货
      </button>
      <button 
        class="action-btn primary" 
        v-if="canContinuePick"
        @click="continuePick"
      >
        继续拣货
      </button>
      <button 
        class="action-btn primary" 
        v-if="canComplete"
        @click="completeOrder"
      >
        完成出库
      </button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      orderId: '',
      loading: false,
      
      // 订单信息
      orderInfo: {
        id: '',
        orderNo: '',
        status: '',
        customerName: '',
        customerPhone: '',
        deliveryAddress: '',
        warehouseName: '',
        expectedTime: '',
        actualTime: '',
        createTime: '',
        remark: ''
      },
      
      // 进度信息
      progressInfo: {
        totalProducts: 0,
        expectedQuantity: 0,
        pickedQuantity: 0
      },
      
      // 商品清单
      productList: [],
      
      // 操作记录
      operationRecords: []
    }
  },
  
  computed: {
    // 进度百分比
    progressPercent() {
      if (this.progressInfo.expectedQuantity === 0) return 0
      return Math.round((this.progressInfo.pickedQuantity / this.progressInfo.expectedQuantity) * 100)
    },
    
    // 是否可以取消
    canCancel() {
      return ['pending', 'picking'].includes(this.orderInfo.status)
    },
    
    // 是否可以开始拣货
    canStartPick() {
      return this.orderInfo.status === 'pending'
    },
    
    // 是否可以继续拣货
    canContinuePick() {
      return this.orderInfo.status === 'picking'
    },
    
    // 是否可以完成
    canComplete() {
      return this.orderInfo.status === 'picking' && this.progressPercent === 100
    }
  },
  
  onLoad(options) {
    this.orderId = options.id
    this.loadOrderDetail()
  },
  
  onPullDownRefresh() {
    this.loadOrderDetail()
  },
  
  methods: {
    // 加载订单详情
    async loadOrderDetail() {
      if (this.loading) return
      
      this.loading = true
      
      try {
        // 模拟API调用
        const response = await this.mockApiCall()
        
        this.orderInfo = response.orderInfo
        this.progressInfo = response.progressInfo
        this.productList = response.productList
        this.operationRecords = response.operationRecords
        
      } catch (error) {
        uni.showToast({
          title: '加载失败',
          icon: 'error'
        })
      } finally {
        this.loading = false
        uni.stopPullDownRefresh()
      }
    },
    
    // 模拟API调用
    mockApiCall() {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            orderInfo: {
              id: this.orderId,
              orderNo: 'OUT20240101001',
              status: 'picking',
              customerName: '客户A',
              customerPhone: '13800138000',
              deliveryAddress: '北京市朝阳区xxx街道xxx号',
              warehouseName: '主仓库',
              expectedTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              actualTime: '',
              createTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              remark: '请尽快处理'
            },
            progressInfo: {
              totalProducts: 5,
              expectedQuantity: 150,
              pickedQuantity: 90
            },
            productList: [
              {
                id: '1',
                name: '商品A',
                sku: 'SKU001',
                specification: '500ml',
                image: '',
                expectedQuantity: 50,
                pickedQuantity: 30
              },
              {
                id: '2',
                name: '商品B',
                sku: 'SKU002',
                specification: '1L',
                image: '',
                expectedQuantity: 30,
                pickedQuantity: 30
              },
              {
                id: '3',
                name: '商品C',
                sku: 'SKU003',
                specification: '250ml',
                image: '',
                expectedQuantity: 40,
                pickedQuantity: 20
              },
              {
                id: '4',
                name: '商品D',
                sku: 'SKU004',
                specification: '2L',
                image: '',
                expectedQuantity: 20,
                pickedQuantity: 10
              },
              {
                id: '5',
                name: '商品E',
                sku: 'SKU005',
                specification: '100ml',
                image: '',
                expectedQuantity: 10,
                pickedQuantity: 0
              }
            ],
            operationRecords: [
              {
                id: '1',
                action: 'create',
                detail: '创建出库单',
                operator: '张三',
                time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
              },
              {
                id: '2',
                action: 'start_pick',
                detail: '开始拣货作业',
                operator: '李四',
                time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
              },
              {
                id: '3',
                action: 'pick',
                detail: '拣货商品B，数量：30',
                operator: '李四',
                time: new Date(Date.now() - 30 * 60 * 1000).toISOString()
              }
            ]
          })
        }, 1000)
      })
    },
    
    // 获取状态样式类
    getStatusClass(status) {
      const classMap = {
        pending: 'status-pending',
        picking: 'status-picking',
        completed: 'status-completed',
        cancelled: 'status-cancelled'
      }
      return classMap[status] || ''
    },
    
    // 获取状态文本
    getStatusText(status) {
      const textMap = {
        pending: '待拣货',
        picking: '拣货中',
        completed: '已完成',
        cancelled: '已取消'
      }
      return textMap[status] || '未知'
    },
    
    // 获取商品状态样式类
    getProductStatusClass(product) {
      if (product.pickedQuantity === 0) return 'status-pending'
      if (product.pickedQuantity < product.expectedQuantity) return 'status-partial'
      return 'status-completed'
    },
    
    // 获取商品状态文本
    getProductStatusText(product) {
      if (product.pickedQuantity === 0) return '待拣货'
      if (product.pickedQuantity < product.expectedQuantity) return '部分拣货'
      return '已完成'
    },
    
    // 获取商品进度
    getProductProgress(product) {
      if (product.expectedQuantity === 0) return 0
      return Math.round((product.pickedQuantity / product.expectedQuantity) * 100)
    },
    
    // 获取记录点样式类
    getRecordDotClass(action) {
      const classMap = {
        create: 'dot-create',
        start_pick: 'dot-start',
        pick: 'dot-pick',
        complete: 'dot-complete',
        cancel: 'dot-cancel'
      }
      return classMap[action] || 'dot-default'
    },
    
    // 获取操作文本
    getActionText(action) {
      const textMap = {
        create: '创建订单',
        start_pick: '开始拣货',
        pick: '拣货操作',
        complete: '完成出库',
        cancel: '取消订单'
      }
      return textMap[action] || '未知操作'
    },
    
    // 格式化日期时间
    formatDateTime(timeStr) {
      if (!timeStr) return ''
      const date = new Date(timeStr)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    
    // 开始拣货
    startPick() {
      uni.navigateTo({
        url: `/pages/outbound/pick?id=${this.orderId}`
      })
    },
    
    // 继续拣货
    continuePick() {
      uni.navigateTo({
        url: `/pages/outbound/pick?id=${this.orderId}`
      })
    },
    
    // 完成订单
    async completeOrder() {
      const result = await uni.showModal({
        title: '确认完成',
        content: '确定要完成此出库单吗？'
      })
      
      if (result.confirm) {
        try {
          // 调用完成API
          uni.showToast({
            title: '完成成功',
            icon: 'success'
          })
          
          // 刷新数据
          this.loadOrderDetail()
          
        } catch (error) {
          uni.showToast({
            title: '操作失败',
            icon: 'error'
          })
        }
      }
    },
    
    // 取消订单
    async cancelOrder() {
      const result = await uni.showModal({
        title: '确认取消',
        content: '确定要取消此出库单吗？取消后无法恢复。'
      })
      
      if (result.confirm) {
        try {
          // 调用取消API
          uni.showToast({
            title: '取消成功',
            icon: 'success'
          })
          
          // 刷新数据
          this.loadOrderDetail()
          
        } catch (error) {
          uni.showToast({
            title: '操作失败',
            icon: 'error'
          })
        }
      }
    }
  }
}
</script>

<style scoped>
.outbound-detail {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 120rpx;
}

/* 头部信息 */
.header-info {
  background-color: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
  border-bottom: 1rpx solid #eee;
}

.order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.order-no {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.status-badge {
  padding: 8rpx 16rpx;
  border-radius: 12rpx;
  font-size: 22rpx;
  color: #fff;
  font-weight: 500;
}

.status-pending {
  background-color: #FF9500;
}

.status-picking {
  background-color: #007AFF;
}

.status-completed {
  background-color: #34C759;
}

.status-cancelled {
  background-color: #8E8E93;
}

.create-time {
  font-size: 24rpx;
  color: #999;
}

/* 通用区块 */
.section {
  background-color: #fff;
  margin-bottom: 20rpx;
  padding: 30rpx;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-header uni-icons {
  margin-right: 12rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.product-count {
  margin-left: auto;
  font-size: 24rpx;
  color: #666;
  font-weight: normal;
}

/* 客户信息 */
.customer-info {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.info-label {
  font-size: 26rpx;
  color: #666;
  min-width: 140rpx;
  flex-shrink: 0;
}

.info-value {
  font-size: 26rpx;
  color: #333;
  flex: 1;
  word-break: break-all;
}

/* 出库详情 */
.outbound-info {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

/* 进度统计 */
.progress-stats {
  display: flex;
  gap: 40rpx;
  margin-bottom: 24rpx;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stat-number {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.stat-number.picked {
  color: #34C759;
}

.stat-number.progress {
  color: #007AFF;
}

.stat-label {
  font-size: 22rpx;
  color: #666;
}

.progress-bar {
  width: 100%;
  height: 16rpx;
  background-color: #f0f0f0;
  border-radius: 8rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007AFF 0%, #34C759 100%);
  border-radius: 8rpx;
  transition: width 0.3s ease;
}

/* 商品清单 */
.product-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.product-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: #f8f8f8;
  border-radius: 12rpx;
  gap: 20rpx;
}

.product-image {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8rpx;
  background-color: #f0f0f0;
  flex-shrink: 0;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.product-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.product-sku {
  font-size: 24rpx;
  color: #666;
}

.product-spec {
  font-size: 24rpx;
  color: #999;
}

.quantity-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  margin-right: 20rpx;
}

.quantity-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.quantity-label {
  font-size: 22rpx;
  color: #666;
  min-width: 60rpx;
}

.quantity-value {
  font-size: 24rpx;
  font-weight: 500;
  color: #333;
  min-width: 40rpx;
  text-align: right;
}

.quantity-value.picked {
  color: #34C759;
}

.quantity-value.pending {
  color: #FF9500;
}

.product-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.product-status .status-badge {
  padding: 6rpx 12rpx;
  border-radius: 10rpx;
  font-size: 20rpx;
  color: #fff;
}

.mini-progress {
  width: 60rpx;
  height: 6rpx;
  background-color: #f0f0f0;
  border-radius: 3rpx;
  overflow: hidden;
}

.mini-progress-fill {
  height: 100%;
  background-color: #34C759;
  border-radius: 3rpx;
  transition: width 0.3s ease;
}

/* 操作记录 */
.record-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.record-item {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  position: relative;
}

.record-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 16rpx;
  top: 32rpx;
  bottom: -24rpx;
  width: 2rpx;
  background-color: #eee;
}

.record-dot {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4rpx;
  position: relative;
  z-index: 1;
}

.dot-create {
  background-color: #007AFF;
}

.dot-start {
  background-color: #FF9500;
}

.dot-pick {
  background-color: #34C759;
}

.dot-complete {
  background-color: #30D158;
}

.dot-cancel {
  background-color: #FF3B30;
}

.dot-default {
  background-color: #8E8E93;
}

.record-content {
  flex: 1;
}

.record-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.record-action {
  font-size: 26rpx;
  font-weight: 500;
  color: #333;
}

.record-time {
  font-size: 22rpx;
  color: #999;
}

.record-detail {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 4rpx;
  display: block;
}

.record-operator {
  font-size: 22rpx;
  color: #999;
}

/* 底部操作 */
.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #fff;
  padding: 20rpx 30rpx;
  border-top: 1rpx solid #eee;
  display: flex;
  gap: 20rpx;
  z-index: 100;
}

.action-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 500;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn.primary {
  background-color: #007AFF;
  color: #fff;
}

.action-btn.secondary {
  background-color: #f8f8f8;
  color: #FF3B30;
  border: 1rpx solid #FF3B30;
}

.action-btn:disabled {
  background-color: #ccc;
  color: #999;
  border-color: #ccc;
}

.action-btn:active:not(:disabled) {
  opacity: 0.8;
}
</style>
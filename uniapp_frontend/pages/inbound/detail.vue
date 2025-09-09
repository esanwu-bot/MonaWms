<template>
  <view class="inbound-detail">
    <!-- 头部信息 -->
    <view class="header-info">
      <view class="order-header">
        <text class="order-no">{{ inboundInfo.inbound_no }}</text>
        <view class="status-badge" :class="getStatusClass(inboundInfo.status)">
          {{ getStatusText(inboundInfo.status) }}
        </view>
      </view>
      <text class="create-time">创建时间：{{ formatDateTime(inboundInfo.created_at) }}</text>
    </view>

    <!-- 供应商信息 -->
    <view class="section">
      <view class="section-title">
        <uni-icons type="person" size="18" color="#007AFF"></uni-icons>
        <text>供应商信息</text>
      </view>
      <view class="supplier-card">
        <view class="supplier-name">{{ inboundInfo.supplier_name }}</view>
        <view class="supplier-details">
          <view class="detail-item">
            <text class="label">联系人：</text>
            <text class="value">{{ inboundInfo.contact_person }}</text>
          </view>
          <view class="detail-item">
            <text class="label">联系电话：</text>
            <text class="value">{{ inboundInfo.contact_phone }}</text>
          </view>
          <view class="detail-item">
            <text class="label">供应商地址：</text>
            <text class="value">{{ inboundInfo.supplier_address }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 入库信息 -->
    <view class="section">
      <view class="section-title">
        <uni-icons type="home" size="18" color="#007AFF"></uni-icons>
        <text>入库信息</text>
      </view>
      <view class="inbound-card">
        <view class="detail-item">
          <text class="label">目标仓库：</text>
          <text class="value">{{ inboundInfo.warehouse_name }}</text>
        </view>
        <view class="detail-item">
          <text class="label">预计到货时间：</text>
          <text class="value">{{ formatDateTime(inboundInfo.expected_arrival_time) }}</text>
        </view>
        <view class="detail-item">
          <text class="label">备注：</text>
          <text class="value">{{ inboundInfo.remark || '无' }}</text>
        </view>
      </view>
    </view>

    <!-- 进度统计 -->
    <view class="section">
      <view class="section-title">
        <uni-icons type="bars" size="18" color="#007AFF"></uni-icons>
        <text>收货进度</text>
      </view>
      <view class="progress-card">
        <view class="progress-stats">
          <view class="stat-item">
            <text class="stat-value">{{ inboundInfo.product_count }}</text>
            <text class="stat-label">商品种类</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ inboundInfo.expected_quantity }}</text>
            <text class="stat-label">预计数量</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ inboundInfo.received_quantity }}</text>
            <text class="stat-label">已收数量</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ progressPercentage }}%</text>
            <text class="stat-label">完成进度</text>
          </view>
        </view>
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: progressPercentage + '%' }"></view>
        </view>
      </view>
    </view>

    <!-- 商品列表 -->
    <view class="section">
      <view class="section-title">
        <uni-icons type="list" size="18" color="#007AFF"></uni-icons>
        <text>商品清单</text>
      </view>
      <view class="product-list">
        <view class="product-item" v-for="item in productList" :key="item.id">
          <image class="product-image" :src="item.image || '/static/default-product.png'"></image>
          <view class="product-info">
            <view class="product-name">{{ item.product_name }}</view>
            <view class="product-sku">SKU: {{ item.sku }}</view>
            <view class="product-spec">规格: {{ item.specification }}</view>
          </view>
          <view class="quantity-info">
            <view class="quantity-row">
              <text class="quantity-label">预计:</text>
              <text class="quantity-value">{{ item.expected_quantity }}</text>
            </view>
            <view class="quantity-row">
              <text class="quantity-label">已收:</text>
              <text class="quantity-value received">{{ item.received_quantity }}</text>
            </view>
            <view class="quantity-row" v-if="item.received_quantity < item.expected_quantity">
              <text class="quantity-label">待收:</text>
              <text class="quantity-value pending">{{ item.expected_quantity - item.received_quantity }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 操作记录 -->
    <view class="section">
      <view class="section-title">
        <uni-icons type="clock" size="18" color="#007AFF"></uni-icons>
        <text>操作记录</text>
      </view>
      <view class="timeline">
        <view class="timeline-item" v-for="(record, index) in operationRecords" :key="index">
          <view class="timeline-dot" :class="getRecordTypeClass(record.type)"></view>
          <view class="timeline-content">
            <view class="record-header">
              <text class="record-action">{{ record.action }}</text>
              <text class="record-time">{{ formatDateTime(record.created_at) }}</text>
            </view>
            <text class="record-operator">操作人：{{ record.operator }}</text>
            <text class="record-remark" v-if="record.remark">{{ record.remark }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作按钮 -->
    <view class="bottom-actions">
      <button 
        v-if="inboundInfo.status === 'pending'" 
        class="action-btn primary" 
        @click="startReceiving"
      >
        开始收货
      </button>
      <button 
        v-if="inboundInfo.status === 'receiving'" 
        class="action-btn primary" 
        @click="continueReceiving"
      >
        继续收货
      </button>
      <button 
        v-if="inboundInfo.status === 'receiving'" 
        class="action-btn secondary" 
        @click="completeInbound"
      >
        完成入库
      </button>
      <button 
        v-if="inboundInfo.status === 'pending'" 
        class="action-btn danger" 
        @click="cancelInbound"
      >
        取消入库
      </button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      inboundId: '',
      loading: false,
      
      // 入库单信息
      inboundInfo: {
        id: '',
        inbound_no: '',
        supplier_name: '',
        contact_person: '',
        contact_phone: '',
        supplier_address: '',
        warehouse_name: '',
        status: '',
        product_count: 0,
        expected_quantity: 0,
        received_quantity: 0,
        expected_arrival_time: '',
        created_at: '',
        remark: ''
      },
      
      // 商品列表
      productList: [],
      
      // 操作记录
      operationRecords: []
    }
  },
  
  computed: {
    // 完成进度百分比
    progressPercentage() {
      if (this.inboundInfo.expected_quantity === 0) return 0
      return Math.round((this.inboundInfo.received_quantity / this.inboundInfo.expected_quantity) * 100)
    }
  },
  
  onLoad(options) {
    this.inboundId = options.id
    this.loadData()
  },
  
  methods: {
    // 加载数据
    async loadData() {
      if (this.loading) return
      
      this.loading = true
      
      try {
        // 并行加载数据
        const [inboundResponse, productResponse, recordResponse] = await Promise.all([
          this.loadInboundInfo(),
          this.loadProductList(),
          this.loadOperationRecords()
        ])
        
        this.inboundInfo = inboundResponse.data
        this.productList = productResponse.data
        this.operationRecords = recordResponse.data
        
      } catch (error) {
        console.error('加载数据失败:', error)
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },
    
    // 加载入库单信息
    async loadInboundInfo() {
      // 模拟API调用
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            data: {
              id: this.inboundId,
              inbound_no: 'IN202401001',
              supplier_name: '北京供应商A',
              contact_person: '张三',
              contact_phone: '13800138001',
              supplier_address: '北京市朝阳区xxx街道xxx号',
              warehouse_name: '北京仓库',
              status: 'receiving',
              product_count: 5,
              expected_quantity: 100,
              received_quantity: 60,
              expected_arrival_time: '2024-01-16 10:00:00',
              created_at: '2024-01-15 09:30:00',
              remark: '紧急入库，请优先处理'
            }
          })
        }, 1000)
      })
    },
    
    // 加载商品列表
    async loadProductList() {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            data: [
              {
                id: 1,
                product_name: '苹果iPhone 15',
                sku: 'IP15-128G-BLK',
                specification: '128GB 黑色',
                image: '/static/default-product.png',
                expected_quantity: 20,
                received_quantity: 15
              },
              {
                id: 2,
                product_name: '华为Mate 60',
                sku: 'HW-M60-256G-WHT',
                specification: '256GB 白色',
                image: '/static/default-product.png',
                expected_quantity: 30,
                received_quantity: 25
              },
              {
                id: 3,
                product_name: '小米14 Pro',
                sku: 'MI14P-512G-GLD',
                specification: '512GB 金色',
                image: '/static/default-product.png',
                expected_quantity: 25,
                received_quantity: 20
              },
              {
                id: 4,
                product_name: 'OPPO Find X7',
                sku: 'OP-FX7-256G-BLU',
                specification: '256GB 蓝色',
                image: '/static/default-product.png',
                expected_quantity: 15,
                received_quantity: 0
              },
              {
                id: 5,
                product_name: 'vivo X100',
                sku: 'VV-X100-128G-SLV',
                specification: '128GB 银色',
                image: '/static/default-product.png',
                expected_quantity: 10,
                received_quantity: 0
              }
            ]
          })
        }, 800)
      })
    },
    
    // 加载操作记录
    async loadOperationRecords() {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            data: [
              {
                type: 'create',
                action: '创建入库单',
                operator: '张三',
                created_at: '2024-01-15 09:30:00',
                remark: '供应商发货通知'
              },
              {
                type: 'start',
                action: '开始收货',
                operator: '李四',
                created_at: '2024-01-15 14:20:00',
                remark: '货物已到达仓库'
              },
              {
                type: 'receive',
                action: '收货操作',
                operator: '李四',
                created_at: '2024-01-15 14:30:00',
                remark: '已收货iPhone 15 x15台'
              },
              {
                type: 'receive',
                action: '收货操作',
                operator: '李四',
                created_at: '2024-01-15 15:10:00',
                remark: '已收货华为Mate 60 x25台'
              }
            ]
          })
        }, 600)
      })
    },
    
    // 开始收货
    startReceiving() {
      uni.navigateTo({
        url: `/pages/inbound/receive?id=${this.inboundId}`
      })
    },
    
    // 继续收货
    continueReceiving() {
      uni.navigateTo({
        url: `/pages/inbound/receive?id=${this.inboundId}`
      })
    },
    
    // 完成入库
    completeInbound() {
      uni.showModal({
        title: '确认完成',
        content: '确定要完成此入库单吗？完成后将无法继续收货。',
        success: (res) => {
          if (res.confirm) {
            this.doCompleteInbound()
          }
        }
      })
    },
    
    // 执行完成入库
    async doCompleteInbound() {
      try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        uni.showToast({
          title: '完成成功',
          icon: 'success'
        })
        
        // 刷新数据
        this.loadData()
        
      } catch (error) {
        console.error('完成入库失败:', error)
        uni.showToast({
          title: '操作失败',
          icon: 'none'
        })
      }
    },
    
    // 取消入库
    cancelInbound() {
      uni.showModal({
        title: '确认取消',
        content: '确定要取消此入库单吗？取消后将无法恢复。',
        success: (res) => {
          if (res.confirm) {
            this.doCancelInbound()
          }
        }
      })
    },
    
    // 执行取消入库
    async doCancelInbound() {
      try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        uni.showToast({
          title: '取消成功',
          icon: 'success'
        })
        
        // 返回上一页
        uni.navigateBack()
        
      } catch (error) {
        console.error('取消入库失败:', error)
        uni.showToast({
          title: '操作失败',
          icon: 'none'
        })
      }
    },
    
    // 获取状态样式类
    getStatusClass(status) {
      const classMap = {
        'pending': 'status-pending',
        'receiving': 'status-receiving',
        'completed': 'status-completed',
        'cancelled': 'status-cancelled'
      }
      return classMap[status] || ''
    },
    
    // 获取状态文本
    getStatusText(status) {
      const textMap = {
        'pending': '待收货',
        'receiving': '收货中',
        'completed': '已完成',
        'cancelled': '已取消'
      }
      return textMap[status] || '未知'
    },
    
    // 获取记录类型样式类
    getRecordTypeClass(type) {
      const classMap = {
        'create': 'dot-create',
        'start': 'dot-start',
        'receive': 'dot-receive',
        'complete': 'dot-complete',
        'cancel': 'dot-cancel'
      }
      return classMap[type] || ''
    },
    
    // 格式化日期时间
    formatDateTime(datetime) {
      if (!datetime) return ''
      const date = new Date(datetime)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }
  }
}
</script>

<style scoped>
.inbound-detail {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 120rpx;
}

/* 头部信息 */
.header-info {
  background-color: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.order-no {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.status-badge {
  padding: 8rpx 16rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
  color: #fff;
}

.status-pending {
  background-color: #FF9500;
}

.status-receiving {
  background-color: #007AFF;
}

.status-completed {
  background-color: #34C759;
}

.status-cancelled {
  background-color: #FF3B30;
}

.create-time {
  font-size: 26rpx;
  color: #666;
}

/* 通用区块 */
.section {
  background-color: #fff;
  margin-bottom: 20rpx;
  padding: 30rpx;
}

.section-title {
  display: flex;
  align-items: center;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 30rpx;
}

.section-title uni-icons {
  margin-right: 12rpx;
}

/* 供应商信息 */
.supplier-card {
  border: 1rpx solid #eee;
  border-radius: 12rpx;
  padding: 24rpx;
}

.supplier-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.supplier-details {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.detail-item {
  display: flex;
  align-items: center;
}

.label {
  font-size: 26rpx;
  color: #666;
  width: 160rpx;
  flex-shrink: 0;
}

.value {
  font-size: 26rpx;
  color: #333;
  flex: 1;
}

/* 入库信息 */
.inbound-card {
  border: 1rpx solid #eee;
  border-radius: 12rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

/* 进度统计 */
.progress-card {
  border: 1rpx solid #eee;
  border-radius: 12rpx;
  padding: 24rpx;
}

.progress-stats {
  display: flex;
  margin-bottom: 30rpx;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #666;
}

.progress-bar {
  height: 12rpx;
  background-color: #f0f0f0;
  border-radius: 6rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007AFF 0%, #34C759 100%);
  border-radius: 6rpx;
  transition: width 0.3s ease;
}

/* 商品列表 */
.product-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.product-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border: 1rpx solid #eee;
  border-radius: 12rpx;
  background-color: #fafafa;
}

.product-image {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8rpx;
  margin-right: 20rpx;
  background-color: #f0f0f0;
}

.product-info {
  flex: 1;
  margin-right: 20rpx;
}

.product-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 8rpx;
}

.product-sku {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 4rpx;
}

.product-spec {
  font-size: 24rpx;
  color: #999;
}

.quantity-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
}

.quantity-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.quantity-label {
  font-size: 24rpx;
  color: #666;
}

.quantity-value {
  font-size: 26rpx;
  font-weight: 500;
  color: #333;
  min-width: 60rpx;
  text-align: right;
}

.quantity-value.received {
  color: #34C759;
}

.quantity-value.pending {
  color: #FF9500;
}

/* 操作记录 */
.timeline {
  position: relative;
}

.timeline-item {
  display: flex;
  margin-bottom: 30rpx;
  position: relative;
}

.timeline-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 12rpx;
  top: 40rpx;
  bottom: -30rpx;
  width: 2rpx;
  background-color: #eee;
}

.timeline-dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  margin-right: 20rpx;
  margin-top: 8rpx;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.dot-create {
  background-color: #007AFF;
}

.dot-start {
  background-color: #FF9500;
}

.dot-receive {
  background-color: #34C759;
}

.dot-complete {
  background-color: #34C759;
}

.dot-cancel {
  background-color: #FF3B30;
}

.timeline-content {
  flex: 1;
  padding: 16rpx 20rpx;
  background-color: #fafafa;
  border-radius: 12rpx;
  border: 1rpx solid #eee;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.record-action {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.record-time {
  font-size: 24rpx;
  color: #999;
}

.record-operator {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 4rpx;
  display: block;
}

.record-remark {
  font-size: 24rpx;
  color: #999;
  display: block;
}

/* 底部操作按钮 */
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
  color: #007AFF;
  border: 1rpx solid #007AFF;
}

.action-btn.danger {
  background-color: #FF3B30;
  color: #fff;
}

.action-btn:active {
  opacity: 0.8;
}
</style>
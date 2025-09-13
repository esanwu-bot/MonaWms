<template>
  <view class="warehouse-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input">
        <uni-icons type="search" size="18" color="#999"></uni-icons>
        <input 
          v-model="searchKeyword" 
          placeholder="搜索仓库名称或位置" 
          @input="onSearch"
        />
      </view>
    </view>

    <!-- 仓库列表 -->
    <scroll-view 
      class="list-container" 
      scroll-y 
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="warehouse-item" v-for="warehouse in warehouseList" :key="warehouse.id" @click="goToDetail(warehouse.id)">
        <view class="warehouse-header">
          <view class="warehouse-info">
            <text class="warehouse-name">{{ warehouse.warehouse_name }}</text>
            <text class="warehouse-location">{{ warehouse.location }}</text>
          </view>
          <view class="warehouse-status" :class="getStatusClass(warehouse.status)">
            {{ getStatusText(warehouse.status) }}
          </view>
        </view>
        
        <view class="warehouse-stats">
          <view class="stat-group">
            <view class="stat-item">
              <text class="stat-value">{{ warehouse.total_devices || 0 }}</text>
              <text class="stat-label">总设备</text>
            </view>
            <view class="stat-item">
              <text class="stat-value">{{ warehouse.available_devices || 0 }}</text>
              <text class="stat-label">在库</text>
            </view>
            <view class="stat-item">
              <text class="stat-value">{{ warehouse.utilization_rate || 0 }}%</text>
              <text class="stat-label">利用率</text>
            </view>
          </view>
        </view>
        
        <view class="warehouse-progress">
          <view class="progress-info">
            <text class="progress-label">库存容量</text>
            <text class="progress-text">{{ warehouse.available_devices }}/{{ warehouse.total_capacity }}</text>
          </view>
          <view class="progress-bar">
            <view class="progress-fill" :style="{ width: warehouse.utilization_rate + '%' }"></view>
          </view>
        </view>
        
        <view class="warehouse-footer">
          <text class="manager">负责人：{{ warehouse.manager_name || '未分配' }}</text>
          <view class="actions">
            <button 
              class="action-btn" 
              size="mini"
              @click.stop="manageStock(warehouse.id)"
            >
              库存管理
            </button>
            <button 
              v-if="warehouse.status === 'active'" 
              class="action-btn primary" 
              size="mini"
              @click.stop="viewDetails(warehouse.id)"
            >
              查看详情
            </button>
            <button 
              v-if="warehouse.status === 'maintenance'" 
              class="action-btn secondary" 
              size="mini"
              @click.stop="scheduleMaintenance(warehouse.id)"
            >
              维护计划
            </button>
          </view>
        </view>
      </view>
      
      <!-- 空状态 -->
      <view class="empty-state" v-if="warehouseList.length === 0 && !loading">
        <image src="/static/empty.png" class="empty-image"></image>
        <text class="empty-text">暂无仓库数据</text>
      </view>
    </scroll-view>

    <!-- 浮动操作按钮 -->
    <view class="fab" @click="addWarehouse">
      <uni-icons type="plus" size="24" color="#fff"></uni-icons>
    </view>
  </view>
</template>

<script>
import api from '@/utils/api.js'

export default {
  data() {
    return {
      searchKeyword: '',
      refreshing: false,
      loading: false,
      
      // 仓库列表
      warehouseList: []
    }
  },
  
  onLoad() {
    this.loadData()
  },
  
  onShow() {
    this.loadData()
  },
  
  methods: {
    // 加载数据
    async loadData() {
      this.loading = true
      
      try {
        // 使用模拟数据
        const response = await this.mockApiCall()
        this.warehouseList = response.data || []
        
      } catch (error) {
        console.error('加载数据失败:', error)
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
        this.refreshing = false
      }
    },
    
    // 搜索
    onSearch() {
      clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => {
        this.loadData()
      }, 500)
    },
    
    // 下拉刷新
    onRefresh() {
      this.refreshing = true
      this.loadData()
    },
    
    // 跳转到详情页
    goToDetail(id) {
      uni.navigateTo({
        url: `/pages/warehouse/detail?id=${id}`
      })
    },
    
    // 库存管理
    manageStock(id) {
      uni.navigateTo({
        url: `/pages/inventory/list?warehouse_id=${id}`
      })
    },
    
    // 查看详情
    viewDetails(id) {
      uni.navigateTo({
        url: `/pages/warehouse/detail?id=${id}`
      })
    },
    
    // 维护计划
    scheduleMaintenance(id) {
      uni.showModal({
        title: '维护计划',
        content: '此功能正在开发中...',
        showCancel: false
      })
    },
    
    // 新增仓库
    addWarehouse() {
      uni.navigateTo({
        url: '/pages/warehouse/add'
      })
    },
    
    // 获取状态样式类
    getStatusClass(status) {
      const classMap = {
        'active': 'status-active',
        'maintenance': 'status-maintenance',
        'inactive': 'status-inactive'
      }
      return classMap[status] || ''
    },
    
    // 获取状态文本
    getStatusText(status) {
      const textMap = {
        'active': '正常运行',
        'maintenance': '维护中',
        'inactive': '停用'
      }
      return textMap[status] || '未知'
    },
    
    // 模拟API调用
    async mockApiCall() {
      return new Promise(resolve => {
        setTimeout(() => {
          const mockData = [
            {
              id: 1,
              warehouse_name: '主仓库A',
              location: '北京市朝阳区科技园',
              status: 'active',
              total_devices: 1258,
              available_devices: 856,
              total_capacity: 1500,
              utilization_rate: 68,
              manager_name: '张经理'
            },
            {
              id: 2,
              warehouse_name: '分仓库B',
              location: '上海市浦东新区张江',
              status: 'active',
              total_devices: 892,
              available_devices: 634,
              total_capacity: 1000,
              utilization_rate: 71,
              manager_name: '李经理'
            },
            {
              id: 3,
              warehouse_name: '临时仓库C',
              location: '深圳市南山区科技园',
              status: 'maintenance',
              total_devices: 456,
              available_devices: 123,
              total_capacity: 600,
              utilization_rate: 27,
              manager_name: '王经理'
            }
          ]
          
          resolve({
            data: mockData
          })
        }, 1000)
      })
    }
  }
}
</script>

<style scoped>
.warehouse-page {
  height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

/* 搜索栏 */
.search-bar {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #eee;
}

.search-input {
  flex: 1;
  display: flex;
  align-items: center;
  background-color: #f8f8f8;
  border-radius: 20rpx;
  padding: 16rpx 24rpx;
}

.search-input input {
  flex: 1;
  margin-left: 16rpx;
  font-size: 28rpx;
  color: #333;
}

/* 列表容器 */
.list-container {
  flex: 1;
  padding: 20rpx;
}

/* 仓库项 */
.warehouse-item {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.warehouse-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20rpx;
}

.warehouse-info {
  flex: 1;
}

.warehouse-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.warehouse-location {
  font-size: 24rpx;
  color: #666;
  display: block;
}

.warehouse-status {
  padding: 8rpx 16rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
  color: #fff;
}

.status-active {
  background-color: #34C759;
}

.status-maintenance {
  background-color: #FF9500;
}

.status-inactive {
  background-color: #8E8E93;
}

.warehouse-stats {
  margin-bottom: 20rpx;
}

.stat-group {
  display: flex;
  justify-content: space-around;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #666;
}

.warehouse-progress {
  margin-bottom: 20rpx;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.progress-label {
  font-size: 26rpx;
  color: #666;
}

.progress-text {
  font-size: 26rpx;
  color: #333;
}

.progress-bar {
  height: 12rpx;
  background-color: #f0f0f0;
  border-radius: 6rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 6rpx;
  transition: width 0.3s ease;
}

.warehouse-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.manager {
  font-size: 24rpx;
  color: #666;
}

.actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  padding: 12rpx 24rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  border: none;
  background-color: #f8f8f8;
  color: #666;
}

.action-btn.primary {
  background-color: #007AFF;
  color: #fff;
}

.action-btn.secondary {
  background-color: #FF9500;
  color: #fff;
}

/* 浮动操作按钮 */
.fab {
  position: fixed;
  bottom: 100rpx;
  right: 40rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.3);
  z-index: 100;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 40rpx;
}

.empty-image {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 30rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}
</style>
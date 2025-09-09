<template>
  <view class="inbound-list">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input">
        <uni-icons type="search" size="18" color="#999"></uni-icons>
        <input 
          v-model="searchKeyword" 
          placeholder="搜索入库单号、供应商" 
          @input="onSearch"
        />
      </view>
      <view class="filter-btn" @click="showFilter = true">
        <uni-icons type="tune" size="18" color="#007AFF"></uni-icons>
      </view>
    </view>

    <!-- 筛选标签 -->
    <view class="filter-tags" v-if="activeFilters.length > 0">
      <view 
        class="tag" 
        v-for="filter in activeFilters" 
        :key="filter.key"
        @click="removeFilter(filter.key)"
      >
        {{ filter.label }}
        <uni-icons type="close" size="12" color="#fff"></uni-icons>
      </view>
    </view>

    <!-- 统计信息 -->
    <view class="stats">
      <view class="stat-item">
        <text class="stat-value">{{ stats.total }}</text>
        <text class="stat-label">总数</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ stats.pending }}</text>
        <text class="stat-label">待收货</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ stats.receiving }}</text>
        <text class="stat-label">收货中</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ stats.completed }}</text>
        <text class="stat-label">已完成</text>
      </view>
    </view>

    <!-- 入库单列表 -->
    <scroll-view 
      class="list-container" 
      scroll-y 
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="list-item" v-for="item in inboundList" :key="item.id" @click="goToDetail(item.id)">
        <view class="item-header">
          <view class="order-info">
            <text class="order-no">{{ item.inbound_no }}</text>
            <view class="status-badge" :class="getStatusClass(item.status)">
              {{ getStatusText(item.status) }}
            </view>
          </view>
          <text class="create-time">{{ formatTime(item.created_at) }}</text>
        </view>
        
        <view class="item-content">
          <view class="supplier-info">
            <text class="supplier-name">{{ item.supplier_name }}</text>
            <text class="contact">{{ item.contact_person }} {{ item.contact_phone }}</text>
          </view>
          
          <view class="order-details">
            <view class="detail-row">
              <text class="label">商品种类：</text>
              <text class="value">{{ item.product_count }}种</text>
            </view>
            <view class="detail-row">
              <text class="label">预计数量：</text>
              <text class="value">{{ item.expected_quantity }}</text>
            </view>
            <view class="detail-row" v-if="item.received_quantity > 0">
              <text class="label">已收数量：</text>
              <text class="value">{{ item.received_quantity }}</text>
            </view>
          </view>
        </view>
        
        <view class="item-footer">
          <text class="warehouse">{{ item.warehouse_name }}</text>
          <view class="actions">
            <button 
              v-if="item.status === 'pending'" 
              class="action-btn primary" 
              size="mini"
              @click.stop="startReceiving(item.id)"
            >
              开始收货
            </button>
            <button 
              v-if="item.status === 'receiving'" 
              class="action-btn secondary" 
              size="mini"
              @click.stop="continueReceiving(item.id)"
            >
              继续收货
            </button>
          </view>
        </view>
      </view>
      
      <!-- 加载更多 -->
      <view class="load-more" v-if="hasMore">
        <uni-load-more :status="loadStatus"></uni-load-more>
      </view>
      
      <!-- 空状态 -->
      <view class="empty-state" v-if="inboundList.length === 0 && !loading">
        <image src="/static/empty.png" class="empty-image"></image>
        <text class="empty-text">暂无入库单</text>
      </view>
    </scroll-view>

    <!-- 筛选弹窗 -->
    <uni-popup ref="filterPopup" type="bottom">
      <view class="filter-popup">
        <view class="popup-header">
          <text class="popup-title">筛选条件</text>
          <view class="popup-actions">
            <button class="reset-btn" @click="resetFilter">重置</button>
            <button class="confirm-btn" @click="applyFilter">确定</button>
          </view>
        </view>
        
        <view class="filter-content">
          <!-- 状态筛选 -->
          <view class="filter-section">
            <text class="section-title">状态</text>
            <view class="option-list">
              <view 
                class="option-item" 
                v-for="status in statusOptions" 
                :key="status.value"
                @click="toggleStatus(status.value)"
              >
                <view class="checkbox" :class="{ checked: tempFilters.status.includes(status.value) }">
                  <uni-icons v-if="tempFilters.status.includes(status.value)" type="checkmarkempty" size="14" color="#fff"></uni-icons>
                </view>
                <text class="option-label">{{ status.label }}</text>
              </view>
            </view>
          </view>
          
          <!-- 时间筛选 -->
          <view class="filter-section">
            <text class="section-title">创建时间</text>
            <view class="date-range">
              <picker mode="date" :value="tempFilters.startDate" @change="onStartDateChange">
                <view class="date-input">
                  <text>{{ tempFilters.startDate || '开始日期' }}</text>
                  <uni-icons type="calendar" size="16" color="#999"></uni-icons>
                </view>
              </picker>
              <text class="date-separator">至</text>
              <picker mode="date" :value="tempFilters.endDate" @change="onEndDateChange">
                <view class="date-input">
                  <text>{{ tempFilters.endDate || '结束日期' }}</text>
                  <uni-icons type="calendar" size="16" color="#999"></uni-icons>
                </view>
              </picker>
            </view>
          </view>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import api from '@/utils/api.js'

export default {
  data() {
    return {
      searchKeyword: '',
      showFilter: false,
      refreshing: false,
      loading: false,
      hasMore: true,
      loadStatus: 'more',
      page: 1,
      pageSize: 20,
      
      // 统计数据
      stats: {
        total: 0,
        pending: 0,
        receiving: 0,
        completed: 0
      },
      
      // 入库单列表
      inboundList: [],
      
      // 筛选条件
      filters: {
        status: [],
        startDate: '',
        endDate: ''
      },
      tempFilters: {
        status: [],
        startDate: '',
        endDate: ''
      },
      
      // 状态选项
      statusOptions: [
        { value: 'pending', label: '待收货' },
        { value: 'receiving', label: '收货中' },
        { value: 'completed', label: '已完成' },
        { value: 'cancelled', label: '已取消' }
      ]
    }
  },
  
  computed: {
    activeFilters() {
      const filters = []
      
      // 状态筛选
      this.filters.status.forEach(status => {
        const option = this.statusOptions.find(opt => opt.value === status)
        if (option) {
          filters.push({
            key: `status_${status}`,
            label: option.label
          })
        }
      })
      
      // 时间筛选
      if (this.filters.startDate || this.filters.endDate) {
        const start = this.filters.startDate || '开始'
        const end = this.filters.endDate || '结束'
        filters.push({
          key: 'date_range',
          label: `${start} ~ ${end}`
        })
      }
      
      return filters
    }
  },
  
  watch: {
    showFilter(val) {
      if (val) {
        this.tempFilters = JSON.parse(JSON.stringify(this.filters))
        this.$refs.filterPopup.open()
      } else {
        this.$refs.filterPopup.close()
      }
    }
  },
  
  onLoad() {
    this.loadData()
    this.loadStats()
  },
  
  onShow() {
    // 从详情页返回时刷新数据
    this.loadData()
    this.loadStats()
  },
  
  methods: {
    // 加载数据
    async loadData(refresh = false) {
      if (refresh) {
        this.page = 1
        this.inboundList = []
        this.hasMore = true
      }
      
      if (this.loading || !this.hasMore) return
      
      this.loading = true
      this.loadStatus = 'loading'
      
      try {
        const params = {
          page: this.page,
          limit: this.pageSize,
          keyword: this.searchKeyword,
          ...this.filters
        }
        
        // 调用真实API
        const response = await api.inbound.getOrders(params)
        
        if (response.code === 200) {
          const data = response.data
          
          if (refresh) {
            this.inboundList = data.list || []
          } else {
            this.inboundList.push(...(data.list || []))
          }
          
          this.hasMore = data.has_more || false
          if (this.hasMore) {
            this.page++
          }
        } else {
          uni.showToast({
            title: response.message || '加载失败',
            icon: 'none'
          })
        }
        
      } catch (error) {
        console.error('加载数据失败:', error)
        // 使用默认数据进行演示
        if (refresh) {
          this.inboundList = [
            {
              id: 1,
              inbound_no: 'IN2024001',
              supplier_name: '苹果供应商',
              contact_person: '张三',
              contact_phone: '13800138000',
              product_count: 5,
              expected_quantity: 100,
              received_quantity: 80,
              status: 'receiving',
              created_at: Date.now() / 1000 - 3600
            },
            {
              id: 2,
              inbound_no: 'IN2024002',
              supplier_name: '华为供应商',
              contact_person: '李四',
              contact_phone: '13900139000',
              product_count: 3,
              expected_quantity: 50,
              received_quantity: 50,
              status: 'completed',
              created_at: Date.now() / 1000 - 7200
            }
          ]
        }
        uni.showToast({
          title: error.message || '网络错误，使用演示数据',
          icon: 'none'
        })
      } finally {
        this.loading = false
        this.refreshing = false
        this.loadStatus = this.hasMore ? 'more' : 'noMore'
      }
    },
    
    // 加载统计数据
    async loadStats() {
      try {
        // 模拟API调用
        const response = await this.mockStatsApiCall()
        this.stats = response.data
      } catch (error) {
        console.error('加载统计数据失败:', error)
      }
    },
    
    // 搜索
    onSearch() {
      clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => {
        this.loadData(true)
      }, 500)
    },
    
    // 下拉刷新
    onRefresh() {
      this.refreshing = true
      this.loadData(true)
      this.loadStats()
    },
    
    // 加载更多
    loadMore() {
      this.loadData()
    },
    
    // 跳转到详情页
    goToDetail(id) {
      uni.navigateTo({
        url: `/pages/inbound/detail?id=${id}`
      })
    },
    
    // 开始收货
    startReceiving(id) {
      uni.navigateTo({
        url: `/pages/inbound/receive?id=${id}`
      })
    },
    
    // 继续收货
    continueReceiving(id) {
      uni.navigateTo({
        url: `/pages/inbound/receive?id=${id}`
      })
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
    
    // 格式化时间
    formatTime(time) {
      const date = new Date(time)
      const now = new Date()
      const diff = now - date
      
      if (diff < 60000) {
        return '刚刚'
      } else if (diff < 3600000) {
        return `${Math.floor(diff / 60000)}分钟前`
      } else if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)}小时前`
      } else {
        return `${date.getMonth() + 1}-${date.getDate()}`
      }
    },
    
    // 切换状态筛选
    toggleStatus(status) {
      const index = this.tempFilters.status.indexOf(status)
      if (index > -1) {
        this.tempFilters.status.splice(index, 1)
      } else {
        this.tempFilters.status.push(status)
      }
    },
    
    // 开始日期变化
    onStartDateChange(e) {
      this.tempFilters.startDate = e.detail.value
    },
    
    // 结束日期变化
    onEndDateChange(e) {
      this.tempFilters.endDate = e.detail.value
    },
    
    // 移除筛选条件
    removeFilter(key) {
      if (key.startsWith('status_')) {
        const status = key.replace('status_', '')
        const index = this.filters.status.indexOf(status)
        if (index > -1) {
          this.filters.status.splice(index, 1)
        }
      } else if (key === 'date_range') {
        this.filters.startDate = ''
        this.filters.endDate = ''
      }
      
      this.loadData(true)
    },
    
    // 重置筛选
    resetFilter() {
      this.tempFilters = {
        status: [],
        startDate: '',
        endDate: ''
      }
    },
    
    // 应用筛选
    applyFilter() {
      this.filters = JSON.parse(JSON.stringify(this.tempFilters))
      this.showFilter = false
      this.loadData(true)
    },
    
    // 模拟API调用
    async mockApiCall(params) {
      return new Promise(resolve => {
        setTimeout(() => {
          const mockData = [
            {
              id: 1,
              inbound_no: 'IN202401001',
              supplier_name: '北京供应商A',
              contact_person: '张三',
              contact_phone: '13800138001',
              status: 'pending',
              product_count: 5,
              expected_quantity: 100,
              received_quantity: 0,
              warehouse_name: '北京仓库',
              created_at: '2024-01-15 09:30:00'
            },
            {
              id: 2,
              inbound_no: 'IN202401002',
              supplier_name: '上海供应商B',
              contact_person: '李四',
              contact_phone: '13800138002',
              status: 'receiving',
              product_count: 3,
              expected_quantity: 50,
              received_quantity: 30,
              warehouse_name: '上海仓库',
              created_at: '2024-01-14 14:20:00'
            }
          ]
          
          resolve({
            data: mockData,
            total: mockData.length
          })
        }, 1000)
      })
    },
    
    // 模拟统计API调用
    async mockStatsApiCall() {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            data: {
              total: 156,
              pending: 23,
              receiving: 8,
              completed: 125
            }
          })
        }, 500)
      })
    }
  }
}
</script>

<style scoped>
.inbound-list {
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
  margin-right: 20rpx;
}

.search-input input {
  flex: 1;
  margin-left: 16rpx;
  font-size: 28rpx;
  color: #333;
}

.filter-btn {
  padding: 16rpx;
}

/* 筛选标签 */
.filter-tags {
  display: flex;
  flex-wrap: wrap;
  padding: 20rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #eee;
}

.tag {
  display: flex;
  align-items: center;
  background-color: #007AFF;
  color: #fff;
  padding: 8rpx 16rpx;
  border-radius: 16rpx;
  font-size: 24rpx;
  margin-right: 16rpx;
  margin-bottom: 16rpx;
}

.tag uni-icons {
  margin-left: 8rpx;
}

/* 统计信息 */
.stats {
  display: flex;
  background-color: #fff;
  padding: 30rpx 20rpx;
  border-bottom: 1rpx solid #eee;
}

.stat-item {
  flex: 1;
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

/* 列表容器 */
.list-container {
  flex: 1;
  padding: 20rpx;
}

/* 列表项 */
.list-item {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.order-info {
  display: flex;
  align-items: center;
}

.order-no {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-right: 20rpx;
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
  font-size: 24rpx;
  color: #999;
}

.item-content {
  margin-bottom: 20rpx;
}

.supplier-info {
  margin-bottom: 20rpx;
}

.supplier-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  margin-right: 20rpx;
}

.contact {
  font-size: 24rpx;
  color: #666;
}

.order-details {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.detail-row {
  display: flex;
  align-items: center;
}

.label {
  font-size: 26rpx;
  color: #666;
  width: 160rpx;
}

.value {
  font-size: 26rpx;
  color: #333;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.warehouse {
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

/* 加载更多 */
.load-more {
  padding: 30rpx;
  text-align: center;
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

/* 筛选弹窗 */
.filter-popup {
  background-color: #fff;
  border-radius: 20rpx 20rpx 0 0;
  max-height: 80vh;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #eee;
}

.popup-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.popup-actions {
  display: flex;
  gap: 20rpx;
}

.reset-btn, .confirm-btn {
  padding: 12rpx 24rpx;
  border-radius: 20rpx;
  font-size: 26rpx;
  border: none;
}

.reset-btn {
  background-color: #f8f8f8;
  color: #666;
}

.confirm-btn {
  background-color: #007AFF;
  color: #fff;
}

.filter-content {
  padding: 30rpx;
  max-height: 60vh;
  overflow-y: auto;
}

.filter-section {
  margin-bottom: 40rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.option-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.option-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
}

.checkbox {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #ddd;
  border-radius: 6rpx;
  margin-right: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox.checked {
  background-color: #007AFF;
  border-color: #007AFF;
}

.option-label {
  font-size: 28rpx;
  color: #333;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.date-input {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background-color: #f8f8f8;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
}

.date-separator {
  font-size: 26rpx;
  color: #666;
}
</style>
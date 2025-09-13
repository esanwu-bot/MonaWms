<template>
  <view class="devices-page">
    <!-- 搜索和筛选栏 -->
    <view class="search-bar">
      <view class="search-input">
        <uni-icons type="search" size="18" color="#999"></uni-icons>
        <input 
          v-model="searchKeyword" 
          placeholder="搜索设备名称、型号或序列号" 
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
        <text class="stat-label">总设备</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ stats.available }}</text>
        <text class="stat-label">可用</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ stats.inUse }}</text>
        <text class="stat-label">使用中</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ stats.maintenance }}</text>
        <text class="stat-label">维护中</text>
      </view>
    </view>

    <!-- 设备列表 -->
    <scroll-view 
      class="list-container" 
      scroll-y 
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="device-item" v-for="device in deviceList" :key="device.id" @click="goToDetail(device.id)">
        <view class="device-header">
          <view class="device-info">
            <text class="device-name">{{ device.device_name }}</text>
            <text class="device-model">{{ device.model }}</text>
          </view>
          <view class="device-status" :class="getStatusClass(device.status)">
            {{ getStatusText(device.status) }}
          </view>
        </view>
        
        <view class="device-details">
          <view class="detail-row">
            <text class="label">序列号：</text>
            <text class="value">{{ device.serial_number }}</text>
          </view>
          <view class="detail-row">
            <text class="label">类型：</text>
            <text class="value">{{ getDeviceTypeText(device.device_type) }}</text>
          </view>
          <view class="detail-row">
            <text class="label">位置：</text>
            <text class="value">{{ device.location || '未分配' }}</text>
          </view>
          <view class="detail-row">
            <text class="label">供应商：</text>
            <text class="value">{{ device.supplier_name }}</text>
          </view>
        </view>
        
        <view class="device-footer">
          <text class="create-time">{{ formatTime(device.created_at) }}</text>
          <view class="actions">
            <button 
              v-if="device.status === 'available'" 
              class="action-btn primary" 
              size="mini"
              @click.stop="assignDevice(device.id)"
            >
              分配使用
            </button>
            <button 
              v-if="device.status === 'in_use'" 
              class="action-btn secondary" 
              size="mini"
              @click.stop="returnDevice(device.id)"
            >
              归还设备
            </button>
            <button 
              class="action-btn" 
              size="mini"
              @click.stop="editDevice(device.id)"
            >
              编辑
            </button>
          </view>
        </view>
      </view>
      
      <!-- 加载更多 -->
      <view class="load-more" v-if="hasMore">
        <uni-load-more :status="loadStatus"></uni-load-more>
      </view>
      
      <!-- 空状态 -->
      <view class="empty-state" v-if="deviceList.length === 0 && !loading">
        <image src="/static/empty.png" class="empty-image"></image>
        <text class="empty-text">暂无设备数据</text>
      </view>
    </scroll-view>

    <!-- 浮动操作按钮 -->
    <view class="fab" @click="addDevice">
      <uni-icons type="plus" size="24" color="#fff"></uni-icons>
    </view>

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
            <text class="section-title">设备状态</text>
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
          
          <!-- 设备类型筛选 -->
          <view class="filter-section">
            <text class="section-title">设备类型</text>
            <view class="option-list">
              <view 
                class="option-item" 
                v-for="type in deviceTypeOptions" 
                :key="type.value"
                @click="toggleDeviceType(type.value)"
              >
                <view class="checkbox" :class="{ checked: tempFilters.device_type.includes(type.value) }">
                  <uni-icons v-if="tempFilters.device_type.includes(type.value)" type="checkmarkempty" size="14" color="#fff"></uni-icons>
                </view>
                <text class="option-label">{{ type.label }}</text>
              </view>
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
        available: 0,
        inUse: 0,
        maintenance: 0
      },
      
      // 设备列表
      deviceList: [],
      
      // 筛选条件
      filters: {
        status: [],
        device_type: []
      },
      tempFilters: {
        status: [],
        device_type: []
      },
      
      // 状态选项
      statusOptions: [
        { value: 'available', label: '可用' },
        { value: 'in_use', label: '使用中' },
        { value: 'maintenance', label: '维护中' },
        { value: 'scrapped', label: '已报废' }
      ],
      
      // 设备类型选项
      deviceTypeOptions: [
        { value: 'router', label: '路由器' },
        { value: 'switch', label: '交换机' },
        { value: 'firewall', label: '防火墙' },
        { value: 'ap', label: '无线AP' },
        { value: 'server', label: '服务器' },
        { value: 'base_station', label: '基站设备' },
        { value: 'optical', label: '光端机' },
        { value: 'other', label: '其他设备' }
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
      
      // 设备类型筛选
      this.filters.device_type.forEach(type => {
        const option = this.deviceTypeOptions.find(opt => opt.value === type)
        if (option) {
          filters.push({
            key: `type_${type}`,
            label: option.label
          })
        }
      })
      
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
    this.loadData()
    this.loadStats()
  },
  
  methods: {
    // 加载数据
    async loadData(refresh = false) {
      if (refresh) {
        this.page = 1
        this.deviceList = []
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
        
        // 使用模拟数据
        const response = await this.mockApiCall(params)
        
        if (refresh) {
          this.deviceList = response.data || []
        } else {
          this.deviceList.push(...(response.data || []))
        }
        
        this.hasMore = response.has_more || false
        if (this.hasMore) {
          this.page++
        }
        
      } catch (error) {
        console.error('加载数据失败:', error)
        uni.showToast({
          title: '加载失败',
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
        url: `/pages/devices/detail?id=${id}`
      })
    },
    
    // 分配设备
    assignDevice(id) {
      uni.showModal({
        title: '分配设备',
        content: '此功能正在开发中...',
        showCancel: false
      })
    },
    
    // 归还设备
    returnDevice(id) {
      uni.showModal({
        title: '归还设备',
        content: '确认归还此设备？',
        success: (res) => {
          if (res.confirm) {
            uni.showToast({
              title: '归还成功',
              icon: 'success'
            })
            this.loadData(true)
          }
        }
      })
    },
    
    // 编辑设备
    editDevice(id) {
      uni.navigateTo({
        url: `/pages/devices/edit?id=${id}`
      })
    },
    
    // 新增设备
    addDevice() {
      uni.navigateTo({
        url: '/pages/devices/add'
      })
    },
    
    // 获取状态样式类
    getStatusClass(status) {
      const classMap = {
        'available': 'status-available',
        'in_use': 'status-in-use',
        'maintenance': 'status-maintenance',
        'scrapped': 'status-scrapped'
      }
      return classMap[status] || ''
    },
    
    // 获取状态文本
    getStatusText(status) {
      const textMap = {
        'available': '可用',
        'in_use': '使用中',
        'maintenance': '维护中',
        'scrapped': '已报废'
      }
      return textMap[status] || '未知'
    },
    
    // 获取设备类型文本
    getDeviceTypeText(type) {
      const textMap = {
        'router': '路由器',
        'switch': '交换机',
        'firewall': '防火墙',
        'ap': '无线AP',
        'server': '服务器',
        'base_station': '基站设备',
        'optical': '光端机',
        'other': '其他设备'
      }
      return textMap[type] || '未知类型'
    },
    
    // 格式化时间
    formatTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp * 1000)
      return `${date.getMonth() + 1}-${date.getDate()}`
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
    
    // 切换设备类型筛选
    toggleDeviceType(type) {
      const index = this.tempFilters.device_type.indexOf(type)
      if (index > -1) {
        this.tempFilters.device_type.splice(index, 1)
      } else {
        this.tempFilters.device_type.push(type)
      }
    },
    
    // 移除筛选条件
    removeFilter(key) {
      if (key.startsWith('status_')) {
        const status = key.replace('status_', '')
        const index = this.filters.status.indexOf(status)
        if (index > -1) {
          this.filters.status.splice(index, 1)
        }
      } else if (key.startsWith('type_')) {
        const type = key.replace('type_', '')
        const index = this.filters.device_type.indexOf(type)
        if (index > -1) {
          this.filters.device_type.splice(index, 1)
        }
      }
      
      this.loadData(true)
    },
    
    // 重置筛选
    resetFilter() {
      this.tempFilters = {
        status: [],
        device_type: []
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
              device_name: '华为路由器 AR2220',
              model: 'AR2220-S',
              serial_number: 'HW2220001',
              device_type: 'router',
              status: 'available',
              location: 'A区-01-05',
              supplier_name: '华为技术',
              created_at: Date.now() / 1000 - 86400
            },
            {
              id: 2,
              device_name: '中兴交换机 ZXR10',
              model: 'ZXR10-5960',
              serial_number: 'ZTE5960002',
              device_type: 'switch',
              status: 'in_use',
              location: 'B区-02-10',
              supplier_name: '中兴通讯',
              created_at: Date.now() / 1000 - 172800
            },
            {
              id: 3,
              device_name: '思科防火墙 ASA5506',
              model: 'ASA5506-X',
              serial_number: 'CISCO5506003',
              device_type: 'firewall',
              status: 'maintenance',
              location: '维修区-01',
              supplier_name: '思科系统',
              created_at: Date.now() / 1000 - 259200
            },
            {
              id: 4,
              device_name: 'TP-Link 无线AP',
              model: 'EAP245',
              serial_number: 'TPLINK245004',
              device_type: 'ap',
              status: 'available',
              location: 'C区-03-15',
              supplier_name: 'TP-Link',
              created_at: Date.now() / 1000 - 345600
            }
          ]
          
          resolve({
            data: mockData,
            has_more: false
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
              total: 1258,
              available: 856,
              inUse: 142,
              maintenance: 68
            }
          })
        }, 500)
      })
    }
  }
}
</script>

<style scoped>
.devices-page {
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

/* 设备项 */
.device-item {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.device-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20rpx;
}

.device-info {
  flex: 1;
}

.device-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.device-model {
  font-size: 24rpx;
  color: #666;
  display: block;
}

.device-status {
  padding: 8rpx 16rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
  color: #fff;
}

.status-available {
  background-color: #34C759;
}

.status-in-use {
  background-color: #FF9500;
}

.status-maintenance {
  background-color: #FF3B30;  
}

.status-scrapped {
  background-color: #8E8E93;
}

.device-details {
  margin-bottom: 20rpx;
}

.detail-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}

.label {
  font-size: 26rpx;
  color: #666;
  width: 140rpx;
}

.value {
  font-size: 26rpx;
  color: #333;
  flex: 1;
}

.device-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.create-time {
  font-size: 24rpx;
  color: #999;
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

.action-btn:not(.primary):not(.secondary) {
  background-color: #f8f8f8;
  color: #666;
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
</style>
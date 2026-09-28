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
	display: flex;
	flex-direction: column;
	background: #0a0e16;
}

/* 搜索栏 */
.search-bar {
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 20rpx 32rpx;

	.search-input {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 14rpx;
		height: 76rpx;
		padding: 0 28rpx;
		background: #161e2e;
		border: 1rpx solid rgba(148, 163, 184, .12);
		border-radius: 22rpx;

		input {
			flex: 1;
			font-size: 26rpx;
			color: #e8edf6;
			background: transparent;
			border: none;
		}
	}

	.filter-btn {
		width: 76rpx;
		height: 76rpx;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #161e2e;
		border: 1rpx solid rgba(148, 163, 184, .12);
		border-radius: 22rpx;
	}
}

/* 已选筛选 */
.filter-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
	padding: 0 32rpx 20rpx;

	.tag {
		display: flex;
		align-items: center;
		gap: 8rpx;
	}
}

/* 统计条 */
.stats {
	display: flex;
	gap: 16rpx;
	padding: 0 32rpx 24rpx;

	.stat-item {
		flex: 1;
		padding: 18rpx 12rpx;
		background: #111725;
		border: 1rpx solid rgba(148, 163, 184, .09);
		border-radius: 24rpx;
		text-align: center;
	}

	.stat-value {
		display: block;
		font-size: 34rpx;
		font-weight: 700;
		color: #22d3ee;
		font-family: "JetBrains Mono", Menlo, Consolas, monospace;
	}

	.stat-label {
		display: block;
		margin-top: 6rpx;
		font-size: 20rpx;
		color: #5c677d;
	}
}

/* 列表 */
.list-container {
	flex: 1;
	padding: 0 32rpx calc(140rpx + env(safe-area-inset-bottom));
}

.device-item {
	padding: 28rpx;
	margin-bottom: 24rpx;
	background: #111725;
	border: 1rpx solid rgba(148, 163, 184, .09);
	border-radius: 32rpx;
	transition: transform .15s ease;

	&:active {
		transform: scale(.985);
	}

	.device-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 20rpx;
	}

	.device-info {
		flex: 1;
		min-width: 0;

		.device-name {
			display: block;
			font-size: 29rpx;
			font-weight: 600;
			color: #e8edf6;
		}

		.device-model {
			display: block;
			margin-top: 6rpx;
			font-size: 22rpx;
			color: #5c677d;
			font-family: "JetBrains Mono", Menlo, Consolas, monospace;
		}
	}

	.device-status {
		flex-shrink: 0;
		margin-left: 16rpx;
		padding: 6rpx 18rpx;
		border-radius: 999rpx;
		font-size: 22rpx;
		font-weight: 600;
		color: #9aa5bb;
		background: rgba(148, 163, 184, .1);

		&.status-available {
			color: #34d399;
			background: rgba(52, 211, 153, .12);
		}

		&.status-in-use {
			color: #a78bfa;
			background: rgba(167, 139, 250, .12);
		}

		&.status-maintenance {
			color: #fbbf24;
			background: rgba(251, 191, 36, .12);
		}

		&.status-scrapped {
			color: #f87171;
			background: rgba(248, 113, 113, .12);
		}
	}

	.device-details {
		display: flex;
		flex-wrap: wrap;
		gap: 0 32rpx;

		.detail-row {
			width: 50%;
			display: flex;
			align-items: center;
			gap: 8rpx;
			padding: 6rpx 0;
		}

		.label {
			font-size: 23rpx;
			color: #5c677d;
		}

		.value {
			font-size: 24rpx;
			color: #e8edf6;
		}
	}

	.device-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20rpx;
		margin-top: 20rpx;
		padding-top: 20rpx;
		border-top: 1rpx solid rgba(148, 163, 184, .09);

		.create-time {
			font-size: 22rpx;
			color: #5c677d;
			font-family: "JetBrains Mono", Menlo, Consolas, monospace;
		}

		.actions {
			display: flex;
			gap: 12rpx;
			margin: 0;
		}

		.action-btn {
			width: auto;
			min-width: 140rpx;
			flex: none;
			height: 64rpx;
			line-height: 64rpx;
			padding: 0 24rpx;
			border-radius: 18rpx;
			background: #161e2e;
			border: 1rpx solid rgba(148, 163, 184, .12);
			color: #9aa5bb;
			font-size: 23rpx;
		}
	}
}

/* 筛选弹窗 */
.filter-popup {
	max-height: 80vh;

	.popup-header {
		align-items: center;
	}

	.popup-actions {
		display: flex;
		gap: 16rpx;
		margin: 0;

		.reset-btn,
		.confirm-btn {
			width: auto;
			min-width: 150rpx;
			flex: none;
			height: 68rpx;
			line-height: 68rpx;
			padding: 0 30rpx;
			border-radius: 20rpx;
			font-size: 25rpx;
		}
	}

	.filter-content {
		max-height: 60vh;
		overflow-y: auto;
	}

	.option-list {
		display: flex;
		flex-wrap: wrap;
		gap: 16rpx;
	}

	.checkbox {
		width: 34rpx;
		height: 34rpx;
		border-radius: 12rpx;
		border: 2rpx solid rgba(148, 163, 184, .3);
		display: flex;
		align-items: center;
		justify-content: center;

		&.checked {
			background: #22d3ee;
			border-color: #22d3ee;
		}
	}
}
</style>
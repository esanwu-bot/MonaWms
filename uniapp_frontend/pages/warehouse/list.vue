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
	display: flex;
	flex-direction: column;
	background: #0a0e16;
}

/* 搜索栏 */
.search-bar {
	padding: 20rpx 32rpx;

	.search-input {
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
}

/* 列表 */
.list-container {
	flex: 1;
	padding: 0 32rpx calc(140rpx + env(safe-area-inset-bottom));
}

.warehouse-item {
	padding: 28rpx;
	margin-bottom: 24rpx;
	background: #111725;
	border: 1rpx solid rgba(148, 163, 184, .09);
	border-radius: 32rpx;
	transition: transform .15s ease;

	&:active {
		transform: scale(.985);
	}

	.warehouse-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 24rpx;
	}

	.warehouse-info {
		flex: 1;
		min-width: 0;

		.warehouse-name {
			display: block;
			font-size: 32rpx;
			font-weight: 700;
			color: #e8edf6;
		}

		.warehouse-location {
			display: block;
			margin-top: 6rpx;
			font-size: 23rpx;
			color: #5c677d;
		}
	}

	.warehouse-status {
		flex-shrink: 0;
		margin-left: 16rpx;
		padding: 6rpx 18rpx;
		border-radius: 999rpx;
		font-size: 22rpx;
		font-weight: 600;
		color: #9aa5bb;
		background: rgba(148, 163, 184, .1);

		&.status-active {
			color: #34d399;
			background: rgba(52, 211, 153, .12);
		}

		&.status-maintenance {
			color: #fbbf24;
			background: rgba(251, 191, 36, .12);
		}

		&.status-inactive {
			color: #f87171;
			background: rgba(248, 113, 113, .12);
		}
	}

	.warehouse-stats {
		margin-bottom: 24rpx;

		.stat-group {
			display: flex;
			gap: 16rpx;
		}

		.stat-item {
			flex: 1;
			padding: 20rpx 8rpx;
			background: #161e2e;
			border-radius: 20rpx;
			text-align: center;
		}

		.stat-value {
			display: block;
			font-size: 32rpx;
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

	.warehouse-progress {
		margin-bottom: 24rpx;

		.progress-info {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: 12rpx;
		}

		.progress-label {
			font-size: 23rpx;
			color: #9aa5bb;
		}

		.progress-text {
			font-size: 22rpx;
			color: #e8edf6;
			font-family: "JetBrains Mono", Menlo, Consolas, monospace;
		}

		.progress-bar {
			height: 12rpx;
			background: #1c2536;
			border-radius: 8rpx;
			overflow: hidden;
		}

		.progress-fill {
			height: 100%;
			border-radius: 8rpx;
			background: linear-gradient(90deg, #06b6d4, #22d3ee);
			transition: width .6s cubic-bezier(.22, 1, .36, 1);
		}
	}

	.warehouse-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20rpx;
		padding-top: 20rpx;
		border-top: 1rpx solid rgba(148, 163, 184, .09);

		.manager {
			font-size: 23rpx;
			color: #9aa5bb;
		}

		.actions {
			display: flex;
			gap: 12rpx;
			margin: 0;
		}

		.action-btn {
			width: auto;
			min-width: 150rpx;
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

.empty-state {
	padding: 140rpx 0;
	text-align: center;
}

.empty-image {
	width: 200rpx;
	height: 200rpx;
	margin-bottom: 24rpx;
	opacity: .35;
}

.empty-text {
	font-size: 26rpx;
	color: #5c677d;
}
</style>
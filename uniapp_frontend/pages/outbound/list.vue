<template>
  <view class="outbound-list">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input">
        <uni-icons type="search" size="20" color="#999"></uni-icons>
        <input 
          type="text" 
          placeholder="搜索出库单号、客户名称" 
          v-model="searchKeyword"
          @input="onSearch"
        />
      </view>
    </view>

    <!-- 筛选标签 -->
    <view class="filter-tags">
      <view 
        class="filter-tag" 
        :class="{ active: activeStatus === 'all' }"
        @click="filterByStatus('all')"
      >
        全部
      </view>
      <view 
        class="filter-tag" 
        :class="{ active: activeStatus === 'pending' }"
        @click="filterByStatus('pending')"
      >
        待拣货
      </view>
      <view 
        class="filter-tag" 
        :class="{ active: activeStatus === 'picking' }"
        @click="filterByStatus('picking')"
      >
        拣货中
      </view>
      <view 
        class="filter-tag" 
        :class="{ active: activeStatus === 'completed' }"
        @click="filterByStatus('completed')"
      >
        已完成
      </view>
      <view class="filter-more" @click="showFilterPopup = true">
        <uni-icons type="tune" size="16" color="#666"></uni-icons>
        筛选
      </view>
    </view>

    <!-- 统计信息 -->
    <view class="statistics">
      <view class="stat-item">
        <text class="stat-number">{{ statistics.total }}</text>
        <text class="stat-label">总计</text>
      </view>
      <view class="stat-item">
        <text class="stat-number">{{ statistics.pending }}</text>
        <text class="stat-label">待拣货</text>
      </view>
      <view class="stat-item">
        <text class="stat-number">{{ statistics.picking }}</text>
        <text class="stat-label">拣货中</text>
      </view>
      <view class="stat-item">
        <text class="stat-number">{{ statistics.completed }}</text>
        <text class="stat-label">已完成</text>
      </view>
    </view>

    <!-- 出库单列表 -->
    <scroll-view 
      class="list-container" 
      scroll-y="true" 
      @scrolltolower="loadMore"
      refresher-enabled="true"
      @refresherrefresh="onRefresh"
      :refresher-triggered="refreshing"
    >
      <view class="list-item" v-for="item in filteredList" :key="item.id" @click="goToDetail(item.id)">
        <view class="item-header">
          <text class="order-no">{{ item.orderNo }}</text>
          <view class="status-badge" :class="getStatusClass(item.status)">
            {{ getStatusText(item.status) }}
          </view>
        </view>
        
        <view class="item-content">
          <view class="customer-info">
            <uni-icons type="person" size="16" color="#666"></uni-icons>
            <text class="customer-name">{{ item.customerName }}</text>
          </view>
          
          <view class="order-info">
            <view class="info-row">
              <text class="info-label">商品数量:</text>
              <text class="info-value">{{ item.productCount }}种</text>
            </view>
            <view class="info-row">
              <text class="info-label">预计数量:</text>
              <text class="info-value">{{ item.expectedQuantity }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">已拣数量:</text>
              <text class="info-value picked">{{ item.pickedQuantity }}</text>
            </view>
          </view>
          
          <view class="warehouse-info">
            <uni-icons type="home" size="16" color="#666"></uni-icons>
            <text class="warehouse-name">{{ item.warehouseName }}</text>
          </view>
        </view>
        
        <view class="item-footer">
          <text class="create-time">{{ formatTime(item.createTime) }}</text>
          <view class="progress-info">
            <text class="progress-text">{{ getProgressText(item) }}</text>
            <view class="progress-bar">
              <view class="progress-fill" :style="{ width: getProgressPercent(item) + '%' }"></view>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 加载更多 -->
      <view class="load-more" v-if="hasMore">
        <uni-icons type="reload" size="16" color="#999"></uni-icons>
        <text>加载更多...</text>
      </view>
      
      <!-- 空状态 -->
      <view class="empty-state" v-if="filteredList.length === 0 && !loading">
        <uni-icons type="inbox" size="60" color="#ccc"></uni-icons>
        <text>暂无出库单</text>
      </view>
    </scroll-view>

    <!-- 筛选弹窗 -->
    <uni-popup ref="filterPopup" type="bottom" :mask-click="false">
      <view class="filter-popup">
        <view class="popup-header">
          <text class="popup-title">筛选条件</text>
          <view class="popup-actions">
            <text class="reset-btn" @click="resetFilter">重置</text>
            <text class="confirm-btn" @click="applyFilter">确定</text>
          </view>
        </view>
        
        <view class="popup-content">
          <view class="filter-section">
            <text class="section-title">出库状态</text>
            <view class="option-list">
              <view 
                class="option-item" 
                v-for="status in statusOptions" 
                :key="status.value"
                @click="toggleStatus(status.value)"
              >
                <view class="checkbox" :class="{ checked: tempFilter.status.includes(status.value) }">
                  <uni-icons v-if="tempFilter.status.includes(status.value)" type="checkmarkempty" size="14" color="#fff"></uni-icons>
                </view>
                <text class="option-label">{{ status.label }}</text>
              </view>
            </view>
          </view>
          
          <view class="filter-section">
            <text class="section-title">仓库</text>
            <view class="option-list">
              <view 
                class="option-item" 
                v-for="warehouse in warehouseOptions" 
                :key="warehouse.value"
                @click="toggleWarehouse(warehouse.value)"
              >
                <view class="checkbox" :class="{ checked: tempFilter.warehouse.includes(warehouse.value) }">
                  <uni-icons v-if="tempFilter.warehouse.includes(warehouse.value)" type="checkmarkempty" size="14" color="#fff"></uni-icons>
                </view>
                <text class="option-label">{{ warehouse.label }}</text>
              </view>
            </view>
          </view>
          
          <view class="filter-section">
            <text class="section-title">创建时间</text>
            <view class="date-range">
              <picker mode="date" @change="onStartDateChange">
                <view class="date-input">
                  <text>{{ tempFilter.startDate || '开始日期' }}</text>
                  <uni-icons type="calendar" size="16" color="#999"></uni-icons>
                </view>
              </picker>
              <text class="date-separator">至</text>
              <picker mode="date" @change="onEndDateChange">
                <view class="date-input">
                  <text>{{ tempFilter.endDate || '结束日期' }}</text>
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
      activeStatus: 'all',
      loading: false,
      refreshing: false,
      hasMore: true,
      page: 1,
      pageSize: 20,
      showFilterPopup: false,
      
      // 统计数据
      statistics: {
        total: 0,
        pending: 0,
        picking: 0,
        completed: 0
      },
      
      // 出库单列表
      outboundList: [],
      
      // 筛选条件
      filter: {
        status: [],
        warehouse: [],
        startDate: '',
        endDate: ''
      },
      
      // 临时筛选条件
      tempFilter: {
        status: [],
        warehouse: [],
        startDate: '',
        endDate: ''
      },
      
      // 状态选项
      statusOptions: [
        { label: '待拣货', value: 'pending' },
        { label: '拣货中', value: 'picking' },
        { label: '已完成', value: 'completed' },
        { label: '已取消', value: 'cancelled' }
      ],
      
      // 仓库选项
      warehouseOptions: [
        { label: '主仓库', value: 'main' },
        { label: '分仓库A', value: 'branch_a' },
        { label: '分仓库B', value: 'branch_b' }
      ]
    }
  },
  
  computed: {
    filteredList() {
      let list = this.outboundList
      
      // 关键词搜索
      if (this.searchKeyword) {
        const keyword = this.searchKeyword.toLowerCase()
        list = list.filter(item => 
          item.orderNo.toLowerCase().includes(keyword) ||
          item.customerName.toLowerCase().includes(keyword)
        )
      }
      
      // 状态筛选
      if (this.activeStatus !== 'all') {
        list = list.filter(item => item.status === this.activeStatus)
      }
      
      // 高级筛选
      if (this.filter.status.length > 0) {
        list = list.filter(item => this.filter.status.includes(item.status))
      }
      
      if (this.filter.warehouse.length > 0) {
        list = list.filter(item => this.filter.warehouse.includes(item.warehouseId))
      }
      
      return list
    }
  },
  
  onLoad() {
    this.loadData()
    this.loadStatistics()
  },
  
  onPullDownRefresh() {
    this.onRefresh()
  },
  
  methods: {
    // 加载数据
    async loadData(refresh = false) {
      if (this.loading) return
      
      this.loading = true
      
      if (refresh) {
        this.page = 1
        this.hasMore = true
      }
      
      try {
        const params = {
          page: this.page,
          limit: 20,
          keyword: this.searchKeyword,
          status: this.activeStatus !== 'all' ? this.activeStatus : undefined
        }
        
        // 调用真实API
        const response = await api.outbound.getOrders(params)
        
        if (response.code === 200) {
          const data = response.data
          
          if (refresh) {
            this.outboundList = data.list || []
          } else {
            this.outboundList.push(...(data.list || []))
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
        console.error('加载出库数据失败:', error)
        // 使用默认数据进行演示
        if (refresh) {
          this.outboundList = [
            {
              id: 1,
              orderNo: 'OUT2024001',
              customerName: '客户A',
              status: 'pending',
              productCount: 5,
              expectedQuantity: 100,
              pickedQuantity: 0,
              warehouseName: '主仓库',
              warehouseId: 'main',
              createTime: new Date(Date.now() - 3600000).toISOString()
            },
            {
              id: 2,
              orderNo: 'OUT2024002',
              customerName: '客户B',
              status: 'picking',
              productCount: 3,
              expectedQuantity: 50,
              pickedQuantity: 30,
              warehouseName: '主仓库',
              warehouseId: 'main',
              createTime: new Date(Date.now() - 7200000).toISOString()
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
        uni.stopPullDownRefresh()
      }
    },
    
    // 加载统计数据
    async loadStatistics() {
      try {
        // 模拟API调用
        this.statistics = {
          total: 156,
          pending: 23,
          picking: 45,
          completed: 88
        }
      } catch (error) {
        console.error('加载统计数据失败:', error)
      }
    },
    
    // 模拟API调用
    mockApiCall() {
      return new Promise((resolve) => {
        setTimeout(() => {
          const mockData = Array.from({ length: 10 }, (_, index) => ({
            id: `OUT${Date.now()}${index}`,
            orderNo: `OUT202401${String(index + 1).padStart(3, '0')}`,
            customerName: `客户${String.fromCharCode(65 + index)}`,
            status: ['pending', 'picking', 'completed'][Math.floor(Math.random() * 3)],
            productCount: Math.floor(Math.random() * 10) + 1,
            expectedQuantity: Math.floor(Math.random() * 100) + 50,
            pickedQuantity: Math.floor(Math.random() * 80) + 10,
            warehouseName: '主仓库',
            warehouseId: 'main',
            createTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
          }))
          
          resolve({
            data: mockData,
            hasMore: this.page < 5
          })
        }, 1000)
      })
    },
    
    // 搜索
    onSearch() {
      // 防抖处理
      clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => {
        // 搜索逻辑在computed中处理
      }, 300)
    },
    
    // 状态筛选
    filterByStatus(status) {
      this.activeStatus = status
    },
    
    // 刷新
    onRefresh() {
      this.refreshing = true
      this.loadData(true)
      this.loadStatistics()
    },
    
    // 加载更多
    loadMore() {
      if (!this.hasMore || this.loading) return
      this.loadData()
    },
    
    // 跳转到详情页
    goToDetail(id) {
      uni.navigateTo({
        url: `/pages/outbound/detail?id=${id}`
      })
    },
    
    // 跳转到拣货页
    goToPick(id) {
      uni.navigateTo({
        url: `/pages/outbound/pick?id=${id}`
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
    
    // 获取进度文本
    getProgressText(item) {
      return `${item.pickedQuantity}/${item.expectedQuantity}`
    },
    
    // 获取进度百分比
    getProgressPercent(item) {
      if (item.expectedQuantity === 0) return 0
      return Math.min((item.pickedQuantity / item.expectedQuantity) * 100, 100)
    },
    
    // 格式化时间
    formatTime(timeStr) {
      const date = new Date(timeStr)
      const now = new Date()
      const diff = now - date
      
      if (diff < 60000) {
        return '刚刚'
      } else if (diff < 3600000) {
        return `${Math.floor(diff / 60000)}分钟前`
      } else if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)}小时前`
      } else {
        return date.toLocaleDateString()
      }
    },
    
    // 切换状态筛选
    toggleStatus(status) {
      const index = this.tempFilter.status.indexOf(status)
      if (index > -1) {
        this.tempFilter.status.splice(index, 1)
      } else {
        this.tempFilter.status.push(status)
      }
    },
    
    // 切换仓库筛选
    toggleWarehouse(warehouse) {
      const index = this.tempFilter.warehouse.indexOf(warehouse)
      if (index > -1) {
        this.tempFilter.warehouse.splice(index, 1)
      } else {
        this.tempFilter.warehouse.push(warehouse)
      }
    },
    
    // 开始日期变化
    onStartDateChange(e) {
      this.tempFilter.startDate = e.detail.value
    },
    
    // 结束日期变化
    onEndDateChange(e) {
      this.tempFilter.endDate = e.detail.value
    },
    
    // 重置筛选
    resetFilter() {
      this.tempFilter = {
        status: [],
        warehouse: [],
        startDate: '',
        endDate: ''
      }
    },
    
    // 应用筛选
    applyFilter() {
      this.filter = { ...this.tempFilter }
      this.showFilterPopup = false
      this.$refs.filterPopup.close()
    }
  }
}
</script>

<style scoped>
.outbound-list {
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

/* chips */
.filter-tags {
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 0 32rpx 20rpx;

	.filter-tag {
		flex-shrink: 0;
		padding: 12rpx 28rpx;
		background: #111725;
		border: 1rpx solid rgba(148, 163, 184, .12);
		border-radius: 999rpx;
		color: #9aa5bb;
		font-size: 24rpx;
		font-weight: 600;
		transition: all .2s ease;

		&.active {
			background: rgba(34, 211, 238, .12);
			border-color: rgba(34, 211, 238, .35);
			color: #22d3ee;
		}
	}

	.filter-more {
		display: flex;
		align-items: center;
		gap: 8rpx;
		margin-left: auto;
		padding: 12rpx 24rpx;
		border-radius: 999rpx;
		background: #161e2e;
		border: 1rpx solid rgba(148, 163, 184, .12);
		color: #9aa5bb;
		font-size: 24rpx;
	}
}

/* 统计条 */
.statistics {
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

	.stat-number {
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
	padding: 0 32rpx calc(32rpx + env(safe-area-inset-bottom));
}

.list-item {
	padding: 28rpx;
	margin-bottom: 24rpx;
	background: #111725;
	border: 1rpx solid rgba(148, 163, 184, .09);
	border-radius: 32rpx;
	transition: transform .15s ease;

	&:active {
		transform: scale(.985);
	}

	.item-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 20rpx;
	}

	.order-no {
		font-size: 28rpx;
		font-weight: 600;
		color: #22d3ee;
		letter-spacing: .02em;
		font-family: "JetBrains Mono", Menlo, Consolas, monospace;
	}

	.customer-info,
	.warehouse-info {
		display: flex;
		align-items: center;
		gap: 10rpx;
		font-size: 25rpx;
		color: #9aa5bb;
	}

	.customer-info {
		margin-bottom: 16rpx;

		.customer-name {
			font-size: 28rpx;
			font-weight: 600;
			color: #e8edf6;
		}
	}

	.order-info {
		display: flex;
		flex-wrap: wrap;
		gap: 0 32rpx;

		.info-row {
			width: 50%;
			display: flex;
			align-items: center;
			gap: 8rpx;
			padding: 6rpx 0;
		}

		.info-label {
			font-size: 23rpx;
			color: #5c677d;
		}

		.info-value {
			font-size: 24rpx;
			color: #e8edf6;
			font-family: "JetBrains Mono", Menlo, Consolas, monospace;

			&.picked {
				color: #34d399;
			}
		}
	}

	.warehouse-info {
		margin-top: 12rpx;
	}

	.item-footer {
		display: flex;
		align-items: center;
		gap: 24rpx;
		margin-top: 22rpx;
		padding-top: 20rpx;
		border-top: 1rpx solid rgba(148, 163, 184, .09);

		.create-time {
			flex-shrink: 0;
			font-size: 22rpx;
			color: #5c677d;
			font-family: "JetBrains Mono", Menlo, Consolas, monospace;
		}

		.progress-info {
			flex: 1;
			display: flex;
			align-items: center;
			gap: 16rpx;
		}

		.progress-text {
			flex-shrink: 0;
			font-size: 22rpx;
			color: #9aa5bb;
			font-family: "JetBrains Mono", Menlo, Consolas, monospace;
		}

		.progress-bar {
			flex: 1;
			height: 10rpx;
			background: #1c2536;
			border-radius: 6rpx;
			overflow: hidden;
		}

		.progress-fill {
			height: 100%;
			border-radius: 6rpx;
			background: linear-gradient(90deg, #06b6d4, #22d3ee);
			transition: width .6s cubic-bezier(.22, 1, .36, 1);
		}
	}
}

/* 空态 */
.empty-state {
	padding: 140rpx 0;
	text-align: center;
	font-size: 26rpx;
	color: #5c677d;
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
			padding: 12rpx 30rpx;
			border-radius: 20rpx;
			font-size: 25rpx;
		}

		.reset-btn {
			background: #161e2e;
			border: 1rpx solid rgba(148, 163, 184, .12);
			color: #9aa5bb;
		}

		.confirm-btn {
			background: linear-gradient(135deg, #06b6d4, #0891b2);
			color: #04222b;
		}
	}

	.popup-content {
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

	.option-item:active .checkbox {
		border-color: #22d3ee;
	}
}
</style>
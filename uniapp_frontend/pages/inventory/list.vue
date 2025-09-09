<template>
	<view class="inventory-list">
		<!-- 搜索栏 -->
		<view class="search-section">
			<view class="search-bar">
				<view class="search-input-wrapper">
					<text class="iconfont icon-search"></text>
					<input 
						class="search-input" 
						v-model="searchKeyword" 
						placeholder="搜索商品名称/SKU/条码" 
						placeholder-class="placeholder"
						@input="onSearchInput"
						@confirm="handleSearch"
					/>
					<view class="clear-btn" v-if="searchKeyword" @click="clearSearch">
						<text class="iconfont icon-close"></text>
					</view>
				</view>
				<view class="filter-btn" @click="showFilterModal">
					<text class="iconfont icon-filter"></text>
				</view>
			</view>
			
			<!-- 筛选标签 -->
			<view class="filter-tags" v-if="activeFilters.length > 0">
				<view class="filter-tag" v-for="(filter, index) in activeFilters" :key="index" @click="removeFilter(index)">
					<text class="tag-text">{{ filter.label }}</text>
					<text class="iconfont icon-close"></text>
				</view>
				<view class="clear-all-btn" @click="clearAllFilters">
					<text>清空</text>
				</view>
			</view>
		</view>
		
		<!-- 统计信息 -->
		<view class="stats-bar">
			<view class="stat-item">
				<text class="stat-label">总数量</text>
				<text class="stat-value">{{ totalQuantity }}</text>
			</view>
			<view class="stat-item">
				<text class="stat-label">总价值</text>
				<text class="stat-value">¥{{ totalValue }}</text>
			</view>
			<view class="stat-item">
				<text class="stat-label">商品种类</text>
				<text class="stat-value">{{ inventoryList.length }}</text>
			</view>
		</view>
		
		<!-- 库存列表 -->
		<view class="list-container">
			<scroll-view 
				class="scroll-view" 
				scroll-y 
				@scrolltolower="loadMore"
				refresher-enabled
				:refresher-triggered="refreshing"
				@refresherrefresh="onRefresh"
			>
				<view class="inventory-item" v-for="(item, index) in inventoryList" :key="index" @click="goToDetail(item)">
					<view class="item-header">
						<view class="product-info">
							<text class="product-name">{{ item.product_name }}</text>
							<text class="product-sku">SKU: {{ item.sku }}</text>
						</view>
						<view class="status-badge" :class="getStatusClass(item)">
							<text class="status-text">{{ getStatusText(item) }}</text>
						</view>
					</view>
					
					<view class="item-content">
						<view class="quantity-info">
							<view class="quantity-row">
								<text class="label">可用库存:</text>
								<text class="value available">{{ item.available_quantity || 0 }}</text>
								<text class="unit">{{ item.unit }}</text>
							</view>
							<view class="quantity-row" v-if="item.reserved_quantity > 0">
								<text class="label">预留库存:</text>
								<text class="value reserved">{{ item.reserved_quantity }}</text>
								<text class="unit">{{ item.unit }}</text>
							</view>
							<view class="quantity-row">
								<text class="label">总库存:</text>
								<text class="value total">{{ item.total_quantity || 0 }}</text>
								<text class="unit">{{ item.unit }}</text>
							</view>
						</view>
						
						<view class="location-info">
							<view class="location-item">
								<text class="iconfont icon-location"></text>
								<text class="location-text">{{ item.warehouse_name }} - {{ item.location_code }}</text>
							</view>
							<view class="price-info" v-if="item.cost_price">
								<text class="price-label">成本价:</text>
								<text class="price-value">¥{{ item.cost_price }}</text>
							</view>
						</view>
						
						<!-- 批次信息 -->
						<view class="batch-info" v-if="item.batch_number || item.expiry_date">
							<view class="batch-item" v-if="item.batch_number">
								<text class="batch-label">批次:</text>
								<text class="batch-value">{{ item.batch_number }}</text>
							</view>
							<view class="expiry-item" v-if="item.expiry_date">
								<text class="expiry-label">有效期:</text>
								<text class="expiry-value" :class="getExpiryClass(item.expiry_date)">{{ formatDate(item.expiry_date) }}</text>
							</view>
						</view>
					</view>
					
					<view class="item-actions">
						<view class="action-btn adjust" @click.stop="showAdjustModal(item)">
							<text class="iconfont icon-adjust"></text>
							<text class="btn-text">调整</text>
						</view>
						<view class="action-btn move" @click.stop="showMoveModal(item)">
							<text class="iconfont icon-move"></text>
							<text class="btn-text">移库</text>
						</view>
						<view class="action-btn detail" @click.stop="goToDetail(item)">
							<text class="iconfont icon-detail"></text>
							<text class="btn-text">详情</text>
						</view>
					</view>
				</view>
				
				<!-- 加载更多 -->
				<view class="load-more" v-if="hasMore">
					<text class="load-text" v-if="!loading">上拉加载更多</text>
					<text class="load-text" v-else>加载中...</text>
				</view>
				
				<!-- 空状态 -->
				<view class="empty-state" v-if="inventoryList.length === 0 && !loading">
					<text class="iconfont icon-empty"></text>
					<text class="empty-text">暂无库存数据</text>
					<text class="empty-desc">请检查筛选条件或添加商品库存</text>
				</view>
			</scroll-view>
		</view>
		
		<!-- 筛选弹窗 -->
		<uni-popup ref="filterPopup" type="bottom">
			<view class="filter-modal">
				<view class="modal-header">
					<text class="modal-title">筛选条件</text>
					<view class="close-btn" @click="closeFilterModal">
						<text class="iconfont icon-close"></text>
					</view>
				</view>
				
				<scroll-view class="modal-content" scroll-y>
					<!-- 仓库筛选 -->
					<view class="filter-group">
						<text class="group-title">仓库</text>
						<view class="option-list">
							<view class="option-item" v-for="warehouse in warehouseOptions" :key="warehouse.id" @click="toggleWarehouse(warehouse.id)">
								<text class="option-text">{{ warehouse.name }}</text>
								<view class="checkbox" :class="{checked: selectedWarehouses.includes(warehouse.id)}">
									<text class="iconfont icon-check" v-if="selectedWarehouses.includes(warehouse.id)"></text>
								</view>
							</view>
						</view>
					</view>
					
					<!-- 库存状态筛选 -->
					<view class="filter-group">
						<text class="group-title">库存状态</text>
						<view class="option-list">
							<view class="option-item" v-for="status in statusOptions" :key="status.value" @click="toggleStatus(status.value)">
								<text class="option-text">{{ status.label }}</text>
								<view class="checkbox" :class="{checked: selectedStatuses.includes(status.value)}">
									<text class="iconfont icon-check" v-if="selectedStatuses.includes(status.value)"></text>
								</view>
							</view>
						</view>
					</view>
					
					<!-- 商品分类筛选 -->
					<view class="filter-group">
						<text class="group-title">商品分类</text>
						<view class="option-list">
							<view class="option-item" v-for="category in categoryOptions" :key="category.id" @click="toggleCategory(category.id)">
								<text class="option-text">{{ category.name }}</text>
								<view class="checkbox" :class="{checked: selectedCategories.includes(category.id)}">
									<text class="iconfont icon-check" v-if="selectedCategories.includes(category.id)"></text>
								</view>
							</view>
						</view>
					</view>
				</scroll-view>
				
				<view class="modal-footer">
					<button class="reset-btn" @click="resetFilters">重置</button>
					<button class="confirm-btn" @click="applyFilters">确定</button>
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
			inventoryList: [],
			activeFilters: [],
			loading: false,
			refreshing: false,
			hasMore: true,
			page: 1,
			pageSize: 20,
			totalQuantity: 0,
			totalValue: 0,
			
			// 筛选选项
			warehouseOptions: [],
			categoryOptions: [],
			statusOptions: [
				{ label: '正常库存', value: 'normal' },
				{ label: '库存不足', value: 'low' },
				{ label: '库存预警', value: 'warning' },
				{ label: '零库存', value: 'zero' },
				{ label: '即将过期', value: 'expiring' }
			],
			
			// 选中的筛选条件
			selectedWarehouses: [],
			selectedCategories: [],
			selectedStatuses: [],
			
			// 搜索防抖
			searchTimer: null
		}
	},
	onLoad(options) {
		// 处理从其他页面传来的筛选参数
		if (options.filter) {
			this.handleInitialFilter(options.filter)
		}
		
		this.loadFilterOptions()
		this.loadInventoryList()
	},
	onShow() {
		// 页面显示时刷新数据
		this.refreshData()
	},
	methods: {
		// 处理初始筛选条件
		handleInitialFilter(filter) {
			switch (filter) {
				case 'warning':
					this.selectedStatuses = ['warning', 'low', 'expiring']
					this.updateActiveFilters()
					break
			}
		},
		
		// 加载筛选选项
		async loadFilterOptions() {
			try {
				const [warehouseRes, categoryRes] = await Promise.all([
					this.$api.warehouse.getList(),
					this.$api.product.getCategoryList()
				])
				
				if (warehouseRes && warehouseRes.code === 200) {
					this.warehouseOptions = warehouseRes.data || []
				}
				
				if (categoryRes && categoryRes.code === 200) {
					this.categoryOptions = categoryRes.data || []
				}
			} catch (error) {
				console.error('加载筛选选项失败:', error)
			}
		},
		
		// 加载库存列表
		async loadInventoryList(isRefresh = false) {
			if (this.loading) return
			
			try {
				this.loading = true
				
				if (isRefresh) {
					this.page = 1
					this.inventoryList = []
					this.hasMore = true
				}
				
				const params = {
					page: this.page,
					limit: this.pageSize,
					keyword: this.searchKeyword,
					warehouses: this.selectedWarehouses,
					categories: this.selectedCategories,
					statuses: this.selectedStatuses
				}
				
				const response = await api.inventory.getList(params)
				
				if (response && response.code === 200) {
					const data = response.data
					
					if (this.page === 1) {
						this.inventoryList = data.list || []
					} else {
						this.inventoryList.push(...(data.list || []))
					}
					
					this.totalQuantity = data.total_quantity || 0
					this.totalValue = data.total_value || 0
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
				console.error('加载库存列表失败:', error)
				// 使用默认数据进行演示
				if (isRefresh || this.page === 1) {
					this.inventoryList = [
						{
							id: 1,
							product_name: 'iPhone 14 Pro',
							sku: 'IP14P-256-BLK',
							available_quantity: 45,
							reserved_quantity: 5,
							total_quantity: 50,
							unit: '台',
							warehouse_name: '主仓库',
							location_code: 'A-01-01',
							cost_price: 8999,
							batch_number: 'B20240101',
							expiry_date: '2025-12-31'
						},
						{
							id: 2,
							product_name: 'MacBook Air M2',
							sku: 'MBA-M2-256-SLV',
							available_quantity: 8,
							reserved_quantity: 2,
							total_quantity: 10,
							unit: '台',
							warehouse_name: '主仓库',
							location_code: 'A-01-02',
							cost_price: 9999,
							batch_number: 'B20240102'
						}
					]
					this.totalQuantity = 60
					this.totalValue = 589990
				}
				uni.showToast({
					title: error.message || '网络错误，使用演示数据',
					icon: 'none'
				})
			} finally {
				this.loading = false
				this.refreshing = false
			}
		},
		
		// 搜索输入处理
		onSearchInput() {
			clearTimeout(this.searchTimer)
			this.searchTimer = setTimeout(() => {
				this.handleSearch()
			}, 500)
		},
		
		// 执行搜索
		handleSearch() {
			this.loadInventoryList(true)
		},
		
		// 清除搜索
		clearSearch() {
			this.searchKeyword = ''
			this.handleSearch()
		},
		
		// 刷新数据
		refreshData() {
			this.loadInventoryList(true)
		},
		
		// 下拉刷新
		onRefresh() {
			this.refreshing = true
			this.refreshData()
		},
		
		// 加载更多
		loadMore() {
			if (this.hasMore && !this.loading) {
				this.loadInventoryList()
			}
		},
		
		// 显示筛选弹窗
		showFilterModal() {
			this.$refs.filterPopup.open()
		},
		
		// 关闭筛选弹窗
		closeFilterModal() {
			this.$refs.filterPopup.close()
		},
		
		// 切换仓库选择
		toggleWarehouse(warehouseId) {
			const index = this.selectedWarehouses.indexOf(warehouseId)
			if (index > -1) {
				this.selectedWarehouses.splice(index, 1)
			} else {
				this.selectedWarehouses.push(warehouseId)
			}
		},
		
		// 切换分类选择
		toggleCategory(categoryId) {
			const index = this.selectedCategories.indexOf(categoryId)
			if (index > -1) {
				this.selectedCategories.splice(index, 1)
			} else {
				this.selectedCategories.push(categoryId)
			}
		},
		
		// 切换状态选择
		toggleStatus(status) {
			const index = this.selectedStatuses.indexOf(status)
			if (index > -1) {
				this.selectedStatuses.splice(index, 1)
			} else {
				this.selectedStatuses.push(status)
			}
		},
		
		// 重置筛选条件
		resetFilters() {
			this.selectedWarehouses = []
			this.selectedCategories = []
			this.selectedStatuses = []
		},
		
		// 应用筛选条件
		applyFilters() {
			this.updateActiveFilters()
			this.closeFilterModal()
			this.loadInventoryList(true)
		},
		
		// 更新活跃筛选标签
		updateActiveFilters() {
			this.activeFilters = []
			
			// 添加仓库筛选标签
			this.selectedWarehouses.forEach(id => {
				const warehouse = this.warehouseOptions.find(w => w.id === id)
				if (warehouse) {
					this.activeFilters.push({
						type: 'warehouse',
						value: id,
						label: warehouse.name
					})
				}
			})
			
			// 添加分类筛选标签
			this.selectedCategories.forEach(id => {
				const category = this.categoryOptions.find(c => c.id === id)
				if (category) {
					this.activeFilters.push({
						type: 'category',
						value: id,
						label: category.name
					})
				}
			})
			
			// 添加状态筛选标签
			this.selectedStatuses.forEach(value => {
				const status = this.statusOptions.find(s => s.value === value)
				if (status) {
					this.activeFilters.push({
						type: 'status',
						value: value,
						label: status.label
					})
				}
			})
		},
		
		// 移除单个筛选条件
		removeFilter(index) {
			const filter = this.activeFilters[index]
			
			switch (filter.type) {
				case 'warehouse':
					this.selectedWarehouses = this.selectedWarehouses.filter(id => id !== filter.value)
					break
				case 'category':
					this.selectedCategories = this.selectedCategories.filter(id => id !== filter.value)
					break
				case 'status':
					this.selectedStatuses = this.selectedStatuses.filter(s => s !== filter.value)
					break
			}
			
			this.updateActiveFilters()
			this.loadInventoryList(true)
		},
		
		// 清空所有筛选条件
		clearAllFilters() {
			this.resetFilters()
			this.updateActiveFilters()
			this.loadInventoryList(true)
		},
		
		// 获取状态样式类
		getStatusClass(item) {
			const available = item.available_quantity || 0
			const minStock = item.min_stock || 0
			const warningStock = item.warning_stock || 0
			
			if (available === 0) return 'zero'
			if (available <= minStock) return 'low'
			if (available <= warningStock) return 'warning'
			if (this.isExpiringSoon(item.expiry_date)) return 'expiring'
			return 'normal'
		},
		
		// 获取状态文本
		getStatusText(item) {
			const statusClass = this.getStatusClass(item)
			const statusMap = {
				zero: '零库存',
				low: '库存不足',
				warning: '库存预警',
				expiring: '即将过期',
				normal: '正常'
			}
			return statusMap[statusClass] || '正常'
		},
		
		// 获取过期时间样式类
		getExpiryClass(expiryDate) {
			if (!expiryDate) return ''
			
			const now = new Date()
			const expiry = new Date(expiryDate)
			const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
			
			if (diffDays < 0) return 'expired'
			if (diffDays <= 7) return 'expiring-soon'
			if (diffDays <= 30) return 'expiring-warning'
			return 'normal'
		},
		
		// 判断是否即将过期
		isExpiringSoon(expiryDate) {
			if (!expiryDate) return false
			
			const now = new Date()
			const expiry = new Date(expiryDate)
			const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
			
			return diffDays <= 30 && diffDays >= 0
		},
		
		// 格式化日期
		formatDate(dateStr) {
			if (!dateStr) return ''
			
			const date = new Date(dateStr)
			return date.toLocaleDateString('zh-CN')
		},
		
		// 显示库存调整弹窗
		showAdjustModal(item) {
			uni.showModal({
				title: '库存调整',
				content: '功能开发中...',
				showCancel: false
			})
		},
		
		// 显示移库弹窗
		showMoveModal(item) {
			uni.showModal({
				title: '库存移库',
				content: '功能开发中...',
				showCancel: false
			})
		},
		
		// 跳转到详情页
		goToDetail(item) {
			uni.navigateTo({
				url: `/pages/inventory/detail?id=${item.id}`
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.inventory-list {
	min-height: 100vh;
	background: #f5f5f5;
}

.search-section {
	background: white;
	padding: 20rpx 30rpx;
	border-bottom: 1rpx solid #f0f0f0;
	
	.search-bar {
		display: flex;
		align-items: center;
		gap: 20rpx;
		
		.search-input-wrapper {
			flex: 1;
			position: relative;
			display: flex;
			align-items: center;
			background: #f8f8f8;
			border-radius: 24rpx;
			padding: 0 20rpx;
			height: 72rpx;
			
			.iconfont {
				font-size: 32rpx;
				color: #999;
				margin-right: 16rpx;
			}
			
			.search-input {
				flex: 1;
				font-size: 28rpx;
				color: #333;
				border: none;
				outline: none;
				background: transparent;
				
				.placeholder {
					color: #999;
				}
			}
			
			.clear-btn {
				width: 32rpx;
				height: 32rpx;
				display: flex;
				align-items: center;
				justify-content: center;
				background: #ccc;
				border-radius: 50%;
				
				.iconfont {
					font-size: 20rpx;
					color: white;
					margin: 0;
				}
			}
		}
		
		.filter-btn {
			width: 72rpx;
			height: 72rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			background: #007AFF;
			border-radius: 12rpx;
			
			.iconfont {
				font-size: 32rpx;
				color: white;
			}
		}
	}
	
	.filter-tags {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 16rpx;
		margin-top: 20rpx;
		
		.filter-tag {
			display: flex;
			align-items: center;
			background: #e3f2fd;
			border: 1rpx solid #2196f3;
			border-radius: 16rpx;
			padding: 8rpx 16rpx;
			
			.tag-text {
				font-size: 24rpx;
				color: #2196f3;
				margin-right: 8rpx;
			}
			
			.iconfont {
				font-size: 20rpx;
				color: #2196f3;
			}
		}
		
		.clear-all-btn {
			padding: 8rpx 16rpx;
			background: #ff5722;
			border-radius: 16rpx;
			
			text {
				font-size: 24rpx;
				color: white;
			}
		}
	}
}

.stats-bar {
	display: flex;
	background: white;
	padding: 20rpx 30rpx;
	border-bottom: 1rpx solid #f0f0f0;
	
	.stat-item {
		flex: 1;
		text-align: center;
		
		.stat-label {
			display: block;
			font-size: 24rpx;
			color: #666;
			margin-bottom: 8rpx;
		}
		
		.stat-value {
			display: block;
			font-size: 32rpx;
			font-weight: bold;
			color: #333;
		}
	}
}

.list-container {
	flex: 1;
	
	.scroll-view {
		height: calc(100vh - 300rpx);
	}
}

.inventory-item {
	background: white;
	margin: 20rpx 30rpx;
	border-radius: 16rpx;
	padding: 30rpx;
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
	
	.item-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 20rpx;
		
		.product-info {
			flex: 1;
			
			.product-name {
				display: block;
				font-size: 32rpx;
				font-weight: bold;
				color: #333;
				margin-bottom: 8rpx;
			}
			
			.product-sku {
				display: block;
				font-size: 24rpx;
				color: #666;
			}
		}
		
		.status-badge {
			padding: 8rpx 16rpx;
			border-radius: 12rpx;
			
			.status-text {
				font-size: 22rpx;
				color: white;
				font-weight: bold;
			}
			
			&.normal {
				background: #34c759;
			}
			
			&.warning {
				background: #ff9500;
			}
			
			&.low {
				background: #ff3b30;
			}
			
			&.zero {
				background: #8e8e93;
			}
			
			&.expiring {
				background: #ff6b35;
			}
		}
	}
	
	.item-content {
		margin-bottom: 20rpx;
		
		.quantity-info {
			margin-bottom: 20rpx;
			
			.quantity-row {
				display: flex;
				align-items: center;
				margin-bottom: 12rpx;
				
				&:last-child {
					margin-bottom: 0;
				}
				
				.label {
					font-size: 28rpx;
					color: #666;
					width: 160rpx;
				}
				
				.value {
					font-size: 32rpx;
					font-weight: bold;
					margin-right: 8rpx;
					
					&.available {
						color: #34c759;
					}
					
					&.reserved {
						color: #ff9500;
					}
					
					&.total {
						color: #007aff;
					}
				}
				
				.unit {
					font-size: 24rpx;
					color: #999;
				}
			}
		}
		
		.location-info {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 20rpx;
			
			.location-item {
				display: flex;
				align-items: center;
				
				.iconfont {
					font-size: 24rpx;
					color: #666;
					margin-right: 8rpx;
				}
				
				.location-text {
					font-size: 26rpx;
					color: #666;
				}
			}
			
			.price-info {
				.price-label {
					font-size: 24rpx;
					color: #666;
					margin-right: 8rpx;
				}
				
				.price-value {
					font-size: 28rpx;
					font-weight: bold;
					color: #ff6b35;
				}
			}
		}
		
		.batch-info {
			display: flex;
			justify-content: space-between;
			align-items: center;
			
			.batch-item, .expiry-item {
				display: flex;
				align-items: center;
				
				.batch-label, .expiry-label {
					font-size: 24rpx;
					color: #666;
					margin-right: 8rpx;
				}
				
				.batch-value {
					font-size: 26rpx;
					color: #333;
				}
				
				.expiry-value {
					font-size: 26rpx;
					
					&.normal {
						color: #333;
					}
					
					&.expiring-warning {
						color: #ff9500;
					}
					
					&.expiring-soon {
						color: #ff3b30;
					}
					
					&.expired {
						color: #8e8e93;
						text-decoration: line-through;
					}
				}
			}
		}
	}
	
	.item-actions {
		display: flex;
		justify-content: space-around;
		padding-top: 20rpx;
		border-top: 1rpx solid #f0f0f0;
		
		.action-btn {
			display: flex;
			flex-direction: column;
			align-items: center;
			padding: 16rpx;
			border-radius: 12rpx;
			transition: background-color 0.2s;
			
			.iconfont {
				font-size: 32rpx;
				margin-bottom: 8rpx;
			}
			
			.btn-text {
				font-size: 22rpx;
			}
			
			&.adjust {
				color: #007aff;
				
				&:active {
					background: rgba(0, 122, 255, 0.1);
				}
			}
			
			&.move {
				color: #ff9500;
				
				&:active {
					background: rgba(255, 149, 0, 0.1);
				}
			}
			
			&.detail {
				color: #34c759;
				
				&:active {
					background: rgba(52, 199, 89, 0.1);
				}
			}
		}
	}
}

.load-more {
	text-align: center;
	padding: 40rpx;
	
	.load-text {
		font-size: 28rpx;
		color: #999;
	}
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 120rpx 40rpx;
	
	.iconfont {
		font-size: 120rpx;
		color: #ddd;
		margin-bottom: 30rpx;
	}
	
	.empty-text {
		font-size: 32rpx;
		color: #666;
		margin-bottom: 16rpx;
	}
	
	.empty-desc {
		font-size: 26rpx;
		color: #999;
		text-align: center;
	}
}

.filter-modal {
	background: white;
	border-radius: 24rpx 24rpx 0 0;
	max-height: 80vh;
	display: flex;
	flex-direction: column;
	
	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 30rpx;
		border-bottom: 1rpx solid #f0f0f0;
		
		.modal-title {
			font-size: 32rpx;
			font-weight: bold;
			color: #333;
		}
		
		.close-btn {
			width: 60rpx;
			height: 60rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: 50%;
			background: #f5f5f5;
			
			.iconfont {
				font-size: 24rpx;
				color: #666;
			}
		}
	}
	
	.modal-content {
		flex: 1;
		padding: 30rpx;
		
		.filter-group {
			margin-bottom: 40rpx;
			
			&:last-child {
				margin-bottom: 0;
			}
			
			.group-title {
								display: block;
								font-size: 28rpx;
								font-weight: bold;
								color: #333;
								margin-bottom: 20rpx;
							}
							
							.option-list {
								.option-item {
									display: flex;
									justify-content: space-between;
									align-items: center;
									padding: 20rpx 0;
									border-bottom: 1rpx solid #f0f0f0;
									
									&:last-child {
										border-bottom: none;
									}
									
									.option-text {
										font-size: 28rpx;
										color: #333;
									}
									
									.checkbox {
										width: 40rpx;
										height: 40rpx;
										border: 2rpx solid #ddd;
										border-radius: 8rpx;
										display: flex;
										align-items: center;
										justify-content: center;
										transition: all 0.2s;
										
										&.checked {
											background: #007aff;
											border-color: #007aff;
											
											.iconfont {
												font-size: 24rpx;
												color: white;
											}
										}
									}
								}
							}
						}
					}
				}
				
				.modal-footer {
					display: flex;
					gap: 20rpx;
					padding: 30rpx;
					border-top: 1rpx solid #f0f0f0;
					
					.reset-btn, .confirm-btn {
						flex: 1;
						height: 80rpx;
						border-radius: 12rpx;
						font-size: 28rpx;
						border: none;
						outline: none;
					}
					
					.reset-btn {
						background: #f5f5f5;
						color: #666;
					}
					
					.confirm-btn {
						background: #007aff;
						color: white;
					}
				}
			}
		}
	}
}
</style>
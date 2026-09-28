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
	background: #0a0e16;
}

/* 搜索区 */
.search-section {
	padding: 20rpx 0 8rpx;
}

.search-bar {
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 0 32rpx;

	.search-input-wrapper {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 14rpx;
		height: 76rpx;
		padding: 0 24rpx;
		background: #161e2e;
		border: 1rpx solid rgba(148, 163, 184, .12);
		border-radius: 22rpx;

		.iconfont {
			font-size: 28rpx;
			color: #5c677d;
		}

		.search-input {
			flex: 1;
			font-size: 26rpx;
			color: #e8edf6;
			background: transparent;
			border: none;
		}

		.clear-btn {
			width: 40rpx;
			height: 40rpx;
			border-radius: 50%;
			background: #1c2536;
			display: flex;
			align-items: center;
			justify-content: center;

			.iconfont {
				font-size: 20rpx;
				color: #9aa5bb;
			}
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

		.iconfont {
			font-size: 30rpx;
			color: #9aa5bb;
		}
	}
}

/* 已选筛选 */
.filter-tags {
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 16rpx 32rpx 8rpx;

	.filter-tag {
		display: flex;
		align-items: center;
		gap: 8rpx;
		padding: 10rpx 22rpx;
		border-radius: 999rpx;
		background: rgba(34, 211, 238, .12);
		border: 1rpx solid rgba(34, 211, 238, .35);
		color: #22d3ee;
		font-size: 23rpx;

		.iconfont {
			font-size: 18rpx;
		}
	}

	.clear-all-btn {
		margin-left: auto;
		font-size: 23rpx;
		color: #5c677d;
	}
}

/* 统计条 */
.stats-bar {
	display: flex;
	gap: 16rpx;
	padding: 12rpx 32rpx 20rpx;

	.stat-item {
		flex: 1;
		padding: 20rpx 12rpx;
		background: #111725;
		border: 1rpx solid rgba(148, 163, 184, .09);
		border-radius: 24rpx;
		text-align: center;
	}

	.stat-label {
		display: block;
		font-size: 21rpx;
		color: #5c677d;
	}

	.stat-value {
		display: block;
		margin-top: 8rpx;
		font-size: 32rpx;
		font-weight: 700;
		color: #22d3ee;
		font-family: "JetBrains Mono", Menlo, Consolas, monospace;
	}
}

/* 列表 */
.list-container {
	padding: 0 32rpx;
}

.scroll-view {
	height: calc(100vh - 300rpx);
}

.inventory-item {
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
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 20rpx;
	}

	.product-info {
		flex: 1;
		min-width: 0;

		.product-name {
			display: block;
			font-size: 29rpx;
			font-weight: 600;
			color: #e8edf6;
		}

		.product-sku {
			display: block;
			margin-top: 6rpx;
			font-size: 22rpx;
			color: #5c677d;
			font-family: "JetBrains Mono", Menlo, Consolas, monospace;
		}
	}

	.status-badge {
		flex-shrink: 0;
		margin-left: 16rpx;
		padding: 6rpx 18rpx;
		border-radius: 999rpx;
		font-size: 22rpx;
		font-weight: 600;
		color: #9aa5bb;
		background: rgba(148, 163, 184, .1);

		&.normal {
			color: #34d399;
			background: rgba(52, 211, 153, .12);
		}

		&.low {
			color: #fbbf24;
			background: rgba(251, 191, 36, .12);
		}

		&.warning {
			color: #f87171;
			background: rgba(248, 113, 113, .12);
		}

		&.zero {
			color: #f87171;
			background: rgba(248, 113, 113, .12);
		}

		&.expiring {
			color: #a78bfa;
			background: rgba(167, 139, 250, .12);
		}
	}

	.quantity-info {
		display: flex;
		flex-wrap: wrap;
		gap: 0 32rpx;
		margin-bottom: 16rpx;
	}

	.quantity-row {
		width: 50%;
		display: flex;
		align-items: center;
		gap: 8rpx;
		padding: 6rpx 0;

		.label {
			font-size: 23rpx;
			color: #5c677d;
		}

		.value {
			font-size: 26rpx;
			font-weight: 600;
			font-family: "JetBrains Mono", Menlo, Consolas, monospace;

			&.available {
				color: #34d399;
			}

			&.reserved {
				color: #fbbf24;
			}

			&.total {
				color: #e8edf6;
			}
		}

		.unit {
			font-size: 21rpx;
			color: #5c677d;
		}
	}

	.location-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16rpx;
		padding: 14rpx 0;
		border-top: 1rpx solid rgba(148, 163, 184, .09);
		border-bottom: 1rpx solid rgba(148, 163, 184, .09);

		.location-item {
			display: flex;
			align-items: center;
			gap: 8rpx;
			flex: 1;
			min-width: 0;
		}

		.location-text {
			font-size: 23rpx;
			color: #9aa5bb;
		}

		.price-info {
			flex-shrink: 0;
		}

		.price-label {
			font-size: 22rpx;
			color: #5c677d;
		}

		.price-value {
			font-size: 24rpx;
			color: #fbbf24;
			font-family: "JetBrains Mono", Menlo, Consolas, monospace;
		}
	}

	.batch-info {
		display: flex;
		gap: 32rpx;
		padding-top: 14rpx;

		.batch-label,
		.expiry-label {
			font-size: 22rpx;
			color: #5c677d;
			margin-right: 8rpx;
		}

		.batch-value {
			font-size: 23rpx;
			color: #9aa5bb;
			font-family: "JetBrains Mono", Menlo, Consolas, monospace;
		}

		.expiry-value {
			font-size: 23rpx;
			color: #9aa5bb;
			font-family: "JetBrains Mono", Menlo, Consolas, monospace;

			&.expired {
				color: #f87171;
			}

			&.expiring {
				color: #fbbf24;
			}
		}
	}

	.item-actions {
		display: flex;
		gap: 16rpx;
		margin-top: 20rpx;

		.action-btn {
			flex: 1;
			height: 68rpx;
			border-radius: 20rpx;
			background: #161e2e;
			border: 1rpx solid rgba(148, 163, 184, .12);
			color: #9aa5bb;
			font-size: 24rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 8rpx;

			&.adjust {
				color: #22d3ee;
				background: rgba(34, 211, 238, .1);
				border-color: rgba(34, 211, 238, .25);
			}

			&.move {
				color: #a78bfa;
				background: rgba(167, 139, 250, .1);
				border-color: rgba(167, 139, 250, .25);
			}

			&.detail {
				color: #9aa5bb;
			}

			&:active {
				transform: scale(.97);
			}
		}
	}
}

/* 加载 / 空态 */
.load-more {
	padding: 24rpx 0 40rpx;
	text-align: center;
}

.load-text {
	font-size: 24rpx;
	color: #5c677d;
}

.empty-state {
	padding: 120rpx 0;
	text-align: center;

	.icon-empty {
		font-size: 80rpx;
		color: #1c2536;
	}

	.empty-text {
		display: block;
		margin-top: 20rpx;
		font-size: 27rpx;
		color: #9aa5bb;
	}

	.empty-desc {
		display: block;
		margin-top: 10rpx;
		font-size: 23rpx;
		color: #5c677d;
	}
}

/* 筛选弹窗 */
.filter-modal {
	padding: 12rpx 40rpx calc(40rpx + env(safe-area-inset-bottom));
	background: #111725;
	border-top: 1rpx solid rgba(148, 163, 184, .2);
	border-radius: 40rpx 40rpx 0 0;

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20rpx 0 24rpx;
	}

	.modal-title {
		font-size: 32rpx;
		font-weight: 700;
		color: #e8edf6;
	}

	.close-btn {
		width: 56rpx;
		height: 56rpx;
		border-radius: 18rpx;
		background: #161e2e;
		display: flex;
		align-items: center;
		justify-content: center;

		.iconfont {
			font-size: 24rpx;
			color: #9aa5bb;
		}
	}

	.modal-content {
		max-height: 60vh;
	}

	.filter-group {
		margin-bottom: 28rpx;
	}

	.group-title {
		display: block;
		margin-bottom: 16rpx;
		font-size: 26rpx;
		font-weight: 700;
		color: #e8edf6;
	}

	.option-list {
		display: flex;
		flex-direction: column;
		gap: 16rpx;
	}

	.option-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20rpx 24rpx;
		background: #161e2e;
		border: 1rpx solid rgba(148, 163, 184, .12);
		border-radius: 20rpx;
	}

	.option-text {
		font-size: 26rpx;
		color: #e8edf6;
	}

	.checkbox {
		width: 36rpx;
		height: 36rpx;
		border-radius: 12rpx;
		border: 2rpx solid rgba(148, 163, 184, .3);
		display: flex;
		align-items: center;
		justify-content: center;

		&.checked {
			background: #22d3ee;
			border-color: #22d3ee;
		}

		.iconfont {
			font-size: 20rpx;
			color: #04222b;
		}
	}

	.modal-footer {
		display: flex;
		gap: 16rpx;
		margin-top: 8rpx;
	}

	.reset-btn,
	.confirm-btn {
		flex: 1;
		height: 84rpx;
		line-height: 84rpx;
		border-radius: 24rpx;
		font-size: 27rpx;
		font-weight: 600;
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
</style>
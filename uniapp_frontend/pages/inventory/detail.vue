<template>
	<view class="inventory-detail">
		<!-- 头部信息 -->
		<view class="header-section">
			<view class="product-header">
				<view class="product-image">
					<image :src="productInfo.image || '/static/default-product.png'" mode="aspectFill"></image>
				</view>
				<view class="product-info">
					<text class="product-name">{{ productInfo.name }}</text>
					<text class="product-sku">SKU: {{ productInfo.sku }}</text>
					<text class="product-barcode" v-if="productInfo.barcode">条码: {{ productInfo.barcode }}</text>
				</view>
				<view class="status-badge" :class="getStatusClass()">
					<text class="status-text">{{ getStatusText() }}</text>
				</view>
			</view>
			
			<!-- 库存概览 -->
			<view class="inventory-overview">
				<view class="overview-item">
					<text class="item-label">可用库存</text>
					<text class="item-value available">{{ totalAvailable }}</text>
					<text class="item-unit">{{ productInfo.unit }}</text>
				</view>
				<view class="overview-item">
					<text class="item-label">预留库存</text>
					<text class="item-value reserved">{{ totalReserved }}</text>
					<text class="item-unit">{{ productInfo.unit }}</text>
				</view>
				<view class="overview-item">
					<text class="item-label">总库存</text>
					<text class="item-value total">{{ totalQuantity }}</text>
					<text class="item-unit">{{ productInfo.unit }}</text>
				</view>
			</view>
		</view>
		
		<!-- 标签页 -->
		<view class="tab-section">
			<view class="tab-bar">
				<view class="tab-item" :class="{active: activeTab === 'locations'}" @click="switchTab('locations')">
					<text class="tab-text">库位详情</text>
				</view>
				<view class="tab-item" :class="{active: activeTab === 'transactions'}" @click="switchTab('transactions')">
					<text class="tab-text">库存记录</text>
				</view>
				<view class="tab-item" :class="{active: activeTab === 'alerts'}" @click="switchTab('alerts')">
					<text class="tab-text">库存预警</text>
				</view>
			</view>
		</view>
		
		<!-- 内容区域 -->
		<view class="content-section">
			<!-- 库位详情 -->
			<view class="tab-content" v-if="activeTab === 'locations'">
				<view class="location-item" v-for="(location, index) in locationList" :key="index">
					<view class="location-header">
						<view class="location-info">
							<text class="warehouse-name">{{ location.warehouse_name }}</text>
							<text class="location-code">{{ location.location_code }}</text>
						</view>
						<view class="location-status" :class="getLocationStatusClass(location)">
							<text class="status-text">{{ getLocationStatusText(location) }}</text>
						</view>
					</view>
					
					<view class="location-details">
						<view class="detail-row">
							<view class="detail-item">
								<text class="detail-label">可用数量</text>
								<text class="detail-value available">{{ location.available_quantity || 0 }}</text>
							</view>
							<view class="detail-item">
								<text class="detail-label">预留数量</text>
								<text class="detail-value reserved">{{ location.reserved_quantity || 0 }}</text>
							</view>
							<view class="detail-item">
								<text class="detail-label">总数量</text>
								<text class="detail-value total">{{ location.total_quantity || 0 }}</text>
							</view>
						</view>
						
						<view class="detail-row" v-if="location.batch_number || location.expiry_date">
							<view class="detail-item" v-if="location.batch_number">
								<text class="detail-label">批次号</text>
								<text class="detail-value">{{ location.batch_number }}</text>
							</view>
							<view class="detail-item" v-if="location.expiry_date">
								<text class="detail-label">有效期</text>
								<text class="detail-value" :class="getExpiryClass(location.expiry_date)">{{ formatDate(location.expiry_date) }}</text>
							</view>
						</view>
						
						<view class="detail-row" v-if="location.cost_price">
							<view class="detail-item">
								<text class="detail-label">成本价</text>
								<text class="detail-value price">¥{{ location.cost_price }}</text>
							</view>
							<view class="detail-item">
								<text class="detail-label">库存价值</text>
								<text class="detail-value price">¥{{ (location.total_quantity * location.cost_price).toFixed(2) }}</text>
							</view>
						</view>
					</view>
					
					<view class="location-actions">
						<view class="action-btn adjust" @click="showAdjustModal(location)">
							<text class="iconfont icon-adjust"></text>
							<text class="btn-text">调整</text>
						</view>
						<view class="action-btn move" @click="showMoveModal(location)">
							<text class="iconfont icon-move"></text>
							<text class="btn-text">移库</text>
						</view>
						<view class="action-btn freeze" @click="showFreezeModal(location)" v-if="location.available_quantity > 0">
							<text class="iconfont icon-freeze"></text>
							<text class="btn-text">冻结</text>
						</view>
					</view>
				</view>
				
				<!-- 空状态 -->
				<view class="empty-state" v-if="locationList.length === 0">
					<text class="iconfont icon-empty"></text>
					<text class="empty-text">暂无库位信息</text>
				</view>
			</view>
			
			<!-- 库存记录 -->
			<view class="tab-content" v-if="activeTab === 'transactions'">
				<view class="transaction-item" v-for="(transaction, index) in transactionList" :key="index">
					<view class="transaction-header">
						<view class="transaction-type" :class="getTransactionTypeClass(transaction.type)">
							<text class="type-text">{{ getTransactionTypeText(transaction.type) }}</text>
						</view>
						<text class="transaction-time">{{ formatDateTime(transaction.created_at) }}</text>
					</view>
					
					<view class="transaction-content">
						<view class="content-row">
							<text class="content-label">数量变化:</text>
							<text class="content-value" :class="getQuantityChangeClass(transaction.quantity_change)">{{ formatQuantityChange(transaction.quantity_change) }}</text>
						</view>
						<view class="content-row">
							<text class="content-label">库位:</text>
							<text class="content-value">{{ transaction.warehouse_name }} - {{ transaction.location_code }}</text>
						</view>
						<view class="content-row" v-if="transaction.batch_number">
							<text class="content-label">批次:</text>
							<text class="content-value">{{ transaction.batch_number }}</text>
						</view>
						<view class="content-row" v-if="transaction.operator_name">
							<text class="content-label">操作人:</text>
							<text class="content-value">{{ transaction.operator_name }}</text>
						</view>
						<view class="content-row" v-if="transaction.remark">
							<text class="content-label">备注:</text>
							<text class="content-value">{{ transaction.remark }}</text>
						</view>
					</view>
				</view>
				
				<!-- 加载更多 -->
				<view class="load-more" v-if="hasMoreTransactions">
					<text class="load-text" @click="loadMoreTransactions">加载更多记录</text>
				</view>
				
				<!-- 空状态 -->
				<view class="empty-state" v-if="transactionList.length === 0">
					<text class="iconfont icon-empty"></text>
					<text class="empty-text">暂无库存记录</text>
				</view>
			</view>
			
			<!-- 库存预警 -->
			<view class="tab-content" v-if="activeTab === 'alerts'">
				<view class="alert-item" v-for="(alert, index) in alertList" :key="index">
					<view class="alert-header">
						<view class="alert-type" :class="getAlertTypeClass(alert.type)">
							<text class="iconfont" :class="getAlertIcon(alert.type)"></text>
							<text class="type-text">{{ getAlertTypeText(alert.type) }}</text>
						</view>
						<text class="alert-time">{{ formatDateTime(alert.created_at) }}</text>
					</view>
					
					<view class="alert-content">
						<text class="alert-message">{{ alert.message }}</text>
						<view class="alert-details">
							<text class="detail-text">当前库存: {{ alert.current_quantity }} {{ productInfo.unit }}</text>
							<text class="detail-text" v-if="alert.threshold_quantity">预警阈值: {{ alert.threshold_quantity }} {{ productInfo.unit }}</text>
						</view>
					</view>
				</view>
				
				<!-- 空状态 -->
				<view class="empty-state" v-if="alertList.length === 0">
					<text class="iconfont icon-empty"></text>
					<text class="empty-text">暂无预警信息</text>
				</view>
			</view>
		</view>
		
		<!-- 底部操作栏 -->
		<view class="bottom-actions">
			<view class="action-btn primary" @click="showQuickAdjust">
				<text class="iconfont icon-adjust"></text>
				<text class="btn-text">快速调整</text>
			</view>
			<view class="action-btn secondary" @click="showQuickMove">
				<text class="iconfont icon-move"></text>
				<text class="btn-text">快速移库</text>
			</view>
			<view class="action-btn secondary" @click="exportData">
				<text class="iconfont icon-export"></text>
				<text class="btn-text">导出数据</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			productId: '',
			activeTab: 'locations',
			productInfo: {},
			locationList: [],
			transactionList: [],
			alertList: [],
			hasMoreTransactions: false,
			transactionPage: 1,
			loading: false
		}
	},
	onLoad(options) {
		if (options.id) {
			this.productId = options.id
			this.loadProductDetail()
			this.loadLocationList()
			this.loadTransactionList()
			this.loadAlertList()
		} else {
			uni.showToast({
				title: '参数错误',
				icon: 'none'
			})
			uni.navigateBack()
		}
	},
	computed: {
		// 总可用库存
		totalAvailable() {
			return this.locationList.reduce((sum, location) => sum + (location.available_quantity || 0), 0)
		},
		
		// 总预留库存
		totalReserved() {
			return this.locationList.reduce((sum, location) => sum + (location.reserved_quantity || 0), 0)
		},
		
		// 总库存
		totalQuantity() {
			return this.locationList.reduce((sum, location) => sum + (location.total_quantity || 0), 0)
		}
	},
	methods: {
		// 加载商品详情
		async loadProductDetail() {
			try {
				const response = await this.$api.inventory.getProductDetail(this.productId)
				
				if (response && response.code === 200) {
					this.productInfo = response.data || {}
					
					// 设置页面标题
					uni.setNavigationBarTitle({
						title: this.productInfo.name || '库存详情'
					})
				} else {
					uni.showToast({
						title: response.message || '加载失败',
						icon: 'none'
					})
				}
			} catch (error) {
				console.error('加载商品详情失败:', error)
				uni.showToast({
					title: '网络错误，请重试',
					icon: 'none'
				})
			}
		},
		
		// 加载库位列表
		async loadLocationList() {
			try {
				const response = await this.$api.inventory.getLocationList(this.productId)
				
				if (response && response.code === 200) {
					this.locationList = response.data || []
				} else {
					uni.showToast({
						title: response.message || '加载失败',
						icon: 'none'
					})
				}
			} catch (error) {
				console.error('加载库位列表失败:', error)
			}
		},
		
		// 加载库存记录
		async loadTransactionList(isLoadMore = false) {
			if (this.loading) return
			
			try {
				this.loading = true
				
				if (!isLoadMore) {
					this.transactionPage = 1
					this.transactionList = []
				}
				
				const response = await this.$api.inventory.getTransactionList({
					product_id: this.productId,
					page: this.transactionPage,
					page_size: 20
				})
				
				if (response && response.code === 200) {
					const data = response.data
					
					if (isLoadMore) {
						this.transactionList.push(...(data.list || []))
					} else {
						this.transactionList = data.list || []
					}
					
					this.hasMoreTransactions = data.has_more || false
					
					if (this.hasMoreTransactions) {
						this.transactionPage++
					}
				} else {
					uni.showToast({
						title: response.message || '加载失败',
						icon: 'none'
					})
				}
			} catch (error) {
				console.error('加载库存记录失败:', error)
			} finally {
				this.loading = false
			}
		},
		
		// 加载预警列表
		async loadAlertList() {
			try {
				const response = await this.$api.inventory.getAlertList(this.productId)
				
				if (response && response.code === 200) {
					this.alertList = response.data || []
				} else {
					uni.showToast({
						title: response.message || '加载失败',
						icon: 'none'
					})
				}
			} catch (error) {
				console.error('加载预警列表失败:', error)
			}
		},
		
		// 切换标签页
		switchTab(tab) {
			this.activeTab = tab
		},
		
		// 加载更多交易记录
		loadMoreTransactions() {
			if (this.hasMoreTransactions && !this.loading) {
				this.loadTransactionList(true)
			}
		},
		
		// 获取状态样式类
		getStatusClass() {
			const available = this.totalAvailable
			const minStock = this.productInfo.min_stock || 0
			const warningStock = this.productInfo.warning_stock || 0
			
			if (available === 0) return 'zero'
			if (available <= minStock) return 'low'
			if (available <= warningStock) return 'warning'
			return 'normal'
		},
		
		// 获取状态文本
		getStatusText() {
			const statusClass = this.getStatusClass()
			const statusMap = {
				zero: '零库存',
				low: '库存不足',
				warning: '库存预警',
				normal: '正常'
			}
			return statusMap[statusClass] || '正常'
		},
		
		// 获取库位状态样式类
		getLocationStatusClass(location) {
			const available = location.available_quantity || 0
			
			if (available === 0) return 'empty'
			if (this.isExpiringSoon(location.expiry_date)) return 'expiring'
			return 'normal'
		},
		
		// 获取库位状态文本
		getLocationStatusText(location) {
			const statusClass = this.getLocationStatusClass(location)
			const statusMap = {
				empty: '空库位',
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
		
		// 获取交易类型样式类
		getTransactionTypeClass(type) {
			const typeMap = {
				inbound: 'inbound',
				outbound: 'outbound',
				adjust: 'adjust',
				move: 'move',
				freeze: 'freeze',
				unfreeze: 'unfreeze'
			}
			return typeMap[type] || 'other'
		},
		
		// 获取交易类型文本
		getTransactionTypeText(type) {
			const typeMap = {
				inbound: '入库',
				outbound: '出库',
				adjust: '调整',
				move: '移库',
				freeze: '冻结',
				unfreeze: '解冻'
			}
			return typeMap[type] || '其他'
		},
		
		// 获取数量变化样式类
		getQuantityChangeClass(change) {
			if (change > 0) return 'increase'
			if (change < 0) return 'decrease'
			return 'neutral'
		},
		
		// 格式化数量变化
		formatQuantityChange(change) {
			if (change > 0) return `+${change}`
			return change.toString()
		},
		
		// 获取预警类型样式类
		getAlertTypeClass(type) {
			const typeMap = {
				low_stock: 'warning',
				zero_stock: 'danger',
				expiring: 'warning',
				expired: 'danger'
			}
			return typeMap[type] || 'info'
		},
		
		// 获取预警图标
		getAlertIcon(type) {
			const iconMap = {
				low_stock: 'icon-warning',
				zero_stock: 'icon-error',
				expiring: 'icon-time',
				expired: 'icon-error'
			}
			return iconMap[type] || 'icon-info'
		},
		
		// 获取预警类型文本
		getAlertTypeText(type) {
			const typeMap = {
				low_stock: '库存不足',
				zero_stock: '零库存',
				expiring: '即将过期',
				expired: '已过期'
			}
			return typeMap[type] || '其他预警'
		},
		
		// 格式化日期
		formatDate(dateStr) {
			if (!dateStr) return ''
			
			const date = new Date(dateStr)
			return date.toLocaleDateString('zh-CN')
		},
		
		// 格式化日期时间
		formatDateTime(dateStr) {
			if (!dateStr) return ''
			
			const date = new Date(dateStr)
			return date.toLocaleString('zh-CN')
		},
		
		// 显示库存调整弹窗
		showAdjustModal(location) {
			uni.showModal({
				title: '库存调整',
				content: '功能开发中...',
				showCancel: false
			})
		},
		
		// 显示移库弹窗
		showMoveModal(location) {
			uni.showModal({
				title: '库存移库',
				content: '功能开发中...',
				showCancel: false
			})
		},
		
		// 显示冻结弹窗
		showFreezeModal(location) {
			uni.showModal({
				title: '库存冻结',
				content: '功能开发中...',
				showCancel: false
			})
		},
		
		// 快速调整
		showQuickAdjust() {
			uni.showModal({
				title: '快速调整',
				content: '功能开发中...',
				showCancel: false
			})
		},
		
		// 快速移库
		showQuickMove() {
			uni.showModal({
				title: '快速移库',
				content: '功能开发中...',
				showCancel: false
			})
		},
		
		// 导出数据
		exportData() {
			uni.showModal({
				title: '导出数据',
				content: '功能开发中...',
				showCancel: false
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.inventory-detail {
	min-height: 100vh;
	background: #f5f5f5;
	padding-bottom: 120rpx;
}

.header-section {
	background: white;
	padding: 30rpx;
	border-bottom: 1rpx solid #f0f0f0;
	
	.product-header {
		display: flex;
		align-items: flex-start;
		margin-bottom: 30rpx;
		
		.product-image {
			width: 120rpx;
			height: 120rpx;
			border-radius: 12rpx;
			overflow: hidden;
			margin-right: 20rpx;
			
			image {
				width: 100%;
				height: 100%;
			}
		}
		
		.product-info {
			flex: 1;
			
			.product-name {
				display: block;
				font-size: 32rpx;
				font-weight: bold;
				color: #333;
				margin-bottom: 8rpx;
			}
			
			.product-sku, .product-barcode {
				display: block;
				font-size: 26rpx;
				color: #666;
				margin-bottom: 4rpx;
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
		}
	}
	
	.inventory-overview {
		display: flex;
		justify-content: space-around;
		
		.overview-item {
			text-align: center;
			
			.item-label {
				display: block;
				font-size: 24rpx;
				color: #666;
				margin-bottom: 8rpx;
			}
			
			.item-value {
				display: block;
				font-size: 36rpx;
				font-weight: bold;
				margin-bottom: 4rpx;
				
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
			
			.item-unit {
				display: block;
				font-size: 22rpx;
				color: #999;
			}
		}
	}
}

.tab-section {
	background: white;
	border-bottom: 1rpx solid #f0f0f0;
	
	.tab-bar {
		display: flex;
		
		.tab-item {
			flex: 1;
			text-align: center;
			padding: 30rpx 20rpx;
			position: relative;
			
			.tab-text {
				font-size: 28rpx;
				color: #666;
				transition: color 0.2s;
			}
			
			&.active {
				.tab-text {
					color: #007aff;
					font-weight: bold;
				}
				
				&::after {
					content: '';
					position: absolute;
					bottom: 0;
					left: 50%;
					transform: translateX(-50%);
					width: 60rpx;
					height: 4rpx;
					background: #007aff;
					border-radius: 2rpx;
				}
			}
		}
	}
}

.content-section {
	padding: 20rpx 30rpx;
	
	.tab-content {
		min-height: 400rpx;
	}
}

.location-item {
	background: white;
	border-radius: 16rpx;
	padding: 30rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
	
	.location-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20rpx;
		
		.location-info {
			.warehouse-name {
				display: block;
				font-size: 28rpx;
				font-weight: bold;
				color: #333;
				margin-bottom: 4rpx;
			}
			
			.location-code {
				display: block;
				font-size: 24rpx;
				color: #666;
			}
		}
		
		.location-status {
			padding: 6rpx 12rpx;
			border-radius: 8rpx;
			
			.status-text {
				font-size: 20rpx;
				color: white;
				font-weight: bold;
			}
			
			&.normal {
				background: #34c759;
			}
			
			&.empty {
				background: #8e8e93;
			}
			
			&.expiring {
				background: #ff6b35;
			}
		}
	}
	
	.location-details {
		margin-bottom: 20rpx;
		
		.detail-row {
			display: flex;
			justify-content: space-between;
			margin-bottom: 16rpx;
			
			&:last-child {
				margin-bottom: 0;
			}
			
			.detail-item {
				flex: 1;
				display: flex;
				align-items: center;
				
				.detail-label {
					font-size: 26rpx;
					color: #666;
					margin-right: 8rpx;
					min-width: 120rpx;
				}
				
				.detail-value {
					font-size: 28rpx;
					font-weight: bold;
					color: #333;
					
					&.available {
						color: #34c759;
					}
					
					&.reserved {
						color: #ff9500;
					}
					
					&.total {
						color: #007aff;
					}
					
					&.price {
						color: #ff6b35;
					}
					
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
	
	.location-actions {
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
			
			&.freeze {
				color: #5856d6;
				
				&:active {
					background: rgba(88, 86, 214, 0.1);
				}
			}
		}
	}
}

.transaction-item {
	background: white;
	border-radius: 16rpx;
	padding: 30rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
	
	.transaction-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20rpx;
		
		.transaction-type {
			padding: 6rpx 12rpx;
			border-radius: 8rpx;
			
			.type-text {
				font-size: 22rpx;
				color: white;
				font-weight: bold;
			}
			
			&.inbound {
				background: #34c759;
			}
			
			&.outbound {
				background: #ff3b30;
			}
			
			&.adjust {
				background: #007aff;
			}
			
			&.move {
				background: #ff9500;
			}
			
			&.freeze, &.unfreeze {
				background: #5856d6;
			}
			
			&.other {
				background: #8e8e93;
			}
		}
		
		.transaction-time {
			font-size: 24rpx;
			color: #999;
		}
	}
	
	.transaction-content {
		.content-row {
			display: flex;
			align-items: center;
			margin-bottom: 12rpx;
			
			&:last-child {
				margin-bottom: 0;
			}
			
			.content-label {
				font-size: 26rpx;
				color: #666;
				margin-right: 8rpx;
				min-width: 120rpx;
			}
			
			.content-value {
				font-size: 26rpx;
				color: #333;
				
				&.increase {
					color: #34c759;
					font-weight: bold;
				}
				
				&.decrease {
					color: #ff3b30;
					font-weight: bold;
				}
				
				&.neutral {
					color: #666;
				}
			}
		}
	}
}

.alert-item {
	background: white;
	border-radius: 16rpx;
	padding: 30rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
	
	.alert-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20rpx;
		
		.alert-type {
			display: flex;
			align-items: center;
			padding: 6rpx 12rpx;
			border-radius: 8rpx;
			
			.iconfont {
				font-size: 24rpx;
				color: white;
				margin-right: 8rpx;
			}
			
			.type-text {
				font-size: 22rpx;
				color: white;
				font-weight: bold;
			}
			
			&.warning {
				background: #ff9500;
			}
			
			&.danger {
				background: #ff3b30;
			}
			
			&.info {
				background: #007aff;
			}
		}
		
		.alert-time {
			font-size: 24rpx;
			color: #999;
		}
	}
	
	.alert-content {
		.alert-message {
			display: block;
			font-size: 28rpx;
			color: #333;
			margin-bottom: 16rpx;
			line-height: 1.5;
		}
		
		.alert-details {
			.detail-text {
				display: block;
				font-size: 24rpx;
				color: #666;
				margin-bottom: 8rpx;
				
				&:last-child {
					margin-bottom: 0;
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
		color: #007aff;
		cursor: pointer;
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
	}
}

.bottom-actions {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	background: white;
	padding: 20rpx 30rpx;
	border-top: 1rpx solid #f0f0f0;
	display: flex;
	gap: 20rpx;
	box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.1);
	
	.action-btn {
		flex: 1;
		height: 80rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 12rpx;
		transition: all 0.2s;
		
		.iconfont {
			font-size: 28rpx;
			margin-right: 8rpx;
		}
		
		.btn-text {
			font-size: 28rpx;
			font-weight: bold;
		}
		
		&.primary {
			background: #007aff;
			color: white;
			
			&:active {
				background: #0056cc;
			}
		}
		
		&.secondary {
			background: #f5f5f5;
			color: #333;
			border: 1rpx solid #ddd;
			
			&:active {
				background: #e5e5e5;
			}
		}
	}
}
</style>
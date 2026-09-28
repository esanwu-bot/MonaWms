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
	background: #0a0e16;
	padding-bottom: calc(60rpx + env(safe-area-inset-bottom));
}

/* 头部 */
.header-section {
	margin: 24rpx 32rpx;
	padding: 32rpx;
	background: #111725;
	border: 1rpx solid rgba(148, 163, 184, .09);
	border-radius: 36rpx;
	position: relative;
	overflow: hidden;

	&::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 4rpx;
		background: linear-gradient(90deg, #22d3ee, transparent);
	}
}

.product-header {
	display: flex;
	align-items: flex-start;
	gap: 24rpx;

	.product-image {
		width: 120rpx;
		height: 120rpx;
		border-radius: 28rpx;
		background: #161e2e;
		overflow: hidden;
		flex-shrink: 0;

		image {
			width: 100%;
			height: 100%;
		}
	}

	.product-info {
		flex: 1;
		min-width: 0;

		.product-name {
			display: block;
			font-size: 32rpx;
			font-weight: 700;
			color: #e8edf6;
		}

		.product-sku {
			display: block;
			margin-top: 8rpx;
			font-size: 23rpx;
			color: #22d3ee;
			font-family: "JetBrains Mono", Menlo, Consolas, monospace;
		}

		.product-barcode {
			display: block;
			margin-top: 6rpx;
			font-size: 22rpx;
			color: #5c677d;
			font-family: "JetBrains Mono", Menlo, Consolas, monospace;
		}
	}

	.status-badge {
		flex-shrink: 0;
		padding: 8rpx 20rpx;
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

		&.warning,
		&.zero {
			color: #f87171;
			background: rgba(248, 113, 113, .12);
		}

		&.expiring {
			color: #a78bfa;
			background: rgba(167, 139, 250, .12);
		}
	}
}

.inventory-overview {
	display: flex;
	gap: 16rpx;
	margin-top: 28rpx;
	padding-top: 24rpx;
	border-top: 1rpx solid rgba(148, 163, 184, .09);

	.overview-item {
		flex: 1;
		text-align: center;
	}

	.item-label {
		display: block;
		font-size: 21rpx;
		color: #5c677d;
	}

	.item-value {
		display: block;
		margin-top: 8rpx;
		font-size: 36rpx;
		font-weight: 700;
		line-height: 1.1;
		font-family: "JetBrains Mono", Menlo, Consolas, monospace;

		&.available {
			color: #34d399;
		}

		&.reserved {
			color: #fbbf24;
		}

		&.total {
			color: #22d3ee;
		}
	}

	.item-unit {
		display: block;
		margin-top: 4rpx;
		font-size: 20rpx;
		color: #5c677d;
	}
}

/* 标签页 */
.tab-section {
	padding: 0 32rpx;
}

.tab-bar {
	display: flex;
	gap: 12rpx;
	padding: 8rpx;
	background: #111725;
	border: 1rpx solid rgba(148, 163, 184, .09);
	border-radius: 24rpx;
}

.tab-item {
	flex: 1;
	height: 70rpx;
	line-height: 70rpx;
	text-align: center;
	border-radius: 18rpx;
	transition: all .2s ease;

	.tab-text {
		font-size: 25rpx;
		color: #9aa5bb;
	}

	&.active {
		background: rgba(34, 211, 238, .12);
		border: 1rpx solid rgba(34, 211, 238, .35);

		.tab-text {
			color: #22d3ee;
			font-weight: 600;
		}
	}
}

.content-section {
	padding: 24rpx 32rpx 0;
}

/* 库位 */
.location-item {
	padding: 28rpx;
	margin-bottom: 24rpx;
	background: #111725;
	border: 1rpx solid rgba(148, 163, 184, .09);
	border-radius: 32rpx;

	.location-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 20rpx;
	}

	.location-info {
		flex: 1;
		min-width: 0;

		.warehouse-name {
			display: block;
			font-size: 28rpx;
			font-weight: 600;
			color: #e8edf6;
		}

		.location-code {
			display: block;
			margin-top: 6rpx;
			font-size: 22rpx;
			color: #22d3ee;
			font-family: "JetBrains Mono", Menlo, Consolas, monospace;
		}
	}

	.location-status {
		flex-shrink: 0;
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

		&.empty {
			color: #5c677d;
			background: rgba(148, 163, 184, .1);
		}

		&.full {
			color: #fbbf24;
			background: rgba(251, 191, 36, .12);
		}
	}

	.detail-row {
		display: flex;
		gap: 24rpx;
		margin-bottom: 16rpx;
	}

	.detail-item {
		flex: 1;
		padding: 16rpx;
		background: #161e2e;
		border-radius: 18rpx;
		text-align: center;
	}

	.detail-label {
		display: block;
		font-size: 21rpx;
		color: #5c677d;
	}

	.detail-value {
		display: block;
		margin-top: 6rpx;
		font-size: 28rpx;
		font-weight: 700;
		color: #e8edf6;
		font-family: "JetBrains Mono", Menlo, Consolas, monospace;

		&.available {
			color: #34d399;
		}

		&.reserved {
			color: #fbbf24;
		}

		&.total {
			color: #22d3ee;
		}

		&.price {
			color: #fbbf24;
		}
	}

	.location-actions {
		display: flex;
		gap: 16rpx;
		margin-top: 20rpx;
		padding-top: 20rpx;
		border-top: 1rpx solid rgba(148, 163, 184, .09);

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

			&.freeze {
				color: #f87171;
				background: rgba(248, 113, 113, .1);
				border-color: rgba(248, 113, 113, .25);
			}
		}
	}
}

/* 库存记录 */
.transaction-item {
	padding: 28rpx;
	margin-bottom: 24rpx;
	background: #111725;
	border: 1rpx solid rgba(148, 163, 184, .09);
	border-radius: 32rpx;

	.transaction-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16rpx;
	}

	.transaction-type {
		padding: 6rpx 18rpx;
		border-radius: 999rpx;
		font-size: 22rpx;
		font-weight: 600;
		color: #9aa5bb;
		background: rgba(148, 163, 184, .1);

		&.inbound {
			color: #34d399;
			background: rgba(52, 211, 153, .12);
		}

		&.outbound {
			color: #fbbf24;
			background: rgba(251, 191, 36, .12);
		}

		&.adjust {
			color: #22d3ee;
			background: rgba(34, 211, 238, .12);
		}

		&.move {
			color: #a78bfa;
			background: rgba(167, 139, 250, .12);
		}
	}

	.transaction-time {
		font-size: 21rpx;
		color: #5c677d;
		font-family: "JetBrains Mono", Menlo, Consolas, monospace;
	}

	.content-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 20rpx;
		padding: 8rpx 0;
	}

	.content-label {
		flex-shrink: 0;
		font-size: 23rpx;
		color: #5c677d;
	}

	.content-value {
		flex: 1;
		text-align: right;
		font-size: 24rpx;
		color: #e8edf6;

		&.increase {
			color: #34d399;
		}

		&.decrease {
			color: #f87171;
		}
	}
}

/* 预警 */
.alert-item {
	padding: 28rpx;
	margin-bottom: 24rpx;
	background: #111725;
	border: 1rpx solid rgba(148, 163, 184, .09);
	border-radius: 32rpx;

	.alert-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16rpx;
	}

	.alert-type {
		display: flex;
		align-items: center;
		gap: 10rpx;
		padding: 6rpx 18rpx;
		border-radius: 999rpx;
		font-size: 22rpx;
		font-weight: 600;
		color: #9aa5bb;
		background: rgba(148, 163, 184, .1);

		&.low_stock {
			color: #fbbf24;
			background: rgba(251, 191, 36, .12);
		}

		&.out_of_stock {
			color: #f87171;
			background: rgba(248, 113, 113, .12);
		}

		&.expiry {
			color: #a78bfa;
			background: rgba(167, 139, 250, .12);
		}
	}

	.alert-time {
		font-size: 21rpx;
		color: #5c677d;
		font-family: "JetBrains Mono", Menlo, Consolas, monospace;
	}

	.alert-message {
		display: block;
		font-size: 26rpx;
		color: #e8edf6;
	}

	.alert-details {
		margin-top: 12rpx;
	}

	.detail-text {
		display: block;
		margin-top: 6rpx;
		font-size: 22rpx;
		color: #5c677d;
	}
}

.load-more {
	padding: 24rpx 0 40rpx;
	text-align: center;
}

.load-text {
	font-size: 24rpx;
	color: #22d3ee;
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
		font-size: 26rpx;
		color: #5c677d;
	}
}
</style>
<template>
	<view class="dashboard">
		<!-- 顶部状态栏 -->
		<view class="status-bar">
			<view class="user-info">
				<image class="avatar" :src="userInfo.avatar || '/static/logo.png'" mode="aspectFill"></image>
				<view class="user-text">
					<text class="greeting">{{ greeting }}</text>
					<text class="username">{{ userInfo.real_name || userInfo.username }}</text>
				</view>
			</view>
			<view class="actions">
				<view class="action-btn" @click="showNotifications">
					<text class="iconfont icon-bell"></text>
					<view class="badge" v-if="notificationCount > 0">{{ notificationCount > 99 ? '99+' : notificationCount }}</view>
				</view>
			</view>
		</view>
		
		<!-- 统计卡片 -->
		<view class="stats-section">
			<view class="stats-grid">
				<view class="stat-card" v-for="(stat, index) in stats" :key="index" @click="goToDetail(stat.type)">
					<view class="stat-icon" :style="{backgroundColor: stat.color}">
						<text class="iconfont" :class="stat.icon"></text>
					</view>
					<view class="stat-info">
						<text class="stat-value">{{ stat.value }}</text>
						<text class="stat-label">{{ stat.label }}</text>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 快捷操作 -->
		<view class="quick-actions">
			<view class="section-title">
				<text class="title-text">快捷操作</text>
			</view>
			<view class="action-grid">
				<view class="action-item" v-for="(action, index) in quickActions" :key="index" @click="handleQuickAction(action.type)">
					<view class="action-icon" :style="{backgroundColor: action.color}">
						<text class="iconfont" :class="action.icon"></text>
					</view>
					<text class="action-label">{{ action.label }}</text>
				</view>
			</view>
		</view>
		
		<!-- 待办事项 -->
		<view class="todo-section">
			<view class="section-title">
				<text class="title-text">待办事项</text>
				<text class="more-btn" @click="goToTodoList">查看全部</text>
			</view>
			<view class="todo-list">
				<view class="todo-item" v-for="(todo, index) in todoList" :key="index" @click="handleTodoClick(todo)">
					<view class="todo-icon" :style="{backgroundColor: todo.color}">
						<text class="iconfont" :class="todo.icon"></text>
					</view>
					<view class="todo-content">
						<text class="todo-title">{{ todo.title }}</text>
						<text class="todo-desc">{{ todo.description }}</text>
					</view>
					<view class="todo-meta">
						<text class="todo-count">{{ todo.count }}</text>
						<text class="iconfont icon-arrow-right"></text>
					</view>
				</view>
				<view class="empty-todo" v-if="todoList.length === 0">
					<text class="empty-text">暂无待办事项</text>
				</view>
			</view>
		</view>
		
		<!-- 最近活动 -->
		<view class="activity-section">
			<view class="section-title">
				<text class="title-text">最近活动</text>
				<text class="more-btn" @click="goToActivityList">查看更多</text>
			</view>
			<view class="activity-list">
				<view class="activity-item" v-for="(activity, index) in recentActivities" :key="index">
					<view class="activity-time">
						<text class="time-text">{{ formatTime(activity.created_at) }}</text>
					</view>
					<view class="activity-content">
						<text class="activity-title">{{ activity.title }}</text>
						<text class="activity-desc">{{ activity.description }}</text>
					</view>
				</view>
				<view class="empty-activity" v-if="recentActivities.length === 0">
					<text class="empty-text">暂无最近活动</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import api from '@/utils/api.js'

export default {
	data() {
		return {
			userInfo: {},
			notificationCount: 0,
			loading: true,
			stats: [
				{
					label: '库存总量',
					value: '0',
					icon: 'icon-inventory',
					color: '#007AFF',
					type: 'inventory'
				},
				{
					label: '待入库',
					value: '0',
					icon: 'icon-inbound',
					color: '#34C759',
					type: 'inbound'
				},
				{
					label: '待出库',
					value: '0',
					icon: 'icon-outbound',
					color: '#FF9500',
					type: 'outbound'
				},
				{
					label: '预警商品',
					value: '0',
					icon: 'icon-warning',
					color: '#FF3B30',
					type: 'warning'
				}
			],
			quickActions: [
				{
					label: '扫码入库',
					icon: 'icon-scan-in',
					color: '#34C759',
					type: 'scan_inbound'
				},
				{
					label: '扫码出库',
					icon: 'icon-scan-out',
					color: '#FF9500',
					type: 'scan_outbound'
				},
				{
					label: '库存盘点',
					icon: 'icon-check',
					color: '#007AFF',
					type: 'inventory_check'
				},
				{
					label: '库存查询',
					icon: 'icon-search',
					color: '#5856D6',
					type: 'inventory_search'
				}
			],
			todoList: [],
			recentActivities: []
		}
	},
	computed: {
		greeting() {
			const hour = new Date().getHours()
			if (hour < 6) return '夜深了'
			if (hour < 9) return '早上好'
			if (hour < 12) return '上午好'
			if (hour < 14) return '中午好'
			if (hour < 18) return '下午好'
			if (hour < 22) return '晚上好'
			return '夜深了'
		}
	},
	onLoad() {
		this.checkAuth()
		this.loadUserInfo()
		this.loadDashboardData()
	},
	onShow() {
		// 页面显示时刷新数据
		this.loadDashboardData()
	},
	onPullDownRefresh() {
		// 下拉刷新
		this.loadDashboardData().finally(() => {
			uni.stopPullDownRefresh()
		})
	},
	methods: {
		// 检查登录状态
		checkAuth() {
			const token = uni.getStorageSync('token')
			if (!token) {
				uni.reLaunch({
					url: '/pages/login/login'
				})
				return false
			}
			return true
		},
		
		// 加载用户信息
		loadUserInfo() {
			const userInfo = uni.getStorageSync('userInfo')
			if (userInfo) {
				this.userInfo = userInfo
			}
		},
		
		// 加载仪表盘数据
		async loadDashboardData() {
			this.loading = true
			try {
				// 加载仪表盘统计数据
				const dashboardRes = await api.dashboard.getStats()
				
				if (dashboardRes.code === 200) {
					const stats = dashboardRes.data.stats
					// 更新统计数据
					this.stats[0].value = stats.total_inventory || '0'
					this.stats[1].value = stats.pending_inbound || '0'
					this.stats[2].value = stats.pending_outbound || '0'
					this.stats[3].value = stats.low_stock_count || '0'
				}
				
				// 加载待办事项
				try {
					const todoRes = await api.dashboard.getTodoList()
					if (todoRes.code === 200) {
						this.todoList = todoRes.data || []
					}
				} catch (todoError) {
					console.error('加载待办事项失败:', todoError)
				}
				
				// 加载最近活动
				await this.loadRecentActivitiesFromAPI()
				
			} catch (error) {
				console.error('加载仪表盘数据失败:', error)
				// 使用默认数据
				this.setDefaultData()
			} finally {
				this.loading = false
			}
		},
		
		// 设置默认数据
		setDefaultData() {
			this.stats[0].value = '1250'
			this.stats[1].value = '8'
			this.stats[2].value = '15'
			this.stats[3].value = '23'
			this.recentActivities = [
				{ id: 1, title: '入库单 #IN2024001 已完成', description: '商品已成功入库', created_at: Date.now() / 1000 - 7200 },
				{ id: 2, title: '出库单 #OUT2024001 待处理', description: '等待出库确认', created_at: Date.now() / 1000 - 10800 },
				{ id: 3, title: '库存盘点已开始', description: '定期库存盘点', created_at: Date.now() / 1000 - 18000 }
			]
		},
		
		// 从API加载最近活动
		async loadRecentActivitiesFromAPI() {
			try {
				const response = await api.transaction.getList({ page: 1, limit: 5 })
				if (response.code === 200) {
					this.recentActivities = response.data.list || []
				}
			} catch (error) {
				console.error('加载最近活动失败:', error)
				// 使用默认活动数据
				this.recentActivities = [
					{ id: 1, title: '入库单 #IN2024001 已完成', description: '商品已成功入库', created_at: Date.now() / 1000 - 7200 },
					{ id: 2, title: '出库单 #OUT2024001 待处理', description: '等待出库确认', created_at: Date.now() / 1000 - 10800 },
					{ id: 3, title: '库存盘点已开始', description: '定期库存盘点', created_at: Date.now() / 1000 - 18000 }
				]
			}
		},
		
		// 加载统计数据
		async loadStats() {
			try {
				return await api.dashboard.getStats()
			} catch (error) {
				console.error('加载统计数据失败:', error)
				return null
			}
		},
		
		// 加载待办事项
		async loadTodoList() {
			try {
				return await this.$api.dashboard.getTodoList()
			} catch (error) {
				console.error('加载待办事项失败:', error)
				return null
			}
		},
		
		// 加载最近活动
		async loadRecentActivities() {
			try {
				return await this.$api.dashboard.getRecentActivities()
			} catch (error) {
				console.error('加载最近活动失败:', error)
				return null
			}
		},
		
		// 显示通知
		showNotifications() {
			uni.showModal({
				title: '通知',
				content: '暂无新通知',
				showCancel: false
			})
		},
		
		// 跳转到详情页面
		goToDetail(type) {
			switch (type) {
				case 'inventory':
					uni.navigateTo({ url: '/pages/inventory/list' })
					break
				case 'inbound':
					uni.navigateTo({ url: '/pages/inbound/list' })
					break
				case 'outbound':
					uni.navigateTo({ url: '/pages/outbound/list' })
					break
				case 'warning':
					uni.navigateTo({ url: '/pages/inventory/list?filter=warning' })
					break
			}
		},
		
		// 处理快捷操作
		handleQuickAction(type) {
			switch (type) {
				case 'scan_inbound':
					uni.navigateTo({ url: '/pages/scan/scan?type=inbound' })
					break
				case 'scan_outbound':
					uni.navigateTo({ url: '/pages/scan/scan?type=outbound' })
					break
				case 'inventory_check':
					uni.navigateTo({ url: '/pages/scan/scan?type=check' })
					break
				case 'inventory_search':
					uni.switchTab({ url: '/pages/inventory/list' })
					break
			}
		},
		
		// 处理待办事项点击
		handleTodoClick(todo) {
			if (todo.url) {
				uni.navigateTo({ url: todo.url })
			}
		},
		
		// 跳转到待办列表
		goToTodoList() {
			uni.showModal({
				title: '待办事项',
				content: '功能开发中...',
				showCancel: false
			})
		},
		
		// 跳转到活动列表
		goToActivityList() {
			uni.showModal({
				title: '活动记录',
				content: '功能开发中...',
				showCancel: false
			})
		},
		
		// 格式化时间
		formatTime(timestamp) {
			if (!timestamp) return ''
			
			const date = new Date(timestamp * 1000)
			const now = new Date()
			const diff = now - date
			
			if (diff < 60000) { // 1分钟内
				return '刚刚'
			} else if (diff < 3600000) { // 1小时内
				return Math.floor(diff / 60000) + '分钟前'
			} else if (diff < 86400000) { // 1天内
				return Math.floor(diff / 3600000) + '小时前'
			} else {
				return date.toLocaleDateString()
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.dashboard {
	min-height: 100vh;
	background: #f5f5f5;
	padding-bottom: 20rpx;
}

.status-bar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx 30rpx;
	background: #007AFF;
	color: white;
	
	.user-info {
		display: flex;
		align-items: center;
		
		.avatar {
			width: 80rpx;
			height: 80rpx;
			border-radius: 50%;
			margin-right: 20rpx;
			border: 2rpx solid rgba(255, 255, 255, 0.3);
		}
		
		.user-text {
			.greeting {
				display: block;
				font-size: 24rpx;
				opacity: 0.8;
				margin-bottom: 4rpx;
			}
			
			.username {
				display: block;
				font-size: 32rpx;
				font-weight: bold;
			}
		}
	}
	
	.actions {
		.action-btn {
			position: relative;
			width: 60rpx;
			height: 60rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: 50%;
			background: rgba(255, 255, 255, 0.2);
			
			.iconfont {
				font-size: 32rpx;
			}
			
			.badge {
				position: absolute;
				top: -8rpx;
				right: -8rpx;
				min-width: 32rpx;
				height: 32rpx;
				background: #FF3B30;
				color: white;
				border-radius: 16rpx;
				font-size: 20rpx;
				display: flex;
				align-items: center;
				justify-content: center;
				padding: 0 8rpx;
			}
		}
	}
}

.stats-section {
	padding: 30rpx;
	margin-top: -20rpx;
	
	.stats-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20rpx;
		
		.stat-card {
			background: white;
			border-radius: 16rpx;
			padding: 30rpx;
			display: flex;
			align-items: center;
			box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
			transition: transform 0.2s;
			
			&:active {
				transform: scale(0.98);
			}
			
			.stat-icon {
				width: 60rpx;
				height: 60rpx;
				border-radius: 12rpx;
				display: flex;
				align-items: center;
				justify-content: center;
				margin-right: 20rpx;
				
				.iconfont {
					font-size: 32rpx;
					color: white;
				}
			}
			
			.stat-info {
				flex: 1;
				
				.stat-value {
					display: block;
					font-size: 36rpx;
					font-weight: bold;
					color: #333;
					margin-bottom: 8rpx;
				}
				
				.stat-label {
					display: block;
					font-size: 24rpx;
					color: #666;
				}
			}
		}
	}
}

.quick-actions, .todo-section, .activity-section {
	margin: 30rpx;
	background: white;
	border-radius: 16rpx;
	padding: 30rpx;
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
	
	.section-title {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 30rpx;
		
		.title-text {
			font-size: 32rpx;
			font-weight: bold;
			color: #333;
		}
		
		.more-btn {
			font-size: 28rpx;
			color: #007AFF;
		}
	}
}

.action-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 30rpx;
	
	.action-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		transition: transform 0.2s;
		
		&:active {
			transform: scale(0.95);
		}
		
		.action-icon {
			width: 80rpx;
			height: 80rpx;
			border-radius: 16rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			margin-bottom: 16rpx;
			
			.iconfont {
				font-size: 36rpx;
				color: white;
			}
		}
		
		.action-label {
			font-size: 24rpx;
			color: #666;
			text-align: center;
		}
	}
}

.todo-list, .activity-list {
	.todo-item, .activity-item {
		display: flex;
		align-items: center;
		padding: 20rpx 0;
		border-bottom: 1rpx solid #f0f0f0;
		transition: background-color 0.2s;
		
		&:last-child {
			border-bottom: none;
		}
		
		&:active {
			background-color: #f8f8f8;
		}
	}
	
	.todo-item {
		.todo-icon {
			width: 60rpx;
			height: 60rpx;
			border-radius: 12rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			margin-right: 20rpx;
			
			.iconfont {
				font-size: 28rpx;
				color: white;
			}
		}
		
		.todo-content {
			flex: 1;
			
			.todo-title {
				display: block;
				font-size: 30rpx;
				color: #333;
				margin-bottom: 8rpx;
			}
			
			.todo-desc {
				display: block;
				font-size: 24rpx;
				color: #666;
			}
		}
		
		.todo-meta {
			display: flex;
			align-items: center;
			
			.todo-count {
				font-size: 28rpx;
				color: #007AFF;
				font-weight: bold;
				margin-right: 10rpx;
			}
			
			.iconfont {
				font-size: 24rpx;
				color: #ccc;
			}
		}
	}
	
	.activity-item {
		.activity-time {
			width: 120rpx;
			margin-right: 20rpx;
			
			.time-text {
				font-size: 24rpx;
				color: #999;
			}
		}
		
		.activity-content {
			flex: 1;
			
			.activity-title {
				display: block;
				font-size: 28rpx;
				color: #333;
				margin-bottom: 8rpx;
			}
			
			.activity-desc {
				display: block;
				font-size: 24rpx;
				color: #666;
			}
		}
	}
	
	.empty-todo, .empty-activity {
		text-align: center;
		padding: 60rpx 0;
		
		.empty-text {
			font-size: 28rpx;
			color: #999;
		}
	}
}

/* 字体图标样式 */
.iconfont {
	font-family: 'iconfont';
	font-style: normal;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}

.icon-bell:before { content: '\e7f4'; }
.icon-inventory:before { content: '\e7a8'; }
.icon-inbound:before { content: '\e7b2'; }
.icon-outbound:before { content: '\e7b3'; }
.icon-warning:before { content: '\e7ca'; }
.icon-scan-in:before { content: '\e7d1'; }
.icon-scan-out:before { content: '\e7d2'; }
.icon-check:before { content: '\e7fc'; }
.icon-search:before { content: '\e7e4'; }
.icon-arrow-right:before { content: '\e6d9'; }
</style>

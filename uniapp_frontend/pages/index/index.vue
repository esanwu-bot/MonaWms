<template>
	<view class="home-page">
		<!-- 顶部栏 -->
		<view class="topbar">
			<view class="topbar-left">
				<text class="date">{{ currentDate }}</text>
				<text class="greeting">{{ greeting }}，{{ displayName }} 👋</text>
			</view>
			<view class="topbar-right">
				<view class="ic-btn" @click="showNotifications">
					<text class="iconfont icon-bell"></text>
					<view class="dot" v-if="notificationCount > 0"></view>
				</view>
				<image class="avatar" :src="userInfo.avatar || '/static/logo.png'" mode="aspectFill"></image>
			</view>
		</view>

		<!-- 统计卡片 -->
		<view class="pad">
			<view class="stats">
				<view class="stat" v-for="(stat, index) in stats" :key="index" @click="goToDetail(stat.type)">
					<view class="stat-line" :style="{background: stat.color}"></view>
					<view class="stat-k">
						<text class="iconfont" :class="stat.icon" :style="{color: stat.color}"></text>
						<text class="stat-label">{{ stat.label }}</text>
					</view>
					<view class="stat-n">
						<text class="stat-value">{{ stat.value }}</text>
						<text class="stat-unit">{{ stat.unit }}</text>
					</view>
					<text class="stat-d" :class="stat.trend">{{ stat.delta }}</text>
				</view>
			</view>

			<!-- 快捷操作 -->
			<view class="sec-title">
				<text class="bar"></text>
				<text class="sec-h">快捷操作</text>
			</view>
			<view class="quick">
				<view class="qk" v-for="(action, index) in quickActions" :key="index" @click="handleQuickAction(action.type)">
					<view class="qi" :style="{background: action.bg}">
						<text class="iconfont" :class="action.icon" :style="{color: action.color}"></text>
					</view>
					<text class="qn">{{ action.label }}</text>
				</view>
			</view>
		</view>

		<!-- 待办提醒（横滚） -->
		<view class="sec-title pad">
			<text class="bar"></text>
			<text class="sec-h">待办提醒</text>
			<text class="more-btn" @click="goToTodoList">全部 ›</text>
		</view>
		<scroll-view class="todos" scroll-x="true" show-scrollbar="false">
			<view class="todo" v-for="(todo, index) in todoList" :key="index" @click="handleTodoClick(todo)">
				<text class="tl">{{ todo.title }}</text>
				<text class="tv">{{ todo.count }}</text>
				<text class="tt">{{ todo.description }}</text>
			</view>
			<view class="todo empty-todo" v-if="todoList.length === 0">
				<text class="tl">全部完成</text>
				<text class="tv">0</text>
				<text class="tt">暂无待办</text>
			</view>
		</scroll-view>

		<!-- 最近活动 -->
		<view class="pad">
			<view class="sec-title">
				<text class="bar"></text>
				<text class="sec-h">最近活动</text>
				<text class="more-btn" @click="goToActivityList">全部 ›</text>
			</view>
			<view class="act-list">
				<view class="act-item" v-for="(activity, index) in recentActivities" :key="index">
					<view class="act-ic">
						<text class="iconfont icon-check"></text>
					</view>
					<view class="act-body">
						<text class="at">{{ activity.title }}</text>
						<text class="am">{{ formatTime(activity.created_at) }} · {{ activity.description || '系统' }}</text>
					</view>
				</view>
				<view class="empty-state" v-if="recentActivities.length === 0">
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
					unit: ' 台',
					delta: '实时',
					trend: 'up',
					icon: 'icon-inventory',
					color: '#22d3ee',
					type: 'inventory'
				},
				{
					label: '待入库',
					value: '0',
					unit: ' 单',
					delta: '待收货',
					trend: 'up',
					icon: 'icon-inbound',
					color: '#34d399',
					type: 'inbound'
				},
				{
					label: '待出库',
					value: '0',
					unit: ' 单',
					delta: '待拣货',
					trend: 'up',
					icon: 'icon-outbound',
					color: '#fbbf24',
					type: 'outbound'
				},
				{
					label: '预警商品',
					value: '0',
					unit: ' 项',
					delta: '需补货',
					trend: 'down',
					icon: 'icon-warning',
					color: '#f87171',
					type: 'warning'
				}
			],
			quickActions: [
				{
					label: '扫码入库',
					icon: 'icon-scan-in',
					color: '#22d3ee',
					bg: 'rgba(34,211,238,.12)',
					type: 'scan_inbound'
				},
				{
					label: '扫码出库',
					icon: 'icon-scan-out',
					color: '#fbbf24',
					bg: 'rgba(251,191,36,.12)',
					type: 'scan_outbound'
				},
				{
					label: '库存查询',
					icon: 'icon-search',
					color: '#a78bfa',
					bg: 'rgba(167,139,250,.12)',
					type: 'inventory_search'
				},
				{
					label: '入库作业',
					icon: 'icon-inbound',
					color: '#34d399',
					bg: 'rgba(52,211,153,.12)',
					type: 'inbound_list'
				},
				{
					label: '出库作业',
					icon: 'icon-outbound',
					color: '#f87171',
					bg: 'rgba(248,113,113,.12)',
					type: 'outbound_list'
				},
				{
					label: '库存盘点',
					icon: 'icon-check',
					color: '#9aa5bb',
					bg: 'rgba(148,163,184,.1)',
					type: 'inventory_check'
				}
			],
			todoList: [],
			recentActivities: []
		}
	},
	computed: {
		displayName() {
			return this.userInfo.real_name || this.userInfo.username || '管理员'
		},
		currentDate() {
			const d = new Date()
			const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
			return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} · ${week[d.getDay()]}`
		},
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
				case 'inbound_list':
					uni.navigateTo({ url: '/pages/inbound/list' })
					break
				case 'outbound_list':
					uni.navigateTo({ url: '/pages/outbound/list' })
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
.home-page {
	min-height: 100vh;
	background: #0a0e16;
	padding-bottom: calc(48rpx + env(safe-area-inset-bottom));
}

.pad {
	padding: 0 32rpx;
}

/* ===== 顶栏 ===== */
.topbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16rpx 32rpx 24rpx;
}

.topbar-left {
	.date {
		display: block;
		font-size: 22rpx;
		color: #5c677d;
		letter-spacing: .05em;
		font-family: "JetBrains Mono", Menlo, Consolas, monospace;
	}

	.greeting {
		display: block;
		margin-top: 6rpx;
		font-size: 40rpx;
		font-weight: 700;
		color: #e8edf6;
		letter-spacing: .01em;
	}
}

.topbar-right {
	display: flex;
	align-items: center;
	gap: 20rpx;

	.ic-btn {
		position: relative;
		width: 76rpx;
		height: 76rpx;
		border-radius: 24rpx;
		border: 1rpx solid rgba(148, 163, 184, .09);
		background: #111725;
		display: flex;
		align-items: center;
		justify-content: center;

		.iconfont {
			font-size: 34rpx;
			color: #9aa5bb;
		}

		.dot {
			position: absolute;
			top: 16rpx;
			right: 18rpx;
			width: 14rpx;
			height: 14rpx;
			border-radius: 50%;
			background: #f87171;
			border: 2rpx solid #111725;
		}
	}

	.avatar {
		width: 80rpx;
		height: 80rpx;
		border-radius: 28rpx;
		border: 4rpx solid #1c2536;
	}
}

/* ===== 区块标题 ===== */
.sec-title {
	display: flex;
	align-items: center;
	margin: 44rpx 0 24rpx;

	.bar {
		width: 6rpx;
		height: 28rpx;
		background: #22d3ee;
		border-radius: 3rpx;
		margin-right: 14rpx;
	}

	.sec-h {
		flex: 1;
		font-size: 30rpx;
		font-weight: 700;
		color: #e8edf6;
	}

	.more-btn {
		font-size: 24rpx;
		color: #5c677d;
	}
}

/* ===== 统计卡 ===== */
.stats {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 24rpx;
}

.stat {
	position: relative;
	overflow: hidden;
	padding: 28rpx;
	background: #111725;
	border: 1rpx solid rgba(148, 163, 184, .09);
	border-radius: 32rpx;
	transition: transform .15s ease;

	&:active {
		transform: scale(.98);
	}

	.stat-line {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 4rpx;
	}

	.stat-k {
		display: flex;
		align-items: center;
		gap: 10rpx;
		font-size: 23rpx;
		color: #9aa5bb;

		.iconfont {
			font-size: 26rpx;
		}
	}

	.stat-n {
		display: flex;
		align-items: baseline;
		margin: 14rpx 0 10rpx;

		.stat-value {
			font-size: 52rpx;
			font-weight: 700;
			line-height: 1.1;
			color: #e8edf6;
			font-family: "JetBrains Mono", Menlo, Consolas, monospace;
		}

		.stat-unit {
			margin-left: 6rpx;
			font-size: 22rpx;
			color: #5c677d;
		}
	}

	.stat-d {
		display: inline-block;
		padding: 4rpx 16rpx;
		border-radius: 999rpx;
		font-size: 20rpx;

		&.up {
			color: #34d399;
			background: rgba(52, 211, 153, .12);
		}

		&.down {
			color: #f87171;
			background: rgba(248, 113, 113, .12);
		}
	}
}

/* ===== 快捷操作 ===== */
.quick {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 22rpx;
}

.qk {
	padding: 28rpx 8rpx;
	background: #111725;
	border: 1rpx solid rgba(148, 163, 184, .09);
	border-radius: 30rpx;
	text-align: center;
	transition: transform .15s ease;

	&:active {
		transform: scale(.95);
	}

	.qi {
		width: 84rpx;
		height: 84rpx;
		border-radius: 24rpx;
		margin: 0 auto 16rpx;
		display: flex;
		align-items: center;
		justify-content: center;

		.iconfont {
			font-size: 38rpx;
		}
	}

	.qn {
		display: block;
		font-size: 24rpx;
		font-weight: 600;
		color: #e8edf6;
		letter-spacing: .02em;
	}
}

/* ===== 待办横滚 ===== */
.todos {
	display: flex;
	flex-direction: row;
	padding: 0 32rpx 8rpx;
}

.todo {
	flex: 0 0 auto;
	min-width: 300rpx;
	margin-right: 22rpx;
	padding: 26rpx 30rpx;
	background: #111725;
	border: 1rpx solid rgba(148, 163, 184, .09);
	border-radius: 30rpx;
	display: flex;
	flex-direction: column;
	gap: 10rpx;

	.tl {
		font-size: 23rpx;
		color: #9aa5bb;
	}

	.tv {
		font-size: 44rpx;
		font-weight: 700;
		color: #fbbf24;
		font-family: "JetBrains Mono", Menlo, Consolas, monospace;
	}

	.tt {
		font-size: 21rpx;
		color: #5c677d;
	}
}

/* ===== 最近活动 ===== */
.act-list {
	background: #111725;
	border: 1rpx solid rgba(148, 163, 184, .09);
	border-radius: 32rpx;
	padding: 8rpx 28rpx;
}

.act-item {
	display: flex;
	align-items: flex-start;
	gap: 24rpx;
	padding: 24rpx 0;
	border-bottom: 1rpx solid rgba(148, 163, 184, .09);

	&:last-child {
		border-bottom: none;
	}

	.act-ic {
		width: 68rpx;
		height: 68rpx;
		border-radius: 22rpx;
		flex-shrink: 0;
		background: rgba(34, 211, 238, .12);
		display: flex;
		align-items: center;
		justify-content: center;

		.iconfont {
			font-size: 30rpx;
			color: #22d3ee;
		}
	}

	.act-body {
		flex: 1;
		min-width: 0;

		.at {
			display: block;
			font-size: 26rpx;
			font-weight: 500;
			color: #e8edf6;
		}

		.am {
			display: block;
			margin-top: 6rpx;
			font-size: 22rpx;
			color: #5c677d;
			font-family: "JetBrains Mono", Menlo, Consolas, monospace;
		}
	}
}

/* ===== 字体图标 ===== */
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

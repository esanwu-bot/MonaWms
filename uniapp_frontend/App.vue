<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/* =========================================================
	   MonaWMS 移动端全局主题 —— 暗色科技风
	   原型基准：prototype/mobile.html
	   ========================================================= */

	page {
		background: #0a0e16;
		color: #e8edf6;
		font-size: 28rpx;
		line-height: 1.55;
		font-family: -apple-system, "PingFang SC", "Noto Sans SC", "Helvetica Neue", Arial, sans-serif;
		-webkit-font-smoothing: antialiased;
	}

	view, text, input, textarea, scroll-view {
		box-sizing: border-box;
	}

	/* 去掉小程序 button 默认样式 */
	button {
		margin: 0;
		padding: 0;
		background: transparent;
		border: none;
		font-size: 26rpx;
		line-height: 1.4;
		color: inherit;
	}

	button::after {
		border: none;
	}

	/* 数字 / 单号统一等宽 */
	.mono,
	.order-no,
	.create-time,
	.stat-value,
	.time-text {
		font-family: "JetBrains Mono", "SFMono-Regular", Menlo, Consolas, monospace;
	}

	/* ---------- 通用页面容器 ---------- */
	.page,
	.inbound-list,
	.outbound-list,
	.inventory-list,
	.devices-page,
	.warehouse-page,
	.pick-page,
	.receive-page,
	.inbound-detail,
	.outbound-detail,
	.inventory-detail,
	.profile-page,
	.scan-page {
		min-height: 100vh;
		background: #0a0e16;
		padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
	}

	/* ---------- 顶部信息头 ---------- */
	.header-info {
		margin: 24rpx 32rpx;
		padding: 28rpx;
		background: #111725;
		border: 1rpx solid rgba(148, 163, 184, .09);
		border-radius: 32rpx;
		position: relative;
		overflow: hidden;
	}

	.header-info::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 3rpx;
		background: linear-gradient(90deg, #22d3ee, transparent);
	}

	/* ---------- 区块卡片 ---------- */
	.section {
		margin: 0 32rpx 24rpx;
		padding: 28rpx;
		background: #111725;
		border: 1rpx solid rgba(148, 163, 184, .09);
		border-radius: 32rpx;
	}

	.section-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 28rpx;
		font-weight: 700;
		color: #e8edf6;
		margin-bottom: 20rpx;
	}

	.section-title::before {
		content: '';
		width: 6rpx;
		height: 26rpx;
		background: #22d3ee;
		border-radius: 3rpx;
		margin-right: 14rpx;
	}

	/* ---------- 搜索栏 ---------- */
	.search-bar {
		display: flex;
		align-items: center;
		gap: 16rpx;
		padding: 20rpx 32rpx;
	}

	.search-input {
		flex: 1;
		height: 76rpx;
		padding: 0 28rpx;
		background: #161e2e;
		border: 1rpx solid rgba(148, 163, 184, .12);
		border-radius: 22rpx;
		color: #e8edf6;
		font-size: 26rpx;
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
		color: #9aa5bb;
		font-size: 30rpx;
	}

	.filter-btn:active {
		background: #1c2536;
	}

	/* ---------- 筛选 chips ---------- */
	.filter-tags {
		display: flex;
		gap: 16rpx;
		padding: 0 32rpx 20rpx;
	}

	.tag {
		flex-shrink: 0;
		padding: 12rpx 28rpx;
		background: #111725;
		border: 1rpx solid rgba(148, 163, 184, .12);
		border-radius: 999rpx;
		color: #9aa5bb;
		font-size: 24rpx;
		font-weight: 600;
	}

	.tag.active {
		background: rgba(34, 211, 238, .12);
		border-color: rgba(34, 211, 238, .35);
		color: #22d3ee;
	}

	.filter-tabs {
		display: flex;
		gap: 16rpx;
		padding: 0 32rpx 20rpx;
	}

	.filter-tab {
		flex: 1;
		height: 64rpx;
		line-height: 64rpx;
		text-align: center;
		background: #111725;
		border: 1rpx solid rgba(148, 163, 184, .12);
		border-radius: 20rpx;
		color: #9aa5bb;
		font-size: 24rpx;
	}

	.filter-tab.active {
		background: rgba(34, 211, 238, .12);
		border-color: rgba(34, 211, 238, .35);
		color: #22d3ee;
	}

	/* ---------- 统计条 ---------- */
	.stats {
		display: flex;
		gap: 16rpx;
		padding: 0 32rpx 20rpx;
	}

	.stats .stat-item {
		flex: 1;
		padding: 18rpx 16rpx;
		background: #111725;
		border: 1rpx solid rgba(148, 163, 184, .09);
		border-radius: 24rpx;
		text-align: center;
	}

	.stats .stat-value {
		display: block;
		font-size: 34rpx;
		font-weight: 700;
		color: #22d3ee;
		line-height: 1.2;
	}

	.stats .stat-label {
		display: block;
		margin-top: 6rpx;
		font-size: 20rpx;
		color: #5c677d;
	}

	/* ---------- 列表 ---------- */
	.list-container {
		display: flex;
		flex-direction: column;
		gap: 24rpx;
		padding: 0 32rpx 24rpx;
	}

	.list-item {
		padding: 28rpx;
		background: #111725;
		border: 1rpx solid rgba(148, 163, 184, .09);
		border-radius: 32rpx;
		transition: transform .15s ease;
	}

	.list-item:active {
		transform: scale(.985);
	}

	.item-header,
	.order-header,
	.device-header,
	.warehouse-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 20rpx;
	}

	.order-info .order-no {
		display: block;
		font-size: 28rpx;
		font-weight: 600;
		color: #22d3ee;
		letter-spacing: .02em;
	}

	.order-info .create-time,
	.create-time {
		display: block;
		margin-top: 4rpx;
		font-size: 22rpx;
		color: #5c677d;
	}

	.item-content {
		padding-top: 4rpx;
	}

	.detail-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8rpx 0;
		font-size: 25rpx;
	}

	.detail-row .label,
	.label {
		color: #5c677d;
		font-size: 24rpx;
	}

	.detail-row .value,
	.value {
		color: #e8edf6;
		font-size: 26rpx;
	}

	.item-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 18rpx;
		padding-top: 18rpx;
		border-top: 1rpx solid rgba(148, 163, 184, .09);
		font-size: 24rpx;
		color: #5c677d;
	}

	/* ---------- 状态徽标 ---------- */
	.status-badge {
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
		padding: 6rpx 18rpx;
		border-radius: 999rpx;
		font-size: 22rpx;
		font-weight: 600;
		color: #9aa5bb;
		background: rgba(148, 163, 184, .1);
	}

	.status-pending {
		color: #fbbf24;
		background: rgba(251, 191, 36, .12);
	}

	.status-receiving,
	.status-picking {
		color: #22d3ee;
		background: rgba(34, 211, 238, .12);
	}

	.status-completed,
	.status-available,
	.status-active {
		color: #34d399;
		background: rgba(52, 211, 153, .12);
	}

	.status-cancelled,
	.status-scrapped,
	.status-inactive {
		color: #f87171;
		background: rgba(248, 113, 113, .12);
	}

	.status-in-use {
		color: #a78bfa;
		background: rgba(167, 139, 250, .12);
	}

	.status-maintenance {
		color: #fbbf24;
		background: rgba(251, 191, 36, .12);
	}

	/* ---------- 进度条 ---------- */
	.progress-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 23rpx;
		color: #9aa5bb;
		margin-bottom: 10rpx;
	}

	.progress-text {
		font-size: 22rpx;
		color: #9aa5bb;
	}

	.progress-bar,
	.mini-progress {
		height: 10rpx;
		background: #1c2536;
		border-radius: 6rpx;
		overflow: hidden;
	}

	.progress-fill,
	.mini-progress-fill {
		height: 100%;
		border-radius: 6rpx;
		background: linear-gradient(90deg, #06b6d4, #22d3ee);
		transition: width .6s cubic-bezier(.22, 1, .36, 1);
	}

	.mini-progress {
		height: 8rpx;
	}

	/* ---------- 按钮 ---------- */
	.actions,
	.bottom-actions,
	.popup-actions,
	.sheet-foot {
		display: flex;
		gap: 16rpx;
		margin-top: 24rpx;
	}

	.action-btn,
	.btn {
		flex: 1;
		height: 78rpx;
		line-height: 78rpx;
		text-align: center;
		border-radius: 22rpx;
		font-size: 26rpx;
		font-weight: 600;
		border: 1rpx solid transparent;
	}

	.action-btn.primary,
	.btn.primary,
	.confirm-btn {
		background: linear-gradient(135deg, #06b6d4, #0891b2);
		color: #04222b;
		border: none;
	}

	.action-btn.secondary,
	.btn.ghost,
	.btn.secondary,
	.reset-btn,
	.cancel-btn {
		background: #161e2e;
		border: 1rpx solid rgba(148, 163, 184, .12);
		color: #9aa5bb;
	}

	.action-btn.danger,
	.btn.danger {
		background: rgba(248, 113, 113, .12);
		border: 1rpx solid rgba(248, 113, 113, .3);
		color: #f87171;
	}

	.action-btn:active,
	.btn:active {
		transform: scale(.97);
	}

	/* ---------- 空态 / 加载更多 ---------- */
	.load-more {
		padding: 32rpx 0 48rpx;
		text-align: center;
		font-size: 24rpx;
		color: #5c677d;
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

	/* ---------- FAB ---------- */
	.fab {
		position: fixed;
		right: 32rpx;
		bottom: calc(140rpx + env(safe-area-inset-bottom));
		width: 104rpx;
		height: 104rpx;
		border-radius: 32rpx;
		background: linear-gradient(135deg, #06b6d4, #0891b2);
		color: #04222b;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 52rpx;
		font-weight: 300;
		box-shadow: 0 16rpx 44rpx rgba(34, 211, 238, .35);
		z-index: 60;
	}

	.fab:active {
		transform: scale(.92);
	}

	/* ---------- 弹出层（筛选 / 表单抽屉） ---------- */
	.filter-popup,
	.manual-popup {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 90;
		background: #111725;
		border-top: 1rpx solid rgba(148, 163, 184, .2);
		border-radius: 40rpx 40rpx 0 0;
		padding: 12rpx 40rpx calc(40rpx + env(safe-area-inset-bottom));
		max-height: 82vh;
		overflow-y: auto;
		box-shadow: 0 -20rpx 60rpx rgba(0, 0, 0, .5);
	}

	.popup-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20rpx 0 24rpx;
	}

	.popup-title {
		font-size: 32rpx;
		font-weight: 700;
		color: #e8edf6;
	}

	.close-btn {
		width: 56rpx;
		height: 56rpx;
		line-height: 52rpx;
		text-align: center;
		border-radius: 18rpx;
		background: #161e2e;
		color: #9aa5bb;
		font-size: 28rpx;
	}

	.filter-content,
	.popup-content {
		padding-bottom: 12rpx;
	}

	.filter-section {
		margin-bottom: 28rpx;
	}

	.filter-section .section-title {
		margin-bottom: 16rpx;
	}

	.option-list {
		display: flex;
		flex-wrap: wrap;
		gap: 16rpx;
	}

	.option-item {
		display: flex;
		align-items: center;
		padding: 14rpx 26rpx;
		background: #161e2e;
		border: 1rpx solid rgba(148, 163, 184, .12);
		border-radius: 20rpx;
	}

	.option-item.active {
		background: rgba(34, 211, 238, .12);
		border-color: rgba(34, 211, 238, .35);
	}

	.option-item.active .option-label {
		color: #22d3ee;
	}

	.checkbox {
		width: 30rpx;
		height: 30rpx;
		margin-right: 14rpx;
		border-radius: 10rpx;
		border: 2rpx solid rgba(148, 163, 184, .3);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 20rpx;
		color: #04222b;
	}

	.option-item.active .checkbox {
		background: #22d3ee;
		border-color: #22d3ee;
	}

	.option-label {
		font-size: 25rpx;
		color: #9aa5bb;
	}

	.date-range {
		display: flex;
		align-items: center;
		gap: 16rpx;
	}

	.date-input {
		flex: 1;
		height: 76rpx;
		line-height: 76rpx;
		padding: 0 24rpx;
		background: #161e2e;
		border: 1rpx solid rgba(148, 163, 184, .12);
		border-radius: 22rpx;
		color: #e8edf6;
		font-size: 25rpx;
	}

	.date-separator {
		color: #5c677d;
	}

	/* ---------- 输入控件 ---------- */
	input,
	textarea {
		color: #e8edf6;
	}

	.input-group {
		margin-bottom: 24rpx;
	}

	.input-label {
		display: block;
		margin-bottom: 12rpx;
		font-size: 24rpx;
		font-weight: 600;
		color: #9aa5bb;
	}

	.manual-input {
		width: 100%;
		height: 88rpx;
		padding: 0 28rpx;
		background: #161e2e;
		border: 1rpx solid rgba(148, 163, 184, .12);
		border-radius: 22rpx;
		font-size: 28rpx;
	}

	/* ---------- 字体图标（iconfont） ---------- */
	.iconfont {
		font-family: 'iconfont';
		font-style: normal;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	.icon-search:before { content: '\e7e4'; }
	.icon-check:before { content: '\e7fc'; }
	.icon-close:before { content: '\e7e9'; }
	.icon-filter:before { content: '\e7c1'; }
	.icon-location:before { content: '\e7b8'; }
	.icon-adjust:before { content: '\e7a1'; }
	.icon-move:before { content: '\e7b7'; }
	.icon-detail:before { content: '\e7a4'; }
	.icon-freeze:before { content: '\e7cb'; }
	.icon-empty:before { content: '\e7a6'; }
	.icon-user:before { content: '\e7ae'; }
	.icon-lock:before { content: '\e7a2'; }

	/* ---------- 滚动条隐藏 ---------- */
	::-webkit-scrollbar {
		width: 0;
		height: 0;
	}
</style>

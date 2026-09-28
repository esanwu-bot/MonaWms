<template>
	<view class="login-container">
		<!-- 背景装饰 -->
		<view class="bg-decoration">
			<view class="circle circle1"></view>
			<view class="circle circle2"></view>
		</view>
		
		<!-- 登录表单 -->
		<view class="login-form">
			<!-- Logo区域 -->
			<view class="logo-section">
				<image class="logo" src="/static/logo.png" mode="aspectFit"></image>
				<text class="app-name">MonaWMS</text>
				<text class="app-desc">智能仓库管理系统</text>
			</view>
			
			<!-- 输入区域 -->
			<view class="input-section">
				<view class="input-group">
					<view class="input-icon">
						<text class="iconfont icon-user"></text>
					</view>
					<input 
						class="input-field" 
						v-model="loginForm.username" 
						placeholder="请输入用户名" 
						placeholder-class="placeholder"
						maxlength="20"
					/>
				</view>
				
				<view class="input-group">
					<view class="input-icon">
						<text class="iconfont icon-lock"></text>
					</view>
					<input 
						class="input-field" 
						v-model="loginForm.password" 
						placeholder="请输入密码" 
						placeholder-class="placeholder"
						password
						maxlength="20"
					/>
					<view class="password-toggle" @click="togglePassword">
						<text class="iconfont" :class="showPassword ? 'icon-eye' : 'icon-eye-close'"></text>
					</view>
				</view>
				
				<!-- 记住密码 -->
				<view class="remember-section">
					<view class="checkbox-group" @click="toggleRemember">
						<view class="checkbox" :class="{checked: rememberPassword}">
							<text class="iconfont icon-check" v-if="rememberPassword"></text>
						</view>
						<text class="checkbox-text">记住密码</text>
					</view>
					<text class="forgot-password" @click="forgotPassword">忘记密码？</text>
				</view>
			</view>
			
			<!-- 登录按钮 -->
			<view class="button-section">
				<button 
					class="login-btn" 
					:class="{disabled: !canLogin}"
					:disabled="!canLogin || loading"
					@click="handleLogin"
				>
					<text v-if="loading" class="loading-text">登录中...</text>
					<text v-else>登录</text>
				</button>
			</view>
			
			<!-- 其他选项 -->
			<view class="other-options">
				<text class="register-text">还没有账号？</text>
				<text class="register-link" @click="goRegister">立即注册</text>
			</view>
		</view>
	</view>
</template>

<script>
import api from '@/utils/api.js'

export default {
	data() {
		return {
			loginForm: {
				username: 'admin',
				password: 'password'
			},
			showPassword: false,
			rememberPassword: false,
			loading: false
		}
	},
	computed: {
		canLogin() {
			return this.loginForm.username.trim() && this.loginForm.password.trim()
		}
	},
	onLoad() {
		// 检查是否有保存的登录信息
		this.loadSavedCredentials()
	},
	methods: {
		// 切换密码显示状态
		togglePassword() {
			this.showPassword = !this.showPassword
		},
		
		// 切换记住密码状态
		toggleRemember() {
			this.rememberPassword = !this.rememberPassword
		},
		
		// 处理登录
		async handleLogin() {
			if (!this.canLogin || this.loading) return
			
			try {
				this.loading = true
				
				// 表单验证
				if (!this.validateForm()) {
					return
				}
				
				// 调用登录API
				const response = await api.auth.login({
					username: this.loginForm.username.trim(),
					password: this.loginForm.password.trim()
				})
				
				if (response.code === 200) {
					// 保存用户信息和token
					uni.setStorageSync('token', response.data.token)
					uni.setStorageSync('userInfo', response.data.user)
					
					// 保存登录信息
					if (this.rememberPassword) {
						this.saveCredentials()
					} else {
						this.clearSavedCredentials()
					}
					
					uni.showToast({
						title: response.message || '登录成功',
						icon: 'success'
					})
					
					// 跳转到首页
					setTimeout(() => {
						uni.switchTab({
							url: '/pages/index/index'
						})
					}, 1500)
				} else {
					uni.showToast({
						title: response.message || '登录失败',
						icon: 'none'
					})
				}
			} catch (error) {
				console.error('登录失败:', error)
				uni.showToast({
					title: error.message || '网络错误，请重试',
					icon: 'none'
				})
			} finally {
				this.loading = false
			}
		},
		
		// 表单验证
		validateForm() {
			if (!this.loginForm.username.trim()) {
				uni.showToast({
					title: '请输入用户名',
					icon: 'none'
				})
				return false
			}
			
			if (!this.loginForm.password.trim()) {
				uni.showToast({
					title: '请输入密码',
					icon: 'none'
				})
				return false
			}
			
			if (this.loginForm.username.length < 3) {
				uni.showToast({
					title: '用户名至少3个字符',
					icon: 'none'
				})
				return false
			}
			
			if (this.loginForm.password.length < 6) {
				uni.showToast({
					title: '密码至少6个字符',
					icon: 'none'
				})
				return false
			}
			
			return true
		},
		
		// 保存登录凭据
		saveCredentials() {
			uni.setStorageSync('savedCredentials', {
				username: this.loginForm.username,
				password: this.loginForm.password,
				remember: true
			})
		},
		
		// 加载保存的登录凭据
		loadSavedCredentials() {
			const saved = uni.getStorageSync('savedCredentials')
			if (saved && saved.remember) {
				this.loginForm.username = saved.username || ''
				this.loginForm.password = saved.password || ''
				this.rememberPassword = true
			}
		},
		
		// 清除保存的登录凭据
		clearSavedCredentials() {
			uni.removeStorageSync('savedCredentials')
		},
		
		// 忘记密码
		forgotPassword() {
			uni.showModal({
				title: '忘记密码',
				content: '请联系系统管理员重置密码',
				showCancel: false
			})
		},
		
		// 注册
		goRegister() {
			uni.showModal({
				title: '账号注册',
				content: '请联系系统管理员开通账号',
				showCancel: false
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.login-container {
	position: relative;
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding: 0 48rpx calc(60rpx + env(safe-area-inset-bottom));
	background:
		radial-gradient(900rpx 600rpx at 80% -10%, rgba(34, 211, 238, .12), transparent),
		radial-gradient(700rpx 500rpx at 10% 110%, rgba(167, 139, 250, .10), transparent),
		#0a0e16;
	overflow: hidden;
}

.bg-decoration {
	position: absolute;
	inset: 0;
	z-index: 0;
	overflow: hidden;
}

.circle {
	position: absolute;
	border-radius: 50%;
}

.circle1 {
	width: 420rpx;
	height: 420rpx;
	top: -140rpx;
	right: -120rpx;
	background: rgba(34, 211, 238, .09);
}

.circle2 {
	width: 520rpx;
	height: 520rpx;
	bottom: -180rpx;
	left: -160rpx;
	background: rgba(167, 139, 250, .09);
}

.login-form {
	position: relative;
	z-index: 1;
}

/* Logo */
.logo-section {
	text-align: center;
	margin-bottom: 80rpx;

	.logo {
		display: block;
		width: 160rpx;
		height: 160rpx;
		margin: 0 auto;
		padding: 20rpx;
		background: #111725;
		border: 1rpx solid rgba(148, 163, 184, .09);
		border-radius: 40rpx;
	}

	.app-name {
		display: block;
		margin-top: 28rpx;
		font-size: 48rpx;
		font-weight: 700;
		color: #e8edf6;
		letter-spacing: .02em;
	}

	.app-desc {
		display: block;
		margin-top: 10rpx;
		font-size: 24rpx;
		color: #5c677d;
		letter-spacing: .08em;
	}
}

/* 输入 */
.input-group {
	display: flex;
	align-items: center;
	gap: 16rpx;
	height: 96rpx;
	margin-bottom: 24rpx;
	padding: 0 28rpx;
	background: #161e2e;
	border: 1rpx solid rgba(148, 163, 184, .12);
	border-radius: 26rpx;

	.input-icon {
		.iconfont {
			font-size: 32rpx;
			color: #5c677d;
		}
	}

	.input-field {
		flex: 1;
		font-size: 28rpx;
		color: #e8edf6;
		background: transparent;
		border: none;
	}

	.password-toggle {
		padding-left: 12rpx;

		.iconfont {
			font-size: 30rpx;
			color: #5c677d;
		}
	}
}

.placeholder {
	color: #5c677d;
}

/* 记住密码 */
.remember-section {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin: 8rpx 0 40rpx;

	.checkbox-group {
		display: flex;
		align-items: center;
		gap: 12rpx;
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

	.checkbox-text {
		font-size: 25rpx;
		color: #9aa5bb;
	}

	.forgot-password {
		font-size: 25rpx;
		color: #22d3ee;
	}
}

/* 登录按钮 */
.button-section {
	.login-btn {
		width: 100%;
		height: 96rpx;
		line-height: 96rpx;
		border-radius: 26rpx;
		background: linear-gradient(135deg, #06b6d4, #0891b2);
		color: #04222b;
		font-size: 31rpx;
		font-weight: 700;
		box-shadow: 0 16rpx 40rpx rgba(34, 211, 238, .26);

		&.disabled {
			background: #1c2536;
			color: #5c677d;
			box-shadow: none;
		}
	}

	.loading-text {
		color: inherit;
	}
}

.other-options {
	margin-top: 40rpx;
	text-align: center;

	.register-text {
		font-size: 25rpx;
		color: #5c677d;
	}

	.register-link {
		margin-left: 8rpx;
		font-size: 25rpx;
		color: #22d3ee;
	}
}

/* 字体图标 */
.iconfont {
	font-family: 'iconfont';
	font-style: normal;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}

.icon-user:before { content: '\e7ae'; }
.icon-lock:before { content: '\e7a2'; }
.icon-eye:before { content: '\e7ce'; }
.icon-eye-close:before { content: '\e7ed'; }
.icon-check:before { content: '\e7fc'; }
</style>
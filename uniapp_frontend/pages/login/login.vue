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
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 40rpx;
	box-sizing: border-box;
}

.bg-decoration {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	overflow: hidden;
	z-index: 0;
	
	.circle {
		position: absolute;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.1);
		
		&.circle1 {
			width: 300rpx;
			height: 300rpx;
			top: -150rpx;
			right: -150rpx;
		}
		
		&.circle2 {
			width: 200rpx;
			height: 200rpx;
			bottom: -100rpx;
			left: -100rpx;
		}
	}
}

.login-form {
	position: relative;
	z-index: 1;
	width: 100%;
	max-width: 600rpx;
	background: rgba(255, 255, 255, 0.95);
	border-radius: 24rpx;
	padding: 60rpx 40rpx;
	box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.1);
	backdrop-filter: blur(10rpx);
}

.logo-section {
	text-align: center;
	margin-bottom: 60rpx;
	
	.logo {
		width: 120rpx;
		height: 120rpx;
		margin-bottom: 20rpx;
	}
	
	.app-name {
		display: block;
		font-size: 48rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 10rpx;
	}
	
	.app-desc {
		display: block;
		font-size: 28rpx;
		color: #666;
	}
}

.input-section {
	margin-bottom: 40rpx;
}

.input-group {
	position: relative;
	margin-bottom: 30rpx;
	border: 2rpx solid #e5e5e5;
	border-radius: 12rpx;
	background: #fff;
	display: flex;
	align-items: center;
	transition: border-color 0.3s;
	
	&:focus-within {
		border-color: #007AFF;
	}
	
	.input-icon {
		width: 80rpx;
		height: 80rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #999;
		font-size: 32rpx;
	}
	
	.input-field {
		flex: 1;
		height: 80rpx;
		padding: 0 20rpx;
		font-size: 32rpx;
		color: #333;
		border: none;
		outline: none;
		background: transparent;
		
		.placeholder {
			color: #999;
		}
	}
	
	.password-toggle {
		width: 80rpx;
		height: 80rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #999;
		font-size: 32rpx;
		cursor: pointer;
	}
}

.remember-section {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
	
	.checkbox-group {
		display: flex;
		align-items: center;
		cursor: pointer;
		
		.checkbox {
			width: 32rpx;
			height: 32rpx;
			border: 2rpx solid #ddd;
			border-radius: 6rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			margin-right: 16rpx;
			transition: all 0.3s;
			
			&.checked {
				background: #007AFF;
				border-color: #007AFF;
				color: #fff;
			}
			
			.iconfont {
				font-size: 20rpx;
			}
		}
		
		.checkbox-text {
			font-size: 28rpx;
			color: #666;
		}
	}
	
	.forgot-password {
		font-size: 28rpx;
		color: #007AFF;
		cursor: pointer;
	}
}

.button-section {
	margin-bottom: 40rpx;
	
	.login-btn {
		width: 100%;
		height: 88rpx;
		background: linear-gradient(135deg, #007AFF, #5856D6);
		color: #fff;
		border: none;
		border-radius: 12rpx;
		font-size: 32rpx;
		font-weight: bold;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s;
		
		&:not(.disabled):active {
			transform: scale(0.98);
		}
		
		&.disabled {
			background: #ccc;
			color: #999;
		}
		
		.loading-text {
			color: #fff;
		}
	}
}

.other-options {
	text-align: center;
	
	.register-text {
		font-size: 28rpx;
		color: #666;
	}
	
	.register-link {
		font-size: 28rpx;
		color: #007AFF;
		margin-left: 10rpx;
		cursor: pointer;
	}
}

/* 字体图标样式 */
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
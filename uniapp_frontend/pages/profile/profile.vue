<template>
  <view class="profile-page">
    <!-- 用户信息卡片 -->
    <view class="user-card">
      <view class="user-avatar">
        <image 
          class="avatar-image" 
          :src="userInfo.avatar || '/static/default-avatar.png'" 
          mode="aspectFill"
        ></image>
        <button class="avatar-edit" @click="changeAvatar">
          <uni-icons type="camera" size="16" color="#fff"></uni-icons>
        </button>
      </view>
      
      <view class="user-info">
        <text class="user-name">{{ userInfo.name }}</text>
        <text class="user-role">{{ userInfo.role }}</text>
        <text class="user-department">{{ userInfo.department }}</text>
      </view>
      
      <button class="edit-btn" @click="editProfile">
        <uni-icons type="compose" size="16" color="#007AFF"></uni-icons>
      </button>
    </view>
    
    <!-- 统计信息 -->
    <view class="stats-section">
      <view class="section-title">
        <uni-icons type="chart" size="20" color="#007AFF"></uni-icons>
        <text>工作统计</text>
      </view>
      
      <view class="stats-grid">
        <view class="stat-item">
          <text class="stat-value">{{ stats.todayTasks }}</text>
          <text class="stat-label">今日任务</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ stats.completedTasks }}</text>
          <text class="stat-label">已完成</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ stats.totalScans }}</text>
          <text class="stat-label">扫码次数</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ stats.workDays }}</text>
          <text class="stat-label">工作天数</text>
        </view>
      </view>
    </view>
    
    <!-- 功能菜单 -->
    <view class="menu-section">
      <view class="menu-group">
        <view class="menu-item" @click="goToSettings">
          <view class="menu-icon">
            <uni-icons type="gear" size="20" color="#007AFF"></uni-icons>
          </view>
          <text class="menu-text">系统设置</text>
          <view class="menu-arrow">
            <uni-icons type="right" size="16" color="#ccc"></uni-icons>
          </view>
        </view>
        
        <view class="menu-item" @click="goToHelp">
          <view class="menu-icon">
            <uni-icons type="help" size="20" color="#007AFF"></uni-icons>
          </view>
          <text class="menu-text">帮助中心</text>
          <view class="menu-arrow">
            <uni-icons type="right" size="16" color="#ccc"></uni-icons>
          </view>
        </view>
        
        <view class="menu-item" @click="goToFeedback">
          <view class="menu-icon">
            <uni-icons type="chatbubble" size="20" color="#007AFF"></uni-icons>
          </view>
          <text class="menu-text">意见反馈</text>
          <view class="menu-arrow">
            <uni-icons type="right" size="16" color="#ccc"></uni-icons>
          </view>
        </view>
      </view>
      
      <view class="menu-group">
        <view class="menu-item" @click="goToAbout">
          <view class="menu-icon">
            <uni-icons type="info" size="20" color="#007AFF"></uni-icons>
          </view>
          <text class="menu-text">关于我们</text>
          <view class="menu-arrow">
            <uni-icons type="right" size="16" color="#ccc"></uni-icons>
          </view>
        </view>
        
        <view class="menu-item" @click="checkUpdate">
          <view class="menu-icon">
            <uni-icons type="download" size="20" color="#007AFF"></uni-icons>
          </view>
          <text class="menu-text">检查更新</text>
          <view class="menu-badge" v-if="hasUpdate">
            <text>新版本</text>
          </view>
          <view class="menu-arrow">
            <uni-icons type="right" size="16" color="#ccc"></uni-icons>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 退出登录 -->
    <view class="logout-section">
      <button class="logout-btn" @click="logout">
        <uni-icons type="loop" size="20" color="#FF3B30"></uni-icons>
        退出登录
      </button>
    </view>
    
    <!-- 版本信息 -->
    <view class="version-info">
      <text>版本 {{ appVersion }}</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      // 用户信息
      userInfo: {
        name: '',
        role: '',
        department: '',
        avatar: ''
      },
      
      // 统计信息
      stats: {
        todayTasks: 0,
        completedTasks: 0,
        totalScans: 0,
        workDays: 0
      },
      
      // 应用信息
      appVersion: '1.0.0',
      hasUpdate: false
    }
  },
  
  onLoad() {
    this.loadUserInfo()
    this.loadStats()
    this.checkAppUpdate()
  },
  
  onShow() {
    // 页面显示时刷新数据
    this.loadStats()
  },
  
  methods: {
    // 加载用户信息
    async loadUserInfo() {
      try {
        // 从本地存储获取用户信息
        const userInfo = uni.getStorageSync('userInfo')
        if (userInfo) {
          this.userInfo = JSON.parse(userInfo)
        } else {
          // 模拟用户信息
          this.userInfo = {
            name: '张三',
            role: '仓库管理员',
            department: '物流部',
            avatar: ''
          }
        }
      } catch (error) {
        console.error('加载用户信息失败:', error)
      }
    },
    
    // 加载统计信息
    async loadStats() {
      try {
        // 模拟API调用
        const response = await this.mockStatsApi()
        this.stats = response
      } catch (error) {
        console.error('加载统计信息失败:', error)
      }
    },
    
    // 模拟统计API
    mockStatsApi() {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            todayTasks: 12,
            completedTasks: 8,
            totalScans: 156,
            workDays: 45
          })
        }, 500)
      })
    },
    
    // 更换头像
    changeAvatar() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempFilePath = res.tempFilePaths[0]
          // 这里应该上传到服务器，现在只是本地预览
          this.userInfo.avatar = tempFilePath
          
          // 保存到本地存储
          this.saveUserInfo()
          
          uni.showToast({
            title: '头像已更新',
            icon: 'success'
          })
        },
        fail: (err) => {
          console.error('选择图片失败:', err)
        }
      })
    },
    
    // 编辑个人资料
    editProfile() {
      uni.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    },
    
    // 保存用户信息
    saveUserInfo() {
      try {
        uni.setStorageSync('userInfo', JSON.stringify(this.userInfo))
      } catch (error) {
        console.error('保存用户信息失败:', error)
      }
    },
    
    // 系统设置
    goToSettings() {
      uni.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    },
    
    // 帮助中心
    goToHelp() {
      uni.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    },
    
    // 意见反馈
    goToFeedback() {
      uni.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    },
    
    // 关于我们
    goToAbout() {
      uni.showModal({
        title: '关于我们',
        content: `WMS移动端\n版本: ${this.appVersion}\n\n一款专业的仓库管理系统移动客户端，提供库存管理、入库作业、出库作业等功能。`,
        showCancel: false
      })
    },
    
    // 检查更新
    async checkUpdate() {
      uni.showLoading({
        title: '检查中...'
      })
      
      try {
        // 模拟检查更新
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        uni.hideLoading()
        
        if (this.hasUpdate) {
          uni.showModal({
            title: '发现新版本',
            content: '发现新版本 1.1.0，是否立即更新？',
            confirmText: '立即更新',
            success: (res) => {
              if (res.confirm) {
                this.downloadUpdate()
              }
            }
          })
        } else {
          uni.showToast({
            title: '已是最新版本',
            icon: 'success'
          })
        }
      } catch (error) {
        uni.hideLoading()
        uni.showToast({
          title: '检查失败',
          icon: 'error'
        })
      }
    },
    
    // 检查应用更新
    checkAppUpdate() {
      // 模拟检查更新逻辑
      // 实际项目中应该调用API检查版本
      this.hasUpdate = Math.random() > 0.7
    },
    
    // 下载更新
    downloadUpdate() {
      uni.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    },
    
    // 退出登录
    async logout() {
      const result = await uni.showModal({
        title: '确认退出',
        content: '确定要退出登录吗？'
      })
      
      if (result.confirm) {
        try {
          // 清除本地存储的用户信息
          uni.removeStorageSync('userInfo')
          uni.removeStorageSync('token')
          
          uni.showToast({
            title: '已退出登录',
            icon: 'success'
          })
          
          // 跳转到登录页
          setTimeout(() => {
            uni.reLaunch({
              url: '/pages/login/login'
            })
          }, 1500)
          
        } catch (error) {
          uni.showToast({
            title: '退出失败',
            icon: 'error'
          })
        }
      }
    }
  }
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 40rpx;
}

/* 用户信息卡片 */
.user-card {
  background: linear-gradient(135deg, #007AFF 0%, #00D4FF 100%);
  padding: 60rpx 30rpx 40rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  position: relative;
}

.user-avatar {
  position: relative;
  margin-right: 30rpx;
}

.avatar-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  border: 6rpx solid rgba(255, 255, 255, 0.3);
}

.avatar-edit {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 40rpx;
  height: 40rpx;
  background: #007AFF;
  border: 4rpx solid #fff;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-info {
  flex: 1;
}

.user-name {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 8rpx;
}

.user-role {
  display: block;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 4rpx;
}

.user-department {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
}

.edit-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 2rpx solid rgba(255, 255, 255, 0.3);
  border-radius: 50rpx;
  padding: 16rpx;
  color: #fff;
}

/* 统计信息 */
.stats-section {
  background: #fff;
  margin: 0 20rpx 20rpx;
  border-radius: 16rpx;
  padding: 30rpx;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 30rpx;
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30rpx;
}

.stat-item {
  text-align: center;
  padding: 30rpx 20rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
}

.stat-value {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #007AFF;
  margin-bottom: 8rpx;
}

.stat-label {
  display: block;
  font-size: 24rpx;
  color: #666;
}

/* 功能菜单 */
.menu-section {
  margin: 0 20rpx;
}

.menu-group {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  border-bottom: 2rpx solid #f8f9fa;
  transition: background-color 0.3s ease;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active {
  background: #f8f9fa;
}

.menu-icon {
  width: 60rpx;
  height: 60rpx;
  background: #f0f8ff;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.menu-text {
  flex: 1;
  font-size: 30rpx;
  color: #333;
}

.menu-badge {
  background: #FF3B30;
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
  margin-right: 16rpx;
}

.menu-arrow {
  margin-left: 16rpx;
}

/* 退出登录 */
.logout-section {
  margin: 40rpx 20rpx 20rpx;
}

.logout-btn {
  width: 100%;
  height: 88rpx;
  background: #fff;
  color: #FF3B30;
  border: 2rpx solid #FF3B30;
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.logout-btn:active {
  background: #fff5f5;
}

/* 版本信息 */
.version-info {
  text-align: center;
  padding: 20rpx;
  font-size: 24rpx;
  color: #999;
}
</style>
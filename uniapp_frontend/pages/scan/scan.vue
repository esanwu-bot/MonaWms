<template>
  <view class="scan-page">
    <!-- 扫码区域 -->
    <view class="scan-container">
      <view class="scan-header">
        <text class="scan-title">扫码功能</text>
        <text class="scan-subtitle">扫描商品条码或二维码</text>
      </view>
      
      <!-- 扫码框 -->
      <view class="scan-frame">
        <view class="scan-area">
          <view class="scan-line"></view>
          <view class="corner corner-tl"></view>
          <view class="corner corner-tr"></view>
          <view class="corner corner-bl"></view>
          <view class="corner corner-br"></view>
        </view>
      </view>
      
      <!-- 操作按钮 -->
      <view class="scan-actions">
        <button class="scan-btn" @click="startScan">
          <uni-icons type="scan" size="24" color="#fff"></uni-icons>
          开始扫码
        </button>
        <button class="manual-btn" @click="showManualInput">
          <uni-icons type="compose" size="20" color="#007AFF"></uni-icons>
          手动输入
        </button>
      </view>
      
      <!-- 扫码提示 -->
      <view class="scan-tips">
        <text>将条码或二维码放入框内，即可自动扫描</text>
      </view>
    </view>
    
    <!-- 扫码历史 -->
    <view class="scan-history">
      <view class="history-header">
        <text class="history-title">扫码记录</text>
        <button class="clear-btn" @click="clearHistory">
          <uni-icons type="trash" size="16" color="#FF3B30"></uni-icons>
          清空
        </button>
      </view>
      
      <view class="history-list" v-if="scanHistory.length > 0">
        <view 
          class="history-item" 
          v-for="item in scanHistory" 
          :key="item.id"
          @click="selectHistoryItem(item)"
        >
          <view class="item-icon">
            <uni-icons 
              :type="item.type === 'barcode' ? 'bars' : 'scan'" 
              size="20" 
              color="#007AFF"
            ></uni-icons>
          </view>
          <view class="item-content">
            <text class="item-code">{{ item.code }}</text>
            <text class="item-time">{{ formatTime(item.time) }}</text>
          </view>
          <view class="item-action">
            <uni-icons type="right" size="16" color="#ccc"></uni-icons>
          </view>
        </view>
      </view>
      
      <view class="empty-history" v-else>
        <uni-icons type="scan" size="60" color="#ccc"></uni-icons>
        <text>暂无扫码记录</text>
      </view>
    </view>
    
    <!-- 手动输入弹窗 -->
    <uni-popup ref="manualPopup" type="center">
      <view class="manual-popup">
        <view class="popup-header">
          <text class="popup-title">手动输入</text>
          <button class="close-btn" @click="closeManualInput">
            <uni-icons type="close" size="20" color="#666"></uni-icons>
          </button>
        </view>
        
        <view class="popup-content">
          <view class="input-group">
            <text class="input-label">条码/二维码内容:</text>
            <input 
              class="manual-input" 
              type="text" 
              v-model="manualCode" 
              placeholder="请输入条码或二维码内容"
              @input="onManualInput"
            />
          </view>
          
          <view class="input-group">
            <text class="input-label">类型:</text>
            <view class="type-selector">
              <button 
                class="type-btn" 
                :class="{ active: manualType === 'barcode' }"
                @click="setManualType('barcode')"
              >
                条码
              </button>
              <button 
                class="type-btn" 
                :class="{ active: manualType === 'qrcode' }"
                @click="setManualType('qrcode')"
              >
                二维码
              </button>
            </view>
          </view>
        </view>
        
        <view class="popup-actions">
          <button class="cancel-btn" @click="closeManualInput">取消</button>
          <button class="confirm-btn" :disabled="!canConfirm" @click="confirmManualInput">
            确认
          </button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
export default {
  data() {
    return {
      // 手动输入
      manualCode: '',
      manualType: 'barcode',
      
      // 扫码历史
      scanHistory: []
    }
  },
  
  computed: {
    // 是否可以确认手动输入
    canConfirm() {
      return this.manualCode.trim().length > 0
    }
  },
  
  onLoad() {
    this.loadScanHistory()
  },
  
  methods: {
    // 开始扫码
    startScan() {
      // #ifdef APP-PLUS
      uni.scanCode({
        success: (res) => {
          this.handleScanResult(res.result, res.scanType || 'barcode')
        },
        fail: (err) => {
          console.error('扫码失败:', err)
          uni.showToast({
            title: '扫码失败',
            icon: 'error'
          })
        }
      })
      // #endif
      
      // #ifdef H5 || MP
      uni.showToast({
        title: '请使用手动输入功能',
        icon: 'none'
      })
      // #endif
    },
    
    // 处理扫码结果
    handleScanResult(code, type) {
      if (!code) return
      
      // 添加到历史记录
      this.addToHistory(code, type)
      
      // 处理扫码结果
      this.processScanCode(code, type)
    },
    
    // 处理扫码内容
    processScanCode(code, type) {
      // 根据扫码内容判断跳转页面
      if (this.isProductCode(code)) {
        // 商品条码，跳转到库存详情
        uni.navigateTo({
          url: `/pages/inventory/detail?code=${encodeURIComponent(code)}`
        })
      } else if (this.isLocationCode(code)) {
        // 库位码，跳转到库位管理
        uni.showToast({
          title: '库位码功能开发中',
          icon: 'none'
        })
      } else {
        // 其他类型，显示扫码结果
        uni.showModal({
          title: '扫码结果',
          content: `类型: ${type === 'barcode' ? '条码' : '二维码'}\n内容: ${code}`,
          showCancel: false
        })
      }
    },
    
    // 判断是否为商品条码
    isProductCode(code) {
      // 简单判断：13位数字为商品条码
      return /^\d{13}$/.test(code) || code.startsWith('SKU')
    },
    
    // 判断是否为库位码
    isLocationCode(code) {
      // 简单判断：以LOC开头为库位码
      return code.startsWith('LOC')
    },
    
    // 添加到历史记录
    addToHistory(code, type) {
      const historyItem = {
        id: Date.now().toString(),
        code: code,
        type: type,
        time: new Date().toISOString()
      }
      
      // 检查是否已存在
      const existIndex = this.scanHistory.findIndex(item => item.code === code)
      if (existIndex !== -1) {
        // 更新时间并移到最前
        this.scanHistory.splice(existIndex, 1)
      }
      
      this.scanHistory.unshift(historyItem)
      
      // 限制历史记录数量
      if (this.scanHistory.length > 50) {
        this.scanHistory = this.scanHistory.slice(0, 50)
      }
      
      // 保存到本地存储
      this.saveScanHistory()
    },
    
    // 加载扫码历史
    loadScanHistory() {
      try {
        const history = uni.getStorageSync('scan_history')
        if (history) {
          this.scanHistory = JSON.parse(history)
        }
      } catch (error) {
        console.error('加载扫码历史失败:', error)
      }
    },
    
    // 保存扫码历史
    saveScanHistory() {
      try {
        uni.setStorageSync('scan_history', JSON.stringify(this.scanHistory))
      } catch (error) {
        console.error('保存扫码历史失败:', error)
      }
    },
    
    // 清空历史记录
    async clearHistory() {
      const result = await uni.showModal({
        title: '确认清空',
        content: '确定要清空所有扫码记录吗？'
      })
      
      if (result.confirm) {
        this.scanHistory = []
        this.saveScanHistory()
        uni.showToast({
          title: '已清空',
          icon: 'success'
        })
      }
    },
    
    // 选择历史记录项
    selectHistoryItem(item) {
      this.processScanCode(item.code, item.type)
    },
    
    // 显示手动输入弹窗
    showManualInput() {
      this.manualCode = ''
      this.manualType = 'barcode'
      this.$refs.manualPopup.open()
    },
    
    // 关闭手动输入弹窗
    closeManualInput() {
      this.$refs.manualPopup.close()
    },
    
    // 手动输入
    onManualInput() {
      // 可以添加输入验证逻辑
    },
    
    // 设置手动输入类型
    setManualType(type) {
      this.manualType = type
    },
    
    // 确认手动输入
    confirmManualInput() {
      if (!this.canConfirm) return
      
      this.handleScanResult(this.manualCode.trim(), this.manualType)
      this.closeManualInput()
    },
    
    // 格式化时间
    formatTime(timeStr) {
      const date = new Date(timeStr)
      const now = new Date()
      const diff = now - date
      
      if (diff < 60000) {
        return '刚刚'
      } else if (diff < 3600000) {
        return `${Math.floor(diff / 60000)}分钟前`
      } else if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)}小时前`
      } else {
        return date.toLocaleDateString('zh-CN')
      }
    }
  }
}
</script>

<style scoped>
.scan-page {
  min-height: 100vh;
  background: #f5f5f5;
}

/* 扫码容器 */
.scan-container {
  background: #000;
  padding: 60rpx 30rpx;
  text-align: center;
  position: relative;
}

.scan-header {
  margin-bottom: 60rpx;
}

.scan-title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 16rpx;
}

.scan-subtitle {
  display: block;
  font-size: 28rpx;
  color: #ccc;
}

/* 扫码框 */
.scan-frame {
  display: flex;
  justify-content: center;
  margin-bottom: 60rpx;
}

.scan-area {
  width: 400rpx;
  height: 400rpx;
  position: relative;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  border-radius: 16rpx;
}

.scan-line {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 4rpx;
  background: linear-gradient(90deg, transparent 0%, #007AFF 50%, transparent 100%);
  animation: scanLine 2s linear infinite;
}

@keyframes scanLine {
  0% {
    transform: translateY(-200rpx);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateY(200rpx);
    opacity: 0;
  }
}

.corner {
  position: absolute;
  width: 40rpx;
  height: 40rpx;
  border: 6rpx solid #007AFF;
}

.corner-tl {
  top: -6rpx;
  left: -6rpx;
  border-right: none;
  border-bottom: none;
}

.corner-tr {
  top: -6rpx;
  right: -6rpx;
  border-left: none;
  border-bottom: none;
}

.corner-bl {
  bottom: -6rpx;
  left: -6rpx;
  border-right: none;
  border-top: none;
}

.corner-br {
  bottom: -6rpx;
  right: -6rpx;
  border-left: none;
  border-top: none;
}

/* 操作按钮 */
.scan-actions {
  display: flex;
  justify-content: center;
  gap: 40rpx;
  margin-bottom: 40rpx;
}

.scan-btn {
  background: #007AFF;
  color: #fff;
  border: none;
  border-radius: 50rpx;
  padding: 24rpx 48rpx;
  font-size: 32rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.manual-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #007AFF;
  border: 2rpx solid #007AFF;
  border-radius: 50rpx;
  padding: 22rpx 40rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.scan-tips {
  font-size: 24rpx;
  color: #ccc;
}

/* 扫码历史 */
.scan-history {
  background: #fff;
  margin: 20rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.history-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.clear-btn {
  background: none;
  border: none;
  color: #FF3B30;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.history-list {
  max-height: 600rpx;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 24rpx 30rpx;
  border-bottom: 2rpx solid #f8f9fa;
  transition: background-color 0.3s ease;
}

.history-item:active {
  background: #f8f9fa;
}

.item-icon {
  margin-right: 20rpx;
}

.item-content {
  flex: 1;
}

.item-code {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 8rpx;
  word-break: break-all;
}

.item-time {
  display: block;
  font-size: 24rpx;
  color: #999;
}

.item-action {
  margin-left: 20rpx;
}

.empty-history {
  text-align: center;
  padding: 80rpx 0;
  color: #ccc;
}

.empty-history text {
  display: block;
  margin-top: 20rpx;
  font-size: 28rpx;
}

/* 手动输入弹窗 */
.manual-popup {
  width: 600rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.popup-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  padding: 8rpx;
}

.popup-content {
  padding: 30rpx;
}

.input-group {
  margin-bottom: 30rpx;
}

.input-label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
}

.manual-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.manual-input:focus {
  border-color: #007AFF;
}

.type-selector {
  display: flex;
  gap: 20rpx;
}

.type-btn {
  flex: 1;
  height: 60rpx;
  background: #f0f0f0;
  color: #666;
  border: none;
  border-radius: 8rpx;
  font-size: 26rpx;
  transition: all 0.3s ease;
}

.type-btn.active {
  background: #007AFF;
  color: #fff;
}

.popup-actions {
  display: flex;
  border-top: 2rpx solid #f0f0f0;
}

.cancel-btn,
.confirm-btn {
  flex: 1;
  height: 88rpx;
  border: none;
  font-size: 32rpx;
  font-weight: bold;
}

.cancel-btn {
  background: #f8f9fa;
  color: #666;
  border-right: 2rpx solid #f0f0f0;
}

.confirm-btn {
  background: #007AFF;
  color: #fff;
}

.confirm-btn:disabled {
  background: #ccc;
  color: #999;
}
</style>
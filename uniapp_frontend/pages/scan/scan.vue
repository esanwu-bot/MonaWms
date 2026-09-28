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
	background: #0a0e16;
	padding-bottom: calc(60rpx + env(safe-area-inset-bottom));
}

/* 扫码区 */
.scan-container {
	padding: 40rpx 32rpx 0;
}

.scan-header {
	.scan-title {
		display: block;
		font-size: 40rpx;
		font-weight: 700;
		color: #e8edf6;
	}

	.scan-subtitle {
		display: block;
		margin-top: 8rpx;
		font-size: 24rpx;
		color: #5c677d;
	}
}

.scan-frame {
	width: 520rpx;
	height: 520rpx;
	margin: 48rpx auto 0;
	display: flex;
	align-items: center;
	justify-content: center;
}

.scan-area {
	position: relative;
	width: 100%;
	height: 100%;
	border-radius: 40rpx;
	border: 2rpx solid rgba(34, 211, 238, .22);
	background: rgba(34, 211, 238, .04);
	overflow: hidden;
}

.scan-line {
	position: absolute;
	left: 48rpx;
	right: 48rpx;
	top: 48rpx;
	height: 4rpx;
	border-radius: 2rpx;
	background: linear-gradient(90deg, transparent, #22d3ee, transparent);
	box-shadow: 0 0 24rpx rgba(34, 211, 238, .6);
	animation: scan-move 2.6s ease-in-out infinite;
}

@keyframes scan-move {
	0% { top: 48rpx; }
	50% { top: 440rpx; }
	100% { top: 48rpx; }
}

.corner {
	position: absolute;
	width: 52rpx;
	height: 52rpx;
	border: 5rpx solid #22d3ee;
}

.corner-tl {
	top: 24rpx;
	left: 24rpx;
	border-right: none;
	border-bottom: none;
	border-radius: 24rpx 0 0 0;
}

.corner-tr {
	top: 24rpx;
	right: 24rpx;
	border-left: none;
	border-bottom: none;
	border-radius: 0 24rpx 0 0;
}

.corner-bl {
	bottom: 24rpx;
	left: 24rpx;
	border-right: none;
	border-top: none;
	border-radius: 0 0 0 24rpx;
}

.corner-br {
	bottom: 24rpx;
	right: 24rpx;
	border-left: none;
	border-top: none;
	border-radius: 0 0 24rpx 0;
}

.scan-actions {
	display: flex;
	gap: 20rpx;
	margin-top: 56rpx;
}

.scan-btn {
	flex: 1;
	height: 92rpx;
	border-radius: 26rpx;
	background: linear-gradient(135deg, #06b6d4, #0891b2);
	color: #04222b;
	font-size: 30rpx;
	font-weight: 600;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10rpx;
}

.manual-btn {
	flex: 1;
	height: 92rpx;
	border-radius: 26rpx;
	background: #161e2e;
	border: 1rpx solid rgba(148, 163, 184, .12);
	color: #9aa5bb;
	font-size: 28rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10rpx;
}

.scan-tips {
	margin-top: 24rpx;
	text-align: center;
	font-size: 23rpx;
	color: #5c677d;
}

/* 扫码记录 */
.scan-history {
	margin: 64rpx 32rpx 0;
}

.history-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 20rpx;

	.history-title {
		position: relative;
		padding-left: 18rpx;
		font-size: 28rpx;
		font-weight: 700;
		color: #e8edf6;

		&::before {
			content: '';
			position: absolute;
			left: 0;
			top: 50%;
			transform: translateY(-50%);
			width: 6rpx;
			height: 26rpx;
			background: #22d3ee;
			border-radius: 3rpx;
		}
	}

	.clear-btn {
		display: flex;
		align-items: center;
		gap: 8rpx;
		padding: 10rpx 22rpx;
		border-radius: 16rpx;
		background: rgba(248, 113, 113, .12);
		border: 1rpx solid rgba(248, 113, 113, .3);
		color: #f87171;
		font-size: 23rpx;
	}
}

.history-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.history-item {
	display: flex;
	align-items: center;
	gap: 20rpx;
	padding: 24rpx;
	background: #111725;
	border: 1rpx solid rgba(148, 163, 184, .09);
	border-radius: 26rpx;
	transition: transform .15s ease;

	&:active {
		transform: scale(.985);
	}

	.item-icon {
		width: 68rpx;
		height: 68rpx;
		border-radius: 20rpx;
		background: rgba(34, 211, 238, .12);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.item-content {
		flex: 1;
		min-width: 0;

		.item-code {
			display: block;
			font-size: 26rpx;
			color: #e8edf6;
			font-family: "JetBrains Mono", Menlo, Consolas, monospace;
		}

		.item-time {
			display: block;
			margin-top: 6rpx;
			font-size: 21rpx;
			color: #5c677d;
			font-family: "JetBrains Mono", Menlo, Consolas, monospace;
		}
	}
}

.empty-history {
	padding: 80rpx 0;
	text-align: center;
	font-size: 25rpx;
	color: #5c677d;
}

/* 手动输入弹窗（居中卡片） */
.manual-popup {
	position: relative;
	left: auto;
	right: auto;
	bottom: auto;
	width: 620rpx;
	max-height: none;
	padding: 32rpx;
	background: #111725;
	border: 1rpx solid rgba(148, 163, 184, .2);
	border-radius: 36rpx;
	box-shadow: 0 24rpx 60rpx rgba(0, 0, 0, .6);
	overflow: visible;

	.popup-header {
		padding: 0 0 24rpx;
	}

	.popup-title {
		font-size: 32rpx;
		font-weight: 700;
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
		color: #e8edf6;
		font-size: 28rpx;
	}

	.type-selector {
		display: flex;
		gap: 16rpx;
	}

	.type-btn {
		flex: 1;
		height: 78rpx;
		line-height: 78rpx;
		text-align: center;
		border-radius: 20rpx;
		background: #161e2e;
		border: 1rpx solid rgba(148, 163, 184, .12);
		color: #9aa5bb;
		font-size: 26rpx;

		&.active {
			background: rgba(34, 211, 238, .12);
			border-color: rgba(34, 211, 238, .35);
			color: #22d3ee;
		}
	}

	.popup-actions {
		margin-top: 8rpx;
	}

	.cancel-btn,
	.confirm-btn {
		height: 82rpx;
		line-height: 82rpx;
		border-radius: 22rpx;
		font-size: 27rpx;
	}
}
</style>
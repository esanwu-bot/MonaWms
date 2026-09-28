<template>
  <view class="receive-page">
    <!-- 头部信息 -->
    <view class="header-info">
      <view class="order-info">
        <text class="order-no">{{ inboundInfo.inbound_no }}</text>
        <text class="supplier-name">{{ inboundInfo.supplier_name }}</text>
      </view>
      <view class="progress-info">
        <text class="progress-text">{{ receivedCount }}/{{ totalCount }}</text>
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: progressPercentage + '%' }"></view>
        </view>
      </view>
    </view>

    <!-- 扫码区域 -->
    <view class="scan-section">
      <view class="scan-input">
        <uni-icons type="scan" size="20" color="#007AFF"></uni-icons>
        <input 
          v-model="scanCode" 
          placeholder="扫描商品条码或手动输入" 
          @confirm="onScanConfirm"
          @input="onScanInput"
          focus
        />
        <button class="scan-btn" @click="openScanner">
          <uni-icons type="camera" size="18" color="#fff"></uni-icons>
        </button>
      </view>
      <view class="scan-tips">
        <text>请扫描商品条码进行收货，或手动输入商品SKU</text>
      </view>
    </view>

    <!-- 当前收货商品 -->
    <view class="current-product" v-if="currentProduct">
      <view class="section-title">
        <uni-icons type="checkmarkempty" size="18" color="#34C759"></uni-icons>
        <text>当前收货商品</text>
      </view>
      <view class="product-card">
        <image class="product-image" :src="currentProduct.image || '/static/default-product.png'"></image>
        <view class="product-info">
          <view class="product-name">{{ currentProduct.product_name }}</view>
          <view class="product-sku">SKU: {{ currentProduct.sku }}</view>
          <view class="product-spec">{{ currentProduct.specification }}</view>
        </view>
        <view class="quantity-section">
          <view class="quantity-info">
            <text class="quantity-label">预计:</text>
            <text class="quantity-value">{{ currentProduct.expected_quantity }}</text>
          </view>
          <view class="quantity-info">
            <text class="quantity-label">已收:</text>
            <text class="quantity-value received">{{ currentProduct.received_quantity }}</text>
          </view>
          <view class="quantity-info">
            <text class="quantity-label">待收:</text>
            <text class="quantity-value pending">{{ currentProduct.expected_quantity - currentProduct.received_quantity }}</text>
          </view>
        </view>
      </view>
      
      <!-- 收货数量输入 -->
      <view class="receive-input">
        <text class="input-label">本次收货数量:</text>
        <view class="quantity-input">
          <button class="quantity-btn" @click="decreaseQuantity">-</button>
          <input 
            v-model.number="receiveQuantity" 
            type="number" 
            class="quantity-field"
            @input="onQuantityInput"
          />
          <button class="quantity-btn" @click="increaseQuantity">+</button>
        </view>
        <button class="confirm-btn" @click="confirmReceive" :disabled="!canConfirm">
          确认收货
        </button>
      </view>
    </view>

    <!-- 收货记录 -->
    <view class="receive-records">
      <view class="section-title">
        <uni-icons type="list" size="18" color="#007AFF"></uni-icons>
        <text>本次收货记录</text>
        <text class="record-count">({{ receiveRecords.length }})</text>
      </view>
      
      <view class="records-list" v-if="receiveRecords.length > 0">
        <view class="record-item" v-for="(record, index) in receiveRecords" :key="index">
          <view class="record-header">
            <text class="record-product">{{ record.product_name }}</text>
            <text class="record-time">{{ formatTime(record.receive_time) }}</text>
          </view>
          <view class="record-details">
            <text class="record-sku">SKU: {{ record.sku }}</text>
            <text class="record-quantity">数量: {{ record.quantity }}</text>
          </view>
          <button class="undo-btn" @click="undoReceive(index)">
            <uni-icons type="undo" size="14" color="#FF3B30"></uni-icons>
            撤销
          </button>
        </view>
      </view>
      
      <view class="empty-records" v-else>
        <uni-icons type="info" size="40" color="#ccc"></uni-icons>
        <text>暂无收货记录</text>
      </view>
    </view>

    <!-- 商品清单 -->
    <view class="product-list">
      <view class="section-title">
        <uni-icons type="grid" size="18" color="#007AFF"></uni-icons>
        <text>商品清单</text>
        <view class="filter-tabs">
          <text 
            class="filter-tab" 
            :class="{ active: filterStatus === 'all' }"
            @click="filterStatus = 'all'"
          >
            全部
          </text>
          <text 
            class="filter-tab" 
            :class="{ active: filterStatus === 'pending' }"
            @click="filterStatus = 'pending'"
          >
            待收货
          </text>
          <text 
            class="filter-tab" 
            :class="{ active: filterStatus === 'completed' }"
            @click="filterStatus = 'completed'"
          >
            已完成
          </text>
        </view>
      </view>
      
      <view class="list-container">
        <view 
          class="list-item" 
          v-for="item in filteredProductList" 
          :key="item.id"
          @click="selectProduct(item)"
          :class="{ selected: currentProduct && currentProduct.id === item.id }"
        >
          <image class="item-image" :src="item.image || '/static/default-product.png'"></image>
          <view class="item-info">
            <view class="item-name">{{ item.product_name }}</view>
            <view class="item-sku">{{ item.sku }}</view>
            <view class="item-spec">{{ item.specification }}</view>
          </view>
          <view class="item-status">
            <view class="status-badge" :class="getItemStatusClass(item)">
              {{ getItemStatusText(item) }}
            </view>
            <view class="quantity-progress">
              <text class="progress-text">{{ item.received_quantity }}/{{ item.expected_quantity }}</text>
              <view class="mini-progress">
                <view 
                  class="mini-progress-fill" 
                  :style="{ width: (item.received_quantity / item.expected_quantity * 100) + '%' }"
                ></view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="bottom-actions">
      <button class="action-btn secondary" @click="saveDraft">
        保存草稿
      </button>
      <button class="action-btn primary" @click="completeReceive" :disabled="!canComplete">
        完成收货
      </button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      inboundId: '',
      scanCode: '',
      receiveQuantity: 1,
      currentProduct: null,
      filterStatus: 'all',
      
      // 入库单信息
      inboundInfo: {
        inbound_no: '',
        supplier_name: ''
      },
      
      // 商品列表
      productList: [],
      
      // 收货记录
      receiveRecords: []
    }
  },
  
  computed: {
    // 总商品数量
    totalCount() {
      return this.productList.reduce((sum, item) => sum + item.expected_quantity, 0)
    },
    
    // 已收货数量
    receivedCount() {
      return this.productList.reduce((sum, item) => sum + item.received_quantity, 0)
    },
    
    // 进度百分比
    progressPercentage() {
      if (this.totalCount === 0) return 0
      return Math.round((this.receivedCount / this.totalCount) * 100)
    },
    
    // 筛选后的商品列表
    filteredProductList() {
      if (this.filterStatus === 'all') {
        return this.productList
      } else if (this.filterStatus === 'pending') {
        return this.productList.filter(item => item.received_quantity < item.expected_quantity)
      } else if (this.filterStatus === 'completed') {
        return this.productList.filter(item => item.received_quantity >= item.expected_quantity)
      }
      return this.productList
    },
    
    // 是否可以确认收货
    canConfirm() {
      return this.currentProduct && 
             this.receiveQuantity > 0 && 
             this.receiveQuantity <= (this.currentProduct.expected_quantity - this.currentProduct.received_quantity)
    },
    
    // 是否可以完成收货
    canComplete() {
      return this.receiveRecords.length > 0
    }
  },
  
  onLoad(options) {
    this.inboundId = options.id
    this.loadData()
  },
  
  methods: {
    // 加载数据
    async loadData() {
      try {
        const [inboundResponse, productResponse] = await Promise.all([
          this.loadInboundInfo(),
          this.loadProductList()
        ])
        
        this.inboundInfo = inboundResponse.data
        this.productList = productResponse.data
        
      } catch (error) {
        console.error('加载数据失败:', error)
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    },
    
    // 加载入库单信息
    async loadInboundInfo() {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            data: {
              inbound_no: 'IN202401001',
              supplier_name: '北京供应商A'
            }
          })
        }, 500)
      })
    },
    
    // 加载商品列表
    async loadProductList() {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            data: [
              {
                id: 1,
                product_name: '苹果iPhone 15',
                sku: 'IP15-128G-BLK',
                specification: '128GB 黑色',
                image: '/static/default-product.png',
                expected_quantity: 20,
                received_quantity: 15
              },
              {
                id: 2,
                product_name: '华为Mate 60',
                sku: 'HW-M60-256G-WHT',
                specification: '256GB 白色',
                image: '/static/default-product.png',
                expected_quantity: 30,
                received_quantity: 25
              },
              {
                id: 3,
                product_name: '小米14 Pro',
                sku: 'MI14P-512G-GLD',
                specification: '512GB 金色',
                image: '/static/default-product.png',
                expected_quantity: 25,
                received_quantity: 20
              },
              {
                id: 4,
                product_name: 'OPPO Find X7',
                sku: 'OP-FX7-256G-BLU',
                specification: '256GB 蓝色',
                image: '/static/default-product.png',
                expected_quantity: 15,
                received_quantity: 0
              },
              {
                id: 5,
                product_name: 'vivo X100',
                sku: 'VV-X100-128G-SLV',
                specification: '128GB 银色',
                image: '/static/default-product.png',
                expected_quantity: 10,
                received_quantity: 0
              }
            ]
          })
        }, 800)
      })
    },
    
    // 扫码输入
    onScanInput() {
      // 实时搜索商品
      if (this.scanCode.length >= 3) {
        this.searchProduct(this.scanCode)
      }
    },
    
    // 扫码确认
    onScanConfirm() {
      if (this.scanCode.trim()) {
        this.searchProduct(this.scanCode.trim())
      }
    },
    
    // 打开扫码器
    openScanner() {
      // #ifdef APP-PLUS
      uni.scanCode({
        success: (res) => {
          this.scanCode = res.result
          this.searchProduct(res.result)
        },
        fail: (err) => {
          console.error('扫码失败:', err)
          uni.showToast({
            title: '扫码失败',
            icon: 'none'
          })
        }
      })
      // #endif
      
      // #ifdef H5
      uni.showToast({
        title: 'H5环境暂不支持扫码',
        icon: 'none'
      })
      // #endif
    },
    
    // 搜索商品
    searchProduct(code) {
      const product = this.productList.find(item => 
        item.sku.toLowerCase().includes(code.toLowerCase()) ||
        item.product_name.toLowerCase().includes(code.toLowerCase())
      )
      
      if (product) {
        this.selectProduct(product)
        this.scanCode = ''
      } else {
        uni.showToast({
          title: '未找到对应商品',
          icon: 'none'
        })
      }
    },
    
    // 选择商品
    selectProduct(product) {
      if (product.received_quantity >= product.expected_quantity) {
        uni.showToast({
          title: '该商品已收货完成',
          icon: 'none'
        })
        return
      }
      
      this.currentProduct = product
      this.receiveQuantity = Math.min(1, product.expected_quantity - product.received_quantity)
    },
    
    // 数量输入
    onQuantityInput() {
      if (this.receiveQuantity < 1) {
        this.receiveQuantity = 1
      }
      
      if (this.currentProduct) {
        const maxQuantity = this.currentProduct.expected_quantity - this.currentProduct.received_quantity
        if (this.receiveQuantity > maxQuantity) {
          this.receiveQuantity = maxQuantity
        }
      }
    },
    
    // 减少数量
    decreaseQuantity() {
      if (this.receiveQuantity > 1) {
        this.receiveQuantity--
      }
    },
    
    // 增加数量
    increaseQuantity() {
      if (this.currentProduct) {
        const maxQuantity = this.currentProduct.expected_quantity - this.currentProduct.received_quantity
        if (this.receiveQuantity < maxQuantity) {
          this.receiveQuantity++
        }
      }
    },
    
    // 确认收货
    confirmReceive() {
      if (!this.canConfirm) return
      
      // 更新商品收货数量
      this.currentProduct.received_quantity += this.receiveQuantity
      
      // 添加收货记录
      this.receiveRecords.unshift({
        product_id: this.currentProduct.id,
        product_name: this.currentProduct.product_name,
        sku: this.currentProduct.sku,
        quantity: this.receiveQuantity,
        receive_time: new Date().toISOString()
      })
      
      uni.showToast({
        title: '收货成功',
        icon: 'success'
      })
      
      // 重置状态
      this.currentProduct = null
      this.receiveQuantity = 1
      this.scanCode = ''
    },
    
    // 撤销收货
    undoReceive(index) {
      const record = this.receiveRecords[index]
      const product = this.productList.find(item => item.id === record.product_id)
      
      if (product) {
        product.received_quantity -= record.quantity
        this.receiveRecords.splice(index, 1)
        
        uni.showToast({
          title: '撤销成功',
          icon: 'success'
        })
      }
    },
    
    // 保存草稿
    async saveDraft() {
      try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        uni.showToast({
          title: '保存成功',
          icon: 'success'
        })
        
      } catch (error) {
        console.error('保存失败:', error)
        uni.showToast({
          title: '保存失败',
          icon: 'none'
        })
      }
    },
    
    // 完成收货
    completeReceive() {
      if (!this.canComplete) return
      
      uni.showModal({
        title: '确认完成',
        content: `本次共收货 ${this.receiveRecords.length} 个商品，确定要完成收货吗？`,
        success: (res) => {
          if (res.confirm) {
            this.doCompleteReceive()
          }
        }
      })
    },
    
    // 执行完成收货
    async doCompleteReceive() {
      try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        uni.showToast({
          title: '收货完成',
          icon: 'success'
        })
        
        // 返回详情页
        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
        
      } catch (error) {
        console.error('完成收货失败:', error)
        uni.showToast({
          title: '操作失败',
          icon: 'none'
        })
      }
    },
    
    // 获取商品状态样式类
    getItemStatusClass(item) {
      if (item.received_quantity >= item.expected_quantity) {
        return 'status-completed'
      } else if (item.received_quantity > 0) {
        return 'status-partial'
      } else {
        return 'status-pending'
      }
    },
    
    // 获取商品状态文本
    getItemStatusText(item) {
      if (item.received_quantity >= item.expected_quantity) {
        return '已完成'
      } else if (item.received_quantity > 0) {
        return '部分收货'
      } else {
        return '待收货'
      }
    },
    
    // 格式化时间
    formatTime(time) {
      const date = new Date(time)
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }
  }
}
</script>

<style scoped>
.receive-page {
	min-height: 100vh;
	background: #0a0e16;
	padding-bottom: 180rpx;
}

/* 头部单据卡 */
.header-info {
	margin: 24rpx 32rpx;
	padding: 28rpx;
	background: #111725;
	border: 1rpx solid rgba(148, 163, 184, .09);
	border-radius: 32rpx;
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

	.order-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20rpx;

		.order-no {
			font-size: 30rpx;
			font-weight: 700;
			color: #22d3ee;
			font-family: "JetBrains Mono", Menlo, Consolas, monospace;
		}

		.supplier-name {
			flex: 1;
			text-align: right;
			font-size: 25rpx;
			color: #9aa5bb;
		}
	}

	.progress-info {
		display: flex;
		align-items: center;
		gap: 20rpx;
		margin-top: 24rpx;

		.progress-text {
			flex-shrink: 0;
			font-size: 24rpx;
			color: #e8edf6;
			font-family: "JetBrains Mono", Menlo, Consolas, monospace;
		}

		.progress-bar {
			flex: 1;
			height: 12rpx;
			background: #1c2536;
			border-radius: 8rpx;
			overflow: hidden;
		}

		.progress-fill {
			height: 100%;
			border-radius: 8rpx;
			background: linear-gradient(90deg, #06b6d4, #22d3ee);
			transition: width .6s cubic-bezier(.22, 1, .36, 1);
		}
	}
}

/* 扫码区 */
.scan-section {
	padding: 0 32rpx 24rpx;

	.scan-input {
		display: flex;
		align-items: center;
		gap: 16rpx;
		height: 88rpx;
		padding: 0 20rpx 0 28rpx;
		background: #161e2e;
		border: 1rpx solid rgba(148, 163, 184, .12);
		border-radius: 24rpx;

		input {
			flex: 1;
			font-size: 27rpx;
			color: #e8edf6;
			background: transparent;
			border: none;
		}

		.scan-btn {
			width: 68rpx;
			height: 68rpx;
			flex-shrink: 0;
			border-radius: 20rpx;
			background: linear-gradient(135deg, #06b6d4, #0891b2);
			display: flex;
			align-items: center;
			justify-content: center;
		}
	}

	.scan-tips {
		margin-top: 16rpx;
		font-size: 23rpx;
		color: #5c677d;
	}
}

/* 区块标题 */
.section-title {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin: 32rpx 0 20rpx;
	font-size: 28rpx;
	font-weight: 700;
	color: #e8edf6;

	&::before {
		content: '';
		width: 6rpx;
		height: 26rpx;
		background: #22d3ee;
		border-radius: 3rpx;
		margin-right: 8rpx;
	}

	.record-count {
		font-size: 23rpx;
		color: #5c677d;
	}
}

/* 当前商品卡 */
.current-product {
	margin: 0 32rpx 24rpx;
	padding: 28rpx;
	background: #111725;
	border: 1rpx solid rgba(34, 211, 238, .28);
	border-radius: 32rpx;

	.section-title {
		margin: 0 0 20rpx;
	}

	.product-card {
		display: flex;
		align-items: center;
		gap: 20rpx;

		.product-image {
			width: 104rpx;
			height: 104rpx;
			border-radius: 24rpx;
			background: #1c2536;
			flex-shrink: 0;
		}

		.product-info {
			flex: 1;
			min-width: 0;

			.product-name {
				font-size: 28rpx;
				font-weight: 600;
				color: #e8edf6;
			}

			.product-sku {
				margin-top: 4rpx;
				font-size: 22rpx;
				color: #5c677d;
				font-family: "JetBrains Mono", Menlo, Consolas, monospace;
			}

			.product-spec {
				margin-top: 4rpx;
				font-size: 22rpx;
				color: #9aa5bb;
			}
		}

		.quantity-section {
			flex-shrink: 0;
			text-align: right;

			.quantity-info {
				display: flex;
				align-items: center;
				justify-content: flex-end;
				gap: 8rpx;
			}

			.quantity-label {
				font-size: 22rpx;
				color: #5c677d;
			}

			.quantity-value {
				font-size: 24rpx;
				color: #e8edf6;
				font-family: "JetBrains Mono", Menlo, Consolas, monospace;

				&.received {
					color: #34d399;
				}

				&.pending {
					color: #fbbf24;
				}
			}
		}
	}

	.receive-input {
		margin-top: 24rpx;
		padding-top: 24rpx;
		border-top: 1rpx solid rgba(148, 163, 184, .09);

		.input-label {
			display: block;
			margin-bottom: 16rpx;
			font-size: 25rpx;
			color: #9aa5bb;
		}

		.quantity-input {
			display: flex;
			align-items: center;
			gap: 20rpx;
			margin-bottom: 24rpx;

			.quantity-btn {
				width: 76rpx;
				height: 76rpx;
				flex-shrink: 0;
				line-height: 76rpx;
				text-align: center;
				border-radius: 20rpx;
				background: #161e2e;
				border: 1rpx solid rgba(148, 163, 184, .12);
				color: #e8edf6;
				font-size: 34rpx;
			}

			.quantity-field {
				flex: 1;
				height: 76rpx;
				text-align: center;
				background: #161e2e;
				border: 1rpx solid rgba(148, 163, 184, .12);
				border-radius: 20rpx;
				color: #22d3ee;
				font-size: 30rpx;
				font-family: "JetBrains Mono", Menlo, Consolas, monospace;
			}
		}

		.confirm-btn {
			width: 100%;
			height: 84rpx;
			line-height: 84rpx;
			text-align: center;
			border-radius: 24rpx;
			background: linear-gradient(135deg, #06b6d4, #0891b2);
			color: #04222b;
			font-size: 28rpx;
			font-weight: 600;
		}
	}
}

/* 收货记录 */
.receive-records {
	margin: 0 32rpx 24rpx;

	.records-list {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}

	.record-item {
		padding: 24rpx;
		background: #111725;
		border: 1rpx solid rgba(148, 163, 184, .09);
		border-radius: 26rpx;

		.record-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 16rpx;
		}

		.record-product {
			flex: 1;
			font-size: 26rpx;
			font-weight: 600;
			color: #e8edf6;
		}

		.record-time {
			flex-shrink: 0;
			font-size: 21rpx;
			color: #5c677d;
			font-family: "JetBrains Mono", Menlo, Consolas, monospace;
		}

		.record-details {
			display: flex;
			gap: 24rpx;
			margin-top: 10rpx;

			.record-sku {
				font-size: 22rpx;
				color: #5c677d;
				font-family: "JetBrains Mono", Menlo, Consolas, monospace;
			}

			.record-quantity {
				font-size: 22rpx;
				color: #34d399;
			}
		}

		.undo-btn {
			display: inline-flex;
			align-items: center;
			gap: 8rpx;
			margin-top: 18rpx;
			padding: 10rpx 24rpx;
			border-radius: 16rpx;
			background: rgba(248, 113, 113, .12);
			border: 1rpx solid rgba(248, 113, 113, .3);
			color: #f87171;
			font-size: 23rpx;
		}
	}

	.empty-records {
		padding: 60rpx 0;
		text-align: center;
		font-size: 25rpx;
		color: #5c677d;
	}
}

/* 商品清单 */
.product-list {
	margin: 0 32rpx;

	.filter-tabs {
		display: flex;
		gap: 12rpx;
		margin-left: auto;
		padding: 0;

		.filter-tab {
			flex: none;
			width: auto;
			height: auto;
			line-height: 1.4;
			padding: 8rpx 20rpx;
			border-radius: 16rpx;
			background: #161e2e;
			border: 1rpx solid rgba(148, 163, 184, .12);
			color: #9aa5bb;
			font-size: 22rpx;

			&.active {
				background: rgba(34, 211, 238, .12);
				border-color: rgba(34, 211, 238, .35);
				color: #22d3ee;
			}
		}
	}

	.list-container {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
		padding: 0;
	}

	.list-item {
		display: flex;
		align-items: center;
		gap: 20rpx;
		padding: 24rpx;
		background: #111725;
		border: 1rpx solid rgba(148, 163, 184, .09);
		border-radius: 26rpx;
		transition: all .2s ease;

		&.selected {
			border-color: rgba(34, 211, 238, .45);
			background: rgba(34, 211, 238, .06);
		}

		.item-image {
			width: 96rpx;
			height: 96rpx;
			border-radius: 22rpx;
			background: #1c2536;
			flex-shrink: 0;
		}

		.item-info {
			flex: 1;
			min-width: 0;

			.item-name {
				font-size: 27rpx;
				font-weight: 600;
				color: #e8edf6;
			}

			.item-sku {
				margin-top: 4rpx;
				font-size: 22rpx;
				color: #5c677d;
				font-family: "JetBrains Mono", Menlo, Consolas, monospace;
			}

			.item-spec {
				margin-top: 4rpx;
				font-size: 22rpx;
				color: #9aa5bb;
			}
		}

		.item-status {
			flex-shrink: 0;
			text-align: right;

			.quantity-progress {
				margin-top: 12rpx;
			}

			.progress-text {
				display: block;
				margin-bottom: 8rpx;
				font-size: 21rpx;
				color: #9aa5bb;
				font-family: "JetBrains Mono", Menlo, Consolas, monospace;
			}
		}
	}
}

/* 底部操作栏 */
.bottom-actions {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 100;
	display: flex;
	gap: 16rpx;
	margin: 0;
	padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
	background: rgba(13, 18, 32, .92);
	border-top: 1rpx solid rgba(148, 163, 184, .09);

	.action-btn {
		height: 84rpx;
		line-height: 84rpx;
		border-radius: 24rpx;
		font-size: 27rpx;
	}
}
</style>
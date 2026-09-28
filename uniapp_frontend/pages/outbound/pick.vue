<template>
  <view class="pick-page">
    <!-- 头部信息 -->
    <view class="header-info">
      <view class="order-info">
        <text class="order-no">{{ orderInfo.orderNo }}</text>
        <text class="customer-name">{{ orderInfo.customerName }}</text>
      </view>
      <view class="progress-info">
        <text class="progress-text">{{ progressInfo.pickedQuantity }}/{{ progressInfo.expectedQuantity }}</text>
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
        </view>
      </view>
    </view>

    <!-- 扫码区域 -->
    <view class="scan-section">
      <view class="scan-input">
        <uni-icons type="scan" size="20" color="#007AFF"></uni-icons>
        <input 
          type="text" 
          placeholder="扫描商品条码或手动输入" 
          v-model="scanCode"
          @input="onScanInput"
          @confirm="handleScan"
          focus
        />
        <button class="scan-btn" @click="openScanner">
          <uni-icons type="camera" size="16" color="#fff"></uni-icons>
        </button>
      </view>
      <view class="scan-tips">
        <text>扫描商品条码开始拣货，或点击下方商品列表选择</text>
      </view>
    </view>

    <!-- 当前拣货商品 -->
    <view class="current-product" v-if="currentProduct">
      <view class="section-title">
        <uni-icons type="gift" size="20" color="#007AFF"></uni-icons>
        <text>当前拣货商品</text>
      </view>
      
      <view class="product-card">
        <image class="product-image" :src="currentProduct.image || '/static/default-product.png'" mode="aspectFill"></image>
        <view class="product-info">
          <text class="product-name">{{ currentProduct.name }}</text>
          <text class="product-sku">SKU: {{ currentProduct.sku }}</text>
          <text class="product-spec">规格: {{ currentProduct.specification }}</text>
        </view>
        <view class="quantity-section">
          <view class="quantity-info">
            <text class="quantity-label">预计:</text>
            <text class="quantity-value">{{ currentProduct.expectedQuantity }}</text>
          </view>
          <view class="quantity-info">
            <text class="quantity-label">已拣:</text>
            <text class="quantity-value picked">{{ currentProduct.pickedQuantity }}</text>
          </view>
          <view class="quantity-info">
            <text class="quantity-label">待拣:</text>
            <text class="quantity-value pending">{{ currentProduct.expectedQuantity - currentProduct.pickedQuantity }}</text>
          </view>
        </view>
      </view>
      
      <!-- 拣货数量输入 -->
      <view class="pick-input">
        <text class="input-label">拣货数量:</text>
        <view class="quantity-input">
          <button class="quantity-btn" @click="decreaseQuantity">-</button>
          <input class="quantity-field" type="number" v-model="pickQuantity" @input="onQuantityInput" />
          <button class="quantity-btn" @click="increaseQuantity">+</button>
        </view>
        <button class="confirm-btn" :disabled="!canConfirmPick" @click="confirmPick">
          确认拣货
        </button>
      </view>
    </view>

    <!-- 拣货记录 -->
    <view class="pick-records">
      <view class="section-title">
        <uni-icons type="checkmarkempty" size="20" color="#007AFF"></uni-icons>
        <text>拣货记录</text>
        <text class="record-count">({{ pickRecords.length }}条)</text>
      </view>
      
      <view class="records-list" v-if="pickRecords.length > 0">
        <view class="record-item" v-for="record in pickRecords" :key="record.id">
          <view class="record-header">
            <text class="record-product">{{ record.productName }}</text>
            <text class="record-time">{{ formatTime(record.time) }}</text>
          </view>
          <view class="record-details">
            <text class="record-sku">SKU: {{ record.sku }}</text>
            <text class="record-quantity">数量: {{ record.quantity }}</text>
          </view>
          <button class="undo-btn" @click="undoPick(record.id)">
            <uni-icons type="undo" size="12" color="#FF3B30"></uni-icons>
            撤销
          </button>
        </view>
      </view>
      
      <view class="empty-records" v-else>
        <uni-icons type="list" size="60" color="#ccc"></uni-icons>
        <text>暂无拣货记录</text>
      </view>
    </view>

    <!-- 商品清单 -->
    <view class="product-list">
      <view class="section-title">
        <uni-icons type="bars" size="20" color="#007AFF"></uni-icons>
        <text>商品清单</text>
        <view class="filter-tabs">
          <text 
            class="filter-tab" 
            :class="{ active: activeFilter === 'all' }"
            @click="setFilter('all')"
          >
            全部
          </text>
          <text 
            class="filter-tab" 
            :class="{ active: activeFilter === 'pending' }"
            @click="setFilter('pending')"
          >
            待拣
          </text>
          <text 
            class="filter-tab" 
            :class="{ active: activeFilter === 'completed' }"
            @click="setFilter('completed')"
          >
            已完成
          </text>
        </view>
      </view>
      
      <view class="list-container">
        <view 
          class="list-item" 
          :class="{ selected: item.id === currentProduct?.id }"
          v-for="item in filteredProducts" 
          :key="item.id"
          @click="selectProduct(item)"
        >
          <image class="item-image" :src="item.image || '/static/default-product.png'" mode="aspectFill"></image>
          <view class="item-info">
            <text class="item-name">{{ item.name }}</text>
            <text class="item-sku">SKU: {{ item.sku }}</text>
            <text class="item-spec">规格: {{ item.specification }}</text>
          </view>
          <view class="item-status">
            <view class="status-badge" :class="getProductStatusClass(item)">
              {{ getProductStatusText(item) }}
            </view>
            <view class="quantity-progress">
              <text class="progress-text">{{ item.pickedQuantity }}/{{ item.expectedQuantity }}</text>
              <view class="mini-progress">
                <view class="mini-progress-fill" :style="{ width: getProductProgress(item) + '%' }"></view>
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
      <button class="action-btn primary" :disabled="!canComplete" @click="completePick">
        完成拣货
      </button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      orderId: '',
      scanCode: '',
      pickQuantity: 1,
      activeFilter: 'all',
      
      // 订单信息
      orderInfo: {
        orderNo: '',
        customerName: ''
      },
      
      // 进度信息
      progressInfo: {
        expectedQuantity: 0,
        pickedQuantity: 0
      },
      
      // 当前拣货商品
      currentProduct: null,
      
      // 商品列表
      productList: [],
      
      // 拣货记录
      pickRecords: []
    }
  },
  
  computed: {
    // 进度百分比
    progressPercent() {
      if (this.progressInfo.expectedQuantity === 0) return 0
      return Math.round((this.progressInfo.pickedQuantity / this.progressInfo.expectedQuantity) * 100)
    },
    
    // 筛选后的商品列表
    filteredProducts() {
      if (this.activeFilter === 'all') {
        return this.productList
      } else if (this.activeFilter === 'pending') {
        return this.productList.filter(item => item.pickedQuantity < item.expectedQuantity)
      } else if (this.activeFilter === 'completed') {
        return this.productList.filter(item => item.pickedQuantity >= item.expectedQuantity)
      }
      return this.productList
    },
    
    // 是否可以确认拣货
    canConfirmPick() {
      return this.currentProduct && 
             this.pickQuantity > 0 && 
             this.pickQuantity <= (this.currentProduct.expectedQuantity - this.currentProduct.pickedQuantity)
    },
    
    // 是否可以完成拣货
    canComplete() {
      return this.progressPercent === 100
    }
  },
  
  onLoad(options) {
    this.orderId = options.id
    this.loadData()
  },
  
  methods: {
    // 加载数据
    async loadData() {
      try {
        // 模拟API调用
        const response = await this.mockApiCall()
        
        this.orderInfo = response.orderInfo
        this.progressInfo = response.progressInfo
        this.productList = response.productList
        this.pickRecords = response.pickRecords
        
        // 自动选择第一个待拣货商品
        const pendingProduct = this.productList.find(item => item.pickedQuantity < item.expectedQuantity)
        if (pendingProduct) {
          this.selectProduct(pendingProduct)
        }
        
      } catch (error) {
        uni.showToast({
          title: '加载失败',
          icon: 'error'
        })
      }
    },
    
    // 模拟API调用
    mockApiCall() {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            orderInfo: {
              orderNo: 'OUT20240101001',
              customerName: '客户A'
            },
            progressInfo: {
              expectedQuantity: 150,
              pickedQuantity: 90
            },
            productList: [
              {
                id: '1',
                name: '商品A',
                sku: 'SKU001',
                specification: '500ml',
                barcode: '1234567890123',
                image: '',
                expectedQuantity: 50,
                pickedQuantity: 30
              },
              {
                id: '2',
                name: '商品B',
                sku: 'SKU002',
                specification: '1L',
                barcode: '1234567890124',
                image: '',
                expectedQuantity: 30,
                pickedQuantity: 30
              },
              {
                id: '3',
                name: '商品C',
                sku: 'SKU003',
                specification: '250ml',
                barcode: '1234567890125',
                image: '',
                expectedQuantity: 40,
                pickedQuantity: 20
              },
              {
                id: '4',
                name: '商品D',
                sku: 'SKU004',
                specification: '2L',
                barcode: '1234567890126',
                image: '',
                expectedQuantity: 20,
                pickedQuantity: 10
              },
              {
                id: '5',
                name: '商品E',
                sku: 'SKU005',
                specification: '100ml',
                barcode: '1234567890127',
                image: '',
                expectedQuantity: 10,
                pickedQuantity: 0
              }
            ],
            pickRecords: [
              {
                id: '1',
                productId: '1',
                productName: '商品A',
                sku: 'SKU001',
                quantity: 10,
                time: new Date(Date.now() - 30 * 60 * 1000).toISOString()
              },
              {
                id: '2',
                productId: '1',
                productName: '商品A',
                sku: 'SKU001',
                quantity: 20,
                time: new Date(Date.now() - 15 * 60 * 1000).toISOString()
              }
            ]
          })
        }, 1000)
      })
    },
    
    // 扫码输入
    onScanInput() {
      // 防抖处理
      clearTimeout(this.scanTimer)
      this.scanTimer = setTimeout(() => {
        if (this.scanCode.length >= 8) {
          this.handleScan()
        }
      }, 500)
    },
    
    // 处理扫码
    handleScan() {
      if (!this.scanCode.trim()) return
      
      // 根据条码查找商品
      const product = this.productList.find(item => 
        item.barcode === this.scanCode || 
        item.sku === this.scanCode
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
    
    // 打开扫码器
    openScanner() {
      // #ifdef APP-PLUS
      uni.scanCode({
        success: (res) => {
          this.scanCode = res.result
          this.handleScan()
        },
        fail: (err) => {
          console.error('扫码失败:', err)
        }
      })
      // #endif
      
      // #ifdef H5 || MP
      uni.showToast({
        title: '请手动输入条码',
        icon: 'none'
      })
      // #endif
    },
    
    // 选择商品
    selectProduct(product) {
      if (product.pickedQuantity >= product.expectedQuantity) {
        uni.showToast({
          title: '该商品已完成拣货',
          icon: 'none'
        })
        return
      }
      
      this.currentProduct = product
      this.pickQuantity = Math.min(1, product.expectedQuantity - product.pickedQuantity)
    },
    
    // 数量输入
    onQuantityInput() {
      if (this.pickQuantity < 1) {
        this.pickQuantity = 1
      }
      if (this.currentProduct && this.pickQuantity > (this.currentProduct.expectedQuantity - this.currentProduct.pickedQuantity)) {
        this.pickQuantity = this.currentProduct.expectedQuantity - this.currentProduct.pickedQuantity
      }
    },
    
    // 减少数量
    decreaseQuantity() {
      if (this.pickQuantity > 1) {
        this.pickQuantity--
      }
    },
    
    // 增加数量
    increaseQuantity() {
      if (this.currentProduct && this.pickQuantity < (this.currentProduct.expectedQuantity - this.currentProduct.pickedQuantity)) {
        this.pickQuantity++
      }
    },
    
    // 确认拣货
    async confirmPick() {
      if (!this.canConfirmPick) return
      
      try {
        // 更新商品拣货数量
        this.currentProduct.pickedQuantity += this.pickQuantity
        
        // 更新总进度
        this.progressInfo.pickedQuantity += this.pickQuantity
        
        // 添加拣货记录
        this.pickRecords.unshift({
          id: Date.now().toString(),
          productId: this.currentProduct.id,
          productName: this.currentProduct.name,
          sku: this.currentProduct.sku,
          quantity: this.pickQuantity,
          time: new Date().toISOString()
        })
        
        uni.showToast({
          title: '拣货成功',
          icon: 'success'
        })
        
        // 重置数量
        this.pickQuantity = 1
        
        // 如果当前商品已完成，自动选择下一个待拣货商品
        if (this.currentProduct.pickedQuantity >= this.currentProduct.expectedQuantity) {
          const nextProduct = this.productList.find(item => 
            item.id !== this.currentProduct.id && 
            item.pickedQuantity < item.expectedQuantity
          )
          if (nextProduct) {
            this.selectProduct(nextProduct)
          } else {
            this.currentProduct = null
          }
        }
        
      } catch (error) {
        uni.showToast({
          title: '拣货失败',
          icon: 'error'
        })
      }
    },
    
    // 撤销拣货
    async undoPick(recordId) {
      const result = await uni.showModal({
        title: '确认撤销',
        content: '确定要撤销这条拣货记录吗？'
      })
      
      if (result.confirm) {
        try {
          const record = this.pickRecords.find(r => r.id === recordId)
          if (record) {
            // 找到对应商品
            const product = this.productList.find(p => p.id === record.productId)
            if (product) {
              // 恢复商品数量
              product.pickedQuantity -= record.quantity
              
              // 恢复总进度
              this.progressInfo.pickedQuantity -= record.quantity
              
              // 删除记录
              const index = this.pickRecords.findIndex(r => r.id === recordId)
              this.pickRecords.splice(index, 1)
              
              uni.showToast({
                title: '撤销成功',
                icon: 'success'
              })
            }
          }
        } catch (error) {
          uni.showToast({
            title: '撤销失败',
            icon: 'error'
          })
        }
      }
    },
    
    // 设置筛选
    setFilter(filter) {
      this.activeFilter = filter
    },
    
    // 获取商品状态样式类
    getProductStatusClass(product) {
      if (product.pickedQuantity === 0) return 'status-pending'
      if (product.pickedQuantity < product.expectedQuantity) return 'status-partial'
      return 'status-completed'
    },
    
    // 获取商品状态文本
    getProductStatusText(product) {
      if (product.pickedQuantity === 0) return '待拣货'
      if (product.pickedQuantity < product.expectedQuantity) return '部分拣货'
      return '已完成'
    },
    
    // 获取商品进度
    getProductProgress(product) {
      if (product.expectedQuantity === 0) return 0
      return Math.round((product.pickedQuantity / product.expectedQuantity) * 100)
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
      } else {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      }
    },
    
    // 保存草稿
    async saveDraft() {
      try {
        uni.showToast({
          title: '草稿已保存',
          icon: 'success'
        })
      } catch (error) {
        uni.showToast({
          title: '保存失败',
          icon: 'error'
        })
      }
    },
    
    // 完成拣货
    async completePick() {
      if (!this.canComplete) {
        uni.showToast({
          title: '请完成所有商品拣货',
          icon: 'none'
        })
        return
      }
      
      const result = await uni.showModal({
        title: '确认完成',
        content: '确定要完成拣货作业吗？'
      })
      
      if (result.confirm) {
        try {
          uni.showToast({
            title: '拣货完成',
            icon: 'success'
          })
          
          // 返回详情页
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
          
        } catch (error) {
          uni.showToast({
            title: '操作失败',
            icon: 'error'
          })
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.pick-page {
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

		.customer-name {
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

	.filter-tabs {
		display: flex;
		gap: 12rpx;
		margin-left: auto;

		.filter-tab {
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
}

/* 当前商品 */
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
				display: block;
				font-size: 28rpx;
				font-weight: 600;
				color: #e8edf6;
			}

			.product-sku {
				display: block;
				margin-top: 4rpx;
				font-size: 22rpx;
				color: #5c677d;
				font-family: "JetBrains Mono", Menlo, Consolas, monospace;
			}

			.product-spec {
				display: block;
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

				&.picked {
					color: #34d399;
				}

				&.pending {
					color: #fbbf24;
				}
			}
		}
	}

	.pick-input {
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

/* 拣货记录 */
.pick-records {
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
				display: block;
				font-size: 27rpx;
				font-weight: 600;
				color: #e8edf6;
			}

			.item-sku {
				display: block;
				margin-top: 4rpx;
				font-size: 22rpx;
				color: #5c677d;
				font-family: "JetBrains Mono", Menlo, Consolas, monospace;
			}

			.item-spec {
				display: block;
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

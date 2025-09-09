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
// HTTP请求工具类

// 后端API基础地址
const BASE_URL = 'http://localhost:8000/api'

// 请求队列，用于处理token刷新时的并发请求
let isRefreshing = false
let requestQueue = []

// 处理队列中的请求
const processQueue = (error, token = null) => {
  requestQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error)
    } else {
      config.header = config.header || {}
      config.header['Authorization'] = `Bearer ${token}`
      resolve(request(config))
    }
  })
  requestQueue = []
}

// 刷新token
const refreshToken = async () => {
  try {
    const refreshTokenValue = uni.getStorageSync('refreshToken')
    if (!refreshTokenValue) {
      throw new Error('No refresh token')
    }
    
    const response = await uni.request({
      url: BASE_URL + '/auth/refresh',
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refreshTokenValue}`
      }
    })
    
    if (response.statusCode === 200 && response.data.code === 200) {
      const newToken = response.data.data.token
      const newRefreshToken = response.data.data.refreshToken
      
      // 保存新的token
      uni.setStorageSync('token', newToken)
      if (newRefreshToken) {
        uni.setStorageSync('refreshToken', newRefreshToken)
      }
      
      return newToken
    } else {
      throw new Error('Token refresh failed')
    }
  } catch (error) {
    // 刷新失败，清除所有认证信息并跳转到登录页
    uni.removeStorageSync('token')
    uni.removeStorageSync('refreshToken')
    uni.removeStorageSync('userInfo')
    
    uni.reLaunch({
      url: '/pages/login/login'
    })
    
    throw error
  }
}

// 主要的请求函数
const request = (options) => {
  return new Promise((resolve, reject) => {
    // 获取token
    const token = uni.getStorageSync('token')
    
    // 设置默认请求头
    const header = {
      'Content-Type': 'application/json',
      ...options.header
    }
    
    // 如果有token，添加到请求头
    if (token) {
      header['Authorization'] = `Bearer ${token}`
    }
    
    // 构建完整的请求配置
    const config = {
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: header,
      timeout: options.timeout || 10000
    }
    
    uni.request({
      ...config,
      success: async (res) => {
        console.log('API请求成功:', res)
        
        // 检查HTTP状态码
        if (res.statusCode === 200) {
          // 检查业务状态码
          if (res.data.code === 200) {
            resolve(res.data)
          } else {
            // 业务错误
            uni.showToast({
              title: res.data.message || '请求失败',
              icon: 'none'
            })
            reject(res.data)
          }
        } else if (res.statusCode === 401) {
          // Token过期，尝试刷新
          if (!isRefreshing) {
            isRefreshing = true
            
            try {
              const newToken = await refreshToken()
              isRefreshing = false
              
              // 处理队列中的请求
              processQueue(null, newToken)
              
              // 重新发起当前请求
              config.header['Authorization'] = `Bearer ${newToken}`
              const retryResponse = await request({
                url: options.url,
                method: options.method,
                data: options.data,
                header: options.header
              })
              resolve(retryResponse)
              
            } catch (refreshError) {
              isRefreshing = false
              processQueue(refreshError)
              reject(refreshError)
            }
          } else {
            // 正在刷新token，将请求加入队列
            requestQueue.push({
              resolve,
              reject,
              config: {
                url: options.url,
                method: options.method,
                data: options.data,
                header: options.header
              }
            })
          }
        } else {
          // 其他HTTP错误
          const errorMessage = res.data?.message || `请求失败 (${res.statusCode})`
          uni.showToast({
            title: errorMessage,
            icon: 'none'
          })
          reject({
            code: res.statusCode,
            message: errorMessage,
            data: res.data
          })
        }
      },
      fail: (err) => {
        console.error('API请求失败:', err)
        
        let errorMessage = '网络请求失败'
        if (err.errMsg) {
          if (err.errMsg.includes('timeout')) {
            errorMessage = '请求超时，请检查网络连接'
          } else if (err.errMsg.includes('fail')) {
            errorMessage = '网络连接失败，请检查网络设置'
          }
        }
        
        uni.showToast({
          title: errorMessage,
          icon: 'none'
        })
        
        reject({
          code: -1,
          message: errorMessage,
          originalError: err
        })
      }
    })
  })
}

// 便捷方法
const get = (url, params = {}, options = {}) => {
  return request({
    url,
    method: 'GET',
    data: params,
    ...options
  })
}

const post = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  })
}

const put = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'PUT',
    data,
    ...options
  })
}

const del = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'DELETE',
    data,
    ...options
  })
}

// 上传文件
const upload = (url, filePath, formData = {}, options = {}) => {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token')
    const header = {
      ...options.header
    }
    
    if (token) {
      header['Authorization'] = `Bearer ${token}`
    }
    
    uni.uploadFile({
      url: BASE_URL + url,
      filePath,
      name: options.name || 'file',
      formData,
      header,
      success: (res) => {
        try {
          const data = JSON.parse(res.data)
          if (data.code === 200) {
            resolve(data)
          } else {
            uni.showToast({
              title: data.message || '上传失败',
              icon: 'none'
            })
            reject(data)
          }
        } catch (error) {
          reject({
            code: -1,
            message: '响应解析失败',
            originalError: error
          })
        }
      },
      fail: (err) => {
        console.error('文件上传失败:', err)
        uni.showToast({
          title: '文件上传失败',
          icon: 'none'
        })
        reject({
          code: -1,
          message: '文件上传失败',
          originalError: err
        })
      }
    })
  })
}

export default {
  request,
  get,
  post,
  put,
  delete: del,
  upload,
  BASE_URL
}

export {
  request,
  get,
  post,
  put,
  del as delete,
  upload,
  BASE_URL
}
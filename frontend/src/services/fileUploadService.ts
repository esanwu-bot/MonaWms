import axios from 'axios';
import type { ApiResponse } from '../types/api';
import { api } from './api';

// 文件上传基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/**
 * 上传条码图片并识别序列号
 * @param file 图片文件
 * @returns 识别结果
 */
export const uploadBarcodeImage = async (file: File): Promise<{ serialNumber: string }> => {
  const formData = new FormData();
  formData.append('image', file);

  // 获取认证token
  const token = localStorage.getItem('token');
  
  try {
    const response = await axios.post<ApiResponse<{ serialNumber: string }>>(
      `${API_BASE_URL}/serial-numbers/upload-barcode`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      }
    );
    
    return response.data.data!;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || '上传失败');
  }
};

/**
 * 通过文件URL识别条码
 * @param imageUrl 图片URL
 * @returns 识别结果
 */
export const recognizeBarcodeFromUrl = async (imageUrl: string): Promise<{ serialNumber: string }> => {
  try {
    const response = await api.post<{ serialNumber: string }>('/serial-numbers/recognize-barcode', {
      imageUrl
    });
    
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || '识别失败');
  }
};

export default {
  uploadBarcodeImage,
  recognizeBarcodeFromUrl
};
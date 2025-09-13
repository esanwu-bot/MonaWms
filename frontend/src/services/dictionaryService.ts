import api from './api';

// 数据字典类型接口
export interface DictionaryType {
  id: number;
  code: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

// 数据字典项接口
export interface DictionaryItem {
  id: number;
  type_id: number;
  type_code?: string;
  code: string;
  name: string;
  value?: string;
  sort_order: number;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

// 获取所有字典类型
export const getDictionaryTypes = async () => {
  try {
    const response = await api.get('/api/dictionary/types');
    return response.data;
  } catch (error) {
    console.error('获取字典类型失败:', error);
    throw error;
  }
};

// 获取指定字典类型的所有字典项
export const getDictionaryItems = async (typeId: number) => {
  try {
    const response = await api.get(`/api/dictionary/items/${typeId}`);
    return response.data;
  } catch (error) {
    console.error('获取字典项失败:', error);
    throw error;
  }
};

// 根据字典类型编码获取字典项
export const getDictionaryItemsByTypeCode = async (typeCode: string) => {
  try {
    const response = await api.get(`/api/dictionary/items/type/${typeCode}`);
    return response.data;
  } catch (error) {
    console.error(`获取${typeCode}字典项失败:`, error);
    throw error;
  }
};

// 创建字典类型
export const createDictionaryType = async (data: Omit<DictionaryType, 'id'>) => {
  try {
    const response = await api.post('/api/dictionary/types', data);
    return response.data;
  } catch (error) {
    console.error('创建字典类型失败:', error);
    throw error;
  }
};

// 更新字典类型
export const updateDictionaryType = async (id: number, data: Partial<DictionaryType>) => {
  try {
    const response = await api.put(`/api/dictionary/types/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('更新字典类型失败:', error);
    throw error;
  }
};

// 删除字典类型
export const deleteDictionaryType = async (id: number) => {
  try {
    const response = await api.delete(`/api/dictionary/types/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除字典类型失败:', error);
    throw error;
  }
};

// 创建字典项
export const createDictionaryItem = async (data: Omit<DictionaryItem, 'id'>) => {
  try {
    const response = await api.post('/api/dictionary/items', data);
    return response.data;
  } catch (error) {
    console.error('创建字典项失败:', error);
    throw error;
  }
};

// 更新字典项
export const updateDictionaryItem = async (id: number, data: Partial<DictionaryItem>) => {
  try {
    const response = await api.put(`/api/dictionary/items/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('更新字典项失败:', error);
    throw error;
  }
};

// 删除字典项
export const deleteDictionaryItem = async (id: number) => {
  try {
    const response = await api.delete(`/api/dictionary/items/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除字典项失败:', error);
    throw error;
  }
};

// 导出默认对象
const dictionaryService = {
  getDictionaryTypes,
  getDictionaryItems,
  getDictionaryItemsByTypeCode,
  createDictionaryType,
  updateDictionaryType,
  deleteDictionaryType,
  createDictionaryItem,
  updateDictionaryItem,
  deleteDictionaryItem,
};

export default dictionaryService;
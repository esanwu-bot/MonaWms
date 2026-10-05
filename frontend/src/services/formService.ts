/**
 * 低代码表单 DIY · API 客户端
 *
 * 对接后端两组 REST：
 *   设计态  /form-meta（admin）：草稿/发布/diff/自然语言草稿
 *   运行态  /forms/:formKey（全登录态）：元数据/记录 CRUD/动态筛选/CSV 导出
 *
 * 后端响应统一为 {code, message, data}（业务错误 HTTP 200 + 字符串业务码），
 * 本文件统一解包：code===200 返回 data，否则抛错（details 携带 data 供页面展示明细）。
 */
import api from './api';
import type { AxiosResponse } from 'axios';

// ===================== 类型 =====================

/** 字段类型（与后端 FormMetaService::FIELD_TYPES 一一对应） */
export type FieldType =
  | 'text' | 'textarea' | 'number' | 'date' | 'datetime'
  | 'select' | 'radio' | 'checkbox' | 'switch'
  | 'file' | 'sn-scan' | 'warehouse-select' | 'dict';

export const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'text', label: '单行文本' },
  { value: 'textarea', label: '多行文本' },
  { value: 'number', label: '数字' },
  { value: 'date', label: '日期' },
  { value: 'datetime', label: '日期时间' },
  { value: 'select', label: '下拉选择' },
  { value: 'radio', label: '单选组' },
  { value: 'checkbox', label: '多选组' },
  { value: 'switch', label: '开关' },
  { value: 'file', label: '附件/照片（URL 列表）' },
  { value: 'sn-scan', label: 'SN 扫码' },
  { value: 'warehouse-select', label: '仓库选择' },
  { value: 'dict', label: '字典选择' },
];

export interface FormFieldMeta {
  prop: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { label: string; value: string }[];
  multiple?: boolean;
  max?: number;
  min?: number;
  maxLen?: number;
  pattern?: string;
  dict_code?: string;
  validate_sn?: boolean;
  accept?: string;
  listVisible?: boolean;
  deprecated?: boolean;
}

/** 元数据本体（后端 camelCase） */
export interface FormMeta {
  id: number;
  formKey: string;
  title: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  changeNote?: string;
  layout?: { columns?: number };
  fields: FormFieldMeta[];
  publishedAt?: string;
  createdAt?: string;
}

/** 已发布表单列表项（后端 getPublishedList 专用 snake_case 结构） */
export interface PublishedForm {
  form_key: string;
  title: string;
  version: number;
  field_count: number;
  published_at?: string;
}

/** 版本 diff（发布确认卡数据源） */
export interface FormDiff {
  base_version: number;
  next_version: number | null;
  added: { prop: string; label: string; type: string; required: boolean; deprecated: boolean }[];
  modified: { prop: string; label: string; type: string; changes: string[] }[];
  hidden: { prop: string; label: string; type: string }[];
  added_count: number;
  modified_count: number;
  hidden_count: number;
}

/** 记录（后端 toRecord snake_case 结构） */
export interface FormRecord {
  id: number;
  form_key: string;
  form_version: number;
  biz_ref: string;
  ext_attrs: Record<string, any>;
  created_by?: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
  /** 详情接口附带的该版本字段定义（宽容渲染依据） */
  fields?: FormFieldMeta[];
}

export interface RecordListResult {
  list: FormRecord[];
  total: number;
  page: number;
  limit: number;
}

/** 设计态版本列表（/form-meta 分页，list 元素为 FormMeta 本体 camelCase） */
export interface MetaListResult {
  list: FormMeta[];
  total: number;
  page: number;
  limit: number;
}

/** 列表查询参数（filters 值为对象，内部序列化为 JSON 字符串传输） */
export interface RecordQueryParams {
  filters?: Record<string, any>;
  sort?: string;
  page?: number;
  limit?: number;
  biz_ref?: string;
}

interface Result<T> {
  code: number | string;
  message: string;
  data: T;
}

/** 业务码解包：非 200 抛错并携带 details（如 FORM_VALIDATION_FAILED 的 errors 数组） */
async function unwrap<T>(p: Promise<AxiosResponse<Result<T>>>): Promise<T> {
  const res = await p;
  if (res.data.code !== 200) {
    const err: any = new Error(res.data.message || '请求失败');
    err.code = res.data.code;
    err.details = res.data.data;
    throw err;
  }
  return res.data.data;
}

// ===================== 设计态（admin） =====================

export const getPublishedForms = () =>
  unwrap<PublishedForm[]>(api.get('/form-meta/published'));

export const getLatestMeta = (formKey: string) =>
  unwrap<FormMeta>(api.get(`/form-meta/latest/${formKey}`));

export const getMetaVersions = (params: { form_key?: string; status?: string; page?: number; limit?: number }) =>
  unwrap<MetaListResult>(api.get('/form-meta', { params }));

export const getMetaDetail = (id: number) =>
  unwrap<FormMeta>(api.get(`/form-meta/${id}`));

/** 保存草稿（同版本仍是 draft 则原地更新，否则生成新版本号） */
export const saveDraft = (payload: {
  form_key: string;
  title?: string;
  layout?: { columns?: number };
  fields: FormFieldMeta[];
  change_note?: string;
}) => unwrap<FormMeta>(api.post('/form-meta', payload));

export const publishMeta = (id: number, changeNote: string) =>
  unwrap<FormMeta>(api.post(`/form-meta/${id}/publish`, { change_note: changeNote }));

export const getDiff = (id: number) =>
  unwrap<FormDiff>(api.get(`/form-meta/${id}/diff`));

/** 自然语言 → schema 草稿（不落库，返回 {meta, diff} 供确认） */
export const draftFromNl = (payload: { form_key: string; description?: string; title?: string; fields?: FormFieldMeta[] }) =>
  unwrap<{ meta: FormMeta; diff: FormDiff }>(api.post('/form-meta/draft-from-nl', payload));

// ===================== 运行态（全登录态） =====================

export const getFormMeta = (formKey: string) =>
  unwrap<FormMeta>(api.get(`/forms/${formKey}/meta`));

export const getRecords = (formKey: string, params: RecordQueryParams) => {
  const query: Record<string, any> = { ...params };
  if (params.filters && Object.keys(params.filters).length > 0) {
    query.filters = JSON.stringify(params.filters);
  } else {
    delete query.filters;
  }
  return unwrap<RecordListResult>(api.get(`/forms/${formKey}/records`, { params: query }));
};

export const getRecord = (formKey: string, id: number) =>
  unwrap<FormRecord>(api.get(`/forms/${formKey}/records/${id}`));

/** 创建记录：payload 仅含 schema 字段值；bizRef 可选挂接核心单号 */
export const createRecord = (formKey: string, payload: Record<string, any>, bizRef?: string) =>
  unwrap<FormRecord>(api.post(`/forms/${formKey}/records`, payload, bizRef ? { headers: { 'X-Biz-Ref': bizRef } } : undefined));

export const updateRecord = (formKey: string, id: number, payload: Record<string, any>) =>
  unwrap<FormRecord>(api.put(`/forms/${formKey}/records/${id}`, payload));

export const deleteRecord = (formKey: string, id: number) =>
  unwrap<null>(api.delete(`/forms/${formKey}/records/${id}`));

/** CSV 导出：后端返回原始 CSV 流（带 BOM），此处取 Blob 供页面触发下载 */
export const exportRecordsCsv = async (formKey: string, params: Pick<RecordQueryParams, 'filters' | 'sort'>): Promise<{ blob: Blob; filename: string }> => {
  const query: Record<string, any> = {};
  if (params.filters && Object.keys(params.filters).length > 0) query.filters = JSON.stringify(params.filters);
  if (params.sort) query.sort = params.sort;
  const res = await api.get(`/forms/${formKey}/export`, {
    params: query,
    responseType: 'blob',
  });
  // Content-Disposition 形如 attachment; filename="site_patrol_20260101.csv"
  const cd = (res.headers as any)['content-disposition'] || '';
  const m = /filename="?([^";]+)"?/.exec(cd);
  return { blob: res.data as Blob, filename: m?.[1] || `${formKey}.csv` };
};

// ===================== DynaForm 字段选项支持 =====================

/** dict 字段按字典编码取选项（后端 /dictionary/items/type/:code） */
export const getDictOptions = (code: string) =>
  unwrap<{ label: string; value: string }[]>(api.get(`/dictionary/items/type/${code}`));

const formService = {
  getPublishedForms, getLatestMeta, getMetaVersions, getMetaDetail,
  saveDraft, publishMeta, getDiff, draftFromNl,
  getFormMeta, getRecords, getRecord, createRecord, updateRecord, deleteRecord,
  exportRecordsCsv, getDictOptions,
};

export default formService;

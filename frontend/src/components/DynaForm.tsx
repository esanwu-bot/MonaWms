/**
 * DynaForm · 元数据驱动的动态表单渲染器
 *
 * 职责：按 form_metadata.fields 逐字段渲染 antd 控件（13 种类型），
 * 并提供记录值 ↔ 表单值 的双向转换（date/dayjs、URL 列表、多值 SN 等）。
 * 表单实例由页面持有（Form.useForm），本组件只负责渲染 Form.Item 列表。
 *
 * 宽容渲染：deprecated 字段以禁用态保留回显（历史记录按其版本字段渲染，
 * 新建表单使用最新 published 元数据，天然不含 deprecated 字段）。
 */
import React from 'react';
import { Form, Input, InputNumber, DatePicker, Select, Radio, Checkbox, Switch } from 'antd';
import type { FormInstance, Rule } from 'antd/es/form';
import dayjs, { type Dayjs } from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useWarehouseStore } from '../store/warehouseStore';
import formService, { type FormFieldMeta } from '../services/formService';

const DATE_FMT = 'YYYY-MM-DD';
const DATETIME_FMT = 'YYYY-MM-DD HH:mm:ss';

/** dict 字段选项加载（组件级 useQuery，规避循环内调用 hook） */
const DictSelect: React.FC<{ field: FormFieldMeta; disabled?: boolean }> = ({ field, disabled }) => {
  const { data: options, isLoading } = useQuery({
    queryKey: ['dyna-dict-options', field.dict_code],
    queryFn: () => formService.getDictOptions(field.dict_code!),
    enabled: !!field.dict_code,
    staleTime: 60_000,
  });
  return <Select options={options} loading={isLoading} allowClear disabled={disabled} placeholder="请选择" />;
};

/** 单个字段的控件渲染 */
const FieldControl: React.FC<{ field: FormFieldMeta; disabled?: boolean }> = ({ field, disabled }) => {
  const warehouses = useWarehouseStore((s) => s.warehouses);

  switch (field.type) {
    case 'textarea':
      return <Input.TextArea rows={3} maxLength={field.maxLen ?? 5000} disabled={disabled} placeholder="请输入" />;
    case 'number':
      return <InputNumber style={{ width: '100%' }} min={field.min} max={field.max} disabled={disabled} placeholder="请输入数字" />;
    case 'date':
      return <DatePicker style={{ width: '100%' }} disabled={disabled} />;
    case 'datetime':
      return <DatePicker style={{ width: '100%' }} showTime={{ defaultValue: dayjs('00:00:00', 'HH:mm:ss') }} disabled={disabled} />;
    case 'select':
      return <Select options={field.options} allowClear disabled={disabled} placeholder="请选择" />;
    case 'radio':
      return <Radio.Group options={field.options} disabled={disabled} />;
    case 'checkbox':
      return <Checkbox.Group options={field.options} disabled={disabled} />;
    case 'switch':
      return <Switch disabled={disabled} />;
    case 'file':
      return (
        <Select
          mode="tags"
          open={false}
          tokenSeparators={[' ', ',']}
          disabled={disabled}
          placeholder="粘贴已上传文件 URL（http:// 或 /uploads/ 开头），回车添加"
          suffixIcon={null}
        />
      );
    case 'sn-scan':
      return field.multiple ? (
        <Select mode="tags" open={false} tokenSeparators={[' ', ',', '\n']} disabled={disabled} placeholder="扫描/输入 SN 后回车，可多条" suffixIcon={null} />
      ) : (
        <Input disabled={disabled} placeholder="扫描/输入 SN" allowClear />
      );
    case 'warehouse-select':
      return (
        <Select
          options={(warehouses || []).map((w) => ({ label: w.name, value: Number(w.id) }))}
          allowClear
          disabled={disabled}
          placeholder="请选择仓库"
        />
      );
    case 'dict':
      return <DictSelect field={field} disabled={disabled} />;
    default:
      return <Input maxLength={field.maxLen ?? 128} disabled={disabled} placeholder="请输入" allowClear />;
  }
};

/** antd 校验规则：必填 + 自定义 pattern（编译失败降级为不校验，避免整表卡死） */
function buildRules(field: FormFieldMeta): Rule[] {
  const rules: Rule[] = [];
  if (field.required) {
    const isChoice = ['select', 'radio', 'checkbox', 'switch', 'dict', 'warehouse-select', 'date', 'datetime'].includes(field.type);
    rules.push({ required: true, message: `${isChoice ? '请选择' : '请输入'}${field.label}` });
  }
  if (field.pattern) {
    try {
      rules.push({ pattern: new RegExp(field.pattern), message: `${field.label} 格式不符合要求` });
    } catch {
      // 非法正则由后端发布校验拦截，前端忽略即可
    }
  }
  if (field.type === 'file' && field.max) {
    rules.push({
      validator: (_, value: string[] | undefined) =>
        !value || value.length <= field.max! ? Promise.resolve() : Promise.reject(new Error(`最多 ${field.max} 个附件`)),
    });
  }
  if (field.type === 'sn-scan' && field.multiple && field.max) {
    rules.push({
      validator: (_, value: string[] | undefined) =>
        !value || value.length <= field.max! ? Promise.resolve() : Promise.reject(new Error(`最多 ${field.max} 个 SN`)),
    });
  }
  return rules;
}

const DynaFieldItem: React.FC<{ field: FormFieldMeta; disabled?: boolean }> = ({ field, disabled }) => (
  <Form.Item
    key={field.prop}
    name={field.prop}
    label={field.label}
    rules={buildRules(field)}
    valuePropName={field.type === 'switch' ? 'checked' : 'value'}
    extra={field.deprecated ? '该字段已在新版本中隐藏，仅保留历史回显' : undefined}
  >
    <FieldControl field={field} disabled={disabled || field.deprecated} />
  </Form.Item>
);

export const DynaForm: React.FC<{ fields: FormFieldMeta[]; disabled?: boolean }> = ({ fields, disabled }) => (
  <>
    {fields.map((f) => (
      <DynaFieldItem key={f.prop} field={f} disabled={disabled} />
    ))}
  </>
);

// ===================== 值转换：ext_attrs ↔ antd 表单 =====================

/** 记录值 → 表单初始值（date 字符串转 dayjs；缺字段补 undefined） */
export function valuesToForm(fields: FormFieldMeta[], extAttrs: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of fields) {
    const v = extAttrs?.[f.prop];
    if (v === undefined || v === null) continue;
    if ((f.type === 'date' || f.type === 'datetime') && typeof v === 'string') {
      const d = dayjs(v, f.type === 'date' ? DATE_FMT : DATETIME_FMT);
      if (d.isValid()) out[f.prop] = d;
      continue;
    }
    out[f.prop] = v;
  }
  return out;
}

/** 表单值 → 提交值（dayjs 转字符串；数组字段保数组；number 保持数字） */
export function formToValues(fields: FormFieldMeta[], values: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of fields) {
    if (f.deprecated) continue; // 隐藏字段不提交，服务端更新时保留原值
    const v = values[f.prop];
    if (v === undefined || v === null) continue;
    if (f.type === 'date' && v instanceof dayjs) {
      out[f.prop] = (v as Dayjs).format(DATE_FMT);
      continue;
    }
    if (f.type === 'datetime' && v instanceof dayjs) {
      out[f.prop] = (v as Dayjs).format(DATETIME_FMT);
      continue;
    }
    out[f.prop] = v;
  }
  return out;
}

/** 详情/表格展示：单字段值 → 展示文本 */
export function renderValue(field: FormFieldMeta, value: any): React.ReactNode {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
    return '-';
  }
  switch (field.type) {
    case 'checkbox':
      return Array.isArray(value)
        ? value.map((v) => field.options?.find((o) => o.value === v)?.label ?? v).join('、')
        : String(value);
    case 'file':
      return Array.isArray(value) ? `${value.length} 个附件` : String(value);
    case 'sn-scan':
      return Array.isArray(value) ? value.join('、') : String(value);
    case 'warehouse-select': {
      const warehouses = useWarehouseStore.getState().warehouses || [];
      const w = warehouses.find((x) => Number(x.id) === Number(value));
      return w?.name ?? String(value);
    }
    case 'switch':
      return value ? '是' : '否';
    default:
      return String(value);
  }
}

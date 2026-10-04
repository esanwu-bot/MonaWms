/**
 * 表单记录页（运行态，全登录态可访问）
 *
 * 选择已发布表单 → 动态列 + 动态筛选（输入即查，防抖 300ms）→ 新增/编辑/查看/软删 → CSV 导出。
 * 编辑历史记录按其自身版本 fields 宽容渲染（后端 getDetail 附带 fields）。
 * operator 数据口径由后端收敛（仅本人记录），前端无需处理。
 */
import React, { useMemo, useRef, useState } from 'react';
import {
  Button, Card, Col, DatePicker, Descriptions, Empty, Form, Input, InputNumber, Modal,
  Popconfirm, Row, Select, Space, Table, Tag, message,
} from 'antd';
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import PageHeader from '../components/ui/PageHeader';
import { DynaForm, formToValues, renderValue, valuesToForm } from '../components/DynaForm';
import formService, { type FormFieldMeta, type FormRecord } from '../services/formService';

const PAGE_SIZE = 20;

/** 动态筛选控件：文本模糊 / 枚举精确 / 数字精确 / 日期区间（转 __gte/__lte） */
const FilterControl: React.FC<{ field: FormFieldMeta; onChange: (v: any) => void }> = ({ field, onChange }) => {
  const [text, setText] = useState('');
  // 防抖定时器挂本组件实例，多个筛选框互不干扰（禁止挂 window 全局）
  const debounceRef = useRef<number | undefined>(undefined);
  const dictQ = useQuery({
    queryKey: ['dyna-dict-options', field.dict_code],
    queryFn: () => formService.getDictOptions(field.dict_code!),
    enabled: field.type === 'dict' && !!field.dict_code,
    staleTime: 60_000,
  });

  switch (field.type) {
    case 'select':
    case 'radio':
      return <Select allowClear size="small" style={{ width: '100%' }} options={field.options} placeholder={field.label} onChange={onChange} />;
    case 'dict':
      return <Select allowClear size="small" style={{ width: '100%' }} options={dictQ.data} loading={dictQ.isLoading} placeholder={field.label} onChange={onChange} />;
    case 'checkbox':
      return (
        <Select
          allowClear size="small" style={{ width: '100%' }}
          options={field.options} placeholder={field.label}
          onChange={(v: any) => onChange(v ?? undefined)}
        />
      );
    case 'switch':
      return <Select allowClear size="small" style={{ width: '100%' }} options={[{ label: '是', value: 'true' }, { label: '否', value: 'false' }]} placeholder={field.label} onChange={onChange} />;
    case 'number':
      return <InputNumber size="small" style={{ width: '100%' }} placeholder={field.label} onChange={(v) => onChange(v ?? undefined)} />;
    case 'date':
    case 'datetime':
      return (
        <DatePicker.RangePicker
          size="small" style={{ width: '100%' }}
          onChange={(range) => onChange(range ? [range[0], range[1]] : undefined)}
        />
      );
    default:
      // text/textarea/file/sn-scan：模糊匹配，本地防抖 300ms（输入即查，无需搜索按钮）
      return (
        <Input
          size="small"
          allowClear
          value={text}
          placeholder={field.label}
          onChange={(e) => {
            setText(e.target.value);
            window.clearTimeout(debounceRef.current);
            debounceRef.current = window.setTimeout(() => onChange(e.target.value || undefined), 300);
          }}
        />
      );
  }
};

const FormRecordsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [formKey, setFormKey] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [editModal, setEditModal] = useState<{ open: boolean; record: FormRecord | null; creating: boolean }>({ open: false, record: null, creating: false });
  const [viewRecord, setViewRecord] = useState<FormRecord | null>(null);
  const [form] = Form.useForm();

  const publishedQ = useQuery({
    queryKey: ['form-meta-published'],
    queryFn: () => formService.getPublishedForms(),
  });

  const metaQ = useQuery({
    queryKey: ['form-meta', formKey],
    queryFn: () => formService.getFormMeta(formKey!),
    enabled: !!formKey,
  });

  /** 筛选值 → 后端 filters JSON（含 __like/__gte/__lte 操作符后缀） */
  const buildFilters = (values: Record<string, any>): Record<string, any> => {
    const out: Record<string, any> = {};
    const typeOf = (prop: string) => metaQ.data?.fields.find((f) => f.prop === prop)?.type;
    for (const [prop, v] of Object.entries(values)) {
      if (v === undefined || v === null || v === '') continue;
      const t = typeOf(prop);
      if (t === 'date' || t === 'datetime') {
        if (Array.isArray(v) && v.length === 2 && v[0] && v[1]) {
          out[`${prop}__gte`] = v[0].format('YYYY-MM-DD');
          out[`${prop}__lte`] = v[1].format(t === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm:ss');
        }
      } else if (t === 'switch') {
        out[prop] = v === 'true';
      } else if (t === 'text' || t === 'textarea' || t === 'file' || t === 'sn-scan') {
        out[`${prop}__like`] = v;
      } else {
        out[prop] = v;
      }
    }
    return out;
  };

  // 实际下发后端的筛选（已加操作符后缀），列表查询与 CSV 导出共用同一口径
  const applied = useMemo(() => buildFilters(filters), [filters, metaQ.data]);

  const recordsQ = useQuery({
    queryKey: ['form-records', formKey, applied, page, limit],
    queryFn: () => formService.getRecords(formKey!, { filters: applied, page, limit }),
    enabled: !!formKey,
    placeholderData: (prev) => prev,
  });

  const listFields = useMemo(
    () => (metaQ.data?.fields ?? []).filter((f) => !f.deprecated && f.listVisible !== false),
    [metaQ.data],
  );

  const createM = useMutation({
    mutationFn: (values: Record<string, any>) => formService.createRecord(formKey!, formToValues(metaQ.data!.fields, values)),
    onSuccess: () => {
      message.success('记录已创建');
      setEditModal({ open: false, record: null, creating: false });
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['form-records', formKey] });
    },
    onError: (e: any) => message.error(e.details?.errors?.map((x: any) => `${x.prop}：${x.msg}`).join('；') || e.message),
  });

  const updateM = useMutation({
    mutationFn: (p: { id: number; fields: FormFieldMeta[]; values: Record<string, any> }) =>
      formService.updateRecord(formKey!, p.id, formToValues(p.fields, p.values)),
    onSuccess: () => {
      message.success('记录已更新');
      setEditModal({ open: false, record: null, creating: false });
      queryClient.invalidateQueries({ queryKey: ['form-records', formKey] });
    },
    onError: (e: any) => message.error(e.details?.errors?.map((x: any) => `${x.prop}：${x.msg}`).join('；') || e.message),
  });

  const deleteM = useMutation({
    mutationFn: (id: number) => formService.deleteRecord(formKey!, id),
    onSuccess: () => {
      message.success('记录已归档删除');
      queryClient.invalidateQueries({ queryKey: ['form-records', formKey] });
    },
    onError: (e: any) => message.error(e.message),
  });

  const openCreate = () => {
    form.resetFields();
    setEditModal({ open: true, record: null, creating: true });
  };

  const openEdit = async (id: number) => {
    try {
      const rec = await formService.getRecord(formKey!, id);
      form.resetFields();
      // 编辑用该记录版本的 fields（宽容渲染），初始值经 dayjs 转换
      form.setFieldsValue(valuesToForm(rec.fields ?? [], rec.ext_attrs));
      setEditModal({ open: true, record: rec, creating: false });
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const openView = async (id: number) => {
    try {
      setViewRecord(await formService.getRecord(formKey!, id));
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleExport = async () => {
    try {
      const { blob, filename } = await formService.exportRecordsCsv(formKey!, { filters: applied });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      message.success('CSV 已导出');
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const columns = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', width: 60 },
      ...listFields.map((f) => ({
        title: f.label,
        key: f.prop,
        render: (_: any, r: FormRecord) => renderValue(f, r.ext_attrs?.[f.prop]),
      })),
      { title: '关联单号', dataIndex: 'biz_ref', width: 130, render: (v: string) => v || '-' },
      { title: '创建时间', dataIndex: 'created_at', width: 160 },
      {
        title: '操作',
        width: 170,
        render: (_: any, r: FormRecord) => (
          <Space size={4}>
            <Button type="link" size="small" onClick={() => openView(r.id)}>查看</Button>
            <Button type="link" size="small" onClick={() => openEdit(r.id)}>编辑</Button>
            <Popconfirm title="归档删除该记录？" onConfirm={() => deleteM.mutate(r.id)}>
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [listFields, formKey],
  );

  const editFields = editModal.record?.fields ?? metaQ.data?.fields ?? [];

  return (
    <div>
      <PageHeader
        title="表单记录"
        sub="自定义表单数据 · 筛选输入即查（防抖 300ms）"
        extra={
          <Space>
            <Button icon={<DownloadOutlined />} disabled={!formKey} onClick={handleExport}>导出 CSV</Button>
            <Button type="primary" icon={<PlusOutlined />} disabled={!formKey} onClick={openCreate}>新增记录</Button>
          </Space>
        }
      />

      <Card size="small">
        <Row gutter={12} style={{ marginBottom: 12 }}>
          <Col span={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="选择表单"
              value={formKey}
              loading={publishedQ.isLoading}
              options={(publishedQ.data ?? []).map((f) => ({ label: `${f.title}（v${f.version}）`, value: f.form_key }))}
              onChange={(k) => {
                setFormKey(k);
                setFilters({});
                setPage(1);
              }}
            />
          </Col>
        </Row>

        {formKey && listFields.length > 0 && (
          <Row gutter={12} style={{ marginBottom: 12 }}>
            {listFields.map((f) => (
              <Col key={f.prop} span={6} style={{ marginBottom: 8 }}>
                <FilterControl
                  field={f}
                  onChange={(v) => {
                    // FilterControl 不持状态，这里用 prop 索引暂存再合并
                    setFilters((prev) => {
                      const next = { ...prev };
                      if (v === undefined || v === null || v === '') {
                        delete next[f.prop];
                      } else {
                        next[f.prop] = v;
                      }
                      return next;
                    });
                    setPage(1);
                  }}
                />
              </Col>
            ))}
          </Row>
        )}

        {Object.keys(applied).length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {Object.entries(applied).map(([k, v]) => (
              <Tag
                key={k}
                closable
                onClose={() => {
                  // 去掉操作符后缀回到原始 prop 清除；日期区间的 __gte/__lte 两个 Tag 一并消失
                  const prop = k.replace(/__(like|gte|lte)$/, '');
                  setFilters((prev) => {
                    const next = { ...prev };
                    delete next[prop];
                    return next;
                  });
                  setPage(1);
                }}
              >
                {k.replace('__like', ' 模糊').replace('__gte', ' 起').replace('__lte', ' 止')}：
                {typeof v === 'boolean' ? (v ? '是' : '否') : String(v)}
              </Tag>
            ))}
          </div>
        )}

        {!formKey ? (
          <Empty description="选择一个表单后查看记录" />
        ) : (
          <Table
            size="small"
            rowKey="id"
            loading={recordsQ.isLoading}
            dataSource={recordsQ.data?.list ?? []}
            columns={columns}
            pagination={{
              current: page,
              pageSize: limit,
              total: recordsQ.data?.total ?? 0,
              showSizeChanger: true,
              showTotal: (t) => `共 ${t} 条记录`,
              onChange: (p, s) => { setPage(p); setLimit(s); },
            }}
          />
        )}
      </Card>

      {/* 新增 / 编辑 */}
      <Modal
        title={editModal.creating ? `新增记录：${metaQ.data?.title ?? formKey}` : `编辑记录 #${editModal.record?.id}`}
        open={editModal.open}
        onCancel={() => setEditModal({ open: false, record: null, creating: false })}
        onOk={() =>
          form.validateFields()
            .then((values) => {
              if (editModal.creating) {
                createM.mutate(values);
              } else {
                updateM.mutate({
                  id: editModal.record!.id,
                  // 编辑按该记录版本 fields 转换提交；deprecated 字段不提交，后端合并语义保留原值
                  fields: editModal.record!.fields ?? metaQ.data?.fields ?? [],
                  values,
                });
              }
            })
            .catch(() => {
              /* 校验失败由表单红字提示，无需弹窗 */
            })
        }
        confirmLoading={createM.isPending || updateM.isPending}
        destroyOnClose
        width={680}
      >
        <Form form={form} layout="vertical">
          <DynaForm fields={editFields} />
        </Form>
      </Modal>

      {/* 查看详情 */}
      <Modal title={`记录 #${viewRecord?.id}（v${viewRecord?.form_version}）`} open={!!viewRecord} onCancel={() => setViewRecord(null)} footer={null} width={680}>
        <Descriptions column={1} size="small" bordered>
          {(viewRecord?.fields ?? []).map((f) => (
            <Descriptions.Item key={f.prop} label={f.label}>
              {renderValue(f, viewRecord?.ext_attrs?.[f.prop])}
            </Descriptions.Item>
          ))}
          <Descriptions.Item label="关联单号">{viewRecord?.biz_ref || '-'}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{viewRecord?.created_at}</Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  );
};

export default FormRecordsPage;

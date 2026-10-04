/**
 * 表单 DIY 设计器（admin）
 *
 * 元数据驱动自定义表单的设计态：表单列表 → 字段编辑（草稿）→ diff 确认卡 → 发布。
 * prop 冻结规则：已发布字段 prop/type 只读，删除即 deprecated 隐藏（不可物理删），
 * 与后端 FormMetaService::validateSchema 的发布校验一一对应。
 */
import React, { useMemo, useState } from 'react';
import {
  Alert, Button, Card, Col, Empty, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space,
  Switch, Table, Tabs, Tag, Tooltip, message,
} from 'antd';
import { PlusOutlined, ArrowUpOutlined, ArrowDownOutlined, EditOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import { usePermission } from '../hooks/usePermission';
import formService, {
  FIELD_TYPE_OPTIONS, type FieldType, type FormDiff, type FormFieldMeta, type FormMeta,
} from '../services/formService';

const STATUS_TAG: Record<string, { color: string; text: string }> = {
  draft: { color: 'orange', text: '草稿' },
  published: { color: 'green', text: '已发布' },
  archived: { color: 'default', text: '已归档' },
};

type FieldLabel = { value: string; label: string } | undefined;

const typeText = (t: string) => FIELD_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;

/** 发布确认卡：added / modified / hidden 三段变更清单（琥珀色警示） */
const DiffCard: React.FC<{ diff: FormDiff }> = ({ diff }) => (
  <div>
    <Alert
      type="warning"
      showIcon
      message={`版本变更：v${diff.base_version} → v${diff.next_version ?? '?'}　新增 ${diff.added_count} · 修改 ${diff.modified_count} · 隐藏 ${diff.hidden_count}`}
      description="发布后旧版本归档、历史记录按原版本宽容渲染不受影响；已发布字段 prop 与类型冻结，不可再改。"
      style={{ marginBottom: 12 }}
    />
    {diff.added.map((f) => (
      <div key={`a-${f.prop}`}>
        <Tag color="green">新增</Tag>
        {f.label}（{f.prop}）<Tag>{typeText(f.type)}</Tag>
        {f.required && <Tag color="red">必填</Tag>}
      </div>
    ))}
    {diff.modified.map((f) => (
      <div key={`m-${f.prop}`}>
        <Tag color="orange">修改</Tag>
        {f.label}（{f.prop}）<span style={{ opacity: 0.7 }}>变更项：{f.changes.join('、')}</span>
      </div>
    ))}
    {diff.hidden.map((f) => (
      <div key={`h-${f.prop}`}>
        <Tag color="default">隐藏</Tag>
        {f.label}（{f.prop}）
      </div>
    ))}
  </div>
);

/** 字段编辑 Modal 内容（prop 冻结：已发布字段 prop/type 禁用） */
const FieldModal: React.FC<{
  open: boolean;
  field: FormFieldMeta | null; // null = 新建
  frozen: boolean;             // 是否已发布字段（prop/type 只读）
  onCancel: () => void;
  onSave: (f: FormFieldMeta) => void;
}> = ({ open, field, frozen, onCancel, onSave }) => {
  const [form] = Form.useForm();
  const editing = field !== null;
  const isChoice = ['select', 'radio', 'checkbox'].includes(Form.useWatch('type', form) || field?.type || 'text');
  const isDict = (Form.useWatch('type', form) || field?.type) === 'dict';
  const isSn = (Form.useWatch('type', form) || field?.type) === 'sn-scan';
  const isFile = (Form.useWatch('type', form) || field?.type) === 'file';
  const isText = (Form.useWatch('type', form) || field?.type) === 'text';

  React.useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue(
        field ?? { prop: '', label: '', type: 'text' as FieldType, required: false, listVisible: true },
      );
    }
  }, [open, field, form]);

  const handleOk = () => {
    form.validateFields().then((v) => {
      const out: FormFieldMeta = { ...field, ...v, prop: (v.prop as string).trim(), label: v.label.trim() };
      if (Array.isArray(v.optionsTags)) {
        out.options = (v.optionsTags as string[]).filter(Boolean).map((s) => ({ label: s, value: s }));
        delete (out as any).optionsTags;
      }
      if (!isChoice) delete out.options;
      onSave(out);
    });
  };

  return (
    <Modal
      title={editing ? `编辑字段：${field!.label}` : '添加字段'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      destroyOnClose
      width={560}
    >
      <Form form={form} layout="vertical">
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="prop" label="字段标识（英文 snake_case）" rules={[{ required: true, pattern: /^[a-z][a-z0-9_]{0,62}$/, message: '小写字母开头，可含数字/下划线' }]}>
              <Input disabled={frozen} placeholder="如 hazard_level" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="label" label="显示名称" rules={[{ required: true, max: 32, message: '必填，≤32 字' }]}>
              <Input placeholder="如 隐患等级" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="type" label="字段类型" rules={[{ required: true }]}>
              <Select options={FIELD_TYPE_OPTIONS} disabled={frozen} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="required" label="必填" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>
        {isChoice && (
          <Form.Item name="optionsTags" label="选项（每行一个 / 逗号分隔）" rules={[{ required: true, message: '选项类字段必须提供选项' }]}>
            <Select mode="tags" open={false} tokenSeparators={['，', ',', '\n']} placeholder="高，中，低" suffixIcon={null} />
          </Form.Item>
        )}
        {isDict && (
          <Form.Item name="dict_code" label="字典编码" rules={[{ required: true, message: 'dict 字段必须指定字典编码' }]}>
            <Input placeholder="如 unit" />
          </Form.Item>
        )}
        {isSn && (
          <Form.Item name="multiple" label="支持多个 SN" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
        {isFile && (
          <Form.Item name="max" label="附件数量上限">
            <InputNumber style={{ width: '100%' }} min={1} max={20} placeholder="如 6" />
          </Form.Item>
        )}
        {(isText || (Form.useWatch('type', form) || field?.type) === 'textarea') && (
          <Form.Item name="maxLen" label="最大长度">
            <InputNumber style={{ width: '100%' }} min={1} max={10000} />
          </Form.Item>
        )}
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="pattern" label="校验正则（可选）">
              <Input placeholder="如 ^MJ-[A-Z0-9]+$" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="listVisible" label="列表中显示该列" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

const FormDesignerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const isAdmin = can('form:manage');

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // 编辑态（null=只读）；draftKey 支持新建表单（尚无 published）
  const [draftFields, setDraftFields] = useState<FormFieldMeta[] | null>(null);
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [fieldModal, setFieldModal] = useState<{ open: boolean; index: number | null; field: FormFieldMeta | null }>({ open: false, index: null, field: null });
  const [diffData, setDiffData] = useState<FormDiff | null>(null);
  const [publishModal, setPublishModal] = useState<{ open: boolean; draftId: number | null; title: string }>({ open: false, draftId: null, title: '' });
  const [newFormModal, setNewFormModal] = useState(false);
  const [nlText, setNlText] = useState('');
  const [nlDraft, setNlDraft] = useState<{ meta: FormMeta; diff: FormDiff } | null>(null);
  const [viewMeta, setViewMeta] = useState<FormMeta | null>(null);
  const [newForm] = Form.useForm();
  const [publishForm] = Form.useForm();

  const activeKey = draftKey ?? selectedKey;

  const publishedQ = useQuery({
    queryKey: ['form-meta-published'],
    queryFn: () => formService.getPublishedForms(),
  });

  const latestQ = useQuery({
    queryKey: ['form-meta-latest', selectedKey],
    queryFn: () => formService.getLatestMeta(selectedKey!),
    enabled: !!selectedKey,
  });

  const versionsQ = useQuery({
    queryKey: ['form-meta-versions', activeKey],
    queryFn: () => formService.getMetaVersions({ form_key: activeKey!, page: 1, limit: 50 }),
    enabled: !!activeKey,
  });

  // 已发布字段的冻结基线（prop → type）
  const publishedFields = latestQ.data?.fields ?? [];
  const frozenProps = useMemo(() => new Set(publishedFields.map((f) => f.prop)), [publishedFields]);

  const invalidateAll = (key?: string) => {
    queryClient.invalidateQueries({ queryKey: ['form-meta-published'] });
    if (key) {
      queryClient.invalidateQueries({ queryKey: ['form-meta-latest', key] });
      queryClient.invalidateQueries({ queryKey: ['form-meta-versions', key] });
    }
  };

  const saveDraftM = useMutation({
    mutationFn: (p: { form_key: string; fields: FormFieldMeta[]; title?: string }) =>
      formService.saveDraft(p),
    onSuccess: (meta) => {
      message.success(`草稿已保存：v${meta.version}`);
      setDraftFields(null);
      setDraftKey(null);
      invalidateAll(meta.formKey);
      // 草稿保存后直接引导查看 diff 并发布
      openDiff(meta.id, meta.title, meta.formKey);
    },
    onError: (e: any) => message.error(e.details?.errors?.map((x: any) => `${x.prop || ''} ${x.msg}`).join('；') || e.message),
  });

  const publishM = useMutation({
    mutationFn: (p: { id: number; note: string }) => formService.publishMeta(p.id, p.note),
    onSuccess: (meta) => {
      message.success(`已发布 ${meta.formKey} v${meta.version}`);
      setDiffData(null);
      setNlDraft(null);
      setNlText('');
      setPublishModal({ open: false, draftId: null, title: '' });
      invalidateAll(meta.formKey);
    },
    onError: (e: any) => message.error(e.message),
  });

  const nlM = useMutation({
    mutationFn: (desc: string) => formService.draftFromNl({ form_key: activeKey!, description: desc }),
    onSuccess: (r) => setNlDraft(r),
    onError: (e: any) => message.error(e.message),
  });

  const openDiff = (draftId: number, title: string, key: string) => {
    formService.getDiff(draftId).then((diff) => {
      setDiffData(diff);
      setPublishModal({ open: true, draftId, title: `${title}（${key}）` });
    }).catch((e: any) => message.error(e.message));
  };

  // 最新 draft 版本（"发布变更"Tab 用）
  const latestDraft = useMemo(
    () => (versionsQ.data?.list ?? []).find((v) => v.status === 'draft'),
    [versionsQ.data],
  );

  // ===================== 字段编辑操作 =====================
  const startEdit = () => {
    if (!activeKey) return;
    setDraftKey(selectedKey);
    setDraftFields((latestQ.data?.fields ?? []).map((f) => ({ ...f })));
  };
  const startNewForm = () => {
    newForm.validateFields().then((v) => {
      setDraftKey((v.form_key as string).trim());
      setDraftFields([]);
      setSelectedKey(null);
      setNewFormModal(false);
      newForm.resetFields();
      message.info('新表单编辑中：添加字段后保存草稿');
    });
  };
  const openFieldModal = (index: number | null) => {
    setFieldModal({
      open: true,
      index,
      field: index === null ? null : { ...draftFields![index] },
    });
  };
  const saveField = (f: FormFieldMeta) => {
    const list = [...(draftFields ?? [])];
    if (fieldModal.index === null) {
      if (list.some((x) => x.prop === f.prop)) {
        message.error(`字段标识 ${f.prop} 已存在`);
        return;
      }
      list.push(f);
    } else {
      list[fieldModal.index] = f;
    }
    setDraftFields(list);
    setFieldModal({ open: false, index: null, field: null });
  };
  const removeField = (index: number) => {
    const list = [...(draftFields ?? [])];
    const f = list[index];
    if (frozenProps.has(f.prop)) {
      list[index] = { ...f, deprecated: true }; // 已发布字段删除 = 隐藏
      message.info(`已发布字段不可物理删除，${f.label} 将标记为隐藏`);
    } else {
      list.splice(index, 1);
    }
    setDraftFields(list);
  };
  const restoreField = (index: number) => {
    const list = [...(draftFields ?? [])];
    list[index] = { ...list[index], deprecated: false };
    setDraftFields(list);
  };
  const moveField = (index: number, dir: -1 | 1) => {
    const list = [...(draftFields ?? [])];
    const t = index + dir;
    if (t < 0 || t >= list.length) return;
    [list[index], list[t]] = [list[t], list[index]];
    setDraftFields(list);
  };

  // ===================== 渲染 =====================
  const fieldColumns = (editable: boolean) => [
    { title: '标识', dataIndex: 'prop', width: 140 },
    { title: '名称', dataIndex: 'label', width: 130 },
    { title: '类型', dataIndex: 'type', width: 110, render: (t: string) => typeText(t) },
    { title: '必填', dataIndex: 'required', width: 60, render: (v: boolean) => (v ? <Tag color="red">必填</Tag> : '-') },
    {
      title: '选项',
      dataIndex: 'options',
      render: (opts?: { label: string }[]) => opts?.map((o) => o.label).join('、') || '-',
    },
    {
      title: '状态',
      dataIndex: 'deprecated',
      width: 80,
      render: (d: boolean) => (d ? <Tag>已隐藏</Tag> : <Tag color="green">正常</Tag>),
    },
    ...(editable
      ? [{
          title: '操作',
          width: 180,
          render: (_: any, __: any, i: number) => {
            const f = draftFields![i];
            return (
              <Space size={2}>
                <Button type="link" size="small" icon={<ArrowUpOutlined />} onClick={() => moveField(i, -1)} />
                <Button type="link" size="small" icon={<ArrowDownOutlined />} onClick={() => moveField(i, 1)} />
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openFieldModal(i)}>编辑</Button>
                {f.deprecated ? (
                  <Button type="link" size="small" onClick={() => restoreField(i)}>恢复</Button>
                ) : (
                  <Popconfirm title={frozenProps.has(f.prop) ? `隐藏字段「${f.label}」？` : `删除字段「${f.label}」？`} onConfirm={() => removeField(i)}>
                    <Button type="link" size="small" danger>{frozenProps.has(f.prop) ? '隐藏' : '删除'}</Button>
                  </Popconfirm>
                )}
              </Space>
            );
          },
        }]
      : []),
  ];

  return (
    <div>
      <PageHeader title="表单 DIY" sub="元数据驱动自定义表单 · 设计草稿 → 变更确认 → 发布生效" />

      <Row gutter={16}>
        <Col span={7}>
          <Card size="small" title="已发布表单" extra={isAdmin && <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setNewFormModal(true)}>新建</Button>}>
            <Table
              size="small"
              rowKey="form_key"
              loading={publishedQ.isLoading}
              dataSource={publishedQ.data ?? []}
              pagination={false}
              onRow={(r) => ({
                onClick: () => { setSelectedKey(r.form_key); setDraftFields(null); setDraftKey(null); setNlDraft(null); },
              })}
              rowClassName={(r) => (r.form_key === selectedKey ? 'ant-table-row-selected' : '')}
              columns={[
                { title: '表单', dataIndex: 'title' },
                { title: '版本', dataIndex: 'version', width: 50, render: (v) => `v${v}` },
                { title: '字段', dataIndex: 'field_count', width: 50 },
              ]}
            />
          </Card>
        </Col>

        <Col span={17}>
          {!activeKey ? (
            <Card><Empty description="从左侧选择一个表单，或点击「新建」创建新表单" /></Card>
          ) : draftFields !== null ? (
            <Card
              size="small"
              title={`编辑草稿：${draftKey}${latestQ.data?.title ? ` · ${latestQ.data.title}` : ''}`}
              extra={
                <Space>
                  <Button size="small" onClick={() => { setDraftFields(null); if (!selectedKey) setDraftKey(null); }}>放弃</Button>
                  <Button size="small" type="primary" loading={saveDraftM.isPending} onClick={() => saveDraftM.mutate({ form_key: draftKey!, fields: draftFields, title: latestQ.data?.title })}>
                    保存草稿
                  </Button>
                </Space>
              }
            >
              <div style={{ marginBottom: 12 }}>
                <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => openFieldModal(null)}>添加字段</Button>
                <span style={{ marginLeft: 12, opacity: 0.65, fontSize: 12 }}>
                  已发布字段 prop/类型冻结；删除即隐藏（deprecated），历史数据不受影响
                </span>
              </div>
              <Table size="small" rowKey="prop" dataSource={draftFields} pagination={false} columns={fieldColumns(true)} />
            </Card>
          ) : (
            <Card size="small" title={selectedKey ? `${latestQ.data?.title ?? selectedKey}（v${latestQ.data?.version ?? '-'} 已发布）` : draftKey ?? ''}>
              <Tabs
                items={[
                  {
                    key: 'schema',
                    label: '字段设计',
                    children: (
                      <>
                        {isAdmin && (
                          <div style={{ marginBottom: 12 }}>
                            <Button size="small" type="primary" icon={<EditOutlined />} onClick={startEdit}>编辑草稿</Button>
                          </div>
                        )}
                        <Table size="small" rowKey="prop" dataSource={publishedFields} pagination={false} columns={fieldColumns(false)} />
                      </>
                    ),
                  },
                  {
                    key: 'publish',
                    label: '发布变更',
                    children: latestDraft ? (
                      <Space direction="vertical">
                        <Alert type="info" showIcon message={`存在未发布草稿 v${latestDraft.version}${latestDraft.changeNote ? `（${latestDraft.changeNote}）` : ''}`} />
                        <Button type="primary" onClick={() => openDiff(latestDraft.id, latestDraft.title || latestDraft.formKey, latestDraft.formKey)}>
                          查看变更并发布
                        </Button>
                      </Space>
                    ) : (
                      <Empty description="当前无待发布草稿" />
                    ),
                  },
                  {
                    key: 'nl',
                    label: '自然语言草稿',
                    children: (
                      <>
                        <Input.TextArea
                          rows={3}
                          value={nlText}
                          onChange={(e) => setNlText(e.target.value)}
                          placeholder='示例：加一个必填下拉字段"隐患等级"，选项：高/中/低，以及一个"整改照片"上传，最多6张'
                          disabled={!isAdmin}
                        />
                        <Space style={{ marginTop: 8 }}>
                          <Button disabled={!isAdmin || !nlText.trim()} loading={nlM.isPending} onClick={() => nlM.mutate(nlText.trim())}>
                            生成草稿
                          </Button>
                          {nlDraft && (
                            <Button type="primary" loading={saveDraftM.isPending} onClick={() => saveDraftM.mutate({ form_key: activeKey, fields: nlDraft.meta.fields, title: nlDraft.meta.title })}>
                              保存为草稿
                            </Button>
                          )}
                        </Space>
                        {nlDraft && (
                          <div style={{ marginTop: 12 }}>
                            <DiffCard diff={nlDraft.diff} />
                          </div>
                        )}
                      </>
                    ),
                  },
                  {
                    key: 'versions',
                    label: '版本历史',
                    children: (
                      <Table
                        size="small"
                        rowKey="id"
                        dataSource={versionsQ.data?.list ?? []}
                        pagination={{ pageSize: 8, hideOnSinglePage: true }}
                        columns={[
                          { title: '版本', dataIndex: 'version', width: 60, render: (v) => `v${v}` },
                          { title: '状态', dataIndex: 'status', width: 80, render: (s) => <Tag color={STATUS_TAG[s]?.color}>{STATUS_TAG[s]?.text ?? s}</Tag> },
                          { title: '变更说明', dataIndex: 'changeNote', render: (v) => v || '-' },
                          { title: '发布时间', dataIndex: 'publishedAt', width: 160, render: (v) => v || '-' },
                          {
                            title: '操作',
                            width: 150,
                            render: (_: any, m: FormMeta) => (
                              <Space size={4}>
                                <Button type="link" size="small" onClick={() => setViewMeta(m)}>查看</Button>
                                {m.status === 'draft' && isAdmin && (
                                  <Button type="link" size="small" onClick={() => openDiff(m.id, m.title || m.formKey, m.formKey)}>发布</Button>
                                )}
                              </Space>
                            ),
                          },
                        ]}
                      />
                    ),
                  },
                ]}
              />
            </Card>
          )}
        </Col>
      </Row>

      {/* 字段编辑 */}
      <FieldModal
        open={fieldModal.open}
        field={fieldModal.field}
        frozen={fieldModal.field !== null && frozenProps.has(fieldModal.field.prop)}
        onCancel={() => setFieldModal({ open: false, index: null, field: null })}
        onSave={saveField}
      />

      {/* 新建表单 */}
      <Modal title="新建表单" open={newFormModal} onOk={startNewForm} onCancel={() => setNewFormModal(false)} destroyOnClose>
        <Form form={newForm} layout="vertical">
          <Form.Item name="form_key" label="表单标识（英文 snake_case，发布后不可改）" rules={[{ required: true, pattern: /^[a-z][a-z0-9_]{1,63}$/, message: '小写字母开头，2-64 位' }]}>
            <Input placeholder="如 site_patrol" />
          </Form.Item>
          <Form.Item name="title" label="表单标题" rules={[{ required: true, max: 64 }]}>
            <Input placeholder="如 基站巡检单" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 发布确认卡 + 执行发布 */}
      <Modal
        title="发布确认"
        open={publishModal.open}
        onCancel={() => setPublishModal({ open: false, draftId: null, title: '' })}
        footer={null}
        width={560}
      >
        {diffData && <DiffCard diff={diffData} />}
        <Form form={publishForm} layout="vertical" style={{ marginTop: 16 }} onFinish={(v) => publishM.mutate({ id: publishModal.draftId!, note: v.change_note })}>
          <Form.Item name="change_note" label="变更说明（写入版本历史）">
            <Input placeholder="如：新增隐患等级与整改照片字段" />
          </Form.Item>
          <Space>
            <Button onClick={() => setPublishModal({ open: false, draftId: null, title: '' })}>再想想</Button>
            <Button type="primary" danger loading={publishM.isPending} htmlType="submit">确认发布</Button>
          </Space>
        </Form>
      </Modal>

      {/* 版本详情（只读） */}
      <Modal title={`v${viewMeta?.version} 字段定义`} open={!!viewMeta} onCancel={() => setViewMeta(null)} footer={null} width={720}>
        <Table
          size="small"
          rowKey="prop"
          dataSource={viewMeta?.fields ?? []}
          pagination={false}
          columns={[
            { title: '标识', dataIndex: 'prop' },
            { title: '名称', dataIndex: 'label' },
            { title: '类型', dataIndex: 'type', render: typeText },
            { title: '必填', dataIndex: 'required', render: (v) => (v ? '是' : '否') },
            { title: '选项', dataIndex: 'options', render: (o?: { label: string }[]) => o?.map((x) => x.label).join('、') || '-' },
          ]}
        />
      </Modal>
    </div>
  );
};

export default FormDesignerPage;

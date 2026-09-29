import React, { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import {
  AutoComplete,
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Radio,
  Cascader,
  Row,
  Col,
  Statistic,
  Typography,
  message,
  Empty,
  Switch,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DefaultOptionType } from 'antd/es/cascader';
import {
  PlusOutlined,
  SearchOutlined,
  SyncOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  AuditOutlined,
  CloseCircleOutlined,
  ScanOutlined,
  ExclamationCircleOutlined,
  ContainerOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  stocktakeService,
  type StocktakeOrder,
  type StocktakeStatus,
  type StocktakeType,
  type StocktakeScopeType,
  getStocktakeStatusText,
} from '../services/stocktakeService';
import {
  stocktakeEnhance,
  vendorCompanies,
  type StocktakeEnhanceMeta,
} from '../services/stocktakeEnhance';
import { api } from '../services/api';
import { warehouseService } from '../services/warehouseService';
import { categoryService } from '../services/categoryService';
import { useWarehouseStore } from '../store/warehouseStore';
import { useAuthStore } from '../store/authStore';
import { usePermission } from '../hooks/usePermission';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const STATUS_COLORS: Record<StocktakeStatus, string> = {
  draft: 'default',
  counting: 'processing',
  pending_review: 'warning',
  completed: 'success',
  cancelled: 'error',
};

const TYPE_TEXTS: Record<StocktakeType, string> = {
  full: '全盘',
  partial: '抽盘',
  dynamic: '动碰盘点',
};

const SCOPE_TEXTS: Record<StocktakeScopeType, string> = {
  all: '全仓',
  category: '按分类',
  location: '按库位',
};

/** 列表行 = 合并后的盘点单（后端单 + mock 单，带代维增强字段） */
type MergedOrder = StocktakeOrder & {
  vendor_name?: string;
  blind_flag?: 0 | 1;
  is_mock?: boolean;
};

interface StocktakeFormValues {
  warehouse_id?: number;
  vendor_id?: number;
  vendor_keeper?: string;
  cmcc_supervisor?: string;
  type: StocktakeType;
  scope_type: StocktakeScopeType;
  scope_value?: (string | number)[];
  notes?: string;
  /** 盲盘开关（Switch 布尔值；代维场景强制 1） */
  blind_flag?: boolean;
}

// 盘点仓库检索选择：名称/编码模糊过滤，下拉展示 名称+编码徽标，表单只存仓库 ID
const WarehouseAutoSelect: React.FC<{
  value?: number | string;
  onChange?: (v?: number) => void;
  warehouses: Array<{ id: number; name: string; code: string }>;
}> = ({ value, onChange, warehouses }) => {
  const [display, setDisplay] = useState('');
  const list = Array.isArray(warehouses) ? warehouses : [];
  const selected = list.find((w) => String(w.id) === String(value));
  return (
    <AutoComplete
      style={{ width: '100%' }}
      value={display || (selected ? `${selected.name}（${selected.code}）` : '')}
      placeholder="输入名称 / 编码检索仓库"
      allowClear
      options={list.map((w) => ({
        value: `${w.name}（${w.code}）`,
        warehouseId: w.id,
        label: (
          <Space>
            <span>{w.name}</span>
            <Tag>{w.code}</Tag>
          </Space>
        ),
      }))}
      filterOption={(input, option) =>
        String(option?.value ?? '').toLowerCase().includes(input.trim().toLowerCase())
      }
      onSearch={(kw) => {
        setDisplay(kw);
        // 重新检索时先清空已选仓库，避免展示串位
        if (value !== undefined) onChange?.(undefined);
      }}
      onSelect={(_v, option: { warehouseId: number }) => {
        onChange?.(option.warehouseId);
        setDisplay('');
      }}
      onChange={(v: any) => {
        // allowClear 清空时走这里
        if (v === '' || v === undefined) {
          setDisplay('');
          onChange?.(undefined);
        } else if (typeof v === 'string') {
          setDisplay(v);
        }
      }}
    />
  );
};

const StocktakePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentWarehouse } = useWarehouseStore();
  const user = useAuthStore((s) => s.user);
  const operator = user?.fullName || user?.username || '-';
  const { can } = usePermission();

  const [params, setParams] = useState({
    page: 1,
    limit: 10,
    order_number: '',
    warehouse_id: currentWarehouse?.id ? String(currentWarehouse.id) : '',
    status: '' as StocktakeStatus | '',
    type: '' as StocktakeType | '',
  });

  const [createVisible, setCreateVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<MergedOrder | null>(null);
  const [selectedMeta, setSelectedMeta] = useState<StocktakeEnhanceMeta | null>(null);
  const [cancelForm] = Form.useForm();
  const [cancelVisible, setCancelVisible] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
  const [createForm] = Form.useForm<StocktakeFormValues>();

  // 后端列表数据（服务端分页/筛选）
  const { data: listData, isLoading } = useQuery({
    queryKey: ['stocktakes', 'list', params],
    queryFn: async () => {
      const res = await stocktakeService.getStocktakes(params);
      return res.data.data;
    },
  });

  // 仓库选项
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses', 'active'],
    queryFn: async () => warehouseService.getActiveWarehouses(),
  });

  // 分类树（新建弹窗用）
  const { data: categoryTreeData } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: async () => categoryService.getCategoryTree(),
  });

  // 库位选项（新建弹窗用，按当前表单选择的仓库加载）
  const [locationWarehouseId, setLocationWarehouseId] = useState<number | undefined>(undefined);
  const { data: locationOptions } = useQuery({
    queryKey: ['locations', 'options', locationWarehouseId],
    queryFn: async () => {
      const res = await api.get('/locations/options', { params: { warehouse_id: locationWarehouseId } });
      return res.data.data as Array<{ id: number; code: string; warehouse_id: number }>;
    },
    enabled: !!locationWarehouseId,
  });

  // 后端单 + mock 单合并（增强层状态机；mock 单在客户端过滤）
  // TODO(backend): 状态流转（开始/驳回/完成）目前仅落增强层，后端落地后切换为透传
  const backendList: StocktakeOrder[] = listData?.list || [];
  const mergedList: MergedOrder[] = React.useMemo(
    () => stocktakeEnhance.mergeWithBackend(backendList),
    [listData]
  );
  const mockList = React.useMemo(() => {
    let rows = mergedList.filter((o) => o.is_mock);
    if (params.order_number) {
      rows = rows.filter((o) => o.order_number.includes(params.order_number));
    }
    if (params.warehouse_id) {
      rows = rows.filter((o) => String(o.warehouse_id) === params.warehouse_id);
    }
    if (params.status) {
      rows = rows.filter((o) => o.status === params.status);
    }
    if (params.type) {
      rows = rows.filter((o) => o.type === params.type);
    }
    return rows;
  }, [mergedList, params.order_number, params.warehouse_id, params.status, params.type]);

  const list: MergedOrder[] = React.useMemo(() => {
    const backendFiltered = params.status ? backendList.filter((o) => o.status === params.status) : backendList;
    return [...mockList, ...backendFiltered];
  }, [mockList, backendList, params.status]);

  const total = (listData?.pagination?.total || 0) + mockList.length;

  // 汇总统计（合并口径）
  const stats = React.useMemo(() => {
    const all = stocktakeEnhance.mergeWithBackend([]).concat(mergedList.filter((o) => !o.is_mock));
    const uniq = Array.from(new Set(all.map((o) => o.id))).map((id) => all.find((o) => o.id === id)!);
    return {
      counting: uniq.filter((o) => o.status === 'counting').length,
      pending_review: uniq.filter((o) => o.status === 'pending_review').length,
      completed: uniq.filter((o) => o.status === 'completed').length,
      diff_items: uniq.reduce((sum, o) => sum + (o.item_diff || 0), 0),
    };
  }, [mergedList]);

  // 创建（后端优先，失败 mock 兜底；同仓不可并存进行中盘点单）
  const createMutation = useMutation({
    mutationFn: async (values: StocktakeFormValues) => {
      const wid = values.warehouse_id;
      // 同仓进行中校验（含 mock 单；后端亦有同规则，这里统一前置拦截）
      const active = mergedList.find(
        (o) => o.warehouse_id === wid && ['draft', 'counting', 'pending_review'].includes(o.status)
      );
      if (active) {
        throw new Error(`该仓库已有进行中的盘点单（${active.order_number}），不可重复创建`);
      }

      const vendor = vendorCompanies.find((v) => v.id === values.vendor_id);
      const enhanceFields = {
        vendor_id: values.vendor_id,
        vendor_name: vendor?.name,
        vendor_keeper: values.vendor_keeper,
        cmcc_supervisor: values.cmcc_supervisor,
        blind_flag: 1 as const,
      };

      let scopeValue = '';
      if (values.scope_type === 'category' && values.scope_value?.length) {
        scopeValue = String(values.scope_value[values.scope_value.length - 1]);
      } else if (values.scope_type === 'location' && values.scope_value?.length) {
        scopeValue = String(values.scope_value[values.scope_value.length - 1]);
      }

      try {
        const res = await stocktakeService.createStocktake({
          warehouse_id: wid!,
          type: values.type,
          scope_type: values.scope_type,
          scope_value: scopeValue,
          notes: values.notes,
        });
        const order = res.data.data;
        stocktakeEnhance.registerBackendOrder(order.id, enhanceFields);
        return { order, isMock: false };
      } catch {
        // TODO(backend): 后端不可达时 mock 兜底创建（含代维字段）
        const warehouse = Array.isArray(warehousesData)
          ? warehousesData.find((w: any) => Number(w.id) === Number(wid))
          : undefined;
        const order = stocktakeEnhance.createMockOrder({
          warehouse_id: wid!,
          warehouse_name: warehouse?.name,
          type: values.type,
          scope_type: values.scope_type,
          scope_value: scopeValue,
          notes: values.notes,
          ...enhanceFields,
        });
        return { order, isMock: true };
      }
    },
    onSuccess: ({ isMock }) => {
      message.success(
        isMock
          ? '盘点单已创建（后端不可达，本地 mock 账面快照已生成）'
          : '盘点单已创建，账面快照已生成'
      );
      setCreateVisible(false);
      createForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['stocktakes'] });
    },
    onError: (error: any) => {
      message.error(error?.message || '创建失败');
    },
  });

  // 开始盘点（增强层：draft → counting，冻结语义）
  const startMutation = useMutation({
    mutationFn: async (id: number) => stocktakeEnhance.startCounting(id, operator),
    onSuccess: (_, id) => {
      message.success('盘点已开始，该仓库账面已冻结');
      queryClient.invalidateQueries({ queryKey: ['stocktakes'] });
      navigate(`/stocktakes/${id}/count`);
    },
    onError: (error: any) => {
      message.error(error?.message || '开始失败');
    },
  });

  // 取消（录原因）
  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) =>
      stocktakeEnhance.cancelOrder(id, reason, operator),
    onSuccess: () => {
      message.success('盘点单已取消');
      setCancelVisible(false);
      cancelForm.resetFields();
      setCancelTargetId(null);
      queryClient.invalidateQueries({ queryKey: ['stocktakes'] });
    },
    onError: (error: any) => {
      message.error(error?.message || '取消失败');
    },
  });

  const handleCreateSubmit = async () => {
    try {
      const values = await createForm.validateFields();
      createMutation.mutate(values);
    } catch {
      // 校验失败
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelTargetId) return;
    const values = await cancelForm.validateFields().catch(() => null);
    cancelMutation.mutate({ id: cancelTargetId, reason: values?.reason || '' });
  };

  const openCancel = (record: MergedOrder) => {
    setCancelTargetId(record.id);
    setCancelVisible(true);
  };

  const viewDetail = (record: MergedOrder) => {
    setSelectedOrder(record);
    setSelectedMeta(stocktakeEnhance.getMeta(record.id) ?? null);
    setDetailVisible(true);
  };

  const columns: ColumnsType<MergedOrder> = [
    {
      title: '盘点单号',
      dataIndex: 'order_number',
      key: 'order_number',
      width: 180,
      render: (text: string, record) => (
        <Space>
          <Text copyable={{ text }}>{text}</Text>
          {record.is_mock && <Tag color="violet">示例</Tag>}
        </Space>
      ),
    },
    {
      title: '仓库',
      dataIndex: 'warehouse_name',
      key: 'warehouse_name',
      width: 120,
    },
    {
      title: '代维公司',
      dataIndex: 'vendor_name',
      key: 'vendor_name',
      width: 130,
      render: (text: string) => text || '-',
    },
    {
      title: '盘点类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: StocktakeType) => TYPE_TEXTS[type] ?? type,
    },
    {
      title: '盘点范围',
      key: 'scope',
      width: 110,
      render: (_, record) => SCOPE_TEXTS[record.scope_type] ?? record.scope_type,
    },
    {
      title: '盲盘',
      key: 'blind',
      width: 80,
      render: (_, record) =>
        record.blind_flag ? (
          <Tooltip title="代维场景强制盲盘">
            <Tag icon={<EyeInvisibleOutlined />} color="cyan">
              盲盘
            </Tag>
          </Tooltip>
        ) : (
          <Tag>明盘</Tag>
        ),
    },
    {
      title: '账面/实盘/差异',
      key: 'qty',
      width: 180,
      render: (_, record) => (
        <Space>
          <Text>{record.total_snapshot_qty}</Text>
          <Text type="secondary">/</Text>
          <Text>{record.total_counted_qty || '-'}</Text>
          <Text type="secondary">/</Text>
          <Text
            type={
              Number(record.total_diff_qty || 0) > 0
                ? 'success'
                : Number(record.total_diff_qty || 0) < 0
                  ? 'danger'
                  : 'secondary'
            }
          >
            {record.total_diff_qty || '0'}
          </Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: StocktakeStatus, record) => (
        <Space size={4}>
          <Tag color={STATUS_COLORS[status]}>{getStocktakeStatusText(status)}</Tag>
          {selectedMetaHint(record)}
        </Space>
      ),
    },
    {
      title: '创建人/时间',
      key: 'created',
      width: 170,
      render: (_, record) => (
        <div>
          <div>{record.keeper_name || '-'}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{record.created_at}</div>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 230,
      fixed: 'right',
      render: (_, record) => {
        const canWrite = can('stocktake:write');
        const canPost = can('stocktake:post');
        return (
          <Space size="small">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => viewDetail(record)}>
              详情
            </Button>
            {record.status === 'draft' && canWrite && (
              <>
                <Button
                  type="link"
                  size="small"
                  icon={<PlayCircleOutlined />}
                  onClick={() => startMutation.mutate(record.id)}
                >
                  开始盘点
                </Button>
                <Button type="link" size="small" danger icon={<CloseCircleOutlined />} onClick={() => openCancel(record)}>
                  取消
                </Button>
              </>
            )}
            {record.status === 'counting' && canWrite && (
              <>
                <Button
                  type="link"
                  size="small"
                  icon={<ScanOutlined />}
                  onClick={() => navigate(`/stocktakes/${record.id}/count`)}
                >
                  盘点执行
                </Button>
                <Button type="link" size="small" danger icon={<CloseCircleOutlined />} onClick={() => openCancel(record)}>
                  取消
                </Button>
              </>
            )}
            {record.status === 'pending_review' && (
              <>
                <Button
                  type="link"
                  size="small"
                  icon={canPost ? <AuditOutlined /> : <EyeOutlined />}
                  onClick={() => navigate(`/stocktakes/${record.id}/count`)}
                >
                  {canPost ? '差异审核' : '查看差异'}
                </Button>
                {canWrite && (
                  <Button type="link" size="small" danger icon={<CloseCircleOutlined />} onClick={() => openCancel(record)}>
                    取消
                  </Button>
                )}
              </>
            )}
            {record.status === 'completed' && (
              <Button
                type="link"
                size="small"
                icon={<ContainerOutlined />}
                onClick={() => navigate(`/stocktakes/${record.id}/count`)}
              >
                查看明细
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  /** 曾驳回的单在状态旁给小提示 */
  function selectedMetaHint(record: MergedOrder) {
    const meta = stocktakeEnhance.getMeta(record.id);
    if (meta?.rejected_at) {
      return (
        <Tooltip title={`曾驳回：${meta.reject_notes || '-'}`}>
          <Tag color="volcano">驳回过</Tag>
        </Tooltip>
      );
    }
    return null;
  }

  // 分类 Cascader 选项
  const categoryCascaderOptions: DefaultOptionType[] = React.useMemo(() => {
    if (!Array.isArray(categoryTreeData)) return [];
    const map = (nodes: any[]): DefaultOptionType[] =>
      nodes.map((n) => ({
        value: n.id,
        label: n.name,
        children: n.children?.length ? map(n.children) : undefined,
      }));
    return map(categoryTreeData);
  }, [categoryTreeData]);

  // 库位 Select 选项
  const locationSelectOptions = React.useMemo(() => {
    return Array.isArray(locationOptions)
      ? locationOptions.map((loc) => ({ value: loc.id, label: loc.code }))
      : [];
  }, [locationOptions]);

  // 监听创建表单仓库变化，加载库位选项
  const watchWarehouse = Form.useWatch('warehouse_id', createForm);
  React.useEffect(() => {
    if (watchWarehouse) {
      setLocationWarehouseId(Number(watchWarehouse));
      createForm.setFieldValue('scope_value', undefined);
    }
  }, [watchWarehouse, createForm]);

  // 默认新建表单仓库为当前仓库
  React.useEffect(() => {
    if (createVisible && currentWarehouse?.id) {
      createForm.setFieldsValue({
        warehouse_id: currentWarehouse.id,
        type: 'full',
        scope_type: 'all',
        blind_flag: true,
      });
      setLocationWarehouseId(currentWarehouse.id);
    }
  }, [createVisible, currentWarehouse, createForm]);

  return (
    <div>
      <PageHeader title="库存盘点" sub="代维双签盲盘、差异审核自动生成盘盈/盘亏调整单" />

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="盘点中"
              value={stats.counting}
              prefix={<PlayCircleOutlined style={{ color: 'var(--cyan)' }} />}
              valueStyle={{ color: 'var(--cyan)' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待审核"
              value={stats.pending_review}
              prefix={<ExclamationCircleOutlined style={{ color: 'var(--amber)' }} />}
              valueStyle={{ color: 'var(--amber)' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="已完成"
              value={stats.completed}
              prefix={<CheckCircleOutlined style={{ color: 'var(--green)' }} />}
              valueStyle={{ color: 'var(--green)' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="累计差异行"
              value={stats.diff_items}
              prefix={<ContainerOutlined style={{ color: 'var(--violet)' }} />}
              valueStyle={{ color: 'var(--violet)' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 列表 */}
      <Card
        title="盘点单列表"
        extra={
          can('stocktake:write') && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateVisible(true)}>
              新建盘点单
            </Button>
          )
        }
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            placeholder="盘点单号"
            value={params.order_number}
            onChange={(e) => setParams((p) => ({ ...p, order_number: e.target.value, page: 1 }))}
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            placeholder="仓库"
            value={params.warehouse_id || undefined}
            onChange={(v) => setParams((p) => ({ ...p, warehouse_id: v, page: 1 }))}
            style={{ width: 180 }}
            allowClear
          >
            {Array.isArray(warehousesData)
              ? warehousesData.map((w: any) => (
                  <Option key={w.id} value={String(w.id)}>
                    <Space>
                      <span>{w.name}</span>
                      <Text type="secondary">{w.code}</Text>
                    </Space>
                  </Option>
                ))
              : null}
          </Select>
          <Select
            placeholder="状态"
            value={params.status || undefined}
            onChange={(v) => setParams((p) => ({ ...p, status: v, page: 1 }))}
            style={{ width: 140 }}
            allowClear
          >
            <Option value="draft">草稿</Option>
            <Option value="counting">盘点中</Option>
            <Option value="pending_review">待审核</Option>
            <Option value="completed">已完成</Option>
            <Option value="cancelled">已取消</Option>
          </Select>
          <Select
            placeholder="类型"
            value={params.type || undefined}
            onChange={(v) => setParams((p) => ({ ...p, type: v, page: 1 }))}
            style={{ width: 140 }}
            allowClear
          >
            <Option value="full">全盘</Option>
            <Option value="partial">抽盘</Option>
            <Option value="dynamic">动碰盘点</Option>
          </Select>
          <Button
            icon={<SyncOutlined />}
            onClick={() =>
              setParams({
                page: 1,
                limit: 10,
                order_number: '',
                warehouse_id: currentWarehouse?.id ? String(currentWarehouse.id) : '',
                status: '',
                type: '',
              })
            }
          >
            重置
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={list}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1300 }}
          pagination={{
            current: params.page,
            pageSize: params.limit,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (page, limit) => setParams((p) => ({ ...p, page, limit })),
          }}
          locale={{ emptyText: <Empty description="暂无盘点单" /> }}
        />
      </Card>

      {/* 新建盘点单 */}
      <Modal
        title="新建盘点单（移动+代维）"
        open={createVisible}
        onCancel={() => {
          setCreateVisible(false);
          createForm.resetFields();
        }}
        onOk={handleCreateSubmit}
        confirmLoading={createMutation.isPending}
        width={640}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" initialValues={{ type: 'full', scope_type: 'all', blind_flag: true }}>
          <Form.Item
            name="warehouse_id"
            label="盘点仓库"
            rules={[{ required: true, message: '请选择仓库' }]}
          >
            <WarehouseAutoSelect warehouses={Array.isArray(warehousesData) ? warehousesData : []} />
          </Form.Item>

          <Form.Item
            name="vendor_id"
            label="代维公司"
            rules={[{ required: true, message: '请选择代维公司' }]}
          >
            <Select placeholder="请选择代维公司" showSearch optionFilterProp="children">
              {vendorCompanies.map((v) => (
                <Option key={v.id} value={v.id}>
                  {v.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="vendor_keeper"
                label="代维负责人"
                rules={[{ required: true, message: '请输入代维负责人' }]}
              >
                <Input placeholder="代维公司盘点负责人" maxLength={50} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="cmcc_supervisor"
                label="移动主管"
                rules={[{ required: true, message: '请输入移动主管' }]}
              >
                <Input placeholder="移动方监盘主管" maxLength={50} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="blind_flag"
            label="盲盘开关"
            valuePropName="checked"
            tooltip="代维场景强制盲盘：执行页不显示账面数量，防止照抄账面"
          >
            <Switch checkedChildren="盲盘" unCheckedChildren="明盘" disabled defaultChecked />
          </Form.Item>

          <Form.Item name="type" label="盘点类型" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio.Button value="full">全盘</Radio.Button>
              <Radio.Button value="partial">抽盘</Radio.Button>
              <Radio.Button value="dynamic">动碰盘点</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="scope_type" label="盘点范围" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio.Button value="all">全仓</Radio.Button>
              <Radio.Button value="category">按分类</Radio.Button>
              <Radio.Button value="location">按库位</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.scope_type !== cur.scope_type}>
            {({ getFieldValue }) => {
              const scopeType = getFieldValue('scope_type');
              if (scopeType === 'category') {
                return (
                  <Form.Item
                    name="scope_value"
                    label="选择分类"
                    rules={[{ required: true, message: '请选择分类' }]}
                  >
                    <Cascader
                      options={categoryCascaderOptions}
                      placeholder="请选择分类（含子分类）"
                      changeOnSelect
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                );
              }
              if (scopeType === 'location') {
                return (
                  <Form.Item
                    name="scope_value"
                    label="选择库位"
                    rules={[{ required: true, message: '请选择库位' }]}
                  >
                    <Select
                      placeholder="请选择库位"
                      options={locationSelectOptions}
                      showSearch
                      optionFilterProp="label"
                      loading={!locationOptions && !!watchWarehouse}
                      disabled={!watchWarehouse}
                    />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item name="notes" label="备注">
            <TextArea rows={3} placeholder="可选：填写盘点说明等" maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="盘点单详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>,
        ]}
        width={720}
      >
        {selectedOrder && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <p>
                  <strong>盘点单号：</strong>
                  {selectedOrder.order_number}
                </p>
              </Col>
              <Col span={12}>
                <p>
                  <strong>状态：</strong>
                  <Tag color={STATUS_COLORS[selectedOrder.status]}>
                    {getStocktakeStatusText(selectedOrder.status)}
                  </Tag>
                </p>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <p>
                  <strong>仓库：</strong>
                  {selectedOrder.warehouse_name || '-'}
                </p>
              </Col>
              <Col span={12}>
                <p>
                  <strong>盘点类型：</strong>
                  {TYPE_TEXTS[selectedOrder.type]}
                </p>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <p>
                  <strong>盘点范围：</strong>
                  {SCOPE_TEXTS[selectedOrder.scope_type] || selectedOrder.scope_type}
                </p>
              </Col>
              <Col span={12}>
                <p>
                  <strong>账面快照时间：</strong>
                  {selectedOrder.snapshot_at || '-'}
                </p>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <p>
                  <strong>代维公司：</strong>
                  {selectedMeta?.vendor_name || selectedOrder.vendor_name || '-'}
                </p>
              </Col>
              <Col span={12}>
                <p>
                  <strong>盲盘：</strong>
                  {(selectedMeta?.blind_flag ?? selectedOrder.blind_flag) ? '盲盘（强制）' : '明盘'}
                </p>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <p>
                  <strong>代维负责人：</strong>
                  {selectedMeta?.vendor_keeper || '-'}
                </p>
              </Col>
              <Col span={12}>
                <p>
                  <strong>移动主管：</strong>
                  {selectedMeta?.cmcc_supervisor || '-'}
                </p>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <p>
                  <strong>代维负责人签字时间：</strong>
                  {selectedMeta?.keeper_sign_at || (
                    <Text type="warning">未签字</Text>
                  )}
                </p>
              </Col>
              <Col span={12}>
                <p>
                  <strong>移动主管签字时间：</strong>
                  {selectedMeta?.supervisor_sign_at || (
                    <Text type="warning">未签字</Text>
                  )}
                </p>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <p>
                  <strong>账面总数：</strong>
                  {selectedOrder.total_snapshot_qty}
                </p>
              </Col>
              <Col span={12}>
                <p>
                  <strong>实盘总数：</strong>
                  {selectedOrder.total_counted_qty || '-'}
                </p>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <p>
                  <strong>差异总数：</strong>
                  {selectedOrder.total_diff_qty || '0'}
                </p>
              </Col>
              <Col span={12}>
                <p>
                  <strong>调整单号：</strong>
                  {selectedMeta?.adjustment_number || selectedOrder.adjustment_number || '-'}
                </p>
              </Col>
            </Row>
            {selectedMeta?.reject_notes && (
              <Row>
                <Col span={24}>
                  <p>
                    <strong>驳回备注：</strong>
                    <Text type="danger">{selectedMeta.reject_notes}</Text>
                    （{selectedMeta.rejected_at}）
                  </p>
                </Col>
              </Row>
            )}
            {selectedMeta?.review_notes && (
              <Row>
                <Col span={24}>
                  <p>
                    <strong>审核备注：</strong>
                    {selectedMeta.review_notes}
                  </p>
                </Col>
              </Row>
            )}
            {selectedMeta?.cancel_reason && (
              <Row>
                <Col span={24}>
                  <p>
                    <strong>取消原因：</strong>
                    {selectedMeta.cancel_reason}
                  </p>
                </Col>
              </Row>
            )}
            {selectedOrder.notes && (
              <Row>
                <Col span={24}>
                  <p>
                    <strong>备注：</strong>
                    {selectedOrder.notes}
                  </p>
                </Col>
              </Row>
            )}
          </div>
        )}
      </Modal>

      {/* 取消确认弹窗 */}
      <Modal
        title="取消盘点单"
        open={cancelVisible}
        onCancel={() => {
          setCancelVisible(false);
          cancelForm.resetFields();
          setCancelTargetId(null);
        }}
        onOk={handleCancelSubmit}
        confirmLoading={cancelMutation.isPending}
      >
        <Form form={cancelForm} layout="vertical">
          <Form.Item name="reason" label="取消原因">
            <TextArea rows={3} placeholder="请填写取消原因" maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StocktakePage;

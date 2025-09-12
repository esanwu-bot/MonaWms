import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  InputNumber,
  message,
  Popconfirm,
  Tag,
  Tooltip,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CopyOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

// 数据类型定义




interface BOMFormData {
  bomCode: string;
  productId: number;
  version: string;
  description: string;
  status: string;
  items: {
    product_id: number;
    quantity: number;
    unit: string;
    notes: string;
  }[];
}

import {
  getBOMs,
  createBOM,
  updateBOM,
  deleteBOM,
  copyBOM,
  explodeBOM,
  type BOM,
  type CreateBOMRequest,
  type BOMListParams,
} from '../services/bomService';
import { productService } from '../services/productService';

const BOMPage: React.FC = () => {
  const [searchParams, setSearchParams] = useState({
    bom_code: '',
    product_id: undefined,
    status: '',
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isExplodeModalVisible, setIsExplodeModalVisible] = useState(false);
  const [editingBOM, setEditingBOM] = useState<BOM | null>(null);
  const [explodingBOM, setExplodingBOM] = useState<BOM | null>(null);
  const [explodeQuantity, setExplodeQuantity] = useState(1);
  const [explodeResult, setExplodeResult] = useState<any>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取BOM列表
  const { data: bomData, isLoading } = useQuery({
    queryKey: ['boms', searchParams],
    queryFn: () => getBOMs(searchParams),
  });

  // 获取产品列表
  const { data: productData } = useQuery({
    queryKey: ['products'],
    queryFn: () => productService.getProducts(),
  });

  // 创建BOM
  const createMutation = useMutation({
    mutationFn: createBOM,
    onSuccess: () => {
      message.success('BOM创建成功');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['boms'] });
    },
    onError: (error: any) => {
      message.error(error.message || 'BOM创建失败');
    },
  });

  // 更新BOM
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      updateBOM(id, data),
    onSuccess: () => {
      message.success('BOM更新成功');
      setIsModalVisible(false);
      setEditingBOM(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['boms'] });
    },
    onError: (error: any) => {
      message.error(error.message || 'BOM更新失败');
    },
  });

  // 删除BOM
  const deleteMutation = useMutation({
    mutationFn: deleteBOM,
    onSuccess: () => {
      message.success('BOM删除成功');
      queryClient.invalidateQueries({ queryKey: ['boms'] });
    },
    onError: (error: any) => {
      message.error(error.message || 'BOM删除失败');
    },
  });

  // 复制BOM
  const copyMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      copyBOM(id, data),
    onSuccess: () => {
      message.success('BOM复制成功');
      queryClient.invalidateQueries({ queryKey: ['boms'] });
    },
    onError: (error: any) => {
      message.error(error.message || 'BOM复制失败');
    },
  });

  // 展开BOM
  const explodeMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) =>
      explodeBOM(id, quantity),
    onSuccess: (data) => {
      setExplodeResult(data);
    },
    onError: (error: any) => {
      message.error(error.message || 'BOM展开失败');
    },
  });

  const columns: ColumnsType<BOM> = [
    {
      title: 'BOM编号',
      dataIndex: 'bom_code',
      key: 'bom_code',
      width: 150,
    },
    {
      title: '主产品',
      key: 'product',
      width: 200,
      render: (_, record) => (
        <div>
          <div>{record.product_name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.product_sku}
          </div>
        </div>
      ),
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 100,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {record.status_text}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(record)}
            />
          </Tooltip>
          <Tooltip title="展开BOM">
            <Button
              type="text"
              icon={<UnorderedListOutlined />}
              onClick={() => handleExplode(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个BOM吗？"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Tooltip title="删除">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleSearch = (value: string) => {
    setSearchParams(prev => ({ ...prev, bom_code: value }));
  };

  const handleAdd = () => {
    setEditingBOM(null);
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleEdit = (bom: BOM) => {
    setEditingBOM(bom);
    setIsModalVisible(true);
    form.setFieldsValue({
      bomCode: bom.bom_code,
      productId: bom.product_id,
      version: bom.version,
      description: bom.description,
      status: bom.status,
      items: [], // 实际应该从API获取BOM明细
    });
  };

  const handleCopy = (bom: BOM) => {
    Modal.confirm({
      title: '复制BOM',
      content: (
        <div>
          <p>确定要复制BOM "{bom.bom_code}" 吗？</p>
          <Input
            placeholder="新BOM编号"
            id="newBomCode"
            defaultValue={`${bom.bom_code}_COPY`}
          />
        </div>
      ),
      onOk: () => {
        const newBomCode = (document.getElementById('newBomCode') as HTMLInputElement)?.value;
        if (newBomCode) {
          copyMutation.mutate({
            id: bom.id,
            data: { bom_code: newBomCode, version: `${bom.version}_COPY` },
          });
        }
      },
    });
  };

  const handleExplode = (bom: BOM) => {
    setExplodingBOM(bom);
    setExplodeQuantity(1);
    setExplodeResult(null);
    setIsExplodeModalVisible(true);
  };

  const handleExplodeBOM = () => {
    if (explodingBOM) {
      explodeMutation.mutate({
        id: explodingBOM.id,
        quantity: explodeQuantity,
      });
    }
  };

  const handleSubmit = (values: BOMFormData) => {
    const data = {
      bom_code: values.bomCode,
      product_id: values.productId,
      version: values.version,
      description: values.description,
      status: values.status,
      items: values.items || [],
    };

    if (editingBOM) {
      updateMutation.mutate({ id: editingBOM.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const explodeColumns: ColumnsType<any> = [
    {
      title: '产品名称',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: 'SKU',
      dataIndex: 'product_sku',
      key: 'product_sku',
    },
    {
      title: '单位用量',
      dataIndex: 'unit_quantity',
      key: 'unit_quantity',
    },
    {
      title: '总需求量',
      dataIndex: 'total_quantity',
      key: 'total_quantity',
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
    },
  ];

  return (
    <div>
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Search
              placeholder="搜索BOM编号"
              allowClear
              onSearch={handleSearch}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择产品"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) =>
                setSearchParams(prev => ({ ...prev, product_id: value }))
              }
            >
              {productData?.data?.map((product: any) => (
                <Option key={product.id} value={product.id}>
                  {product.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="状态"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) =>
                setSearchParams(prev => ({ ...prev, status: value }))
              }
            >
              <Option value="active">激活</Option>
              <Option value="inactive">非激活</Option>
            </Select>
          </Col>
          <Col span={10}>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增BOM
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => queryClient.invalidateQueries({ queryKey: ['boms'] })}
              >
                刷新
              </Button>
            </Space>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={bomData?.data || []}
          loading={isLoading}
          rowKey="id"
          pagination={{
            total: bomData?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      {/* BOM编辑模态框 */}
      <Modal
        title={editingBOM ? '编辑BOM' : '新增BOM'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingBOM(null);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="BOM编号"
                name="bomCode"
                rules={[{ required: true, message: '请输入BOM编号' }]}
              >
                <Input placeholder="请输入BOM编号" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="主产品"
                name="productId"
                rules={[{ required: true, message: '请选择主产品' }]}
              >
                <Select placeholder="请选择主产品">
                  {productData?.data?.map((product: any) => (
                    <Option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="版本"
                name="version"
                rules={[{ required: true, message: '请输入版本' }]}
              >
                <Input placeholder="请输入版本" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="状态"
                name="status"
                initialValue="active"
              >
                <Select>
                  <Option value="active">激活</Option>
                  <Option value="inactive">非激活</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="描述"
            name="description"
          >
            <TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>

          <Divider>BOM明细</Divider>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Row key={key} gutter={16} align="middle">
                    <Col span={6}>
                      <Form.Item
                        {...restField}
                        name={[name, 'product_id']}
                        rules={[{ required: true, message: '请选择产品' }]}
                      >
                        <Select placeholder="选择产品">
                          {productData?.data?.map((product: any) => (
                            <Option key={product.id} value={product.id}>
                              {product.name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        rules={[{ required: true, message: '请输入数量' }]}
                      >
                        <InputNumber
                          min={0}
                          step={0.01}
                          placeholder="数量"
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...restField}
                        name={[name, 'unit']}
                      >
                        <Input placeholder="单位" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        {...restField}
                        name={[name, 'notes']}
                      >
                        <Input placeholder="备注" />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Button
                        type="text"
                        danger
                        onClick={() => remove(name)}
                      >
                        删除
                      </Button>
                    </Col>
                  </Row>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    添加明细
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingBOM ? '更新' : '创建'}
              </Button>
              <Button
                onClick={() => {
                  setIsModalVisible(false);
                  setEditingBOM(null);
                  form.resetFields();
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* BOM展开模态框 */}
      <Modal
        title={`展开BOM - ${explodingBOM?.bom_code}`}
        open={isExplodeModalVisible}
        onCancel={() => {
          setIsExplodeModalVisible(false);
          setExplodingBOM(null);
          setExplodeResult(null);
        }}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Space>
            <span>生产数量：</span>
            <InputNumber
              min={1}
              value={explodeQuantity}
              onChange={(value) => setExplodeQuantity(value || 1)}
            />
            <Button
              type="primary"
              onClick={handleExplodeBOM}
              loading={explodeMutation.isPending}
            >
              展开BOM
            </Button>
          </Space>
        </div>

        {explodeResult && (
          <div>
            <Divider>物料需求清单</Divider>
            <Table
              columns={explodeColumns}
              dataSource={explodeResult.items}
              pagination={false}
              size="small"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BOMPage;
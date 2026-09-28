import React, { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import {
  Card,
  Button,
  Input,
  Table,
  Tag,
  Tabs,
  Select,
  Space,
  Typography,
  Divider,
  Tooltip,
  message,
  Empty,
  Modal,
  Form,
  DatePicker,
  InputNumber,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Upload,
} from 'antd';
import {
  SearchOutlined,
  SyncOutlined,
  DownloadOutlined,
  EyeOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ImportOutlined,
  ExportOutlined,
  BarChartOutlined,
  CameraOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import {
  getWirelessSpareParts,
  createWirelessSparePart,
  updateWirelessSparePart,
  deleteWirelessSparePart,
  bulkImportWirelessSpareParts,
  exportWirelessSpareParts,
  getWirelessSparePartStats,
  type WirelessSparePart,
  type CreateWirelessSparePartRequest,
  type WirelessSparePartListParams,
} from '../services/wirelessSparePartService';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;
const { TextArea } = Input;

interface WirelessSparePartFormData {
  partName: string;
  model: string;
  serialNumber: string;
  type: string;
  quantity: number;
  operator: string;
  operationDate: dayjs.Dayjs;
  status: string;
  project: string;
  notes?: string;
}

const WirelessSparePartsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useState<WirelessSparePartListParams>({
    page: 1,
    limit: 15,
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WirelessSparePart | null>(null);
  const [activeTab, setActiveTab] = useState('list');
  const [barcodeUploading, setBarcodeUploading] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取无线备件列表
  const { data: partsData, isLoading } = useQuery({
    queryKey: ['wirelessSpareParts', searchParams],
    queryFn: () => getWirelessSpareParts(searchParams),
  });

  // 获取统计数据
  const { data: statsData } = useQuery({
    queryKey: ['wirelessSparePartStats'],
    queryFn: getWirelessSparePartStats,
  });

  // 创建无线备件记录
  const createMutation = useMutation({
    mutationFn: createWirelessSparePart,
    onSuccess: () => {
      message.success('记录创建成功');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['wirelessSpareParts'] });
      queryClient.invalidateQueries({ queryKey: ['wirelessSparePartStats'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '记录创建失败');
    },
  });

  // 更新无线备件记录
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      updateWirelessSparePart(id, data),
    onSuccess: () => {
      message.success('记录更新成功');
      setIsModalVisible(false);
      setEditingRecord(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['wirelessSpareParts'] });
      queryClient.invalidateQueries({ queryKey: ['wirelessSparePartStats'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '记录更新失败');
    },
  });

  // 删除无线备件记录
  const deleteMutation = useMutation({
    mutationFn: deleteWirelessSparePart,
    onSuccess: () => {
      message.success('记录删除成功');
      queryClient.invalidateQueries({ queryKey: ['wirelessSpareParts'] });
      queryClient.invalidateQueries({ queryKey: ['wirelessSparePartStats'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '记录删除失败');
    },
  });

  // 批量导入
  const importMutation = useMutation({
    mutationFn: bulkImportWirelessSpareParts,
    onSuccess: (result) => {
      message.success(
        `导入完成：成功 ${result.success_count} 条，失败 ${result.failure_count} 条`
      );
      setIsImportModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['wirelessSpareParts'] });
      queryClient.invalidateQueries({ queryKey: ['wirelessSparePartStats'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '批量导入失败');
    },
  });

  const columns: ColumnsType<WirelessSparePart> = [
    {
      title: '记录ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: '备件名称',
      dataIndex: 'part_name',
      key: 'part_name',
      width: 150,
      ellipsis: true,
    },
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model',
      width: 120,
    },
    {
      title: '序列号',
      dataIndex: 'serial_number',
      key: 'serial_number',
      width: 150,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text code copyable={{ text }}>
            {text}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => {
        const colors = {
          '5G': 'red',
          '4G': 'blue',
          '3G': 'green',
          '2G': 'orange',
          '其他': 'default',
        };
        return (
          <Tag color={colors[type as keyof typeof colors] || 'default'}>
            {type}
          </Tag>
        );
      },
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'center',
    },
    {
      title: '操作员',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
    },
    {
      title: '操作日期',
      dataIndex: 'operation_date',
      key: 'operation_date',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        const colors = {
          '入库': 'green',
          '出库': 'red',
          '调拨': 'blue',
          '盘点': 'orange',
        };
        return (
          <Tag color={colors[status as keyof typeof colors] || 'default'}>
            {status}
          </Tag>
        );
      },
    },
    {
      title: '项目',
      dataIndex: 'project',
      key: 'project',
      width: 150,
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这条记录吗？"
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

  const handleSearch = (field: string, value: string) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value,
      page: 1,
    }));
  };

  const handleTableChange = (pagination: any) => {
    setSearchParams(prev => ({
      ...prev,
      page: pagination.current,
      limit: pagination.pageSize,
    }));
  };

  const handleAdd = () => {
    setEditingRecord(null);
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleEdit = (record: WirelessSparePart) => {
    setEditingRecord(record);
    setIsModalVisible(true);
    form.setFieldsValue({
      partName: record.part_name,
      model: record.model,
      serialNumber: record.serial_number,
      type: record.type,
      quantity: record.quantity,
      operator: record.operator,
      operationDate: dayjs(record.operation_date),
      status: record.status,
      project: record.project,
      notes: record.notes,
    });
  };

  const handleView = (record: WirelessSparePart) => {
    Modal.info({
      title: '备件详情',
      width: 600,
      content: (
        <div>
          <Row gutter={16}>
            <Col span={12}>
              <p><strong>备件名称：</strong>{record.part_name}</p>
              <p><strong>型号：</strong>{record.model}</p>
              <p><strong>序列号：</strong>{record.serial_number}</p>
              <p><strong>类型：</strong>{record.type}</p>
              <p><strong>数量：</strong>{record.quantity}</p>
            </Col>
            <Col span={12}>
              <p><strong>操作员：</strong>{record.operator}</p>
              <p><strong>操作日期：</strong>{record.operation_date}</p>
              <p><strong>状态：</strong>{record.status}</p>
              <p><strong>项目：</strong>{record.project}</p>
              <p><strong>创建时间：</strong>{record.created_at}</p>
            </Col>
          </Row>
          {record.notes && (
            <div>
              <p><strong>备注：</strong></p>
              <p>{record.notes}</p>
            </div>
          )}
        </div>
      ),
    });
  };

  // 条码上传处理
  const handleBarcodeUpload = async (file: File) => {
    setBarcodeUploading(true);
    const formData = new FormData();
    formData.append('barcode_image', file);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/barcode/recognize`, {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.barcode) {
          // 自动填充识别到的条码到序列号输入框
          form.setFieldsValue({
            serialNumber: result.data.barcode
          });
          message.success('条码识别成功，已自动填充序列号');
        } else {
          message.error('未能识别到有效条码');
        }
      } else {
        message.error('条码识别失败');
      }
    } catch (error) {
      message.error('条码上传失败');
    } finally {
      setBarcodeUploading(false);
    }
    
    return false; // 阻止默认上传行为
  };

  const handleSubmit = (values: WirelessSparePartFormData) => {
    const data: CreateWirelessSparePartRequest = {
      part_name: values.partName,
      model: values.model,
      serial_number: values.serialNumber,
      type: values.type,
      quantity: values.quantity,
      operator: values.operator,
      operation_date: values.operationDate.format('YYYY-MM-DD'),
      status: values.status,
      project: values.project,
      notes: values.notes,
    };

    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportWirelessSpareParts(searchParams);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `wireless_spare_parts_${dayjs().format('YYYYMMDD')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    accept: '.xlsx,.xls',
    showUploadList: false,
    beforeUpload: (file) => {
      // 这里可以添加文件解析逻辑
      message.info('文件上传功能开发中');
      return false;
    },
  };

  // 统计卡片
  const renderStatsCards = () => {
    if (!statsData) return null;

    return (
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总记录数"
              value={statsData.total_count}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="入库记录"
              value={statsData.inbound_count}
              valueStyle={{ color: 'var(--green)' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="出库记录"
              value={statsData.outbound_count}
              valueStyle={{ color: 'var(--red)' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="类型数量"
              value={statsData.by_type?.length || 0}
              valueStyle={{ color: 'var(--cyan)' }}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  return (
    <div>
      <PageHeader title="无线备件登记表" sub="无线备件出入库记录，支持序列号追踪与项目关联" />
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'list',
              label: '记录列表',
              children: (
                <>
            {renderStatsCards()}

            {/* 搜索和操作区域 */}
            {/* 第一行：搜索字段 */}
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={5}>
                <Search
                  placeholder="搜索备件名称"
                  allowClear
                  onSearch={(value) => handleSearch('part_name', value)}
                />
              </Col>
              <Col span={5}>
                <Input
                  placeholder="搜索型号"
                  allowClear
                  onChange={(e) => handleSearch('model', e.target.value)}
                />
              </Col>
              <Col span={5}>
                <Input
                  placeholder="搜索序列号"
                  allowClear
                  onChange={(e) => handleSearch('serial_number', e.target.value)}
                />
              </Col>
              <Col span={4}>
                <Select
                  placeholder="类型"
                  allowClear
                  style={{ width: '100%' }}
                  onChange={(value) => handleSearch('type', value)}
                >
                  <Option value="5G">5G</Option>
                  <Option value="4G">4G</Option>
                  <Option value="3G">3G</Option>
                  <Option value="2G">2G</Option>
                  <Option value="其他">其他</Option>
                </Select>
              </Col>
              <Col span={5}>
                <Select
                  placeholder="状态"
                  allowClear
                  style={{ width: '100%' }}
                  onChange={(value) => handleSearch('status', value)}
                >
                  <Option value="入库">入库</Option>
                  <Option value="出库">出库</Option>
                  <Option value="调拨">调拨</Option>
                  <Option value="盘点">盘点</Option>
                </Select>
              </Col>
            </Row>
            
            {/* 第二行：操作按钮 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <Space>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                  >
                    新增记录
                  </Button>
                  <Button
                    icon={<ImportOutlined />}
                    onClick={() => setIsImportModalVisible(true)}
                  >
                    批量导入
                  </Button>
                  <Button
                    icon={<ExportOutlined />}
                    onClick={handleExport}
                  >
                    导出
                  </Button>
                  <Button
                    icon={<SyncOutlined />}
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['wirelessSpareParts'] })}
                  >
                    刷新
                  </Button>
                </Space>
              </Col>
            </Row>

            {/* 数据表格 */}
            <Table
              columns={columns}
              dataSource={partsData?.list || []}
              loading={isLoading}
              rowKey="id"
              scroll={{ x: 1200 }}
              pagination={{
                current: searchParams.page,
                pageSize: searchParams.limit,
                total: partsData?.pagination?.total || 0,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
              onChange={handleTableChange}
            />
                </>
              ),
            },
            {
              key: 'stats',
              label: '统计分析',
              children: (
                <>
            {statsData ? (
              <div>
                {renderStatsCards()}
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Card title="按类型统计" size="small">
                      {statsData.by_type?.map((item) => (
                        <div key={item.type} style={{ marginBottom: 8 }}>
                          <Tag color="blue">{item.type}</Tag>
                          <span style={{ marginLeft: 8 }}>{item.count} 条记录</span>
                        </div>
                      ))}
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="按项目统计" size="small">
                      {statsData.by_project?.slice(0, 10).map((item) => (
                        <div key={item.project} style={{ marginBottom: 8 }}>
                          <Text ellipsis style={{ width: 200, display: 'inline-block' }}>
                            {item.project}
                          </Text>
                          <span style={{ marginLeft: 8 }}>{item.count} 条记录</span>
                        </div>
                      ))}
                    </Card>
                  </Col>
                </Row>
              </div>
            ) : (
              <Empty description="暂无统计数据" />
            )}
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* 新增/编辑模态框 */}
      <Modal
        title={editingRecord ? '编辑记录' : '新增记录'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingRecord(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="备件名称"
                name="partName"
                rules={[{ required: true, message: '请输入备件名称' }]}
              >
                <Input placeholder="请输入备件名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="型号"
                name="model"
                rules={[{ required: true, message: '请输入型号' }]}
              >
                <Input placeholder="请输入型号" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="序列号"
                name="serialNumber"
                rules={[{ required: true, message: '请输入序列号' }]}
              >
                <Input.Group compact>
                  <Input 
                    placeholder="请输入序列号或上传条码图片" 
                    style={{ width: 'calc(100% - 40px)' }}
                  />
                  <Upload
                    accept="image/*"
                    showUploadList={false}
                    beforeUpload={handleBarcodeUpload}
                    disabled={barcodeUploading}
                  >
                    <Button 
                      icon={<CameraOutlined />} 
                      loading={barcodeUploading}
                      style={{ width: '40px' }}
                      title="上传条码图片"
                    />
                  </Upload>
                </Input.Group>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="类型"
                name="type"
                rules={[{ required: true, message: '请选择类型' }]}
              >
                <Select placeholder="请选择类型">
                  <Option value="5G">5G</Option>
                  <Option value="4G">4G</Option>
                  <Option value="3G">3G</Option>
                  <Option value="2G">2G</Option>
                  <Option value="其他">其他</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="数量"
                name="quantity"
                rules={[{ required: true, message: '请输入数量' }]}
              >
                <InputNumber
                  min={1}
                  placeholder="请输入数量"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="操作员"
                name="operator"
                rules={[{ required: true, message: '请输入操作员' }]}
              >
                <Input placeholder="请输入操作员" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="操作日期"
                name="operationDate"
                rules={[{ required: true, message: '请选择操作日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="状态"
                name="status"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="请选择状态">
                  <Option value="入库">入库</Option>
                  <Option value="出库">出库</Option>
                  <Option value="调拨">调拨</Option>
                  <Option value="盘点">盘点</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="项目"
                name="project"
                rules={[{ required: true, message: '请输入项目' }]}
              >
                <Input placeholder="请输入项目" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="备注"
            name="notes"
          >
            <TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingRecord ? '更新' : '创建'}
              </Button>
              <Button
                onClick={() => {
                  setIsModalVisible(false);
                  setEditingRecord(null);
                  form.resetFields();
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量导入模态框 */}
      <Modal
        title="批量导入"
        open={isImportModalVisible}
        onCancel={() => setIsImportModalVisible(false)}
        footer={null}
      >
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Upload {...uploadProps}>
            <Button icon={<ImportOutlined />} size="large">
              选择Excel文件
            </Button>
          </Upload>
          <div style={{ marginTop: 16, color: '#666' }}>
            <p>支持 .xlsx 和 .xls 格式</p>
            <p>请确保文件包含必要的列：备件名称、型号、序列号等</p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WirelessSparePartsPage;
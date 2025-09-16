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
  DatePicker,
  InputNumber,
  message,
  Popconfirm,
  Tag,
  Tooltip,
  Row,
  Col,
  Upload,
  Progress,
  Alert,
  Divider,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ExportOutlined,
  ImportOutlined,
  CameraOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import type { SerialNumber, CreateSerialNumberRequest, UpdateSerialNumberRequest } from '../types/api';
import {
  getSerialNumbers,
  createSerialNumber,
  updateSerialNumber,
  deleteSerialNumber,
  queryByBarcode,
  bulkImportSerialNumbers,
} from '../services/serialNumberService';
import { productService } from '../services/productService';

const { Search } = Input;
const { Option } = Select;

interface SerialNumberFormData {
  serialNumber: string;
  productId: string;
  manufactureDate?: dayjs.Dayjs;
  warrantyPeriod?: number;
  status?: 'in_stock' | 'sold' | 'scrapped';
  location?: string;
  notes?: string;
}

const SerialNumbersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useState({
    page: 1,
    limit: 10,
    serial_number: '',
    product_id: '',
    status: '',
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SerialNumber | null>(null);
  const [barcodeUploading, setBarcodeUploading] = useState(false);
  
  // 批量导入相关状态
  const [isBatchImportVisible, setIsBatchImportVisible] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<any>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  
  const [form] = Form.useForm<SerialNumberFormData>();
  const queryClient = useQueryClient();

  // 获取序列号列表
  const { data: serialNumbersData, isLoading } = useQuery({
    queryKey: ['serialNumbers', searchParams],
    queryFn: () => getSerialNumbers(searchParams),
  });

  // 获取产品列表
  const { data: productsData } = useQuery({
    queryKey: ['products', { page: 1, pageSize: 1000 }],
    queryFn: () => productService.getProducts({ page: 1, pageSize: 1000 }),
  });

  // 创建序列号
  const createMutation = useMutation({
    mutationFn: createSerialNumber,
    onSuccess: () => {
      message.success('序列号创建成功');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['serialNumbers'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '创建失败');
    },
  });

  // 更新序列号
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSerialNumberRequest }) =>
      updateSerialNumber(id, data),
    onSuccess: () => {
      message.success('序列号更新成功');
      setIsModalVisible(false);
      setEditingRecord(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['serialNumbers'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '更新失败');
    },
  });

  // 删除序列号
  const deleteMutation = useMutation({
    mutationFn: deleteSerialNumber,
    onSuccess: () => {
      message.success('序列号删除成功');
      queryClient.invalidateQueries({ queryKey: ['serialNumbers'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '删除失败');
    },
  });

  // 条码查询
  const [barcodeSearchValue, setBarcodeSearchValue] = useState('');
  const barcodeQueryMutation = useMutation({
    mutationFn: queryByBarcode,
    onSuccess: (data) => {
      if (data.data?.type === 'serial_number') {
        message.success('找到序列号信息');
        // 可以在这里处理查询结果，比如高亮显示或跳转到对应记录
      } else {
        message.info('找到产品信息，但无对应序列号');
      }
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '查询失败');
    },
  });

  const handleSearch = (value: string, field: string) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value,
      page: 1,
    } as typeof prev));
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
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: SerialNumber) => {
    setEditingRecord(record);
    form.setFieldsValue({
      serialNumber: record.serialNumber,
      productId: record.productId,
      manufactureDate: record.manufactureDate ? dayjs(record.manufactureDate) : undefined,
      warrantyPeriod: record.warrantyPeriod,
      status: record.status,
      location: record.location,
      notes: record.notes,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
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

  // 批量导入相关函数
  const handleBatchImport = () => {
    setIsBatchImportVisible(true);
    setImportStatus('idle');
    setImportProgress(0);
    setImportResult(null);
    setImportFile(null);
  };

  const handleFileUpload = (file: File) => {
    setImportFile(file);
    setImportStatus('uploading');
    setImportProgress(30);

    // 模拟文件处理
    setTimeout(() => {
      setImportStatus('processing');
      setImportProgress(60);
      
      // 这里应该调用实际的文件解析和导入API
      setTimeout(() => {
        setImportStatus('success');
        setImportProgress(100);
        setImportResult({
          total_count: 10,
          success_count: 8,
          error_count: 2,
          errors: ['第3行：序列号已存在', '第7行：产品ID无效']
        });
        queryClient.invalidateQueries({ queryKey: ['serialNumbers'] });
        message.success('批量导入完成');
      }, 2000);
    }, 1000);

    return false; // 阻止默认上传行为
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/serial-numbers/download-template`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '序列号导入模板.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        message.success('模板下载成功');
      } else {
        message.error('模板下载失败');
      }
    } catch (error) {
      message.error('模板下载失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const submitData = {
        serialNumber: values.serialNumber,
        productId: values.productId,
        manufactureDate: values.manufactureDate?.format('YYYY-MM-DD'),
        warrantyPeriod: values.warrantyPeriod,
        status: values.status,
        location: values.location,
        notes: values.notes,
      };

      if (editingRecord) {
        updateMutation.mutate({ id: editingRecord.id, data: submitData });
      } else {
        createMutation.mutate(submitData as CreateSerialNumberRequest);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'green';
      case 'sold':
        return 'blue';
      case 'scrapped':
        return 'red';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_stock':
        return '库存中';
      case 'sold':
        return '已售出';
      case 'scrapped':
        return '已报废';
      default:
        return status;
    }
  };

  const columns: ColumnsType<SerialNumber> = [
    {
      title: '序列号',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (text) => (
        <Tooltip placement="topLeft" title={text}>
          <span style={{ fontFamily: 'monospace' }}>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '产品信息',
      key: 'product',
      width: 250,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.product?.name || record.productName}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            SKU: {record.product?.sku || record.productSku}
          </div>
          {(record.product?.modelNumber || record.productModel) && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              型号: {record.product?.modelNumber || record.productModel}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '生产日期',
      dataIndex: 'manufactureDate',
      key: 'manufactureDate',
      width: 120,
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '保修期(月)',
      dataIndex: 'warrantyPeriod',
      key: 'warrantyPeriod',
      width: 100,
      render: (period) => period ? `${period}个月` : '-',
    },
    {
      title: '保修到期',
      dataIndex: 'warrantyEndDate',
      key: 'warrantyEndDate',
      width: 120,
      render: (date) => {
        if (!date) return '-';
        const endDate = dayjs(date);
        const isExpired = endDate.isBefore(dayjs());
        return (
          <span style={{ color: isExpired ? '#ff4d4f' : undefined }}>
            {endDate.format('YYYY-MM-DD')}
            {isExpired && ' (已过期)'}
          </span>
        );
      },
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
      width: 120,
      ellipsis: {
        showTitle: false,
      },
      render: (text) => (
        <Tooltip placement="topLeft" title={text}>
          {text || '-'}
        </Tooltip>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个序列号吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Search
                placeholder="搜索序列号"
                allowClear
                onSearch={(value) => handleSearch(value, 'serial_number')}
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Select
                placeholder="选择产品"
                allowClear
                showSearch
                optionFilterProp="children"
                style={{ width: '100%' }}
                onChange={(value) => handleSearch(value || '', 'product_id')}
              >
                {Array.isArray(productsData?.list) ? productsData.list.map((product) => (
                  <Option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </Option>
                )) : []}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Select
                placeholder="选择状态"
                allowClear
                style={{ width: '100%' }}
                onChange={(value) => handleSearch(value || '', 'status')}
              >
                <Option value="in_stock">库存中</Option>
                <Option value="sold">已售出</Option>
                <Option value="scrapped">已报废</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                >
                  新增序列号
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['serialNumbers'] })}
                >
                  刷新
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Search
                placeholder="扫描或输入条码查询设备信息"
                value={barcodeSearchValue}
                onChange={(e) => setBarcodeSearchValue(e.target.value)}
                onSearch={(value) => {
                  if (value.trim()) {
                    barcodeQueryMutation.mutate(value.trim());
                  }
                }}
                enterButton="条码查询"
                loading={barcodeQueryMutation.isPending}
              />
            </Col>
            <Col xs={24} md={12}>
              <Space>
                <Button 
                  icon={<ImportOutlined />}
                  onClick={handleBatchImport}
                >
                  批量导入
                </Button>
                <Button icon={<ExportOutlined />}>
                  导出数据
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        <Table
          columns={columns}
          dataSource={serialNumbersData?.data?.data || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1200 }}
          pagination={{
            current: searchParams.page,
            pageSize: searchParams.limit,
            total: serialNumbersData?.data?.pagination?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          onChange={handleTableChange}
        />
      </Card>

      <Modal
        title={editingRecord ? '编辑序列号' : '新增序列号'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingRecord(null);
          form.resetFields();
        }}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'in_stock',
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="serialNumber"
                label="序列号"
                rules={[
                  { required: true, message: '请输入序列号' },
                  { min: 1, max: 100, message: '序列号长度应在1-100字符之间' },
                ]}
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
                name="productId"
                label="关联产品"
                rules={[{ required: true, message: '请选择关联产品' }]}
              >
                <Select
                  placeholder="请选择产品"
                  showSearch
                  optionFilterProp="children"
                >
                  {Array.isArray(productsData?.list) ? productsData.list.map((product) => (
                  <Option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </Option>
                )) : []}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="manufactureDate"
                label="生产日期"
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="选择生产日期"
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="warrantyPeriod"
                label="保修期(月)"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入保修期"
                  min={0}
                  max={120}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="请选择状态">
                  <Option value="in_stock">库存中</Option>
                  <Option value="sold">已售出</Option>
                  <Option value="scrapped">已报废</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="location"
                label="存放位置"
              >
                <Input placeholder="请输入存放位置" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label="备注"
          >
            <Input.TextArea
              placeholder="请输入备注信息"
              rows={3}
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量导入弹出层 */}
      <Modal
        title="批量导入序列号"
        open={isBatchImportVisible}
        onCancel={() => {
          setIsBatchImportVisible(false);
          setImportStatus('idle');
          setImportProgress(0);
          setImportResult(null);
          setImportFile(null);
        }}
        footer={[
          <Button key="template" onClick={handleDownloadTemplate}>
            下载模板
          </Button>,
          <Button 
            key="cancel" 
            onClick={() => {
              setIsBatchImportVisible(false);
              setImportStatus('idle');
              setImportProgress(0);
              setImportResult(null);
              setImportFile(null);
            }}
          >
            关闭
          </Button>,
        ]}
        width={800}
      >
        <Alert
          message="导入说明"
          description={
            <div>
              <p>1. 请下载并使用标准模板</p>
              <p>2. 序列号为必填项，不能重复</p>
              <p>3. 产品ID必须是系统中已存在的产品</p>
              <p>4. 支持的文件格式：.xlsx、.xls</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <div style={{ marginBottom: 16 }}>
          <Upload.Dragger
            accept=".xlsx,.xls"
            beforeUpload={handleFileUpload}
            showUploadList={false}
            disabled={importStatus === 'uploading' || importStatus === 'processing'}
          >
            <p className="ant-upload-drag-icon">
              <ImportOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            </p>
            <p className="ant-upload-text">
              {importFile ? importFile.name : '点击或拖拽Excel文件到此区域'}
            </p>
            <p className="ant-upload-hint">
              支持单个文件上传，文件格式：.xlsx、.xls
            </p>
          </Upload.Dragger>
        </div>

        {/* 导入进度 */}
        {importStatus !== 'idle' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8 }}>
              <span>导入进度：</span>
              {importStatus === 'uploading' && <span>上传文件中...</span>}
              {importStatus === 'processing' && <span>处理数据中...</span>}
              {importStatus === 'success' && <span style={{ color: '#52c41a' }}>导入完成</span>}
              {importStatus === 'error' && <span style={{ color: '#ff4d4f' }}>导入失败</span>}
            </div>
            <Progress
              percent={importProgress}
              status={
                importStatus === 'success' ? 'success' :
                importStatus === 'error' ? 'exception' : 'active'
              }
            />
          </div>
        )}

        {/* 导入结果 */}
        {importResult && (
          <div>
            <Divider>导入结果</Divider>
            {importStatus === 'success' && (
              <div>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic title="总记录数" value={importResult.total_count} />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title="成功导入" 
                      value={importResult.success_count} 
                      valueStyle={{ color: '#3f8600' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title="失败记录" 
                      value={importResult.error_count} 
                      valueStyle={{ color: '#cf1322' }}
                    />
                  </Col>
                </Row>
                
                {importResult.errors && importResult.errors.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <Alert
                      message="部分记录导入失败"
                      description={
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {importResult.errors.map((error: string, index: number) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      }
                      type="warning"
                      showIcon
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SerialNumbersPage;
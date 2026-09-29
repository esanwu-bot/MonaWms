import React, { useState, useEffect } from 'react';
import PageHeader from '../components/ui/PageHeader';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  message,
  Popconfirm,
  Tag,
  Tooltip,
  Row,
  Col,
  Tabs,
  Statistic,
  Alert,
  Upload,
  Progress,
  Divider,
} from 'antd';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  EyeOutlined,
  ToolOutlined,
  ArrowLeftOutlined,
  CameraOutlined,
  UploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dictionaryService from '../services/dictionaryService';
import type { ColumnsType } from 'antd/es/table';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

// 数据类型定义
interface Device {
  id: number;
  device_code: string;
  device_name: string;
  device_type: string;
  model: string;
  brand: string;
  serial_number: string;
  status: string;
  status_text: string;
  location: string;
  purchase_date: string;
  warranty_period: number;
  warranty_end_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface DeviceFormData {
  deviceCode: string;
  deviceName: string;
  deviceType: string;
  model: string;
  brand: string;
  serialNumber: string;
  status: string;
  location: string;
  purchaseDate: string;
  warrantyPeriod: number;
  notes: string;
}

// 模拟数据和服务
const mockDevices: Device[] = [
  {
    id: 1,
    device_code: 'DEV-001',
    device_name: '5G基站设备',
    device_type: '基站设备',
    model: 'AAU5613',
    brand: '华为',
    serial_number: 'HW202401001',
    status: 'active',
    status_text: '正常运行',
    location: '机房A-01',
    purchase_date: '2024-01-15',
    warranty_period: 36,
    warranty_end_date: '2027-01-15',
    notes: '5G基站主设备',
    created_at: '2024-01-15 10:00:00',
    updated_at: '2024-01-15 10:00:00',
  },
  {
    id: 2,
    device_code: 'DEV-002',
    device_name: '光纤交换机',
    device_type: '网络设备',
    model: 'S5720-28X-SI',
    brand: '华为',
    serial_number: 'HW202401002',
    status: 'maintenance',
    status_text: '维护中',
    location: '机房B-02',
    purchase_date: '2024-01-10',
    warranty_period: 24,
    warranty_end_date: '2026-01-10',
    notes: '核心交换设备',
    created_at: '2024-01-10 14:00:00',
    updated_at: '2024-01-20 09:30:00',
  },
];

const deviceService = {
  getDevices: async (params: any) => ({
    data: mockDevices,
    total: mockDevices.length,
  }),
  createDevice: async (data: any) => ({ success: true }),
  updateDevice: async (id: number, data: any) => ({ success: true }),
  deleteDevice: async (id: number) => ({ success: true }),
  getDeviceStats: async () => ({
    total: 25,
    active: 20,
    maintenance: 3,
    inactive: 2,
  }),
};

const DevicesPage: React.FC = () => {
  const [urlSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState({
    device_name: '',
    device_type: '',
    status: '',
    location: '',
    warehouseId: '',
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [activeTab, setActiveTab] = useState('list');
  const [barcodeUploading, setBarcodeUploading] = useState(false);
  const [form] = Form.useForm();
  
  // 批量导入相关状态
  const [isBatchImportVisible, setIsBatchImportVisible] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [importResult, setImportResult] = useState<any>(null);
  const queryClient = useQueryClient();

  // 从URL参数获取仓库信息
  const warehouseId = urlSearchParams.get('warehouseId');
  const warehouseName = urlSearchParams.get('warehouseName');

  // 初始化时设置仓库过滤
  useEffect(() => {
    if (warehouseId) {
      setSearchParams(prev => ({
        ...prev,
        warehouseId: warehouseId
      }));
    }
  }, [warehouseId]);

  // 返回上一页
  const handleGoBack = () => {
    navigate(-1);
  };
  
  // 获取数据字典数据
  const { data: deviceTypesData } = useQuery({
    queryKey: ['dictionary-items-device-type'],
    queryFn: async () => {
      // 查找设备类型字典
      const typesResponse = await dictionaryService.getDictionaryTypes();
      const deviceTypeDict = typesResponse.data.find(type => type.code === 'device_type');
      if (deviceTypeDict) {
        const itemsResponse = await dictionaryService.getDictionaryItems(deviceTypeDict.id);
        return itemsResponse.data;
      }
      return [];
    },
  });
  
  const { data: deviceModelsData } = useQuery({
    queryKey: ['dictionary-items-device-model'],
    queryFn: async () => {
      // 查找设备型号字典
      const typesResponse = await dictionaryService.getDictionaryTypes();
      const deviceModelDict = typesResponse.data.find(type => type.code === 'device_model');
      if (deviceModelDict) {
        const itemsResponse = await dictionaryService.getDictionaryItems(deviceModelDict.id);
        return itemsResponse.data;
      }
      return [];
    },
  });
  
  const { data: deviceBrandsData } = useQuery({
    queryKey: ['dictionary-items-device-brand'],
    queryFn: async () => {
      // 查找设备品牌字典
      const typesResponse = await dictionaryService.getDictionaryTypes();
      const deviceBrandDict = typesResponse.data.find(type => type.code === 'device_brand');
      if (deviceBrandDict) {
        const itemsResponse = await dictionaryService.getDictionaryItems(deviceBrandDict.id);
        return itemsResponse.data;
      }
      return [];
    },
  });
  
  const { data: deviceStatusData } = useQuery({
    queryKey: ['dictionary-items-device-status'],
    queryFn: async () => {
      // 查找设备状态字典
      const typesResponse = await dictionaryService.getDictionaryTypes();
      const deviceStatusDict = typesResponse.data.find(type => type.code === 'device_status');
      if (deviceStatusDict) {
        const itemsResponse = await dictionaryService.getDictionaryItems(deviceStatusDict.id);
        return itemsResponse.data;
      }
      return [];
    },
  });

  // 获取设备列表
  const { data: devicesData, isLoading } = useQuery({
    queryKey: ['devices', searchParams],
    queryFn: () => deviceService.getDevices(searchParams),
  });

  // 获取统计数据
  const { data: statsData } = useQuery({
    queryKey: ['deviceStats'],
    queryFn: deviceService.getDeviceStats,
  });

  // 创建设备
  const createMutation = useMutation({
    mutationFn: deviceService.createDevice,
    onSuccess: () => {
      message.success('设备创建成功');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['deviceStats'] });
    },
    onError: () => {
      message.error('设备创建失败');
    },
  });

  // 更新设备
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      deviceService.updateDevice(id, data),
    onSuccess: () => {
      message.success('设备更新成功');
      setIsModalVisible(false);
      setEditingDevice(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['deviceStats'] });
    },
    onError: () => {
      message.error('设备更新失败');
    },
  });

  // 删除设备
  const deleteMutation = useMutation({
    mutationFn: deviceService.deleteDevice,
    onSuccess: () => {
      message.success('设备删除成功');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['deviceStats'] });
    },
    onError: () => {
      message.error('设备删除失败');
    },
  });

  const columns: ColumnsType<Device> = [
    {
      title: (
        <div style={{ textAlign: 'center', lineHeight: '1.2' }}>
          设备<br />编号
        </div>
      ),
      dataIndex: 'device_code',
      key: 'device_code',
      width: 120,
    },
    {
      title: (
        <div style={{ textAlign: 'center', lineHeight: '1.2' }}>
          设备<br />名称
        </div>
      ),
      dataIndex: 'device_name',
      key: 'device_name',
      width: 150,
    },
    {
      title: (
        <div style={{ textAlign: 'center', lineHeight: '1.2' }}>
          设备<br />类型
        </div>
      ),
      dataIndex: 'device_type',
      key: 'device_type',
      width: 120,
    },
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model',
      width: 120,
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand',
      width: 100,
    },
    {
      title: '序列号',
      dataIndex: 'serial_number',
      key: 'serial_number',
      width: 150,
      render: (text: string) => (
        <Tooltip title={text}>
          <span style={{ fontFamily: 'monospace' }}>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record) => {
        const colors = {
          active: 'green',
          maintenance: 'orange',
          inactive: 'red',
        };
        return (
          <Tag color={colors[status as keyof typeof colors]}>
            {record.status_text}
          </Tag>
        );
      },
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
      width: 120,
    },
    {
      title: (
        <div style={{ textAlign: 'center', lineHeight: '1.2' }}>
          保修<br />期至
        </div>
      ),
      dataIndex: 'warranty_end_date',
      key: 'warranty_end_date',
      width: 120,
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
            title="确定要删除这个设备吗？"
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
    setSearchParams(prev => ({ ...prev, [field]: value }));
  };

  const handleAdd = () => {
    setEditingDevice(null);
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleEdit = (device: Device) => {
    setEditingDevice(device);
    setIsModalVisible(true);
    form.setFieldsValue({
      deviceCode: device.device_code,
      deviceName: device.device_name,
      deviceType: device.device_type,
      model: device.model,
      brand: device.brand,
      serialNumber: device.serial_number,
      status: device.status,
      location: device.location,
      purchaseDate: device.purchase_date,
      warrantyPeriod: device.warranty_period,
      notes: device.notes,
    });
  };

  const handleView = (device: Device) => {
    Modal.info({
      title: '设备详情',
      width: 600,
      content: (
        <div>
          <Row gutter={16}>
            <Col span={12}>
              <p><strong>设备编号：</strong>{device.device_code}</p>
              <p><strong>设备名称：</strong>{device.device_name}</p>
              <p><strong>设备类型：</strong>{device.device_type}</p>
              <p><strong>型号：</strong>{device.model}</p>
              <p><strong>品牌：</strong>{device.brand}</p>
              <p><strong>序列号：</strong>{device.serial_number}</p>
            </Col>
            <Col span={12}>
              <p><strong>状态：</strong>{device.status_text}</p>
              <p><strong>位置：</strong>{device.location}</p>
              <p><strong>购买日期：</strong>{device.purchase_date}</p>
              <p><strong>保修期：</strong>{device.warranty_period}个月</p>
              <p><strong>保修期至：</strong>{device.warranty_end_date}</p>
              <p><strong>创建时间：</strong>{device.created_at}</p>
            </Col>
          </Row>
          {device.notes && (
            <div>
              <p><strong>备注：</strong></p>
              <p>{device.notes}</p>
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

  // 批量导入相关函数
  const handleBatchImport = () => {
    setIsBatchImportVisible(true);
    setImportStatus('idle');
    setImportProgress(0);
    setImportResult(null);
    setImportFile(null);
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/devices/download-template`, {
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
        a.download = '设备导入模板.xlsx';
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

  const handleFileUpload = (file: File) => {
    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                   file.type === 'application/vnd.ms-excel';
    if (!isExcel) {
      message.error('只能上传Excel文件！');
      return false;
    }
    
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('文件大小不能超过10MB！');
      return false;
    }
    
    setImportFile(file);
    return false;
  };

  const handleImportSubmit = async () => {
    if (!importFile) {
      message.error('请选择要导入的文件');
      return;
    }

    setImportStatus('uploading');
    setImportProgress(30);

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/devices/batch-import`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      setImportProgress(70);
      setImportStatus('processing');

      const result = await response.json();
      
      setImportProgress(100);
      
      if (response.ok && result.success) {
        setImportStatus('success');
        setImportResult(result.data);
        message.success(`导入成功！成功导入 ${result.data.success_count} 条记录`);
        
        // 刷新设备列表
        queryClient.invalidateQueries({ queryKey: ['devices'] });
      } else {
        setImportStatus('error');
        setImportResult(result);
        message.error(result.message || '导入失败');
      }
    } catch (error) {
      setImportStatus('error');
      setImportResult({ message: '网络错误，请重试' });
      message.error('导入失败，请重试');
    }
  };

  const resetImportModal = () => {
    setIsBatchImportVisible(false);
    setImportFile(null);
    setImportProgress(0);
    setImportStatus('idle');
    setImportResult(null);
  };

  const handleSubmit = (values: DeviceFormData) => {
    const data = {
      device_code: values.deviceCode,
      device_name: values.deviceName,
      device_type: values.deviceType,
      model: values.model,
      brand: values.brand,
      serial_number: values.serialNumber,
      status: values.status,
      location: values.location,
      purchase_date: values.purchaseDate,
      warranty_period: values.warrantyPeriod,
      notes: values.notes,
    };

    if (editingDevice) {
      updateMutation.mutate({ id: editingDevice.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // 统计卡片
  const renderStatsCards = () => {
    if (!statsData) return null;

    return (
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="设备总数"
              value={statsData.total}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="正常运行"
              value={statsData.active}
              valueStyle={{ color: 'var(--green)' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="维护中"
              value={statsData.maintenance}
              valueStyle={{ color: 'var(--amber)' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="停用"
              value={statsData.inactive}
              valueStyle={{ color: 'var(--text-3)' }}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  return (
    <div>
      <PageHeader title="设备登记" sub="设备台账、状态跟踪与维保管理" />
      {/* G 项：模型已收敛——设备=按件计量的物资 + SN 单件记录，状态在序列号页维护 */}
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="设备已并入物资主数据（products）"
        description="单件设备的在库 / 正在用 / 返修中 / 待报废 / 已报废状态统一在「序列号管理」维护，本页仅保留台账查询。"
      />
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'list',
              label: '设备列表',
              children: (
                <>
            {warehouseName && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={handleGoBack}
                    style={{ padding: '4px 8px' }}
                  >
                    返回
                  </Button>
                  <span style={{ color: '#666', fontSize: '14px' }}>仓库管理</span>
                </div>
                <Alert
                  message={`当前筛选仓库: ${decodeURIComponent(warehouseName)}`}
                  type="info"
                  showIcon
                  closable
                  onClose={() => {
                    // 清除URL参数并重置过滤
                    window.history.replaceState({}, '', '/devices');
                    setSearchParams(prev => ({ ...prev, warehouseId: '' }));
                  }}
                />
              </div>
            )}
            
            {renderStatsCards()}

            {/* 搜索和操作区域 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={5}>
                <Search
                  placeholder="搜索设备名称"
                  allowClear
                  onSearch={(value) => handleSearch('device_name', value)}
                />
              </Col>
              <Col span={4}>
                <Select
                  placeholder="设备类型"
                  allowClear
                  style={{ width: '100%' }}
                  onChange={(value) => handleSearch('device_type', value)}
                >
                  {deviceTypesData?.map(item => (
                    <Option key={item.id} value={item.code}>{item.name}</Option>
                  ))}
                </Select>
              </Col>
              <Col span={3}>
                <Select
                  placeholder="状态"
                  allowClear
                  style={{ width: '100%' }}
                  onChange={(value) => handleSearch('status', value)}
                >
                  {deviceStatusData?.map(item => (
                    <Option key={item.id} value={item.code}>{item.name}</Option>
                  ))}
                </Select>
              </Col>
              <Col span={4}>
                <Input
                  placeholder="位置"
                  allowClear
                  onChange={(e) => handleSearch('location', e.target.value)}
                />
              </Col>
              <Col span={8}>
                <Space>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                  >
                    新增设备
                  </Button>
                  <Button
                    icon={<UploadOutlined />}
                    onClick={handleBatchImport}
                  >
                    批量导入
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={handleDownloadTemplate}
                  >
                    下载模板
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['devices'] })}
                  >
                    刷新
                  </Button>
                </Space>
              </Col>
            </Row>

            {/* 数据表格 */}
            <Table
              columns={columns}
              dataSource={devicesData?.data || []}
              loading={isLoading}
              rowKey="id"
              scroll={{ x: 1200 }}
              pagination={{
                total: devicesData?.total || 0,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* 新增/编辑模态框 */}
      <Modal
        title={editingDevice ? '编辑设备' : '新增设备'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingDevice(null);
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
                label="设备编号"
                name="deviceCode"
                rules={[{ required: true, message: '请输入设备编号' }]}
              >
                <Input placeholder="请输入设备编号" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="设备名称"
                name="deviceName"
                rules={[{ required: true, message: '请输入设备名称' }]}
              >
                <Input placeholder="请输入设备名称" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="设备类型"
                name="deviceType"
                rules={[{ required: true, message: '请选择设备类型' }]}
              >
                <Select placeholder="请选择设备类型">
                  {deviceTypesData?.map(item => (
                    <Option key={item.id} value={item.code}>{item.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="型号"
                name="model"
                rules={[{ required: true, message: '请选择型号' }]}
              >
                <Select placeholder="请选择型号">
                  {deviceModelsData?.map(item => (
                    <Option key={item.id} value={item.code}>{item.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="品牌"
                name="brand"
                rules={[{ required: true, message: '请选择品牌' }]}
              >
                <Select placeholder="请选择品牌">
                  {deviceBrandsData?.map(item => (
                    <Option key={item.id} value={item.code}>{item.name}</Option>
                  ))}
                </Select>
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
                label="状态"
                name="status"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="请选择状态">
                  {deviceStatusData?.map(item => (
                    <Option key={item.id} value={item.code}>{item.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="位置"
                name="location"
              >
                <Input placeholder="请输入位置" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="购买日期"
                name="purchaseDate"
              >
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="保修期(月)"
                name="warrantyPeriod"
              >
                <Input type="number" placeholder="保修期月数" />
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
                {editingDevice ? '更新' : '创建'}
              </Button>
              <Button
                onClick={() => {
                  setIsModalVisible(false);
                  setEditingDevice(null);
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
        title="批量导入设备"
        open={isBatchImportVisible}
        onCancel={resetImportModal}
        width={600}
        footer={[
          <Button key="cancel" onClick={resetImportModal}>
            取消
          </Button>,
          <Button
            key="download"
            icon={<DownloadOutlined />}
            onClick={handleDownloadTemplate}
          >
            下载模板
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={importStatus === 'uploading' || importStatus === 'processing'}
            disabled={!importFile || importStatus === 'success'}
            onClick={handleImportSubmit}
          >
            开始导入
          </Button>,
        ]}
      >
        <div>
          <Alert
            message="导入说明"
            description={
              <div>
                <p>1. 请先下载导入模板，按照模板格式填写设备信息</p>
                <p>2. 支持的文件格式：.xlsx、.xls</p>
                <p>3. 文件大小不能超过10MB</p>
                <p>4. 设备编号和序列号不能重复</p>
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
                <FileExcelOutlined style={{ fontSize: 48, color: '#1890ff' }} />
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
                          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                            {importResult.errors.map((error: any, index: number) => (
                              <div key={index} style={{ marginBottom: 4 }}>
                                第{error.row}行：{error.message}
                              </div>
                            ))}
                          </div>
                        }
                        type="warning"
                        showIcon
                      />
                    </div>
                  )}
                </div>
              )}
              
              {importStatus === 'error' && (
                <Alert
                  message="导入失败"
                  description={importResult.message || '未知错误'}
                  type="error"
                  showIcon
                />
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default DevicesPage;
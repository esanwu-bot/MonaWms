import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Row,
  Col,
  Statistic,
  Typography,
  message,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  EyeOutlined,
  AuditOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  scrapService, 
  type ScrapApplication, 
  type CreateScrapRequest,
  type AvailableDevice 
} from '../services/scrapService';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// 报废原因选项
const scrapReasons = [
  { value: 'damage', label: '设备损坏' },
  { value: 'obsolete', label: '技术淘汰' },
  { value: 'expired', label: '超期使用' },
  { value: 'other', label: '其他原因' },
];

// 状态标签配置
const statusConfig = {
  pending: { color: 'warning', text: '待审核' },
  approved: { color: 'success', text: '已审核' },
  completed: { color: 'processing', text: '已处理' },
};


const ScrapPage: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ScrapApplication | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取报废申请列表
  const { data: scrapData, isLoading } = useQuery({
    queryKey: ['scrapApplications'],
    queryFn: () => scrapService.getScrapApplications(),
  });

  // 获取统计数据
  const { data: statsData } = useQuery({
    queryKey: ['scrapStatistics'],
    queryFn: () => scrapService.getScrapStatistics(),
  });

  // 获取可报废设备列表
  const { data: devicesData } = useQuery({
    queryKey: ['availableDevices'],
    queryFn: () => scrapService.getAvailableDevices(),
  });

  const data = (scrapData?.data as any)?.list || [];
  const stats = (statsData?.data as any) || {
    pending: 0,
    approved: 0,
    completed: 0,
    totalEstimatedLoss: 0,
  };
  const devices = (devicesData?.data as any) || [];

  // 表格列定义
  const columns: ColumnsType<ScrapApplication> = [
    {
      title: '申请编号',
      dataIndex: 'scrapNumber',
      key: 'scrapNumber',
      width: 140,
    },
    {
      title: '设备信息',
      key: 'deviceInfo',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.deviceInfo.name}</div>
          <div style={{ color: '#666', fontSize: '12px' }}>
            SN: {record.deviceInfo.serialNumber}
          </div>
        </div>
      ),
    },
    {
      title: '报废原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 120,
    },
    {
      title: '申请人',
      key: 'applicant',
      width: 100,
      render: (_, record) => <span>{record.applicant.name}</span>,
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
    },
    {
      title: '预估损失',
      dataIndex: 'estimatedLoss',
      key: 'estimatedLoss',
      width: 120,
      render: (value) => `¥${value.toLocaleString()}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={statusConfig[status].color}>
          {statusConfig[status].text}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          {record.status === 'pending' && (
            <Popconfirm
              title="确认审核通过此报废申请？"
              onConfirm={() => handleApprove(record.id)}
              okText="确认"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                icon={<AuditOutlined />}
              >
                审核
              </Button>
            </Popconfirm>
          )}
          {record.status === 'approved' && (
            <Popconfirm
              title="确认处理此报废申请？"
              onConfirm={() => handleProcess(record.id)}
              okText="确认"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                icon={<ToolOutlined />}
              >
                处理
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 查看详情
  const handleViewDetail = (record: ScrapApplication) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  // 审核报废申请
  const approveMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      scrapService.approveScrapApplication(id, { action }),
    onSuccess: () => {
      message.success('审核操作成功');
      queryClient.invalidateQueries({ queryKey: ['scrapApplications'] });
      queryClient.invalidateQueries({ queryKey: ['scrapStatistics'] });
    },
    onError: () => {
      message.error('审核操作失败');
    },
  });

  // 处理报废申请
  const processMutation = useMutation({
    mutationFn: ({ id, actualLoss }: { id: string; actualLoss: number }) =>
      scrapService.processScrapApplication(id, { actualLoss }),
    onSuccess: () => {
      message.success('报废申请处理完成');
      queryClient.invalidateQueries({ queryKey: ['scrapApplications'] });
      queryClient.invalidateQueries({ queryKey: ['scrapStatistics'] });
    },
    onError: () => {
      message.error('处理操作失败');
    },
  });

  // 创建报废申请
  const createMutation = useMutation({
    mutationFn: (data: CreateScrapRequest) => scrapService.createScrapApplication(data),
    onSuccess: () => {
      message.success('报废申请提交成功');
      setModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['scrapApplications'] });
      queryClient.invalidateQueries({ queryKey: ['scrapStatistics'] });
      queryClient.invalidateQueries({ queryKey: ['availableDevices'] });
    },
    onError: () => {
      message.error('提交失败，请重试');
    },
  });

  // 审核通过
  const handleApprove = (id: string) => {
    approveMutation.mutate({ id, action: 'approve' });
  };

  // 处理报废
  const handleProcess = (id: string) => {
    // 这里可以添加一个输入实际损失金额的对话框
    // 暂时使用预估损失作为实际损失
    const record = (data as ScrapApplication[]).find(item => item.id === id);
    if (record) {
      processMutation.mutate({ id, actualLoss: record.estimatedLoss });
    }
  };

  // 提交新建申请
  const handleSubmit = (values: Record<string, unknown>) => {
    const selectedDevice = (devices as AvailableDevice[]).find((device: AvailableDevice) => device.value === values.deviceId);
    
    if (!selectedDevice) {
      message.error('请选择有效的设备');
      return;
    }

    const requestData: CreateScrapRequest = {
      deviceId: values.deviceId as number,
      reasonType: values.reasonType as 'damage' | 'obsolete' | 'expired' | 'other',
      description: values.description as string,
      estimatedLoss: values.estimatedLoss as number,
    };

    createMutation.mutate(requestData);
  };

  return (
    <div>
      <Title level={2}>报废管理</Title>
      
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="待审核报废"
              value={stats.pending}
              prefix={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已审核报废"
              value={stats.approved}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已处理报废"
              value={stats.completed}
              prefix={<DeleteOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="报废损失金额"
              value={stats.totalEstimatedLoss}
              prefix={<DollarOutlined style={{ color: '#f5222d' }} />}
              formatter={(value) => `¥${Number(value).toLocaleString()}`}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 报废申请列表 */}
      <Card
        title="报废申请列表"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalVisible(true)}
          >
            新建报废申请
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total: number) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      {/* 新建报废申请模态框 */}
      <Modal
        title="新建报废申请"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
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
          <Form.Item
            name="deviceId"
            label="设备选择"
            rules={[{ required: true, message: '请选择设备' }]}
          >
            <Select placeholder="请选择设备" showSearch>
              {(devices as AvailableDevice[]).map((device: AvailableDevice) => (
                <Option key={device.value} value={device.value}>
                  {device.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="reasonType"
            label="报废原因"
            rules={[{ required: true, message: '请选择报废原因' }]}
          >
            <Select placeholder="请选择报废原因">
              {scrapReasons.map(reason => (
                <Option key={reason.value} value={reason.value}>
                  {reason.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="详细说明"
            rules={[{ required: true, message: '请输入详细说明' }]}
          >
            <TextArea
              rows={4}
              placeholder="请详细描述报废原因..."
            />
          </Form.Item>

          <Form.Item
            name="estimatedLoss"
            label="预估损失金额"
            rules={[{ required: true, message: '请输入预估损失金额' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入预估损失金额"
              min={0}
              step={0.01}
              formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => parseFloat(value!.replace(/¥\s?|(,*)/g, '')) || 0}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                提交申请
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情查看模态框 */}
      <Modal
        title="报废申请详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {selectedRecord && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <p><strong>申请编号：</strong>{selectedRecord.scrapNumber}</p>
              </Col>
              <Col span={12}>
                <p><strong>申请时间：</strong>{selectedRecord.createdAt}</p>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <p><strong>设备名称：</strong>{selectedRecord.deviceInfo.name}</p>
              </Col>
              <Col span={12}>
                <p><strong>序列号：</strong>{selectedRecord.deviceInfo.serialNumber}</p>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <p><strong>报废原因：</strong>{selectedRecord.reason}</p>
              </Col>
              <Col span={12}>
                <p><strong>申请人：</strong>{selectedRecord.applicant.name}</p>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <p><strong>预估损失：</strong>¥{selectedRecord.estimatedLoss.toLocaleString()}</p>
              </Col>
              <Col span={12}>
                <p><strong>状态：</strong>
                  <Tag color={statusConfig[selectedRecord.status].color}>
                    {statusConfig[selectedRecord.status].text}
                  </Tag>
                </p>
              </Col>
            </Row>
            {selectedRecord.description && (
              <Row>
                <Col span={24}>
                  <p><strong>详细说明：</strong></p>
                  <p style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                    {selectedRecord.description}
                  </p>
                </Col>
              </Row>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ScrapPage;
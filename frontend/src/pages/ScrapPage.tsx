import React, { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
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
  Upload,
  Image,
} from 'antd';
import type { UploadFile } from 'antd/es/upload';
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
const statusConfig: Record<string, { color: string; text: string }> = {
  pending: { color: 'warning', text: '待审核' },
  approved: { color: 'success', text: '已审核' },
  rejected: { color: 'error', text: '已拒绝' },
  completed: { color: 'processing', text: '已处理' },
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace('/api', '');

const ScrapPage: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ScrapApplication | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
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

  // 服务层返回的是 axios 响应，业务数据在 response.data.data
  const data = (scrapData?.data?.data as any)?.list || [];
  const stats = (statsData?.data?.data as any) || {
    pending: 0,
    approved: 0,
    completed: 0,
    total_estimated_loss: 0,
  };
  const devices: AvailableDevice[] = Array.isArray(devicesData?.data?.data)
    ? (devicesData?.data?.data as AvailableDevice[])
    : [];

  // 表格列定义
  const columns: ColumnsType<ScrapApplication> = [
    {
      title: '申请编号',
      dataIndex: 'scrap_number',
      key: 'scrap_number',
      width: 140,
    },
    {
      title: '设备信息',
      key: 'deviceInfo',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.device_info?.name ?? '-'}</div>
          <div style={{ color: '#666', fontSize: '12px' }}>
            SN: {record.device_info?.serial_number ?? '-'}
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
      render: (_, record) => <span>{record.applicant?.name ?? '-'}</span>,
    },
    {
      title: '申请时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
    },
    {
      title: '预估损失',
      dataIndex: 'estimated_loss',
      key: 'estimated_loss',
      width: 120,
      render: (value) => `¥${Number(value ?? 0).toLocaleString()}`,
    },
    {
      title: '图片',
      key: 'images',
      width: 80,
      render: (_, record) =>
        record.images && record.images.length > 0 ? (
          <Tag color="blue">{record.images.length}张</Tag>
        ) : (
          '-'
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const cfg = statusConfig[status] ?? { color: 'default', text: status };
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      },
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
      setFileList([]);
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
      processMutation.mutate({ id, actualLoss: Number(record.estimated_loss ?? 0) });
    }
  };

  // 提交新建申请
  const handleSubmit = (values: Record<string, unknown>) => {
    const selectedDevice = (devices as AvailableDevice[]).find((device: AvailableDevice) => device.value === values.deviceId);

    if (!selectedDevice) {
      message.error('请选择有效的设备');
      return;
    }

    const images = fileList
      .map((file) => file.originFileObj)
      .filter(Boolean) as File[];

    const requestData: CreateScrapRequest = {
      deviceId: values.deviceId as number,
      reasonType: values.reasonType as 'damage' | 'obsolete' | 'expired' | 'other',
      description: values.description as string,
      estimatedLoss: values.estimatedLoss as number,
      images,
    };

    createMutation.mutate(requestData);
  };

  return (
    <div>
      <PageHeader title="报废管理" sub="报废申请、审批与残值处置全流程留痕" />
      
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="待审核报废"
              value={stats.pending}
              prefix={<ExclamationCircleOutlined style={{ color: 'var(--amber)' }} />}
              valueStyle={{ color: 'var(--amber)' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已审核报废"
              value={stats.approved}
              prefix={<CheckCircleOutlined style={{ color: 'var(--green)' }} />}
              valueStyle={{ color: 'var(--green)' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已处理报废"
              value={stats.completed}
              prefix={<DeleteOutlined style={{ color: 'var(--cyan)' }} />}
              valueStyle={{ color: 'var(--cyan)' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="报废损失金额"
              value={stats.total_estimated_loss}
              prefix={<DollarOutlined style={{ color: 'var(--red)' }} />}
              formatter={(value) => `¥${Number(value).toLocaleString()}`}
              valueStyle={{ color: 'var(--red)' }}
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
          setFileList([]);
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
              parser={(value) => value!.replace(/¥\s?|(,*)/g, '') as any}
            />
          </Form.Item>

          <Form.Item label="报废图片（最多 9 张，单张不超过 5MB）">
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={({ fileList: newFileList }) => setFileList(newFileList)}
              beforeUpload={() => false}
              accept="image/*"
              multiple
            >
              {fileList.length >= 9 ? null : (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>上传</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
                setFileList([]);
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
                <p><strong>申请编号：</strong>{selectedRecord.scrap_number}</p>
              </Col>
              <Col span={12}>
                <p><strong>申请时间：</strong>{selectedRecord.created_at}</p>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <p><strong>设备名称：</strong>{selectedRecord.device_info?.name ?? '-'}</p>
              </Col>
              <Col span={12}>
                <p><strong>序列号：</strong>{selectedRecord.device_info?.serial_number ?? '-'}</p>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <p><strong>报废原因：</strong>{selectedRecord.reason}</p>
              </Col>
              <Col span={12}>
                <p><strong>申请人：</strong>{selectedRecord.applicant?.name ?? '-'}</p>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <p><strong>预估损失：</strong>¥{Number(selectedRecord.estimated_loss ?? 0).toLocaleString()}</p>
              </Col>
              <Col span={12}>
                <p><strong>状态：</strong>
                  {(() => {
                    const cfg = statusConfig[selectedRecord.status] ?? { color: 'default', text: selectedRecord.status };
                    return <Tag color={cfg.color}>{cfg.text}</Tag>;
                  })()}
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
            {selectedRecord.images && selectedRecord.images.length > 0 && (
              <Row style={{ marginTop: 16 }}>
                <Col span={24}>
                  <p><strong>报废图片：</strong></p>
                  <Image.PreviewGroup>
                    <Space wrap>
                      {selectedRecord.images.map((url, idx) => (
                        <Image
                          key={idx}
                          src={`${API_BASE}${url}`}
                          alt="报废图片"
                          width={120}
                          style={{ borderRadius: 4, objectFit: 'cover' }}
                        />
                      ))}
                    </Space>
                  </Image.PreviewGroup>
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
import React, { useState } from 'react';
import { 
  Card, 
  Row,
  Col,
  Typography, 
  Avatar, 
  List, 
  Spin,
  Badge,
  Button,
  Table,
  Modal,
  Form,
  Select,
  Input,
  message
} from 'antd';
import { 
  BankOutlined,
  ShoppingCartOutlined, 
  RiseOutlined, 
  ExclamationCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  HomeOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../utils/queryClient';
import { api } from '../services/api';
import type { DashboardStats } from '../types/api';

const { Title, Text } = Typography;
import { theme } from 'antd';
const { useToken } = theme;

// 统计卡片组件
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend }) => {
  const { token } = useToken();
  
  return (
    <Card style={{ height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Text type="secondary">{title}</Text>
          <Title level={3} style={{ margin: '8px 0' }}>{value}</Title>
          {trend && (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
              {trend.value > 0 && (
                trend.isPositive ? (
                  <ArrowUpOutlined style={{ color: token.colorSuccess, marginRight: 4 }} />
                ) : (
                  <ArrowDownOutlined style={{ color: token.colorError, marginRight: 4 }} />
                )
              )}
              <Text style={{ color: trend.isPositive ? token.colorSuccess : token.colorError }}>
                {trend.value > 0 ? `${trend.value}%` : ''}
                {trend.label && ` ${trend.label}`}
              </Text>
            </div>
          )}
        </div>
        <Avatar 
          size="large" 
          icon={icon} 
          style={{ 
            backgroundColor: color,
            color: 'white',
            fontSize: 24
          }} 
        />
      </div>
    </Card>
  );
};

const DashboardPage: React.FC = () => {
  const { token } = useToken();
  const [isScrapModalVisible, setIsScrapModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [form] = Form.useForm();

  // 处理报废按钮点击
  const handleScrapClick = (record: any) => {
    setSelectedDevice(record);
    setIsScrapModalVisible(true);
  };

  // 处理报废确认
  const handleScrapConfirm = async () => {
    try {
      const values = await form.validateFields();
      console.log('报废申请数据:', {
        deviceId: selectedDevice?.deviceId,
        ...values
      });
      
      message.success('报废申请已提交');
      setIsScrapModalVisible(false);
      form.resetFields();
      setSelectedDevice(null);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 取消报废
  const handleScrapCancel = () => {
    setIsScrapModalVisible(false);
    form.resetFields();
    setSelectedDevice(null);
  };

  // 处理查看按钮点击
  const handleViewClick = (record: any) => {
    setSelectedDevice(record);
    setIsDetailModalVisible(true);
  };

  // 关闭设备详情模态框
  const handleDetailModalClose = () => {
    setIsDetailModalVisible(false);
    setSelectedDevice(null);
  };

  // 获取仪表盘统计数据
  const { data: stats, isLoading } = useQuery({
    queryKey: queryKeys.reports.dashboard(),
    queryFn: async () => {
      const response = await api.get<DashboardStats>('/reports/dashboard');
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%' }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        仪表盘
      </Title>

      {/* 库存概览统计卡片 */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <Title level={4}>库存概览</Title>
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="总设备数"
              value={stats?.stats?.total_products || 1258}
              icon={<ShoppingCartOutlined />}
              color={token.colorPrimary}
              trend={{ value: 5, isPositive: true, label: "较上月" }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="在库设备"
              value={stats?.stats?.total_inventory || 856}
              icon={<RiseOutlined />}
              color={token.colorSuccess}
              trend={{ value: 92, isPositive: true, label: "可用率" }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="本月入库"
              value={stats?.stats?.pending_inbound || 142}
              icon={<ShoppingCartOutlined />}
              color={token.colorInfo}
              trend={{ value: 12, isPositive: true, label: "较上月" }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="本月出库"
              value={stats?.stats?.pending_outbound || 98}
              icon={<ExclamationCircleOutlined />}
              color={token.colorWarning}
              trend={{ value: 3, isPositive: false, label: "较上月" }}
            />
          </Col>
        </Row>
      </Card>
      
      {/* 仓库状态统计卡片 */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <Title level={4}>仓库状态</Title>
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="总仓库数"
              value={stats?.stats?.total_warehouses || 6}
              icon={<HomeOutlined />}
              color={token.colorPrimary}
              trend={{ value: 0, isPositive: true, label: "正常运行" }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="主仓库容量"
              value="82%"
              icon={<BankOutlined />}
              color={token.colorWarning}
              trend={{ value: 0, isPositive: false, label: "接近饱和" }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="待处理事务"
              value={stats?.stats?.pending_inbound + stats?.stats?.pending_outbound || 12}
              icon={<ClockCircleOutlined />}
              color={token.colorInfo}
              trend={{ value: 0, isPositive: false, label: "需及时处理" }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="报废设备"
              value={stats?.stats?.low_stock_count || 24}
              icon={<WarningOutlined />}
              color={token.colorError}
              trend={{ value: 0, isPositive: false, label: "待处理" }}
            />
          </Col>
        </Row>
      </Card>

      {/* 设备列表表格 */}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={4}>设备列表</Title>
        </div>
        <Table 
          dataSource={[
            {
              key: '1',
              deviceId: 'DEV2024010001',
              deviceType: '5G基站',
              model: 'AAU5613',
              warehouse: '主仓库A区',
              status: 'in_stock'
            },
            {
              key: '2',
              deviceId: 'DEV2024010002',
              deviceType: '核心网设备',
              model: 'NE9000',
              warehouse: '主仓库B区',
              status: 'outbound'
            },
            {
              key: '3',
              deviceId: 'DEV2024010003',
              deviceType: '光传输设备',
              model: 'OTN9800',
              warehouse: '备用仓库',
              status: 'in_stock'
            },
            {
              key: '4',
              deviceId: 'DEV2023120015',
              deviceType: '路由器',
              model: 'AR6100',
              warehouse: '主仓库A区',
              status: 'scrap'
            }
          ]}
          columns={[
            {
              title: '设备编号',
              dataIndex: 'deviceId',
              key: 'deviceId',
            },
            {
              title: '设备类型',
              dataIndex: 'deviceType',
              key: 'deviceType',
            },
            {
              title: '型号',
              dataIndex: 'model',
              key: 'model',
            },
            {
              title: '所属仓库',
              dataIndex: 'warehouse',
              key: 'warehouse',
            },
            {
              title: '状态',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => {
                const statusMap = {
                  'in_stock': { text: '在库', color: 'green' },
                  'outbound': { text: '出库', color: 'blue' },
                  'scrap': { text: '报废', color: 'red' }
                };
                const statusInfo = statusMap[status as keyof typeof statusMap] || { text: status, color: 'default' };
                return <Badge color={statusInfo.color} text={statusInfo.text} />;
              }
            },
            {
              title: '操作',
              key: 'action',
              render: (_, record) => (
                <div>
                  <Button 
                    type="link" 
                    icon={<EyeOutlined />} 
                    size="small"
                    onClick={() => handleViewClick(record)}
                  >
                    查看
                  </Button>
                  {record.status !== 'scrap' && (
                    <Button 
                      type="link" 
                      icon={<DeleteOutlined />} 
                      danger 
                      size="small"
                      onClick={() => handleScrapClick(record)}
                    >
                      报废
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          pagination={{ pageSize: 4 }}
        />
      </Card>

      {/* 设备详情模态框 */}
      <Modal
        title="设备详情"
        open={isDetailModalVisible}
        onCancel={handleDetailModalClose}
        footer={[
          <Button key="close" onClick={handleDetailModalClose}>
            知道了
          </Button>
        ]}
        width={600}
      >
        {selectedDevice && (
          <div style={{ padding: '16px 0' }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <Text strong>设备编号：</Text>
                  <Text>{selectedDevice.deviceId}</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <Text strong>状态：</Text>
                  <Badge 
                    color={
                      selectedDevice.status === 'in_stock' ? 'green' :
                      selectedDevice.status === 'outbound' ? 'blue' : 'red'
                    } 
                    text={
                      selectedDevice.status === 'in_stock' ? '正常运行' :
                      selectedDevice.status === 'outbound' ? '出库' : '报废'
                    } 
                  />
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <Text strong>设备名称：</Text>
                  <Text>{selectedDevice.deviceType}设备</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <Text strong>位置：</Text>
                  <Text>机房A-01</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <Text strong>设备类型：</Text>
                  <Text>{selectedDevice.deviceType}</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <Text strong>购买日期：</Text>
                  <Text>2024-01-15</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <Text strong>型号：</Text>
                  <Text>{selectedDevice.model}</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <Text strong>保修期：</Text>
                  <Text>36个月</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <Text strong>品牌：</Text>
                  <Text>华为</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <Text strong>保修期至：</Text>
                  <Text>2027-01-15</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <Text strong>序列号：</Text>
                  <Text>HW{selectedDevice.deviceId}</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <Text strong>创建时间：</Text>
                  <Text>2024-01-15 10:00:00</Text>
                </div>
              </Col>
              <Col span={24}>
                <div style={{ marginBottom: 12 }}>
                  <Text strong>备注：</Text>
                </div>
                <div style={{ 
                  padding: '8px 12px', 
                  backgroundColor: '#f5f5f5', 
                  borderRadius: '4px',
                  minHeight: '60px'
                }}>
                  <Text>{selectedDevice.deviceType}设备</Text>
                </div>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* 报废确认模态框 */}
      <Modal
        title="设备报废确认"
        open={isScrapModalVisible}
        onOk={handleScrapConfirm}
        onCancel={handleScrapCancel}
        okText="确认报废"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要将设备 <strong>{selectedDevice?.deviceId}</strong> 标记为报废吗？</p>
        <Form form={form} layout="vertical">
          <Form.Item
            name="reason"
            label="报废原因"
            rules={[{ required: true, message: '请选择报废原因' }]}
          >
            <Select placeholder="请选择报废原因">
              <Select.Option value="设备老化">设备老化</Select.Option>
              <Select.Option value="技术淘汰">技术淘汰</Select.Option>
              <Select.Option value="损坏无法修复">损坏无法修复</Select.Option>
              <Select.Option value="其他原因">其他原因</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="remark"
            label="备注信息"
          >
            <Input.TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DashboardPage;
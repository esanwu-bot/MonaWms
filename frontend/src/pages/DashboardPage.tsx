import React from 'react';
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
  Table
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
                let color = '';
                let text = '';
                
                switch(status) {
                  case 'in_stock':
                    color = 'success';
                    text = '在库';
                    break;
                  case 'outbound':
                    color = 'warning';
                    text = '出库中';
                    break;
                  case 'scrap':
                    color = 'error';
                    text = '待报废';
                    break;
                  default:
                    color = 'default';
                    text = '未知';
                }
                
                return <Badge status={color as any} text={text} />;
              }
            },
            {
              title: '操作',
              key: 'action',
              render: (_: any, record: any) => (
                <>
                  <Button 
                    type="primary" 
                    size="small" 
                    icon={<EyeOutlined />}
                    style={{ marginRight: 8 }}
                  >
                    查看
                  </Button>
                  {record.status !== 'scrap' ? (
                    <Button 
                      danger 
                      size="small" 
                      icon={<DeleteOutlined />}
                    >
                      报废
                    </Button>
                  ) : (
                    <Button 
                      type="primary" 
                      size="small" 
                      style={{ backgroundColor: token.colorSuccess }}
                    >
                      确认
                    </Button>
                  )}
                </>
              ),
            },
          ]}
          pagination={{ pageSize: 4 }}
        />
      </Card>
    </div>
  );
};

export default DashboardPage;
import React from 'react';
import { 
  Card, 
  Row,
  Col,
  Typography, 
  Avatar, 
  List, 
  Spin, 
  Progress,
  Tag,
  Divider,
  Alert
} from 'antd';
import { 
  BankOutlined,
  ShoppingCartOutlined, 
  RiseOutlined, 
  ExclamationCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
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
              {trend.isPositive ? (
                <ArrowUpOutlined style={{ color: token.colorSuccess, marginRight: 4 }} />
              ) : (
                <ArrowDownOutlined style={{ color: token.colorError, marginRight: 4 }} />
              )}
              <Text style={{ color: trend.isPositive ? token.colorSuccess : token.colorError }}>
                {trend.value}%
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

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="仓库总数"
            value={stats?.stats?.total_warehouses || 0}
            icon={<BankOutlined />}
            color={token.colorPrimary}
            trend={{ value: 5.2, isPositive: true }}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="产品总数"
            value={stats?.stats?.total_products || 0}
            icon={<ShoppingCartOutlined />}
            color={token.colorSuccess}
            trend={{ value: 12.8, isPositive: true }}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="库存总量"
            value={stats?.stats?.total_inventory || 0}
            icon={<RiseOutlined />}
            color={token.colorInfo}
            trend={{ value: 8.1, isPositive: true }}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="低库存产品"
            value={stats?.stats?.low_stock_count || 0}
            icon={<ExclamationCircleOutlined />}
            color={token.colorWarning}
            trend={{ value: 2.3, isPositive: false }}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 待处理订单 */}
        <Col xs={24} md={12}>
          <Card style={{ height: '100%' }}>
            <Title level={5} style={{ marginBottom: 16 }}>
              待处理订单
            </Title>
            <Row gutter={16}>
              <Col span={12}>
                <Card 
                  bordered
                  style={{ 
                    textAlign: 'center',
                    backgroundColor: token.colorSuccessBg,
                    borderColor: token.colorSuccessBorder
                  }}
                >
                  <Title level={3} style={{ color: token.colorSuccess, marginBottom: 8 }}>
                    {stats?.stats?.pending_inbound || 0}
                  </Title>
                  <Text type="secondary">待入库订单</Text>
                </Card>
              </Col>
              <Col span={12}>
                <Card 
                  bordered
                  style={{ 
                    textAlign: 'center',
                    backgroundColor: token.colorPrimaryBg,
                    borderColor: token.colorPrimaryBorder
                  }}
                >
                  <Title level={3} style={{ color: token.colorPrimary, marginBottom: 8 }}>
                    {stats?.stats?.pending_outbound || 0}
                  </Title>
                  <Text type="secondary">待出库订单</Text>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 最近活动 */}
        <Col xs={24} md={12}>
          <Card style={{ height: '100%' }}>
            <Title level={5} style={{ marginBottom: 16 }}>
              最近活动
            </Title>
            <List
              style={{ maxHeight: 300, overflow: 'auto' }}
              dataSource={stats?.recent_transactions || []}
              renderItem={(item, index) => (
                <List.Item>
                  <List.Item.Meta
                    title={`交易记录 #${index + 1}`}
                    description="暂无详细信息"
                  />
                </List.Item>
              )}
              locale={{
                emptyText: (
                  <div style={{ textAlign: 'center', padding: 24 }}>
                    <Text type="secondary">暂无交易记录</Text>
                    <br />
                    <Text type="secondary">系统中还没有任何交易记录</Text>
                  </div>
                )
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
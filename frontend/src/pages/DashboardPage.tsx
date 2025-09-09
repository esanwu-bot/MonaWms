import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  useTheme,
  Avatar,
  Paper,
} from '@mui/material';
import {
  Warehouse,
  Inventory,
  TrendingUp,
  Warning,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../utils/queryClient';
import { api } from '../services/api';
import type { DashboardStats } from '../types/api';

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
  const theme = useTheme();
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 600 }}>
              {value}
            </Typography>
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUp
                  sx={{
                    fontSize: 16,
                    color: trend.isPositive ? theme.palette.success.main : theme.palette.error.main,
                    transform: trend.isPositive ? 'none' : 'rotate(180deg)',
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    color: trend.isPositive ? theme.palette.success.main : theme.palette.error.main,
                    ml: 0.5,
                  }}
                >
                  {trend.value}%
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar
            sx={{
              backgroundColor: color,
              width: 56,
              height: 56,
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
};



const DashboardPage: React.FC = () => {
  const theme = useTheme();

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
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        仪表盘
      </Typography>

      {/* 统计卡片 */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 4, width: '100%' }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="仓库总数"
            value={stats?.stats?.total_warehouses || 0}
            icon={<Warehouse />}
            color={theme.palette.primary.main}
            trend={{ value: 5.2, isPositive: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="产品总数"
            value={stats?.stats?.total_products || 0}
            icon={<Inventory />}
            color={theme.palette.success.main}
            trend={{ value: 12.8, isPositive: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="库存总量"
            value={stats?.stats?.total_inventory || 0}
            icon={<TrendingUp />}
            color={theme.palette.info.main}
            trend={{ value: 8.1, isPositive: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="低库存产品"
            value={stats?.stats?.low_stock_count || 0}
            icon={<Warning />}
            color={theme.palette.warning.main}
            trend={{ value: 2.3, isPositive: false }}
          />
        </Grid>
      </Grid>

      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ width: '100%' }}>
        {/* 待处理订单 */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                待处理订单
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      backgroundColor: theme.palette.success.light + '20',
                      border: `1px solid ${theme.palette.success.light}`,
                    }}
                  >
                    <Typography variant="h4" sx={{ color: theme.palette.success.main, fontWeight: 600 }}>
                      {stats?.stats?.pending_inbound || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      待入库订单
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      backgroundColor: theme.palette.primary.light + '20',
                      border: `1px solid ${theme.palette.primary.light}`,
                    }}
                  >
                    <Typography variant="h4" sx={{ color: theme.palette.primary.main, fontWeight: 600 }}>
                      {stats?.stats?.pending_outbound || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      待出库订单
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 最近活动 */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                最近活动
              </Typography>
              <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                {stats?.recent_transactions?.length ? (
                  stats.recent_transactions.map((transaction, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={`交易记录 #${index + 1}`}
                        secondary={`暂无详细信息`}
                      />
                    </ListItem>
                  ))
                ) : (
                  <ListItem>
                    <ListItemText
                      primary="暂无交易记录"
                      secondary="系统中还没有任何交易记录"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
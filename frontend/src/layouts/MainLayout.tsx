import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Warehouse,
  Inventory,
  Category,
  ShoppingCart,
  LocalShipping,
  Assessment,
  Settings,
  AccountCircle,
  Logout,
  Person,
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const drawerWidth = 240;

// 导航菜单项
const menuItems = [
  {
    text: '仪表盘',
    icon: <Dashboard />,
    path: '/dashboard',
  },
  {
    text: '仓库管理',
    icon: <Warehouse />,
    path: '/warehouses',
  },
  {
    text: '产品管理',
    icon: <Inventory />,
    path: '/products',
  },
  {
    text: '分类管理',
    icon: <Category />,
    path: '/categories',
  },
  {
    text: '库存管理',
    icon: <ShoppingCart />,
    path: '/inventory',
  },
  {
    text: '入库管理',
    icon: <LocalShipping />,
    path: '/inbound',
  },
  {
    text: '出库管理',
    icon: <LocalShipping />,
    path: '/outbound',
  },
  {
    text: '无线备件登记表',
    icon: <Inventory />,
    path: '/wireless-spare-parts',
  },
  // 报表分析菜单已隐藏
  // {
  //   text: '报表分析',
  //   icon: <Assessment />,
  //   path: '/reports',
  // },
  {
    text: '系统设置',
    icon: <Settings />,
    path: '/settings',
  },
];

const MainLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleProfileMenuClose();
    await logout();
    navigate('/login');
  };

  const handleProfile = () => {
    handleProfileMenuClose();
    navigate('/profile');
  };

  // 获取用户角色显示文本
  const getRoleText = (role: string) => {
    const roleMap: Record<string, string> = {
      ADMIN: '管理员',
      MANAGER: '经理',
      OPERATOR: '操作员',
      VIEWER: '查看者',
    };
    return roleMap[role] || role;
  };

  // 获取用户角色颜色
  const getRoleColor = (role: string) => {
    const colorMap: Record<string, 'primary' | 'secondary' | 'success' | 'warning'> = {
      ADMIN: 'primary',
      MANAGER: 'secondary',
      OPERATOR: 'success',
      VIEWER: 'warning',
    };
    return colorMap[role] || 'primary';
  };

  // 侧边栏内容
  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          MonaWMS
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={isActive}
                onClick={() => handleMenuClick(item.path)}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.primary.main + '20',
                    '& .MuiListItemIcon-root': {
                      color: theme.palette.primary.main,
                    },
                    '& .MuiListItemText-primary': {
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                    },
                  },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* 应用栏 */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            仓库管理系统
          </Typography>
          
          {/* 用户信息 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {user && (
              <>
                <Chip
                  label={getRoleText(user.role)}
                  color={getRoleColor(user.role)}
                  size="small"
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {user.fullName?.charAt(0) || user.username?.charAt(0) || 'U'}
                  </Avatar>
                  <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                    {user.fullName || user.username || '用户'}
                  </Typography>
                </Box>
                <IconButton
                  size="large"
                  aria-label="account of current user"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  onClick={handleProfileMenuOpen}
                  color="inherit"
                >
                  <AccountCircle />
                </IconButton>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* 用户菜单 */}
      <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
      >
        <MenuItem onClick={handleProfile}>
          <ListItemIcon>
            <Person fontSize="small" />
          </ListItemIcon>
          个人资料
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          退出登录
        </MenuItem>
      </Menu>

      {/* 侧边栏 */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        {/* 移动端抽屉 */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* 桌面端抽屉 */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* 主内容区域 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
          overflow: 'auto',
        }}
      >
        <Toolbar />
        <Box sx={{ maxWidth: '100%', width: '100%' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Chip,
  TextField,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Stack,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Refresh,
  FilterList,
  GetApp,
} from '@mui/icons-material';

// 模拟数据
const mockData = [
  {
    key: '1',
    id: 'ORD-2024-0001',
    partName: '5G基站射频模块',
    model: 'AAU5613',
    type: '5G',
    quantity: 2,
    operator: '张三',
    date: '2024-01-15',
    status: '出库',
    project: 'XX市5G三期建设',
  },
  {
    key: '2',
    id: 'ORD-2024-0002',
    partName: '4G光模块',
    model: 'SFP-1G',
    type: '4G',
    quantity: 5,
    operator: '李四',
    date: '2024-01-14',
    status: '入库',
    project: '日常维护',
  },
  {
    key: '3',
    id: 'ORD-2024-0003',
    partName: '5G天线',
    model: 'ANT4518R6v06',
    type: '5G',
    quantity: 3,
    operator: '王五',
    date: '2024-01-13',
    status: '出库',
    project: '农村5G覆盖工程',
  },
  {
    key: '4',
    id: 'ORD-2024-0004',
    partName: '4G基站主控板',
    model: 'BBU3900',
    type: '4G',
    quantity: 1,
    operator: '赵六',
    date: '2024-01-12',
    status: '入库',
    project: '设备升级',
  },
  {
    key: '5',
    id: 'ORD-2024-0005',
    partName: '5G核心网模块',
    model: 'UGW9811',
    type: '5G',
    quantity: 2,
    operator: '张三',
    date: '2024-01-11',
    status: '入库',
    project: '核心网扩容',
  },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const WirelessSparePartsPage: React.FC = () => {
  // 状态管理
  const [tabValue, setTabValue] = useState(0);
  const [filterType, setFilterType] = useState('全部');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // 处理标签页切换
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 处理类型筛选
  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterType(event.target.value);
    setPage(0); // 重置页码
  };

  // 处理搜索
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
  };

  // 处理页码变化
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // 处理每页行数变化
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // 筛选数据
  const filteredData = mockData.filter(item => {
    // 类型筛选
    if (filterType !== '全部' && item.type !== filterType) {
      return false;
    }
    // 搜索筛选
    if (searchText && !(
      item.id.toLowerCase().includes(searchText.toLowerCase()) ||
      item.partName.toLowerCase().includes(searchText.toLowerCase()) ||
      item.model.toLowerCase().includes(searchText.toLowerCase()) ||
      item.project.toLowerCase().includes(searchText.toLowerCase())
    )) {
      return false;
    }
    // 标签页筛选
    if (tabValue === 1 && item.status !== '入库') {
      return false;
    }
    if (tabValue === 2 && item.status !== '出库') {
      return false;
    }
    return true;
  });

  // 分页数据
  const paginatedData = filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        无线备件出入库登记表
      </Typography>

      <Card>
        <CardContent>
          {/* 标签页 */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="wireless spare parts tabs">
              <Tab label="全部记录" />
              <Tab label="入库记录" />
              <Tab label="出库记录" />
            </Tabs>
          </Box>

          {/* 筛选工具栏 */}
          <Box sx={{ my: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel id="type-filter-label">类型</InputLabel>
              <Select
                labelId="type-filter-label"
                value={filterType}
                label="类型"
                onChange={handleFilterChange}
                size="small"
              >
                <MenuItem value="全部">全部</MenuItem>
                <MenuItem value="5G">5G</MenuItem>
                <MenuItem value="4G">4G</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="搜索"
              variant="outlined"
              size="small"
              value={searchText}
              onChange={handleSearchChange}
              sx={{ minWidth: 200 }}
              InputProps={{
                startAdornment: <Search fontSize="small" sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />

            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => {
                setFilterType('全部');
                setSearchText('');
              }}
            >
              重置
            </Button>

            <Box sx={{ flexGrow: 1 }} />

            <Button
              variant="contained"
              startIcon={<GetApp />}
              color="primary"
            >
              导出数据
            </Button>
          </Box>

          {/* 表格内容 */}
          <TabPanel value={tabValue} index={0}>
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table sx={{ minWidth: 650 }} aria-label="wireless spare parts table">
                <TableHead>
                  <TableRow>
                    <TableCell>单据编号</TableCell>
                    <TableCell>备件名称</TableCell>
                    <TableCell>型号</TableCell>
                    <TableCell>类型</TableCell>
                    <TableCell align="right">数量</TableCell>
                    <TableCell>操作人</TableCell>
                    <TableCell>日期</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>关联项目</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.partName}</TableCell>
                      <TableCell>{row.model}</TableCell>
                      <TableCell>
                        <Chip 
                          label={row.type} 
                          color={row.type === '5G' ? 'success' : 'primary'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell align="right">{row.quantity}</TableCell>
                      <TableCell>{row.operator}</TableCell>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>
                        <Chip 
                          label={row.status} 
                          color={row.status === '入库' ? 'info' : 'warning'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{row.project}</TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="查看详情">
                            <IconButton size="small" color="primary">
                              <Search fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredData.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="每页行数:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count}`}
              />
            </TableContainer>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table sx={{ minWidth: 650 }} aria-label="wireless spare parts inbound table">
                <TableHead>
                  <TableRow>
                    <TableCell>单据编号</TableCell>
                    <TableCell>备件名称</TableCell>
                    <TableCell>型号</TableCell>
                    <TableCell>类型</TableCell>
                    <TableCell align="right">数量</TableCell>
                    <TableCell>操作人</TableCell>
                    <TableCell>日期</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>关联项目</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.partName}</TableCell>
                      <TableCell>{row.model}</TableCell>
                      <TableCell>
                        <Chip 
                          label={row.type} 
                          color={row.type === '5G' ? 'success' : 'primary'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell align="right">{row.quantity}</TableCell>
                      <TableCell>{row.operator}</TableCell>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>
                        <Chip 
                          label={row.status} 
                          color="info" 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{row.project}</TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="查看详情">
                            <IconButton size="small" color="primary">
                              <Search fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredData.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="每页行数:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count}`}
              />
            </TableContainer>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table sx={{ minWidth: 650 }} aria-label="wireless spare parts outbound table">
                <TableHead>
                  <TableRow>
                    <TableCell>单据编号</TableCell>
                    <TableCell>备件名称</TableCell>
                    <TableCell>型号</TableCell>
                    <TableCell>类型</TableCell>
                    <TableCell align="right">数量</TableCell>
                    <TableCell>操作人</TableCell>
                    <TableCell>日期</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>关联项目</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.partName}</TableCell>
                      <TableCell>{row.model}</TableCell>
                      <TableCell>
                        <Chip 
                          label={row.type} 
                          color={row.type === '5G' ? 'success' : 'primary'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell align="right">{row.quantity}</TableCell>
                      <TableCell>{row.operator}</TableCell>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>
                        <Chip 
                          label={row.status} 
                          color="warning" 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{row.project}</TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="查看详情">
                            <IconButton size="small" color="primary">
                              <Search fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredData.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="每页行数:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count}`}
              />
            </TableContainer>
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
};

export default WirelessSparePartsPage;
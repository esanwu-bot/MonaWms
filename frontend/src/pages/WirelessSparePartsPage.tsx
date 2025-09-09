import React, { useState } from 'react';
import {
  Card,
  Button,
  Input,
  Table,
  Tag,
  Tabs,
  Select,
  Space,
  Typography,
  Divider,
  Tooltip,
  Pagination,
  Form,
  message,
} from 'antd';
import {
  SearchOutlined,
  SyncOutlined,
  DownloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

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

const WirelessSparePartsPage: React.FC = () => {
  // 状态管理
  const [tabValue, setTabValue] = useState('1');
  const [filterType, setFilterType] = useState('全部');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 处理标签页切换
  const handleTabChange = (key: string) => {
    setTabValue(key);
    setPage(1); // 切换标签页时重置页码
  };

  // 处理类型筛选
  const handleFilterChange = (value: string) => {
    setFilterType(value);
    setPage(1); // 重置页码
  };

  // 处理搜索
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  // 处理分页变化
  const handlePageChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  };

  // 重置筛选条件
  const handleReset = () => {
    setFilterType('全部');
    setSearchText('');
    setPage(1);
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
    if (tabValue === '2' && item.status !== '入库') {
      return false;
    }
    if (tabValue === '3' && item.status !== '出库') {
      return false;
    }
    return true;
  });

  // 分页数据
  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);

  // 表格列定义
  const columns = [
    {
      title: '单据编号',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '备件名称',
      dataIndex: 'partName',
      key: 'partName',
    },
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === '5G' ? 'success' : 'blue'}>{type}</Tag>
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right' as const,
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === '入库' ? 'blue' : 'orange'}>{status}</Tag>
      ),
    },
    {
      title: '关联项目',
      dataIndex: 'project',
      key: 'project',
    },
    {
      title: '操作',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Tooltip title="查看详情">
          <Button type="text" icon={<EyeOutlined />} />
        </Tooltip>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>无线备件出入库登记表</Title>

      <Card>
        {/* 标签页 */}
        <Tabs activeKey={tabValue} onChange={handleTabChange}>
          <TabPane tab="全部记录" key="1" />
          <TabPane tab="入库记录" key="2" />
          <TabPane tab="出库记录" key="3" />
        </Tabs>

        {/* 筛选工具栏 */}
        <div style={{ margin: '16px 0', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Select
            value={filterType}
            onChange={handleFilterChange}
            style={{ width: 120 }}
          >
            <Option value="全部">全部</Option>
            <Option value="5G">5G</Option>
            <Option value="4G">4G</Option>
          </Select>

          <Input
            placeholder="搜索"
            value={searchText}
            onChange={handleSearchChange}
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
          />

          <Button
            icon={<SyncOutlined />}
            onClick={handleReset}
          >
            重置
          </Button>

          <div style={{ flex: 1 }} />

          <Button
            type="primary"
            icon={<DownloadOutlined />}
          >
            导出数据
          </Button>
        </div>

        {/* 表格内容 */}
        <Table
          columns={columns}
          dataSource={paginatedData}
          rowKey="key"
          pagination={{
            current: page,
            pageSize,
            total: filteredData.length,
            onChange: handlePageChange,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          locale={{
            emptyText: (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Text type="secondary">暂无数据</Text>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default WirelessSparePartsPage;
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
  message,
  Empty,
} from 'antd';
import {
  SearchOutlined,
  SyncOutlined,
  DownloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Option } = Select;

// 数据类型定义
interface WirelessPartRecord {
  key: string;
  id: string;
  partName: string;
  model: string;
  serialNumber: string;
  type: string;
  quantity: number;
  operator: string;
  date: string;
  status: string;
  project: string;
}

// 模拟数据
const mockData: WirelessPartRecord[] = [
  {
    key: '1',
    id: 'ORD-2024-0001',
    partName: '5G基站射频模块',
    model: 'AAU5613',
    serialNumber: 'SN202401150001',
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
    serialNumber: 'SN202401140002',
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
    serialNumber: 'SN202401130003',
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
    serialNumber: 'SN202401120004',
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
    serialNumber: 'SN202401110005',
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
  const [loading, setLoading] = useState(false);

  // 处理标签页切换
  const handleTabChange = (key: string) => {
    setTabValue(key);
  };

  // 处理类型筛选
  const handleFilterChange = (value: string) => {
    setFilterType(value);
  };

  // 处理搜索
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  // 重置筛选条件
  const handleReset = () => {
    setFilterType('全部');
    setSearchText('');
    message.success('筛选条件已重置');
  };

  // 导出数据
  const handleExport = () => {
    setLoading(true);
    // 模拟导出过程
    setTimeout(() => {
      setLoading(false);
      message.success('数据导出成功');
    }, 1000);
  };

  // 查看详情
  const handleViewDetail = (record: WirelessPartRecord) => {
    message.info(`查看 ${record.partName} 的详细信息`);
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
      item.serialNumber.toLowerCase().includes(searchText.toLowerCase()) ||
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

  // 表格列定义
  const columns: ColumnsType<WirelessPartRecord> = [
    {
      title: '单据编号',
      dataIndex: 'id',
      key: 'id',
      width: 140,
      fixed: 'left',
    },
    {
      title: '备件名称',
      dataIndex: 'partName',
      key: 'partName',
      width: 160,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <Tooltip placement="topLeft" title={text}>
          {text}
        </Tooltip>
      ),
    },
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model',
      width: 120,
    },
    {
      title: '序列号',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
      width: 140,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      align: 'center',
      render: (type: string) => (
        <Tag color={type === '5G' ? 'success' : 'processing'}>{type}</Tag>
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'right',
      render: (quantity: number) => (
        <Text strong>{quantity}</Text>
      ),
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      align: 'center',
      render: (status: string) => (
        <Tag color={status === '入库' ? 'blue' : 'orange'}>{status}</Tag>
      ),
    },
    {
      title: '关联项目',
      dataIndex: 'project',
      key: 'project',
      width: 160,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <Tooltip placement="topLeft" title={text}>
          {text}
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Tooltip title="查看详情">
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => handleViewDetail(record)}
          />
        </Tooltip>
      ),
    },
  ];

  const tabItems = [
    {
      key: '1',
      label: '全部记录',
    },
    {
      key: '2',
      label: '入库记录',
    },
    {
      key: '3',
      label: '出库记录',
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        无线备件出入库登记表
      </Title>

      <Card>
        {/* 标签页 */}
        <Tabs 
          activeKey={tabValue} 
          onChange={handleTabChange}
          items={tabItems}
        />

        <Divider style={{ margin: '16px 0' }} />

        {/* 筛选工具栏 */}
        <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Space wrap>
            <Select
              value={filterType}
              onChange={handleFilterChange}
              style={{ width: 120 }}
              placeholder="选择类型"
            >
              <Option value="全部">全部类型</Option>
              <Option value="5G">5G设备</Option>
              <Option value="4G">4G设备</Option>
            </Select>

            <Input
              placeholder="搜索单据号、备件名称、型号等"
              value={searchText}
              onChange={handleSearchChange}
              prefix={<SearchOutlined />}
              style={{ width: 280 }}
              allowClear
            />

            <Button
              icon={<SyncOutlined />}
              onClick={handleReset}
            >
              重置
            </Button>
          </Space>

          <Button
            type="primary"
            icon={<DownloadOutlined />}
            loading={loading}
            onClick={handleExport}
          >
            导出数据
          </Button>
        </Space>

        {/* 统计信息 */}
        <Space style={{ marginBottom: 16 }}>
          <Text type="secondary">
            共找到 <Text strong>{filteredData.length}</Text> 条记录
          </Text>
          {tabValue === '2' && (
            <Text type="secondary">
              | 入库总数: <Text strong>{filteredData.reduce((sum, item) => sum + item.quantity, 0)}</Text> 件
            </Text>
          )}
          {tabValue === '3' && (
            <Text type="secondary">
              | 出库总数: <Text strong>{filteredData.reduce((sum, item) => sum + item.quantity, 0)}</Text> 件
            </Text>
          )}
        </Space>

        {/* 表格内容 */}
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="key"
          scroll={{ x: 1200 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
            defaultPageSize: 10,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无数据"
              />
            ),
          }}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default WirelessSparePartsPage;
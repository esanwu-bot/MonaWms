import React, { useState, useEffect } from 'react';
import PageHeader from '../components/ui/PageHeader';
import {
  Card, Table, Button, Space, Modal, Form, Input, Select, Tabs,
  Typography, Divider, message, Popconfirm, Tag, Row, Col
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  ReloadOutlined, SettingOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dictionaryService, { type DictionaryType, type DictionaryItem } from '../services/dictionaryService';

const { Title, Text } = Typography;
const { Option } = Select;

// 模拟数据 - 仅在API未实现时使用
const mockDictionaryTypes: DictionaryType[] = [
  { id: 1, code: 'device_type', name: '设备类型', status: 'active' },
  { id: 2, code: 'device_model', name: '设备型号', status: 'active' },
  { id: 3, code: 'device_brand', name: '设备品牌', status: 'active' },
  { id: 4, code: 'device_status', name: '设备状态', status: 'active' },
];

const mockDictionaryItems: DictionaryItem[] = [
  { id: 1, type_id: 1, type_code: 'device_type', code: '5g-base', name: '5G基站', sort_order: 1, status: 'active' },
  { id: 2, type_id: 1, type_code: 'device_type', code: 'core-network', name: '核心网设备', sort_order: 2, status: 'active' },
  { id: 3, type_id: 1, type_code: 'device_type', code: 'optical', name: '光传输设备', sort_order: 3, status: 'active' },
  { id: 4, type_id: 1, type_code: 'device_type', code: 'router', name: '路由器', sort_order: 4, status: 'active' },
  { id: 5, type_id: 1, type_code: 'device_type', code: 'switch', name: '交换机', sort_order: 5, status: 'active' },
  { id: 6, type_id: 2, type_code: 'device_model', code: 'model-a1', name: 'Model A1', sort_order: 1, status: 'active' },
  { id: 7, type_id: 2, type_code: 'device_model', code: 'model-b2', name: 'Model B2', sort_order: 2, status: 'active' },
  { id: 8, type_id: 3, type_code: 'device_brand', code: 'huawei', name: '华为', sort_order: 1, status: 'active' },
  { id: 9, type_id: 3, type_code: 'device_brand', code: 'zte', name: '中兴', sort_order: 2, status: 'active' },
  { id: 10, type_id: 4, type_code: 'device_status', code: 'normal', name: '正常', sort_order: 1, status: 'active' },
  { id: 11, type_id: 4, type_code: 'device_status', code: 'maintenance', name: '维护中', sort_order: 2, status: 'active' },
  { id: 12, type_id: 4, type_code: 'device_status', code: 'fault', name: '故障', sort_order: 3, status: 'active' },
];

// 判断是否使用模拟数据（实际项目中可根据环境变量或配置决定）
const USE_MOCK_DATA = true;

const DictionaryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('types');
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [editingType, setEditingType] = useState<DictionaryType | null>(null);
  const [editingItem, setEditingItem] = useState<DictionaryItem | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [typeForm] = Form.useForm();
  const [itemForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  
  const queryClient = useQueryClient();

  // 获取字典类型列表
  const { data: typesData, isLoading: typesLoading } = useQuery({
    queryKey: ['dictionary-types'],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        return { data: mockDictionaryTypes };
      }
      return await dictionaryService.getDictionaryTypes();
    },
  });

  // 获取字典项列表
  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['dictionary-items', selectedTypeId],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        const filteredItems = selectedTypeId
          ? mockDictionaryItems.filter(item => item.type_id === selectedTypeId)
          : mockDictionaryItems;
        return { data: filteredItems };
      }
      return await dictionaryService.getDictionaryItems(selectedTypeId!);
    },
    enabled: !!selectedTypeId,
  });

  // 创建字典类型
  const createTypeMutation = useMutation({
    mutationFn: async (values: Omit<DictionaryType, 'id'>) => {
      if (USE_MOCK_DATA) {
        return { success: true };
      }
      return await dictionaryService.createDictionaryType(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dictionary-types'] });
      setTypeModalVisible(false);
      typeForm.resetFields();
      message.success('字典类型创建成功');
    },
  });

  // 更新字典类型
  const updateTypeMutation = useMutation({
    mutationFn: async (values: DictionaryType) => {
      if (USE_MOCK_DATA) {
        return { success: true };
      }
      return await dictionaryService.updateDictionaryType(values.id, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dictionary-types'] });
      setTypeModalVisible(false);
      setEditingType(null);
      typeForm.resetFields();
      message.success('字典类型更新成功');
    },
  });

  // 删除字典类型
  const deleteTypeMutation = useMutation({
    mutationFn: async (id: number) => {
      if (USE_MOCK_DATA) {
        return { success: true };
      }
      return await dictionaryService.deleteDictionaryType(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dictionary-types'] });
      message.success('字典类型删除成功');
    },
  });

  // 创建字典项
  const createItemMutation = useMutation({
    mutationFn: async (values: Omit<DictionaryItem, 'id'>) => {
      if (USE_MOCK_DATA) {
        return { success: true };
      }
      return await dictionaryService.createDictionaryItem(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dictionary-items', selectedTypeId] });
      setItemModalVisible(false);
      itemForm.resetFields();
      message.success('字典项创建成功');
    },
  });

  // 更新字典项
  const updateItemMutation = useMutation({
    mutationFn: async (values: DictionaryItem) => {
      if (USE_MOCK_DATA) {
        return { success: true };
      }
      return await dictionaryService.updateDictionaryItem(values.id, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dictionary-items', selectedTypeId] });
      setItemModalVisible(false);
      setEditingItem(null);
      itemForm.resetFields();
      message.success('字典项更新成功');
    },
  });

  // 删除字典项
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      if (USE_MOCK_DATA) {
        return { success: true };
      }
      return await dictionaryService.deleteDictionaryItem(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dictionary-items', selectedTypeId] });
      message.success('字典项删除成功');
    },
  });

  // 处理字典类型表单提交
  const handleTypeFormSubmit = () => {
    typeForm.validateFields().then(values => {
      if (editingType) {
        updateTypeMutation.mutate({ ...editingType, ...values });
      } else {
        createTypeMutation.mutate(values);
      }
    });
  };

  // 处理字典项表单提交
  const handleItemFormSubmit = () => {
    itemForm.validateFields().then(values => {
      if (editingItem) {
        updateItemMutation.mutate({ ...editingItem, ...values });
      } else {
        createItemMutation.mutate({ ...values, type_id: selectedTypeId! });
      }
    });
  };

  // 处理编辑字典类型
  const handleEditType = (record: DictionaryType) => {
    setEditingType(record);
    typeForm.setFieldsValue(record);
    setTypeModalVisible(true);
  };

  // 处理编辑字典项
  const handleEditItem = (record: DictionaryItem) => {
    setEditingItem(record);
    itemForm.setFieldsValue(record);
    setItemModalVisible(true);
  };

  // 处理删除字典类型
  const handleDeleteType = (id: number) => {
    deleteTypeMutation.mutate(id);
  };

  // 处理删除字典项
  const handleDeleteItem = (id: number) => {
    deleteItemMutation.mutate(id);
  };

  // 处理添加字典类型
  const handleAddType = () => {
    setEditingType(null);
    typeForm.resetFields();
    setTypeModalVisible(true);
  };

  // 处理添加字典项
  const handleAddItem = () => {
    if (!selectedTypeId) {
      message.warning('请先选择一个字典类型');
      return;
    }
    setEditingItem(null);
    itemForm.resetFields();
    setItemModalVisible(true);
  };

  // 处理选择字典类型
  const handleSelectType = (typeId: number) => {
    setSelectedTypeId(typeId);
    setActiveTab('items');
  };

  // 字典类型表格列定义
  const typeColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '类型编码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '类型名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: any, record: DictionaryType) => (
        <Space size="middle">
          <Button
            type="link"
            size="small"
            onClick={() => handleSelectType(record.id)}
          >
            查看项
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditType(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此字典类型吗？"
            onConfirm={() => handleDeleteType(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 字典项表格列定义
  const itemColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '项编码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '项名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: DictionaryItem) => (
        <Space size="middle">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditItem(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此字典项吗？"
            onConfirm={() => handleDeleteItem(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 获取当前选中的字典类型名称
  const getSelectedTypeName = () => {
    if (!selectedTypeId || !typesData?.data) return '';
    const selectedType = typesData.data.find(type => type.id === selectedTypeId);
    return selectedType ? selectedType.name : '';
  };

  return (
    <div>
      <PageHeader title="数据字典管理" sub="统一维护系统枚举与字典项" />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'types',
            label: '字典类型',
            children: (
              <>
          <Card>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <Input.Search
                placeholder="搜索字典类型"
                allowClear
                style={{ width: 300 }}
                onSearch={setSearchText}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddType}
              >
                新增字典类型
              </Button>
            </div>
            <Table
              columns={typeColumns}
              dataSource={typesData?.data || []}
              rowKey="id"
              loading={typesLoading}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          </Card>
              </>
            ),
          },
          {
            key: 'items',
            label: '字典项',
            children: (
              <>
          <Card>
            <div style={{ marginBottom: 16 }}>
              <Row gutter={16} align="middle">
                <Col span={12}>
                  <Space>
                    <Text strong>当前字典类型:</Text>
                    {selectedTypeId ? (
                      <Tag color="blue">{getSelectedTypeName()}</Tag>
                    ) : (
                      <Text type="secondary">请先在字典类型标签页选择一个类型</Text>
                    )}
                  </Space>
                </Col>
                <Col span={12} style={{ textAlign: 'right' }}>
                  <Space>
                    <Input.Search
                      placeholder="搜索字典项"
                      allowClear
                      style={{ width: 200 }}
                      onSearch={setSearchText}
                    />
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddItem}
                      disabled={!selectedTypeId}
                    >
                      新增字典项
                    </Button>
                  </Space>
                </Col>
              </Row>
            </div>
            <Table
              columns={itemColumns}
              dataSource={itemsData?.data || []}
              rowKey="id"
              loading={itemsLoading}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          </Card>
              </>
            ),
          },
        ]}
      />

      {/* 字典类型表单模态框 */}
      <Modal
        title={editingType ? '编辑字典类型' : '新增字典类型'}
        open={typeModalVisible}
        onCancel={() => setTypeModalVisible(false)}
        onOk={handleTypeFormSubmit}
        maskClosable={false}
      >
        <Form
          form={typeForm}
          layout="vertical"
        >
          <Form.Item
            name="code"
            label="类型编码"
            rules={[{ required: true, message: '请输入类型编码' }]}
          >
            <Input placeholder="请输入类型编码，如：device_type" />
          </Form.Item>
          <Form.Item
            name="name"
            label="类型名称"
            rules={[{ required: true, message: '请输入类型名称' }]}
          >
            <Input placeholder="请输入类型名称，如：设备类型" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={3} placeholder="请输入描述信息" />
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
            initialValue="active"
          >
            <Select>
              <Option value="active">启用</Option>
              <Option value="inactive">禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 字典项表单模态框 */}
      <Modal
        title={editingItem ? '编辑字典项' : '新增字典项'}
        open={itemModalVisible}
        onCancel={() => setItemModalVisible(false)}
        onOk={handleItemFormSubmit}
        maskClosable={false}
      >
        <Form
          form={itemForm}
          layout="vertical"
        >
          <Form.Item
            name="code"
            label="项编码"
            rules={[{ required: true, message: '请输入项编码' }]}
          >
            <Input placeholder="请输入项编码，如：5g-base" />
          </Form.Item>
          <Form.Item
            name="name"
            label="项名称"
            rules={[{ required: true, message: '请输入项名称' }]}
          >
            <Input placeholder="请输入项名称，如：5G基站" />
          </Form.Item>
          <Form.Item
            name="value"
            label="值"
          >
            <Input placeholder="请输入值（可选）" />
          </Form.Item>
          <Form.Item
            name="sort_order"
            label="排序"
            initialValue={1}
            rules={[{ required: true, message: '请输入排序值' }]}
          >
            <Input type="number" min={1} placeholder="请输入排序值" />
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
            initialValue="active"
          >
            <Select>
              <Option value="active">启用</Option>
              <Option value="inactive">禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DictionaryPage;
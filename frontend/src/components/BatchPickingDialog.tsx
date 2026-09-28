import React, { useState } from 'react';
import {
  Modal,
  Button,
  Table,
  Checkbox,
  Space,
  Typography,
  Alert,
  Progress,
  Divider,
  Tag,
  message,
  Steps
} from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { outboundApi } from '../services/outboundApi';

const { Title, Text } = Typography;
const { Step } = Steps;

interface OutboundOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  warehouseName: string;
  status: string;
  statusText: string;
  totalQuantity: number;
  priority: string;
  expectedDate: string;
}

interface BatchPickingResult {
  order_id: string;
  order_number: string;
  success: boolean;
  message: string;
  status?: string;
  status_text?: string;
}

interface BatchPickingResponse {
  total: number;
  success_count: number;
  fail_count: number;
  results: BatchPickingResult[];
}

interface BatchPickingDialogProps {
  visible: boolean;
  onClose: () => void;
  selectedOrders: OutboundOrder[];
  onSuccess?: () => void;
}

const BatchPickingDialog: React.FC<BatchPickingDialogProps> = ({
  visible,
  onClose,
  selectedOrders,
  onSuccess
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [pickingResults, setPickingResults] = useState<BatchPickingResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [processingCount, setProcessingCount] = useState(0);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // 批量拣货 mutation
  const batchPickingMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const response = await outboundApi.batchPicking({ order_ids: orderIds });
      return response.data.data;
    },
    onSuccess: (data: BatchPickingResponse) => {
      setPickingResults(data.results);
      setProgress(100);
      setCurrentStep(2);
      
      // 收集错误详情
      const errors = data.results
        .filter(r => !r.success)
        .map(r => `${r.order_number}: ${r.message}`);
      setErrorDetails(errors);
      
      // 刷新出库单列表
      queryClient.invalidateQueries({ queryKey: ['outbound', 'list'] });
      
      if (data.success_count > 0) {
        message.success(`批量拣货完成，成功：${data.success_count}个，失败：${data.fail_count}个`);
      } else if (data.fail_count > 0) {
        message.error(`批量拣货失败，所有${data.fail_count}个出库单都处理失败`);
      }
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || '网络请求失败';
      message.error('批量拣货失败：' + errorMessage);
      setErrorDetails([errorMessage]);
      setCurrentStep(0);
      setProgress(0);
      setProcessingCount(0);
    }
  });

  // 批量完成拣货 mutation
  const batchCompletePickingMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const response = await outboundApi.batchCompletePicking({ order_ids: orderIds });
      return response.data.data;
    },
    onSuccess: (data: BatchPickingResponse) => {
      setPickingResults(data.results);
      setProgress(100);
      setCurrentStep(2);
      
      // 收集错误详情
      const errors = data.results
        .filter(r => !r.success)
        .map(r => `${r.order_number}: ${r.message}`);
      setErrorDetails(errors);
      
      // 刷新出库单列表
      queryClient.invalidateQueries({ queryKey: ['outbound', 'list'] });
      
      if (data.success_count > 0) {
        message.success(`批量完成拣货，成功：${data.success_count}个，失败：${data.fail_count}个`);
      } else if (data.fail_count > 0) {
        message.error(`批量完成拣货失败，所有${data.fail_count}个出库单都处理失败`);
      }
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || '网络请求失败';
      message.error('批量完成拣货失败：' + errorMessage);
      setErrorDetails([errorMessage]);
      setCurrentStep(0);
      setProgress(0);
      setProcessingCount(0);
    }
  });

  const handleStartPicking = () => {
    const orderIds = selectedOrders.map(order => order.id);
    setCurrentStep(1);
    setProgress(0);
    setProcessingCount(0);
    setErrorDetails([]);
    
    // 模拟进度更新
    let currentProgress = 0;
    let currentCount = 0;
    const totalOrders = selectedOrders.length;
    const progressInterval = setInterval(() => {
      if (currentProgress < 90) {
        currentProgress += Math.random() * 15;
        currentCount = Math.min(Math.floor((currentProgress / 90) * totalOrders), totalOrders - 1);
        setProgress(Math.min(currentProgress, 90));
        setProcessingCount(currentCount);
      } else {
        clearInterval(progressInterval);
      }
    }, 300);
    
    batchPickingMutation.mutate(orderIds);
  };

  const handleCompletePicking = () => {
    const orderIds = selectedOrders.map(order => order.id);
    setCurrentStep(1);
    setProgress(0);
    setProcessingCount(0);
    setErrorDetails([]);
    
    // 模拟进度更新
    let currentProgress = 0;
    let currentCount = 0;
    const totalOrders = selectedOrders.length;
    const progressInterval = setInterval(() => {
      if (currentProgress < 90) {
        currentProgress += Math.random() * 15;
        currentCount = Math.min(Math.floor((currentProgress / 90) * totalOrders), totalOrders - 1);
        setProgress(Math.min(currentProgress, 90));
        setProcessingCount(currentCount);
      } else {
        clearInterval(progressInterval);
      }
    }, 300);
    
    batchCompletePickingMutation.mutate(orderIds);
  };

  const handleClose = () => {
    setCurrentStep(0);
    setProgress(0);
    setProcessingCount(0);
    setPickingResults([]);
    setErrorDetails([]);
    onClose();
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'pending': 'orange',
      'picking': 'blue',
      'packed': 'green',
      'shipped': 'purple',
      'delivered': 'success',
      'cancelled': 'error'
    };
    return statusColors[status] || 'default';
  };

  const getPriorityColor = (priority: string) => {
    const priorityColors: Record<string, string> = {
      'low': 'green',
      'normal': 'blue',
      'high': 'orange',
      'urgent': 'red'
    };
    return priorityColors[priority] || 'default';
  };

  const orderColumns = [
    {
      title: '出库单号',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 150,
    },
    {
      title: '客户名称',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 120,
    },
    {
      title: '仓库',
      dataIndex: 'warehouseName',
      key: 'warehouseName',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string, record: OutboundOrder) => (
        <Tag color={getStatusColor(status)}>{record.statusText}</Tag>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)}>
          {priority === 'low' ? '低' : priority === 'normal' ? '普通' : priority === 'high' ? '高' : '紧急'}
        </Tag>
      ),
    },
    {
      title: '数量',
      dataIndex: 'totalQuantity',
      key: 'totalQuantity',
      width: 80,
      render: (quantity: number) => `${quantity}件`,
    },
    {
      title: '预期日期',
      dataIndex: 'expectedDate',
      key: 'expectedDate',
      width: 100,
    },
  ];

  const resultColumns = [
    {
      title: '出库单号',
      dataIndex: 'order_number',
      key: 'order_number',
      width: 150,
    },
    {
      title: '处理结果',
      dataIndex: 'success',
      key: 'success',
      width: 100,
      render: (success: boolean) => (
        success ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>成功</Tag>
        ) : (
          <Tag color="error" icon={<ExclamationCircleOutlined />}>失败</Tag>
        )
      ),
    },
    {
      title: '状态',
      dataIndex: 'status_text',
      key: 'status_text',
      width: 100,
      render: (statusText: string, record: BatchPickingResult) => (
        record.success && statusText ? (
          <Tag color={getStatusColor(record.status || '')}>{statusText}</Tag>
        ) : null
      ),
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      render: (message: string) => (
        <Text style={{ fontSize: '12px' }}>{message}</Text>
      ),
    },
  ];

  const renderConfirmStep = () => (
    <div>
      <Alert
        message="批量拣货确认"
        description={`您选择了 ${selectedOrders.length} 个出库单进行批量拣货操作，请确认后继续。`}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Table
        columns={orderColumns}
        dataSource={selectedOrders}
        rowKey="id"
        pagination={false}
        size="small"
        scroll={{ y: 300 }}
      />
      
      <Divider />
      
      <Space>
        <Button
          type="primary"
          onClick={handleStartPicking}
          loading={batchPickingMutation.isPending}
          disabled={selectedOrders.length === 0}
        >
          开始拣货
        </Button>
        <Button
          onClick={handleCompletePicking}
          loading={batchCompletePickingMutation.isPending}
          disabled={selectedOrders.length === 0}
        >
          完成拣货
        </Button>
        <Button onClick={handleClose}>
          取消
        </Button>
      </Space>
    </div>
  );

  const renderProcessingStep = () => (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <LoadingOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
      <Title level={4}>正在处理批量拣货...</Title>
      <Progress 
        percent={progress} 
        status="active" 
        style={{ marginBottom: 16 }}
        format={(percent) => `${Math.round(percent || 0)}%`}
      />
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          正在处理第 {processingCount + 1} / {selectedOrders.length} 个出库单
        </Text>
      </div>
      <Text type="secondary">请稍候，系统正在为您批量处理拣货操作...</Text>
      
      {errorDetails.length > 0 && (
        <Alert
          message="处理过程中发现错误"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {errorDetails.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          }
          type="warning"
          showIcon
          style={{ marginTop: 16, textAlign: 'left' }}
        />
      )}
    </div>
  );

  const renderResultStep = () => {
    const successCount = pickingResults.filter(r => r.success).length;
    const failCount = pickingResults.filter(r => !r.success).length;
    const successRate = pickingResults.length > 0 ? Math.round((successCount / pickingResults.length) * 100) : 0;
    
    return (
      <div>
        <Alert
          message="批量拣货完成"
          description={
            <div>
              <div>处理完成！成功：{successCount} 个，失败：{failCount} 个</div>
              <div>成功率：{successRate}%</div>
            </div>
          }
          type={failCount === 0 ? 'success' : failCount < successCount ? 'warning' : 'error'}
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        {failCount > 0 && (
          <Alert
            message="失败详情"
            description={
              <div>
                <div style={{ marginBottom: 8 }}>以下出库单处理失败，请检查后重试：</div>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {pickingResults
                    .filter(r => !r.success)
                    .map((result, index) => (
                      <li key={index}>
                        <strong>{result.order_number}</strong>: {result.message}
                      </li>
                    ))
                  }
                </ul>
              </div>
            }
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Table
          columns={resultColumns}
          dataSource={pickingResults}
          rowKey="order_id"
          pagination={false}
          size="small"
          scroll={{ y: 300 }}
        />
        
        <Divider />
        
        <Space>
          <Button type="primary" onClick={handleClose}>
            完成
          </Button>
          {failCount > 0 && (
            <Button 
              onClick={() => {
                // 重新选择失败的订单进行重试
                const failedOrderIds = pickingResults
                  .filter(r => !r.success)
                  .map(r => r.order_id);
                const failedOrders = selectedOrders.filter(order => 
                  failedOrderIds.includes(order.id)
                );
                if (failedOrders.length > 0) {
                  setCurrentStep(0);
                  setProgress(0);
                  setProcessingCount(0);
                  setPickingResults([]);
                  setErrorDetails([]);
                }
              }}
            >
              重试失败项
            </Button>
          )}
        </Space>
      </div>
    );
  };

  const steps = [
    {
      title: '确认拣货',
      content: renderConfirmStep(),
    },
    {
      title: '处理中',
      content: renderProcessingStep(),
    },
    {
      title: '完成',
      content: renderResultStep(),
    },
  ];

  return (
    <Modal
      title="批量拣货"
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        {steps.map(item => (
          <Step key={item.title} title={item.title} />
        ))}
      </Steps>
      
      {steps[currentStep].content}
    </Modal>
  );
};

export default BatchPickingDialog;
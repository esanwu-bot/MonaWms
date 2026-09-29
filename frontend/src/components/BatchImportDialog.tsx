import React, { useState } from 'react';
import {
  Modal,
  Upload,
  Button,
  Table,
  message,
  Progress,
  Alert,
  Space,
  Typography,
  Divider,
} from 'antd';
import {
  InboxOutlined,
  DownloadOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import type { UploadProps, TableColumnsType } from 'antd';

const { Dragger } = Upload;
const { Text, Title } = Typography;

interface BatchImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportData {
  key: string;
  orderNumber: string;
  supplierName: string;
  warehouseName: string;
  expectedDate: string;
  remark?: string;
  items: {
    productCode: string;
    productName: string;
    quantity: number;
    unit: string;
  }[];
}

const BatchImportDialog: React.FC<BatchImportDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [fileList, setFileList] = useState<any[]>([]);
  const [importData, setImportData] = useState<ImportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');

  const columns: TableColumnsType<ImportData> = [
    {
      title: '入库单号',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 150,
    },
    {
      title: '供应商',
      dataIndex: 'supplierName',
      key: 'supplierName',
      width: 120,
    },
    {
      title: '仓库',
      dataIndex: 'warehouseName',
      key: 'warehouseName',
      width: 100,
    },
    {
      title: '预期到货日期',
      dataIndex: 'expectedDate',
      key: 'expectedDate',
      width: 120,
    },
    {
      title: '商品数量',
      key: 'itemCount',
      width: 80,
      render: (_, record) => record.items.length,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
    },
  ];

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    fileList,
    accept: '.xlsx,.xls',
    beforeUpload: (file) => {
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                     file.type === 'application/vnd.ms-excel';
      if (!isExcel) {
        message.error('只能上传 Excel 文件！');
        return false;
      }
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过 10MB！');
        return false;
      }
      return false; // 阻止自动上传
    },
    onChange: (info) => {
      setFileList(info.fileList.slice(-1)); // 只保留最新的一个文件
    },
    onRemove: () => {
      setFileList([]);
      setImportData([]);
      setErrors([]);
      setStep('upload');
    },
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/inbound-orders/template');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '入库单导入模板.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        message.success('模板下载成功');
      } else {
        message.error('模板下载失败');
      }
    } catch (error) {
      message.error('模板下载失败');
    }
  };

  const handleParseFile = async () => {
    if (fileList.length === 0) {
      message.error('请先选择文件');
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      const formData = new FormData();
      formData.append('file', fileList[0].originFileObj);
      formData.append('preview', 'true');

      const response = await fetch('/api/inbound-orders/batch-import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setImportData(result.data.preview || []);
        setErrors(result.data.errors || []);
        setStep('preview');
        message.success(`解析成功，共 ${result.data.preview?.length || 0} 条数据`);
      } else {
        setErrors(result.errors || [result.message || '解析失败']);
        message.error('文件解析失败');
      }
    } catch (error) {
      message.error('文件解析失败');
      setErrors(['网络错误，请重试']);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (importData.length === 0) {
      message.error('没有可导入的数据');
      return;
    }

    setImporting(true);
    setStep('importing');
    setProgress(0);
    setErrors([]);

    try {
      const formData = new FormData();
      formData.append('file', fileList[0].originFileObj);
      formData.append('preview', 'false');

      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 200);

      const response = await fetch('/api/inbound-orders/batch-import', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      const result = await response.json();

      if (response.ok && result.success) {
        setProgress(100);
        const successCount = result.data.imported || 0;
        const failedCount = result.data.failed || 0;
        
        if (failedCount > 0) {
          message.warning(`导入完成，成功 ${successCount} 条，失败 ${failedCount} 条`);
          setErrors(result.data.errors || []);
        } else {
          message.success(`导入成功，共导入 ${successCount} 条数据`);
        }
        
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      } else {
        setErrors(result.errors || [result.message || '导入失败']);
        message.error('批量导入失败');
        setStep('preview');
      }
    } catch (error) {
      message.error('批量导入失败');
      setErrors(['网络错误，请重试']);
      setStep('preview');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFileList([]);
    setImportData([]);
    setErrors([]);
    setProgress(0);
    setStep('upload');
    setLoading(false);
    setImporting(false);
    onClose();
  };

  const renderUploadStep = () => (
    <div style={{ textAlign: 'center' }}>
      <Title level={4}>批量导入入库单</Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Button
          icon={<DownloadOutlined />}
          onClick={handleDownloadTemplate}
          type="link"
        >
          下载导入模板
        </Button>
        
        <Dragger {...uploadProps} style={{ padding: '20px' }}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 .xlsx 和 .xls 格式，文件大小不超过 10MB
          </p>
        </Dragger>

        {fileList.length > 0 && (
          <Button
            type="primary"
            loading={loading}
            onClick={handleParseFile}
            size="large"
          >
            解析文件
          </Button>
        )}
      </Space>
    </div>
  );

  const renderPreviewStep = () => (
    <div>
      <Title level={4}>数据预览</Title>
      
      {errors.length > 0 && (
        <Alert
          message="数据验证错误"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          }
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Text type="secondary">
        共解析到 {importData.length} 条入库单数据
      </Text>
      
      <Table
        columns={columns}
        dataSource={importData}
        pagination={{
          pageSize: 10,
          showSizeChanger: false,
          showQuickJumper: true,
        }}
        scroll={{ x: 800 }}
        size="small"
        style={{ marginTop: 16 }}
      />
    </div>
  );

  const renderImportingStep = () => (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <Title level={4}>{importing ? '正在导入...' : '导入完成'}</Title>
      <Progress
        type="circle"
        percent={progress}
        status={importing ? 'active' : progress === 100 ? 'success' : 'exception'}
        style={{ marginBottom: 16 }}
      />
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          {importing ? '正在处理数据，请稍候...' : '导入完成'}
        </Text>
      </div>
      
      {errors.length > 0 && !importing && (
        <Alert
          message="部分数据导入失败"
          description={
            <ul style={{ margin: 0, paddingLeft: 20, textAlign: 'left' }}>
              {errors.slice(0, 5).map((error, index) => (
                <li key={index}>{error}</li>
              ))}
              {errors.length > 5 && <li>...还有 {errors.length - 5} 个错误</li>}
            </ul>
          }
          type="warning"
          showIcon
          style={{ marginTop: 16, textAlign: 'left' }}
        />
      )}
    </div>
  );

  const getFooterButtons = () => {
    switch (step) {
      case 'upload':
        return [
          <Button key="cancel" onClick={handleClose}>
            取消
          </Button>,
        ];
      case 'preview':
        return [
          <Button key="back" onClick={() => setStep('upload')}>
            返回
          </Button>,
          <Button key="cancel" onClick={handleClose}>
            取消
          </Button>,
          <Button
            key="import"
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={handleImport}
            disabled={importData.length === 0 || errors.length > 0}
          >
            开始导入
          </Button>,
        ];
      case 'importing':
        return [];
      default:
        return [];
    }
  };

  return (
    <Modal
      title="批量导入入库单"
      open={open}
      onCancel={handleClose}
      footer={getFooterButtons()}
      width={step === 'preview' ? 1000 : 600}
      maskClosable={false}
      destroyOnHidden
    >
      {step === 'upload' && renderUploadStep()}
      {step === 'preview' && renderPreviewStep()}
      {step === 'importing' && renderImportingStep()}
    </Modal>
  );
};

export default BatchImportDialog;
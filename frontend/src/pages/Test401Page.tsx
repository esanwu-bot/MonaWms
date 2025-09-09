import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Grid
} from '@mui/material';
import { api } from '../services/api';

const Test401Page: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // 测试正常API请求
  const testNormalRequest = async () => {
    setIsLoading(true);
    setTestResult('');
    try {
      const response = await api.get('/dashboard/stats');
      setTestResult(`正常请求成功: ${JSON.stringify(response.data)}`);
    } catch (error: any) {
      setTestResult(`正常请求失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 测试模拟401响应
  const testMock401Response = async () => {
    setIsLoading(true);
    setTestResult('');
    
    // 模拟一个返回401 code的响应
    try {
      // 创建一个模拟的401响应
      const mockResponse = {
        data: {
          code: 401,
          message: "Token无效或已过期",
          data: null
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      };
      
      // 手动触发响应拦截器的逻辑
      if (mockResponse.data && mockResponse.data.code === 401) {
        setTestResult('检测到401响应，应该会跳转到登录页面');
        // 这里会触发实际的跳转逻辑
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    } catch (error: any) {
      setTestResult(`测试失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 测试无效token请求
  const testInvalidTokenRequest = async () => {
    setIsLoading(true);
    setTestResult('');
    
    // 临时设置一个无效的token
    const originalToken = localStorage.getItem('token');
    localStorage.setItem('token', 'invalid-token-for-test');
    
    try {
      const response = await api.get('/dashboard/stats');
      setTestResult(`意外成功: ${JSON.stringify(response.data)}`);
    } catch (error: any) {
      setTestResult(`无效token请求失败（预期行为）: ${error.message}`);
    } finally {
      // 恢复原始token
      if (originalToken) {
        localStorage.setItem('token', originalToken);
      } else {
        localStorage.removeItem('token');
      }
      setIsLoading(false);
    }
  };

  // 清除所有token进行测试
  const clearTokensAndTest = async () => {
    setIsLoading(true);
    setTestResult('');
    
    // 清除所有token
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    
    try {
      const response = await api.get('/dashboard/stats');
      setTestResult(`无token请求意外成功: ${JSON.stringify(response.data)}`);
    } catch (error: any) {
      setTestResult(`无token请求失败（预期行为）: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        401错误处理测试页面
      </Typography>
      
      <Grid container spacing={3}>
        {/* 测试按钮 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                测试操作
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <Button 
                  variant="contained" 
                  onClick={testNormalRequest}
                  disabled={isLoading}
                >
                  测试正常请求
                </Button>
                <Button 
                  variant="contained" 
                  color="warning"
                  onClick={testMock401Response}
                  disabled={isLoading}
                >
                  模拟401响应
                </Button>
                <Button 
                  variant="contained" 
                  color="error"
                  onClick={testInvalidTokenRequest}
                  disabled={isLoading}
                >
                  测试无效Token
                </Button>
                <Button 
                  variant="outlined" 
                  color="error"
                  onClick={clearTokensAndTest}
                  disabled={isLoading}
                >
                  清除Token测试
                </Button>
              </Box>
              
              {testResult && (
                <Alert 
                  severity={testResult.includes('成功') ? 'success' : testResult.includes('失败（预期行为）') ? 'info' : 'error'}
                >
                  {testResult}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 说明信息 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                测试说明
              </Typography>
              <Typography variant="body2" paragraph>
                1. <strong>测试正常请求</strong>: 使用当前token发送正常的API请求
              </Typography>
              <Typography variant="body2" paragraph>
                2. <strong>模拟401响应</strong>: 模拟服务器返回code=401的响应，测试自动跳转逻辑
              </Typography>
              <Typography variant="body2" paragraph>
                3. <strong>测试无效Token</strong>: 临时设置无效token，测试服务器401响应处理
              </Typography>
              <Typography variant="body2" paragraph>
                4. <strong>清除Token测试</strong>: 清除所有token后发送请求，测试无认证状态的处理
              </Typography>
              <Alert severity="warning" sx={{ mt: 2 }}>
                注意：某些测试可能会导致自动跳转到登录页面，这是正常的预期行为。
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Test401Page;
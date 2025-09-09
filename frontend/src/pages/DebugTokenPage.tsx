import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  Divider,
  Chip
} from '@mui/material';
import { authService } from '../services/authService';

interface TokenInfo {
  token: string | null;
  refreshToken: string | null;
  tokenPayload: any;
  refreshTokenPayload: any;
  tokenExpiry: string;
  refreshTokenExpiry: string;
  isTokenExpired: boolean;
  isRefreshTokenExpired: boolean;
}

const DebugTokenPage: React.FC = () => {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [refreshResult, setRefreshResult] = useState<string>('');

  // 解析JWT token
  const parseJWT = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  };

  // 检查token状态
  const checkTokenStatus = () => {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    
    let tokenPayload = null;
    let refreshTokenPayload = null;
    let tokenExpiry = '';
    let refreshTokenExpiry = '';
    let isTokenExpired = true;
    let isRefreshTokenExpired = true;

    if (token) {
      tokenPayload = parseJWT(token);
      if (tokenPayload && tokenPayload.exp) {
        tokenExpiry = new Date(tokenPayload.exp * 1000).toLocaleString();
        isTokenExpired = Date.now() >= tokenPayload.exp * 1000;
      }
    }

    if (refreshToken) {
      refreshTokenPayload = parseJWT(refreshToken);
      if (refreshTokenPayload && refreshTokenPayload.exp) {
        refreshTokenExpiry = new Date(refreshTokenPayload.exp * 1000).toLocaleString();
        isRefreshTokenExpired = Date.now() >= refreshTokenPayload.exp * 1000;
      }
    }

    setTokenInfo({
      token,
      refreshToken,
      tokenPayload,
      refreshTokenPayload,
      tokenExpiry,
      refreshTokenExpiry,
      isTokenExpired,
      isRefreshTokenExpired
    });
  };

  // 测试刷新token
  const testRefreshToken = async () => {
    try {
      setRefreshResult('正在刷新token...');
      const result = await authService.refreshToken();
      if (result) {
        setRefreshResult('Token刷新成功！');
        checkTokenStatus(); // 重新检查状态
      } else {
        setRefreshResult('Token刷新失败');
      }
    } catch (error: any) {
      setRefreshResult(`Token刷新失败: ${error.message}`);
    }
  };

  // 清除所有token
  const clearTokens = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setTokenInfo(null);
    setRefreshResult('所有token已清除');
  };

  useEffect(() => {
    checkTokenStatus();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Token 调试页面
      </Typography>
      
      <Grid container spacing={3}>
        {/* 操作按钮 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                操作
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button variant="contained" onClick={checkTokenStatus}>
                  刷新状态
                </Button>
                <Button variant="contained" color="secondary" onClick={testRefreshToken}>
                  测试刷新Token
                </Button>
                <Button variant="outlined" color="error" onClick={clearTokens}>
                  清除所有Token
                </Button>
              </Box>
              {refreshResult && (
                <Alert severity={refreshResult.includes('成功') ? 'success' : 'error'} sx={{ mt: 2 }}>
                  {refreshResult}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Access Token 信息 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Access Token
                {tokenInfo && (
                  <Chip 
                    label={tokenInfo.isTokenExpired ? '已过期' : '有效'} 
                    color={tokenInfo.isTokenExpired ? 'error' : 'success'}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
              </Typography>
              
              {tokenInfo?.token ? (
                <>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Token: {tokenInfo.token.substring(0, 50)}...
                  </Typography>
                  
                  {tokenInfo.tokenPayload && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2">载荷信息:</Typography>
                      <Typography variant="body2">用户ID: {tokenInfo.tokenPayload.user_id}</Typography>
                      <Typography variant="body2">用户名: {tokenInfo.tokenPayload.username}</Typography>
                      <Typography variant="body2">角色: {tokenInfo.tokenPayload.role}</Typography>
                      <Typography variant="body2">过期时间: {tokenInfo.tokenExpiry}</Typography>
                    </>
                  )}
                </>
              ) : (
                <Alert severity="warning">未找到 Access Token</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Refresh Token 信息 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Refresh Token
                {tokenInfo && (
                  <Chip 
                    label={tokenInfo.isRefreshTokenExpired ? '已过期' : '有效'} 
                    color={tokenInfo.isRefreshTokenExpired ? 'error' : 'success'}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
              </Typography>
              
              {tokenInfo?.refreshToken ? (
                <>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Token: {tokenInfo.refreshToken.substring(0, 50)}...
                  </Typography>
                  
                  {tokenInfo.refreshTokenPayload && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2">载荷信息:</Typography>
                      <Typography variant="body2">用户ID: {tokenInfo.refreshTokenPayload.user_id}</Typography>
                      <Typography variant="body2">类型: {tokenInfo.refreshTokenPayload.type}</Typography>
                      <Typography variant="body2">过期时间: {tokenInfo.refreshTokenExpiry}</Typography>
                    </>
                  )}
                </>
              ) : (
                <Alert severity="warning">未找到 Refresh Token</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 诊断信息 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                诊断信息
              </Typography>
              
              {tokenInfo ? (
                <>
                  {!tokenInfo.token && !tokenInfo.refreshToken && (
                    <Alert severity="error">
                      未找到任何token，用户可能未登录
                    </Alert>
                  )}
                  
                  {tokenInfo.token && tokenInfo.isTokenExpired && !tokenInfo.isRefreshTokenExpired && (
                    <Alert severity="warning">
                      Access Token已过期，但Refresh Token仍有效，可以尝试刷新
                    </Alert>
                  )}
                  
                  {tokenInfo.isRefreshTokenExpired && (
                    <Alert severity="error">
                      Refresh Token已过期，需要重新登录
                    </Alert>
                  )}
                  
                  {tokenInfo.token && !tokenInfo.isTokenExpired && (
                    <Alert severity="success">
                      Access Token有效，无需刷新
                    </Alert>
                  )}
                </>
              ) : (
                <Alert severity="info">
                  点击"刷新状态"按钮检查token状态
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DebugTokenPage;
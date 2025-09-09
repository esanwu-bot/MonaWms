<?php

namespace app\middleware;

use think\Request;
use think\Response;
use think\facade\Log;
use think\facade\Cache;

/**
 * API日志中间件
 */
class ApiLog
{
    /**
     * 处理请求
     *
     * @param Request $request
     * @param \Closure $next
     * @return Response
     */
    public function handle($request, \Closure $next)
    {
        $startTime = microtime(true);
        $startMemory = memory_get_usage();
        
        // 获取请求信息
        $requestData = [
            'method' => $request->method(),
            'url' => $request->url(true),
            'ip' => $request->ip(),
            'user_agent' => $request->header('User-Agent'),
            'params' => $this->filterSensitiveData($request->param()),
            'headers' => $this->filterSensitiveHeaders($request->header()),
            'start_time' => date('Y-m-d H:i:s', (int)$startTime),
            'request_id' => $this->generateRequestId()
        ];
        
        // 获取用户信息
        $user = $request->user ?? null;
        if ($user) {
            $requestData['user_id'] = $user['id'] ?? null;
            $requestData['username'] = $user['username'] ?? null;
        }
        
        // 将请求ID添加到请求中，方便后续使用
        $request->requestId = $requestData['request_id'];
        
        try {
            // 执行请求
            $response = $next($request);
            
            // 计算执行时间和内存使用
            $endTime = microtime(true);
            $endMemory = memory_get_usage();
            
            $responseData = [
                'status_code' => $response->getCode(),
                'response_time' => round(($endTime - $startTime) * 1000, 2), // 毫秒
                'memory_usage' => $this->formatBytes($endMemory - $startMemory),
                'response_size' => strlen($response->getContent())
            ];
            
            // 记录成功日志
            $this->logRequest(array_merge($requestData, $responseData), 'success');
            
            return $response;
            
        } catch (\Exception $e) {
            // 计算执行时间
            $endTime = microtime(true);
            
            $errorData = [
                'error_message' => $e->getMessage(),
                'error_code' => $e->getCode(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'response_time' => round(($endTime - $startTime) * 1000, 2)
            ];
            
            // 记录错误日志
            $this->logRequest(array_merge($requestData, $errorData), 'error');
            
            throw $e;
        }
    }
    
    /**
     * 记录请求日志
     *
     * @param array $data 日志数据
     * @param string $type 日志类型
     */
    private function logRequest(array $data, string $type = 'info')
    {
        $logMessage = sprintf(
            '[%s] %s %s - User: %s - Time: %sms - Memory: %s - Status: %s',
            $data['request_id'],
            $data['method'],
            $data['url'],
            $data['username'] ?? 'Guest',
            $data['response_time'] ?? 0,
            $data['memory_usage'] ?? '0B',
            $data['status_code'] ?? ($type === 'error' ? 'ERROR' : 'UNKNOWN')
        );
        
        // 根据类型记录不同级别的日志
        switch ($type) {
            case 'error':
                Log::error($logMessage, $data);
                break;
            case 'success':
                // 慢查询日志（超过1秒）
                if (($data['response_time'] ?? 0) > 1000) {
                    Log::warning('Slow API Request: ' . $logMessage, $data);
                } else {
                    Log::info($logMessage, $data);
                }
                break;
            default:
                Log::info($logMessage, $data);
        }
        
        // 统计API调用次数（可选）
        $this->updateApiStats($data);
    }
    
    /**
     * 过滤敏感数据
     *
     * @param array $data
     * @return array
     */
    private function filterSensitiveData(array $data): array
    {
        $sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
        
        foreach ($sensitiveFields as $field) {
            if (isset($data[$field])) {
                $data[$field] = '***';
            }
        }
        
        return $data;
    }
    
    /**
     * 过滤敏感请求头
     *
     * @param array $headers
     * @return array
     */
    private function filterSensitiveHeaders(array $headers): array
    {
        $sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
        
        foreach ($sensitiveHeaders as $header) {
            if (isset($headers[$header])) {
                $headers[$header] = '***';
            }
        }
        
        return $headers;
    }
    
    /**
     * 生成请求ID
     *
     * @return string
     */
    private function generateRequestId(): string
    {
        return uniqid('req_', true);
    }
    
    /**
     * 格式化字节数
     *
     * @param int $bytes
     * @return string
     */
    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        
        $bytes /= pow(1024, $pow);
        
        return round($bytes, 2) . ' ' . $units[$pow];
    }
    
    /**
     * 更新API统计信息
     *
     * @param array $data
     */
    private function updateApiStats(array $data)
    {
        try {
            $today = date('Y-m-d');
            $cacheKey = 'api_stats_' . $today;
            
            // 获取今日统计
            $stats = Cache::get($cacheKey, [
                'total_requests' => 0,
                'success_requests' => 0,
                'error_requests' => 0,
                'avg_response_time' => 0,
                'endpoints' => []
            ]);
            
            // 更新统计
            $stats['total_requests']++;
            
            if (isset($data['status_code']) && $data['status_code'] < 400) {
                $stats['success_requests']++;
            } else {
                $stats['error_requests']++;
            }
            
            // 更新平均响应时间
            if (isset($data['response_time'])) {
                $stats['avg_response_time'] = (
                    ($stats['avg_response_time'] * ($stats['total_requests'] - 1)) + $data['response_time']
                ) / $stats['total_requests'];
            }
            
            // 更新端点统计
            $endpoint = $data['method'] . ' ' . parse_url($data['url'], PHP_URL_PATH);
            if (!isset($stats['endpoints'][$endpoint])) {
                $stats['endpoints'][$endpoint] = [
                    'count' => 0,
                    'avg_time' => 0
                ];
            }
            
            $endpointStats = &$stats['endpoints'][$endpoint];
            $endpointStats['count']++;
            
            if (isset($data['response_time'])) {
                $endpointStats['avg_time'] = (
                    ($endpointStats['avg_time'] * ($endpointStats['count'] - 1)) + $data['response_time']
                ) / $endpointStats['count'];
            }
            
            // 缓存统计信息（24小时）
            Cache::set($cacheKey, $stats, 86400);
            
        } catch (\Exception $e) {
            // 统计更新失败不影响主流程
            Log::warning('Failed to update API stats: ' . $e->getMessage());
        }
    }
}
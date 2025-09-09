<?php

namespace app\middleware;

use think\Request;
use think\Response;

/**
 * CORS跨域中间件
 */
class Cors
{
    /**
     * 允许的域名
     * @var array
     */
    private $allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:8080',
        // 生产环境域名
        // 'https://your-domain.com'
    ];
    
    /**
     * 允许的请求方法
     * @var array
     */
    private $allowedMethods = [
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'OPTIONS',
        'PATCH'
    ];
    
    /**
     * 允许的请求头
     * @var array
     */
    private $allowedHeaders = [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers',
        'X-Api-Key',
        'X-Request-ID'
    ];
    
    /**
     * 暴露的响应头
     * @var array
     */
    private $exposedHeaders = [
        'X-Request-ID',
        'X-Total-Count',
        'X-Page-Count'
    ];
    
    /**
     * 处理请求
     *
     * @param Request $request
     * @param \Closure $next
     * @return Response
     */
    public function handle($request, \Closure $next)
    {
        // 获取请求来源
        $origin = $request->header('Origin');
        
        // 检查是否为预检请求
        if ($request->method() === 'OPTIONS') {
            return $this->handlePreflightRequest($request, $origin);
        }
        
        // 处理实际请求
        $response = $next($request);
        
        // 添加CORS头
        return $this->addCorsHeaders($response, $origin);
    }
    
    /**
     * 处理预检请求
     *
     * @param Request $request
     * @param string|null $origin
     * @return Response
     */
    private function handlePreflightRequest(Request $request, ?string $origin): Response
    {
        $response = response('', 200);
        
        // 检查来源是否允许
        if ($this->isOriginAllowed($origin)) {
            $response->header(['Access-Control-Allow-Origin' => $origin]);
            $response->header(['Access-Control-Allow-Credentials' => 'true']);
        }
        
        // 检查请求方法是否允许
        $requestMethod = $request->header('Access-Control-Request-Method');
        if ($requestMethod && in_array($requestMethod, $this->allowedMethods)) {
            $response->header(['Access-Control-Allow-Methods' => implode(', ', $this->allowedMethods)]);
        }
        
        // 检查请求头是否允许
        $requestHeaders = $request->header('Access-Control-Request-Headers');
        if ($requestHeaders) {
            $headers = array_map('trim', explode(',', $requestHeaders));
            $allowedRequestHeaders = array_intersect($headers, $this->allowedHeaders);
            
            if (!empty($allowedRequestHeaders)) {
                $response->header(['Access-Control-Allow-Headers' => implode(', ', $this->allowedHeaders)]);
            }
        }
        
        // 设置预检请求缓存时间（24小时）
        $response->header(['Access-Control-Max-Age' => '86400']);
        
        return $response;
    }
    
    /**
     * 添加CORS响应头
     *
     * @param Response $response
     * @param string|null $origin
     * @return Response
     */
    private function addCorsHeaders(Response $response, ?string $origin): Response
    {
        // 检查来源是否允许
        if ($this->isOriginAllowed($origin)) {
            $response->header(['Access-Control-Allow-Origin' => $origin]);
            $response->header(['Access-Control-Allow-Credentials' => 'true']);
        }
        
        // 添加允许的方法
        $response->header(['Access-Control-Allow-Methods' => implode(', ', $this->allowedMethods)]);
        
        // 添加允许的请求头
        $response->header(['Access-Control-Allow-Headers' => implode(', ', $this->allowedHeaders)]);
        
        // 添加暴露的响应头
        if (!empty($this->exposedHeaders)) {
            $response->header(['Access-Control-Expose-Headers' => implode(', ', $this->exposedHeaders)]);
        }
        
        return $response;
    }
    
    /**
     * 检查来源是否允许
     *
     * @param string|null $origin
     * @return bool
     */
    private function isOriginAllowed(?string $origin): bool
    {
        if (empty($origin)) {
            return false;
        }
        
        // 开发环境允许所有localhost和127.0.0.1
        if (app()->isDebug()) {
            if (preg_match('/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/', $origin)) {
                return true;
            }
        }
        
        // 检查是否在允许列表中
        return in_array($origin, $this->allowedOrigins) || in_array('*', $this->allowedOrigins);
    }
    
    /**
     * 设置允许的域名
     *
     * @param array $origins
     * @return $this
     */
    public function setAllowedOrigins(array $origins): self
    {
        $this->allowedOrigins = $origins;
        return $this;
    }
    
    /**
     * 添加允许的域名
     *
     * @param string $origin
     * @return $this
     */
    public function addAllowedOrigin(string $origin): self
    {
        if (!in_array($origin, $this->allowedOrigins)) {
            $this->allowedOrigins[] = $origin;
        }
        return $this;
    }
    
    /**
     * 设置允许的请求方法
     *
     * @param array $methods
     * @return $this
     */
    public function setAllowedMethods(array $methods): self
    {
        $this->allowedMethods = $methods;
        return $this;
    }
    
    /**
     * 设置允许的请求头
     *
     * @param array $headers
     * @return $this
     */
    public function setAllowedHeaders(array $headers): self
    {
        $this->allowedHeaders = $headers;
        return $this;
    }
    
    /**
     * 设置暴露的响应头
     *
     * @param array $headers
     * @return $this
     */
    public function setExposedHeaders(array $headers): self
    {
        $this->exposedHeaders = $headers;
        return $this;
    }
}
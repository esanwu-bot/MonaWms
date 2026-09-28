<?php

namespace app\middleware;

use app\common\library\Jwt;
use app\common\Current;
use think\Request;
use think\Response;

/**
 * JWT认证中间件
 */
class Auth
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
        // 获取请求头中的Authorization
        $authorization = $request->header('Authorization');
        
        if (empty($authorization)) {
            return json([
                'code' => 401,
                'message' => '缺少Authorization请求头',
                'data' => null
            ], 401);
        }
        
        // 检查Bearer格式
        if (!preg_match('/^Bearer\s+(\S+)$/', $authorization, $matches)) {
            return json([
                'code' => 401,
                'message' => 'Authorization格式错误',
                'data' => null
            ], 401);
        }
        
        $token = $matches[1];
        
        // 验证JWT令牌
        $payload = Jwt::getPayload($token);
        if ($payload === false) {
            return json([
                'code' => 401,
                'message' => 'Token无效或已过期',
                'data' => null
            ], 401);
        }
        
        // 将用户信息存储到请求中
        $request->user = $payload;

        // 注入请求级上下文，供 Grant / WarehouseScoped 使用
        Current::setUser(
            (int) ($payload['user_id'] ?? 0),
            (string) ($payload['role'] ?? 'operator'),
            $payload['username'] ?? null
        );

        return $next($request);
    }
}
<?php

namespace app\middleware;

use think\Request;
use think\Response;

/**
 * 权限检查中间件
 */
class Permission
{
    /**
     * 权限配置
     */
    private $permissions = [
        'admin' => ['*'], // 管理员拥有所有权限
        'manager' => [
            'warehouse.*',
            'product.*',
            'inventory.*',
            'inbound.*',
            'outbound.*',
            'report.*'
        ],
        'operator' => [
            'warehouse.index',
            'warehouse.read',
            'product.index',
            'product.read',
            'inventory.index',
            'inventory.read',
            'inbound.*',
            'outbound.*'
        ],
        'viewer' => [
            'warehouse.index',
            'warehouse.read',
            'product.index',
            'product.read',
            'inventory.index',
            'inventory.read',
            'report.index',
            'report.read'
        ]
    ];
    
    /**
     * 处理请求
     *
     * @param Request $request
     * @param \Closure $next
     * @param string $permission 需要的权限
     * @return Response
     */
    public function handle($request, \Closure $next, $permission = '')
    {
        // 获取当前用户信息
        $user = $request->user ?? null;
        
        if (empty($user)) {
            return json([
                'code' => 401,
                'message' => '用户未认证',
                'data' => null
            ], 401);
        }
        
        $userRole = $user['role'] ?? 'viewer';
        
        // 检查权限
        if (!$this->checkPermission($userRole, $permission)) {
            return json([
                'code' => 403,
                'message' => '权限不足',
                'data' => null
            ], 403);
        }
        
        return $next($request);
    }
    
    /**
     * 检查权限
     *
     * @param string $role 用户角色
     * @param string $permission 需要的权限
     * @return bool
     */
    private function checkPermission($role, $permission)
    {
        if (empty($permission)) {
            return true;
        }
        
        $rolePermissions = $this->permissions[$role] ?? [];
        
        // 检查是否有通配符权限
        if (in_array('*', $rolePermissions)) {
            return true;
        }
        
        // 检查精确匹配
        if (in_array($permission, $rolePermissions)) {
            return true;
        }
        
        // 检查通配符匹配
        foreach ($rolePermissions as $rolePermission) {
            if (str_ends_with($rolePermission, '.*')) {
                $prefix = substr($rolePermission, 0, -2);
                if (str_starts_with($permission, $prefix . '.')) {
                    return true;
                }
            }
        }
        
        return false;
    }
}
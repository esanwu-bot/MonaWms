<?php

namespace app\controller;

use app\BaseController;
use app\model\User;
use app\common\library\Response;
use think\Request;
use think\facade\Validate;
use app\common\library\Jwt;

/**
 * 认证控制器
 */
class AuthController extends BaseController
{
    
    /**
     * 用户登录
     */
    public function login(Request $request)
    {
        $data = $request->post();
        
        // 验证参数
        $validate = Validate::rule([
            'username' => 'require|max:50',
            'password' => 'require|min:6'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError([$validate->getError()]);
        }
        
        try {
            // 查找用户
            $user = User::where('username', $data['username'])
                       ->where('status', User::STATUS_ACTIVE)
                       ->find();
            
            if (!$user) {
                return Response::error('用户名或密码错误', 401);
            }
            
            // 验证密码
            if (!$user->verifyPassword($data['password'])) {
                return Response::error('用户名或密码错误', 401);
            }
            
            // 生成JWT token
            $payload = [
                'user_id' => $user->id,
                'username' => $user->username,
                'role' => $user->role
            ];
            
            $token = Jwt::encode($payload);
            
            // 生成refresh token（有效期30天）
            $refreshPayload = [
                'user_id' => $user->id,
                'type' => 'refresh'
            ];
            $refreshToken = Jwt::encode($refreshPayload, 30 * 24 * 3600); // 30天
            
            // 更新最后登录时间
            $user->last_login_at = date('Y-m-d H:i:s');
            $user->save();
            
            return Response::success([
                'token' => $token,
                'refreshToken' => $refreshToken,
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'email' => $user->email,
                    'role' => $user->role,
                    'role_text' => $user->role_text,
                    'status' => $user->status,
                    'status_text' => $user->status_text,
                    'last_login_at' => $user->last_login_at
                ]
            ], '登录成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('登录失败：' . $e->getMessage());
        }
    }
    
    /**
     * 用户注册
     */
    public function register(Request $request)
    {
        $data = $request->post();
        
        // 验证参数
        $validate = Validate::rule([
            'username' => 'require|max:50|unique:users',
            'email' => 'require|email|unique:users',
            'password' => 'require|min:6|confirm',
            'role' => 'in:admin,manager,operator,viewer'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            // 创建用户
            $user = new User();
            $user->username = $data['username'];
            $user->email = $data['email'];
            $user->password_hash = $user->hashPassword($data['password']);
            $user->role = $data['role'] ?? 'viewer';
            $user->status = User::STATUS_ACTIVE;
            $user->save();
            
            return Response::success([
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'email' => $user->email,
                    'role' => $user->role,
                    'role_text' => $user->getRoleText(),
                    'status' => $user->status,
                    'status_text' => $user->status_text
                ]
            ], '注册成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('注册失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取当前用户信息
     */
    public function profile(Request $request)
    {
        try {
            $user = $this->getCurrentUser($request);
            
            if (!$user) {
                return Response::unauthorized('用户未登录');
            }
            
            return Response::success([
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'email' => $user->email,
                    'role' => $user->role,
                    'role_text' => $user->getRoleText(),
                    'status' => $user->status,
                    'status_text' => $user->status_text,
                    'created_at' => $user->created_at,
                    'last_login_at' => $user->last_login_at
                ]
            ]);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('获取用户信息失败：' . $e->getMessage());
        }
    }
    
    /**
     * 更新用户信息
     */
    public function updateProfile(Request $request)
    {
        $data = $request->post();
        
        // 验证参数
        $validate = Validate::rule([
            'email' => 'email',
            'old_password' => 'requireWith:new_password',
            'new_password' => 'min:6|confirm'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            $user = $this->getCurrentUser($request);
            
            if (!$user) {
                return Response::unauthorized('用户未登录');
            }
            
            // 更新邮箱
            if (isset($data['email']) && $data['email'] != $user->email) {
                // 检查邮箱是否已存在
                $existUser = User::where('email', $data['email'])
                               ->where('id', '<>', $user->id)
                               ->find();
                if ($existUser) {
                    return Response::error('邮箱已被使用');
                }
                $user->email = $data['email'];
            }
            
            // 更新密码
            if (isset($data['new_password'])) {
                if (!$user->verifyPassword($data['old_password'])) {
                    return Response::error('原密码错误');
                }
                $user->password_hash = $user->hashPassword($data['new_password']);
            }
            
            $user->save();
            
            return Response::success([
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'email' => $user->email,
                    'role' => $user->role,
                    'role_text' => $user->getRoleText(),
                    'status' => $user->status,
                    'status_text' => $user->status_text
                ]
            ], '更新成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('更新失败：' . $e->getMessage());
        }
    }
    
    /**
     * 用户退出
     */
    public function logout(Request $request)
    {
        // JWT是无状态的，客户端删除token即可
        return Response::success([], '退出成功');
    }
    
    /**
     * 刷新token
     */
    public function refresh(Request $request)
    {
        try {
            $data = $request->post();
            $refreshToken = $data['refreshToken'] ?? '';
            
            if (!$refreshToken) {
                return Response::validateError(['refreshToken不能为空']);
            }
            
            // 验证refresh token
            $payload = Jwt::getPayload($refreshToken);
            if (!$payload || !isset($payload['user_id']) || !isset($payload['type']) || $payload['type'] !== 'refresh') {
                return Response::unauthorized('无效的refreshToken');
            }
            
            // 获取用户信息
            $user = User::find($payload['user_id']);
            if (!$user) {
                return Response::unauthorized('用户不存在');
            }
            
            // 生成新的access token
            $newPayload = [
                'user_id' => $user->id,
                'username' => $user->username,
                'role' => $user->role
            ];
            
            $newToken = Jwt::encode($newPayload);
            
            // 生成新的refresh token
            $newRefreshPayload = [
                'user_id' => $user->id,
                'type' => 'refresh'
            ];
            $newRefreshToken = Jwt::encode($newRefreshPayload, 30 * 24 * 3600); // 30天
            
            return Response::success([
                'token' => $newToken,
                'refreshToken' => $newRefreshToken
            ], 'Token刷新成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('Token刷新失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取当前登录用户
     */
    private function getCurrentUser(Request $request)
    {
        $token = $request->header('Authorization');
        
        if (!$token) {
            return null;
        }
        
        // 移除Bearer前缀
        if (strpos($token, 'Bearer ') === 0) {
            $token = substr($token, 7);
        }
        
        try {
            $payload = Jwt::getPayload($token);
            if ($payload) {
                $userId = $payload['user_id'];
                return User::find($userId);
            }
            return null;
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return null;
        }
    }
}
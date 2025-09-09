<?php

namespace app\service;

use app\model\User;
use think\exception\ValidateException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use think\facade\Config;
use think\facade\Cache;

/**
 * 认证服务类
 */
class AuthService
{
    /**
     * 用户登录
     * @param string $username 用户名
     * @param string $password 密码
     * @return array
     * @throws ValidateException
     */
    public function login(string $username, string $password): array
    {
        // 查找用户
        $user = User::where('username', $username)->find();
        if (!$user) {
            throw new ValidateException('用户名或密码错误');
        }

        // 验证密码
        if (!password_verify($password, $user->password)) {
            throw new ValidateException('用户名或密码错误');
        }

        // 检查用户状态
        if ($user->status !== 1) {
            throw new ValidateException('用户已被禁用');
        }

        // 更新最后登录时间
        $user->last_login_time = date('Y-m-d H:i:s');
        $user->save();

        // 生成JWT令牌
        $token = $this->generateToken($user);
        $refreshToken = $this->generateRefreshToken($user);

        return [
            'user' => $user->hidden(['password'])->toArray(),
            'token' => $token,
            'refresh_token' => $refreshToken,
            'expires_in' => Config::get('jwt.ttl', 3600)
        ];
    }

    /**
     * 用户注册
     * @param array $data 用户数据
     * @return User
     * @throws ValidateException
     */
    public function register(array $data): User
    {
        // 检查用户名是否已存在
        if (User::where('username', $data['username'])->find()) {
            throw new ValidateException('用户名已存在');
        }

        // 检查邮箱是否已存在
        if (isset($data['email']) && User::where('email', $data['email'])->find()) {
            throw new ValidateException('邮箱已存在');
        }

        // 加密密码
        $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        $data['status'] = 1; // 默认启用
        $data['created_time'] = date('Y-m-d H:i:s');

        // 创建用户
        $user = User::create($data);
        return $user;
    }

    /**
     * 刷新令牌
     * @param string $refreshToken 刷新令牌
     * @return array
     * @throws ValidateException
     */
    public function refreshToken(string $refreshToken): array
    {
        try {
            $key = Config::get('jwt.key');
            $decoded = JWT::decode($refreshToken, new Key($key, 'HS256'));
            
            // 检查是否为刷新令牌
            if ($decoded->type !== 'refresh') {
                throw new ValidateException('无效的刷新令牌');
            }

            // 查找用户
            $user = User::find($decoded->user_id);
            if (!$user || $user->status !== 1) {
                throw new ValidateException('用户不存在或已被禁用');
            }

            // 生成新的访问令牌
            $token = $this->generateToken($user);
            $newRefreshToken = $this->generateRefreshToken($user);

            return [
                'token' => $token,
                'refresh_token' => $newRefreshToken,
                'expires_in' => Config::get('jwt.ttl', 3600)
            ];
        } catch (\Exception $e) {
            throw new ValidateException('刷新令牌无效或已过期');
        }
    }

    /**
     * 验证令牌
     * @param string $token JWT令牌
     * @return User
     * @throws ValidateException
     */
    public function verifyToken(string $token): User
    {
        try {
            $key = Config::get('jwt.key');
            $decoded = JWT::decode($token, new Key($key, 'HS256'));
            
            // 检查是否为访问令牌
            if ($decoded->type !== 'access') {
                throw new ValidateException('无效的访问令牌');
            }

            // 查找用户
            $user = User::find($decoded->user_id);
            if (!$user || $user->status !== 1) {
                throw new ValidateException('用户不存在或已被禁用');
            }

            return $user;
        } catch (\Exception $e) {
            throw new ValidateException('令牌无效或已过期');
        }
    }

    /**
     * 用户登出
     * @param string $token JWT令牌
     * @return bool
     */
    public function logout(string $token): bool
    {
        try {
            $key = Config::get('jwt.key');
            $decoded = JWT::decode($token, new Key($key, 'HS256'));
            
            // 将令牌加入黑名单（使用缓存）
            $expireTime = $decoded->exp - time();
            if ($expireTime > 0) {
                Cache::set('blacklist_token_' . md5($token), true, $expireTime);
            }
            
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * 检查令牌是否在黑名单中
     * @param string $token JWT令牌
     * @return bool
     */
    public function isTokenBlacklisted(string $token): bool
    {
        return Cache::has('blacklist_token_' . md5($token));
    }

    /**
     * 生成访问令牌
     * @param User $user 用户对象
     * @return string
     */
    private function generateToken(User $user): string
    {
        $key = Config::get('jwt.key');
        $ttl = Config::get('jwt.ttl', 3600);
        
        $payload = [
            'iss' => Config::get('app.app_host', 'localhost'), // 签发者
            'aud' => Config::get('app.app_host', 'localhost'), // 接收者
            'iat' => time(), // 签发时间
            'exp' => time() + $ttl, // 过期时间
            'user_id' => $user->id,
            'username' => $user->username,
            'role' => $user->role,
            'type' => 'access'
        ];

        return JWT::encode($payload, $key, 'HS256');
    }

    /**
     * 生成刷新令牌
     * @param User $user 用户对象
     * @return string
     */
    private function generateRefreshToken(User $user): string
    {
        $key = Config::get('jwt.key');
        $refreshTtl = Config::get('jwt.refresh_ttl', 604800); // 7天
        
        $payload = [
            'iss' => Config::get('app.app_host', 'localhost'),
            'aud' => Config::get('app.app_host', 'localhost'),
            'iat' => time(),
            'exp' => time() + $refreshTtl,
            'user_id' => $user->id,
            'type' => 'refresh'
        ];

        return JWT::encode($payload, $key, 'HS256');
    }

    /**
     * 修改密码
     * @param User $user 用户对象
     * @param string $oldPassword 旧密码
     * @param string $newPassword 新密码
     * @return bool
     * @throws ValidateException
     */
    public function changePassword(User $user, string $oldPassword, string $newPassword): bool
    {
        // 验证旧密码
        if (!password_verify($oldPassword, $user->password)) {
            throw new ValidateException('原密码错误');
        }

        // 更新密码
        $user->password = password_hash($newPassword, PASSWORD_DEFAULT);
        $user->updated_time = date('Y-m-d H:i:s');
        
        return $user->save();
    }

    /**
     * 重置密码
     * @param string $username 用户名
     * @param string $newPassword 新密码
     * @return bool
     * @throws ValidateException
     */
    public function resetPassword(string $username, string $newPassword): bool
    {
        $user = User::where('username', $username)->find();
        if (!$user) {
            throw new ValidateException('用户不存在');
        }

        $user->password = password_hash($newPassword, PASSWORD_DEFAULT);
        $user->updated_time = date('Y-m-d H:i:s');
        
        return $user->save();
    }
}
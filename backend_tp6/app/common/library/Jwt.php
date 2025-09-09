<?php

namespace app\common\library;

use Firebase\JWT\JWT as FirebaseJWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;
use Firebase\JWT\BeforeValidException;

/**
 * JWT工具类
 */
class Jwt
{
    /**
     * JWT密钥
     */
    private static $key;
    
    /**
     * JWT算法
     */
    private static $alg = 'HS256';
    
    /**
     * JWT过期时间（秒）
     */
    private static $exp = 7200;
    
    /**
     * 初始化配置
     */
    private static function init()
    {
        if (empty(self::$key)) {
            self::$key = env('jwt.key', 'monawms_jwt_secret_key_2024');
            self::$alg = env('jwt.alg', 'HS256');
            self::$exp = env('jwt.exp', 7200);
        }
    }
    
    /**
     * 生成JWT令牌
     * @param array $payload 载荷数据
     * @param int $customExp 自定义过期时间（秒），为null时使用默认过期时间
     * @return string
     */
    public static function encode($payload, $customExp = null)
    {
        self::init();
        
        $time = time();
        $expTime = $customExp !== null ? $customExp : self::$exp;
        $token = [
            'iss' => 'MonaWMS',           // 签发者
            'aud' => 'MonaWMS-Client',    // 接收者
            'iat' => $time,               // 签发时间
            'nbf' => $time,               // 生效时间
            'exp' => $time + $expTime,    // 过期时间
            'data' => $payload            // 用户数据
        ];
        
        return FirebaseJWT::encode($token, self::$key, self::$alg);
    }
    
    /**
     * 解析JWT令牌
     * @param string $token JWT令牌
     * @return object|false
     */
    public static function decode($token)
    {
        self::init();
        
        try {
            $decoded = FirebaseJWT::decode($token, new Key(self::$key, self::$alg));
            return $decoded;
        } catch (ExpiredException $e) {
            // 令牌过期
            return false;
        } catch (SignatureInvalidException $e) {
            // 签名无效
            return false;
        } catch (BeforeValidException $e) {
            // 令牌尚未生效
            return false;
        } catch (\Exception $e) {
            // 其他异常
            return false;
        }
    }
    
    /**
     * 验证JWT令牌
     * @param string $token JWT令牌
     * @return bool
     */
    public static function verify($token)
    {
        return self::decode($token) !== false;
    }
    
    /**
     * 获取JWT载荷数据
     * @param string $token JWT令牌
     * @return array|false
     */
    public static function getPayload($token)
    {
        $decoded = self::decode($token);
        if ($decoded === false) {
            return false;
        }
        
        return (array)$decoded->data;
    }
    
    /**
     * 刷新JWT令牌
     * @param string $token 原JWT令牌
     * @return string|false
     */
    public static function refresh($token)
    {
        $payload = self::getPayload($token);
        if ($payload === false) {
            return false;
        }
        
        return self::encode($payload);
    }
}
<?php

// 引入ThinkPHP框架
require_once __DIR__ . '/vendor/autoload.php';

// 启动应用
$app = new \think\App();
$app->initialize();

try {
    // 模拟登录请求
    $data = [
        'username' => 'admin',
        'password' => 'password'
    ];
    
    echo "开始测试登录逻辑...\n";
    
    // 验证参数
    $validate = \think\facade\Validate::rule([
        'username' => 'require|max:50',
        'password' => 'require|min:6'
    ]);
    
    if (!$validate->check($data)) {
        echo "验证失败: " . $validate->getError() . "\n";
        exit;
    }
    
    echo "参数验证通过\n";
    
    // 查找用户
    $user = \app\model\User::where('username', $data['username'])
                   ->where('status', \app\model\User::STATUS_ACTIVE)
                   ->find();
    
    if (!$user) {
        echo "用户不存在或未激活\n";
        exit;
    }
    
    echo "找到用户: " . $user->username . "\n";
    
    // 验证密码
    if (!$user->verifyPassword($data['password'])) {
        echo "密码验证失败\n";
        exit;
    }
    
    echo "密码验证通过\n";
    
    // 生成JWT token
    $payload = [
        'user_id' => $user->id,
        'username' => $user->username,
        'role' => $user->role
    ];
    
    echo "开始生成JWT token...\n";
    $token = \app\common\library\Jwt::encode($payload);
    
    echo "JWT token生成成功: " . substr($token, 0, 50) . "...\n";
    
    // 生成refresh token
    $refreshPayload = [
        'user_id' => $user->id,
        'type' => 'refresh'
    ];
    $refreshToken = \app\common\library\Jwt::encode($refreshPayload, 30 * 24 * 3600);
    
    echo "Refresh token生成成功: " . substr($refreshToken, 0, 50) . "...\n";
    
    echo "登录测试成功！\n";
    
} catch (\Exception $e) {
    echo "登录测试失败: " . $e->getMessage() . "\n";
    echo "错误文件: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "错误堆栈: " . $e->getTraceAsString() . "\n";
}
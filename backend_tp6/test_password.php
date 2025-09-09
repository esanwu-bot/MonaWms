<?php
// 测试密码验证

try {
    // 直接使用数据库配置
    $host = '47.119.22.120';
    $dbname = 'monawms';
    $username = 'monawms';
    $password = 'pFxA54yZeBw35naZ';
    $port = '3306';
    
    $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    
    // 获取用户密码哈希
    $stmt = $pdo->query("SELECT username, password_hash FROM users WHERE username = 'admin'");
    $user = $stmt->fetch();
    
    if ($user) {
        echo "用户名: {$user['username']}\n";
        echo "密码哈希: {$user['password_hash']}\n";
        
        // 测试不同的密码
        $testPasswords = ['123456', 'admin', 'password', 'admin123'];
        
        foreach ($testPasswords as $testPassword) {
            $isValid = password_verify($testPassword, $user['password_hash']);
            echo "密码 '$testPassword': " . ($isValid ? '正确' : '错误') . "\n";
        }
        
        // 生成新的密码哈希用于比较
        echo "\n为密码 '123456' 生成的新哈希: " . password_hash('123456', PASSWORD_DEFAULT) . "\n";
        
    } else {
        echo "未找到admin用户\n";
    }
    
} catch (Exception $e) {
    echo "错误: " . $e->getMessage() . "\n";
}
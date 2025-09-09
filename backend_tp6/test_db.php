<?php
// 测试数据库连接

try {
    // 直接使用数据库配置
    $host = '47.119.22.120';
    $dbname = 'monawms';
    $username = 'monawms';
    $password = 'pFxA54yZeBw35naZ';
    $port = '3306';
    
    echo "尝试连接数据库...\n";
    echo "Host: $host\n";
    echo "Database: $dbname\n";
    echo "Username: $username\n";
    echo "Port: $port\n";
    
    $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    
    echo "数据库连接成功！\n";
    
    // 测试查询
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
    $result = $stmt->fetch();
    echo "用户表记录数: " . $result['count'] . "\n";
    
    // 查看表结构
    $stmt = $pdo->query("DESCRIBE users");
    $columns = $stmt->fetchAll();
    echo "\n用户表结构:\n";
    foreach ($columns as $column) {
        echo "字段: {$column['Field']}, 类型: {$column['Type']}, 允许空值: {$column['Null']}\n";
    }
    
    // 查询用户信息
    $stmt = $pdo->query("SELECT * FROM users LIMIT 5");
    $users = $stmt->fetchAll();
    echo "\n用户信息:\n";
    foreach ($users as $user) {
        print_r($user);
    }
    
} catch (Exception $e) {
    echo "数据库连接失败: " . $e->getMessage() . "\n";
    echo "错误代码: " . $e->getCode() . "\n";
}
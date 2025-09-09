<?php
// 测试customers表是否存在

try {
    // 直接使用数据库配置
    $host = '47.119.22.120';
    $dbname = 'monawms';
    $username = 'monawms';
    $password = 'pFxA54yZeBw35naZ';
    $port = '3306';
    
    echo "尝试连接数据库...\n";
    
    $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    
    echo "数据库连接成功！\n";
    
    // 检查所有表
    echo "\n检查数据库中的所有表:\n";
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll();
    foreach ($tables as $table) {
        echo "- " . array_values($table)[0] . "\n";
    }
    
    // 检查customers表是否存在
    $stmt = $pdo->query("SHOW TABLES LIKE 'customers'");
    $customersTable = $stmt->fetch();
    
    if ($customersTable) {
        echo "\ncustomers表存在！\n";
        
        // 查看customers表结构
        $stmt = $pdo->query("DESCRIBE customers");
        $columns = $stmt->fetchAll();
        echo "\ncustomers表结构:\n";
        foreach ($columns as $column) {
            echo "字段: {$column['Field']}, 类型: {$column['Type']}, 允许空值: {$column['Null']}\n";
        }
        
        // 查询customers表记录数
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM customers");
        $result = $stmt->fetch();
        echo "\ncustomers表记录数: " . $result['count'] . "\n";
        
    } else {
        echo "\ncustomers表不存在！需要创建表。\n";
        
        // 读取并执行SQL文件
        echo "\n正在创建customers表...\n";
        $sqlFile = file_get_contents('database/migrations/create_tables.sql');
        
        // 分割SQL语句
        $statements = explode(';', $sqlFile);
        
        foreach ($statements as $statement) {
            $statement = trim($statement);
            if (!empty($statement)) {
                try {
                    $pdo->exec($statement);
                } catch (Exception $e) {
                    // 忽略已存在的表错误
                    if (strpos($e->getMessage(), 'already exists') === false) {
                        echo "执行SQL时出错: " . $e->getMessage() . "\n";
                    }
                }
            }
        }
        
        echo "数据库表创建完成！\n";
        
        // 再次检查customers表
        $stmt = $pdo->query("SHOW TABLES LIKE 'customers'");
        $customersTable = $stmt->fetch();
        
        if ($customersTable) {
            echo "customers表创建成功！\n";
        } else {
            echo "customers表创建失败！\n";
        }
    }
    
} catch (Exception $e) {
    echo "错误: " . $e->getMessage() . "\n";
    echo "错误代码: " . $e->getCode() . "\n";
}
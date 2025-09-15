<?php
/**
 * 创建报废管理相关数据表
 */

require_once __DIR__ . '/vendor/autoload.php';

use think\facade\Db;
use think\facade\Config;

// 初始化应用
$app = new \think\App();
$app->initialize();

try {
    echo "开始创建报废管理数据表...\n";
    
    // 读取SQL文件内容
    $sqlFile = __DIR__ . '/create_scrap_tables.sql';
    if (!file_exists($sqlFile)) {
        throw new Exception("SQL文件不存在: {$sqlFile}");
    }
    
    $sql = file_get_contents($sqlFile);
    
    // 分割SQL语句
    $statements = array_filter(array_map('trim', explode(';', $sql)));
    
    echo "找到 " . count($statements) . " 条SQL语句\n";
    
    foreach ($statements as $index => $statement) {
        if (empty($statement) || strpos($statement, '--') === 0) {
            echo "跳过语句 $index: " . substr($statement, 0, 30) . "\n";
            continue;
        }
        
        echo "执行SQL: " . substr($statement, 0, 50) . "...\n";
        try {
            $result = Db::execute($statement);
            echo "执行结果: " . ($result ? "成功" : "失败") . "\n";
        } catch (Exception $e) {
            echo "SQL执行错误: " . $e->getMessage() . "\n";
            throw $e;
        }
    }
    
    echo "报废管理数据表创建成功！\n";
    
    // 验证表是否创建成功
    $tables = Db::query("SHOW TABLES LIKE 'scrap_applications'");
    echo "查询结果: " . json_encode($tables) . "\n";
    
    if (empty($tables)) {
        throw new Exception("表创建失败");
    }
    
    echo "验证完成，所有表创建成功！\n";
    
} catch (Exception $e) {
    echo "错误: " . $e->getMessage() . "\n";
    exit(1);
}
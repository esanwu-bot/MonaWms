<?php
// 测试客户API

require_once 'vendor/autoload.php';

// 初始化ThinkPHP应用
$app = new \think\App();
$app->initialize();

try {
    // 创建请求对象
    $request = \think\facade\Request::create('http://localhost/api/customers', 'GET');
    
    // 创建控制器实例
    $controller = new \app\controller\CustomerController($app);
    
    echo "正在测试客户API...\n";
    
    // 调用index方法
    $response = $controller->index($request);
    
    echo "API调用成功！\n";
    echo "响应内容: " . $response->getContent() . "\n";
    
} catch (\Exception $e) {
    echo "API调用失败: " . $e->getMessage() . "\n";
    echo "错误文件: " . $e->getFile() . "\n";
    echo "错误行号: " . $e->getLine() . "\n";
    echo "错误堆栈: " . $e->getTraceAsString() . "\n";
}
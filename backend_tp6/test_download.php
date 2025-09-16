<?php
require_once 'vendor/autoload.php';

// 模拟创建模板文件
$templatePath = __DIR__ . '/public/templates/inbound_template.xlsx';

// 确保目录存在
$dir = dirname($templatePath);
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

// 检查文件是否已存在
if (file_exists($templatePath)) {
    echo "Template file already exists at: " . $templatePath . "\n";
    echo "File size: " . filesize($templatePath) . " bytes\n";
    echo "File is readable: " . (is_readable($templatePath) ? 'Yes' : 'No') . "\n";
} else {
    echo "Template file does not exist, would need to create it.\n";
}

// 测试文件路径
echo "Template path: " . $templatePath . "\n";
echo "Directory exists: " . (is_dir($dir) ? 'Yes' : 'No') . "\n";
echo "Directory is writable: " . (is_writable($dir) ? 'Yes' : 'No') . "\n";
?>
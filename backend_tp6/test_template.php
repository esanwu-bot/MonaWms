<?php
require_once 'vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;

try {
    $templatePath = __DIR__ . '/public/templates/test_template.xlsx';
    
    // 确保目录存在
    $dir = dirname($templatePath);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    
    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
    
    // 设置标题行
    $headers = [
        'A1' => '入库单号',
        'B1' => '供应商名称',
        'C1' => '仓库名称',
        'D1' => '预期到货日期',
        'E1' => '备注',
        'F1' => '商品代码',
        'G1' => '商品名称',
        'H1' => '数量',
        'I1' => '单位'
    ];
    
    foreach ($headers as $cell => $value) {
        $sheet->setCellValue($cell, $value);
    }
    
    // 添加示例数据
    $sheet->setCellValue('A2', 'IN202401150001');
    $sheet->setCellValue('B2', '供应商A');
    $sheet->setCellValue('C2', '主仓库');
    $sheet->setCellValue('D2', '2024-01-15');
    $sheet->setCellValue('E2', '批量导入测试');
    $sheet->setCellValue('F2', 'P001');
    $sheet->setCellValue('G2', '商品1');
    $sheet->setCellValue('H2', '100');
    $sheet->setCellValue('I2', '件');
    
    // 设置样式
    $sheet->getStyle('A1:I1')->getFont()->setBold(true);
    $sheet->getStyle('A1:I1')->getFill()->setFillType(Fill::FILL_SOLID)
          ->getStartColor()->setRGB('E6E6FA');
    
    // 设置边框
    $sheet->getStyle('A1:I2')->getBorders()->getAllBorders()
          ->setBorderStyle(Border::BORDER_THIN);
    
    // 设置列宽
    $sheet->getColumnDimension('A')->setWidth(15);
    $sheet->getColumnDimension('B')->setWidth(12);
    $sheet->getColumnDimension('C')->setWidth(12);
    $sheet->getColumnDimension('D')->setWidth(12);
    $sheet->getColumnDimension('E')->setWidth(20);
    $sheet->getColumnDimension('F')->setWidth(12);
    $sheet->getColumnDimension('G')->setWidth(20);
    $sheet->getColumnDimension('H')->setWidth(8);
    $sheet->getColumnDimension('I')->setWidth(8);
    
    $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
    $writer->save($templatePath);
    
    echo "Template created successfully at: " . $templatePath . "\n";
    echo "File size: " . filesize($templatePath) . " bytes\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
?>
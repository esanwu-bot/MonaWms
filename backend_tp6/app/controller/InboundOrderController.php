<?php

namespace app\controller;

use app\BaseController;
use app\common\Current;
use app\common\Grant;
use app\model\InboundOrder;
use app\model\InboundOrderItem;
use app\model\Warehouse;
use app\model\Supplier;
use app\model\Product;
use app\model\Location;
use app\common\library\Response;
use think\Request;
use think\facade\Validate;
use think\facade\Db;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;

/**
 * 入库单管理控制器
 */
class InboundOrderController extends BaseController
{
    /**
     * 获取入库单列表
     */
    public function index(Request $request)
    {
        try {
            $params = $request->get();
            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 15;

            // 归档筛选：缺省=未归档（软删自动排除）；archived=仅归档；all=全部
            $archived = $params['archived'] ?? '';
            if ($archived === 'archived') {
                $query = InboundOrder::onlyTrashed()->with(['warehouse', 'supplier', 'operator']);
            } elseif ($archived === 'all') {
                $query = InboundOrder::withTrashed()->with(['warehouse', 'supplier', 'operator']);
            } else {
                $query = InboundOrder::with(['warehouse', 'supplier', 'operator']);
            }

            if (Current::role() !== 'admin' && Current::grantRole() !== 'manager') {
                $query->where('created_by', Current::idOrNull());
            }

            // 负责人筛选（经办人）
            if (!empty($params['operator_id'])) {
                $query->where('operator_id', (int) $params['operator_id']);
            }
            
            // 搜索条件
            $searchFields = [];
            if (!empty($params['order_number'])) {
                $searchFields['order_number'] = $params['order_number'];
            }
            
            if (!empty($params['warehouse_id'])) {
                $searchFields['warehouse_id'] = $params['warehouse_id'];
            }
            
            if (!empty($params['supplier_id'])) {
                $searchFields['supplier_id'] = $params['supplier_id'];
            }
            
            if (!empty($params['status'])) {
                $searchFields['status'] = $params['status'];
            }
            
            if (!empty($params['type'])) {
                $searchFields['type'] = $params['type'];
            }
            
            // I3：来源筛选
            if (!empty($params['source'])) {
                $searchFields['source'] = $params['source'];
            }
            
            if (!empty($params['expected_date_start'])) {
                $query->where('expected_date', '>=', $params['expected_date_start']);
            }
            
            if (!empty($params['expected_date_end'])) {
                $query->where('expected_date', '<=', $params['expected_date_end']);
            }
            
            if (!empty($searchFields)) {
                $query->withSearch(array_keys($searchFields), $searchFields);
            }
            
            // 分页查询
            $result = $query->order('created_at', 'desc')
                          ->paginate([
                              'list_rows' => $limit,
                              'page' => $page
                          ]);
            
            $list = [];
            foreach ($result->items() as $order) {
                $item = $order->toArray();
                $item['status_text'] = $order->status_text;
                $item['type_text'] = $order->getTypeText();
                $item['warehouse_name'] = $order->warehouse->name ?? '';
                $item['supplier_name'] = $order->supplier->name ?? '';
                $item['operator_name'] = $order->operator->username ?? '';
                $item['statistics'] = $order->getStatistics();
                // 归档标记：前端据此展示「已归档」Tag
                $item['is_archived'] = !empty($order->getData('deleted_at'));
                $item['archived_at'] = $order->getData('deleted_at');
                $list[] = $item;
            }
            
            return Response::paginate($list, $result->total(), $page, $limit);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('获取入库单列表失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取入库单详情
     */
    public function read(Request $request, $id)
    {
        try {
            // withTrashed：已归档单据详情仍可翻查
            $order = InboundOrder::withTrashed()->with(['warehouse', 'supplier', 'operator', 'items.product', 'items.location'])->find($id);

            if (!$order) {
                return Response::notFound('入库单不存在');
            }
            
            $data = $order->getDetailInfo();
            
            return Response::success($data);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('获取入库单详情失败：' . $e->getMessage());
        }
    }

    /**
     * 批量导入入库单
     */
    public function batchImport(Request $request)
    {
        try {
            $file = $request->file('file');
            if (!$file) {
                return Response::badRequest('请上传Excel文件');
            }

            // 验证文件类型
            $allowedTypes = ['xlsx', 'xls'];
            $extension = $file->getOriginalExtension();
            if (!in_array($extension, $allowedTypes)) {
                return Response::badRequest('只支持Excel文件格式(.xlsx, .xls)');
            }

            // 保存上传文件
            $savePath = $file->store('imports');
            $filePath = app()->getRootPath() . 'public/storage/' . $savePath;

            // 解析Excel文件
            $data = $this->parseExcelFile($filePath);
            
            if (empty($data)) {
                return Response::badRequest('Excel文件为空或格式不正确');
            }

            // 验证数据
            $validationResult = $this->validateBatchData($data);
            if (!$validationResult['success']) {
                return Response::badRequest('数据验证失败', $validationResult['errors']);
            }

            // 批量创建入库单
            $results = $this->createBatchInboundOrders($data);
            
            // 删除临时文件
            @unlink($filePath);

            return Response::success($results, '批量导入完成');

        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('批量导入失败：' . $e->getMessage());
        }
    }

    /**
     * 下载批量导入模板
     */
    public function downloadTemplate()
    {
        try {
            $templatePath = app()->getRootPath() . 'public/templates/inbound_template.xlsx';
            
            if (!file_exists($templatePath)) {
                // 创建模板文件
                $this->createTemplate($templatePath);
            }

            // 检查文件是否存在且可读
            if (!file_exists($templatePath) || !is_readable($templatePath)) {
                return Response::serverError('模板文件不存在或无法读取');
            }

            // 设置正确的文件名，使用URL编码处理中文
            $filename = 'inbound_import_template.xlsx';
            
            // 设置响应头
            $headers = [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"; filename*=UTF-8\'\'' . rawurlencode('入库单导入模板.xlsx'),
                'Content-Length' => filesize($templatePath),
                'Cache-Control' => 'max-age=0',
                'Expires' => '0',
                'Last-Modified' => gmdate('D, d M Y H:i:s') . ' GMT',
                'Pragma' => 'public'
            ];

            return download($templatePath, $filename, $headers);

        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('下载模板失败：' . $e->getMessage());
        }
    }
    
    /**
     * 创建入库单
     */
    public function save(Request $request)
    {
        $data = $request->post();
        Grant::assert('inbound:write', (int) $data['warehouse_id']);
        
        // 验证参数：直接实例化 think\Validate，避免门面单例导致 items.* 通配规则失效
        $validate = new \think\Validate([
            'warehouse_id' => 'require|integer',
            'supplier_id' => 'integer',                 // I4：采购来源时必填，其他来源可选
            'source' => 'in:purchase,transfer_in,return_in,project_return,borrow_return,inventory_gain,other',
            'received_at' => 'date',                    // C1：入库时间
            'type' => 'require|in:purchase,return,transfer,other',
            'expected_date' => 'require|date',
            'notes' => 'max:500',
            'items' => 'require|array',
            // A4：数量允许小数（计件类在下方按物资计量方式二次校验）
            'items.*.quantity' => 'require|float|>:0',
            'items.*.unit_price' => 'float|>=:0',
            'items.*.batch_number' => 'max:50',
            'items.*.expiry_date' => 'date',
            'items.*.notes' => 'max:255'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        // I4：来源为采购入库时供应商必填
        $source = $data['source'] ?? 'purchase';
        if ($source === 'purchase' && empty($data['supplier_id'])) {
            return Response::validateError('来源为采购入库时，供应商必填');
        }
        
        Db::startTrans();
        try {
            // 验证仓库和供应商是否存在
            $warehouse = Warehouse::find($data['warehouse_id']);
            if (!$warehouse) {
                throw new \Exception('仓库不存在');
            }
            
            if (!empty($data['supplier_id'])) {
                $supplier = Supplier::find($data['supplier_id']);
                if (!$supplier) {
                    throw new \Exception('供应商不存在');
                }
            }
            
            // 创建入库单
            $order = new InboundOrder();
            $order->order_number = InboundOrder::generateOrderNumber();
            $order->warehouse_id = $data['warehouse_id'];
            $order->supplier_id = $data['supplier_id'] ?? null;
            $order->source = $data['source'] ?? 'purchase';   // I2：入库来源
            $order->received_at = $data['received_at'] ?? null; // C1：入库时间
            $order->operator_id = $this->getCurrentUserId($request);
            $order->created_by = Current::idOrNull();
            $order->status = InboundOrder::STATUS_PENDING;
            $order->type = $data['type'];
            $order->expected_date = $data['expected_date'];
            $order->notes = $data['notes'] ?? '';
            $order->save();
            
            // 创建入库单明细
            foreach ($data['items'] as $itemData) {
                // 验证商品是否存在
                $product = Product::find($itemData['product_id']);
                if (!$product) {
                    throw new \Exception('商品ID ' . $itemData['product_id'] . ' 不存在');
                }
                
                // A4：按物资计量方式校验数量（计件类必须正整数，长度/重量类允许 4 位小数）
                try {
                    $product->assertQuantityValid((string) $itemData['quantity']);
                } catch (\InvalidArgumentException $e) {
                    throw new \Exception($product->name . '：' . $e->getMessage());
                }
                
                $item = new InboundOrderItem();
                $item->inbound_order_id = $order->id;
                $item->product_id = $itemData['product_id'];
                $item->unit = $product->unit ?: '件';                        // A6：单位快照
                $item->requires_serial = $product->requiresSerial() ? 1 : 0;  // E1：由计量方式推导
                $item->quantity = (string) $itemData['quantity'];
                $item->received_quantity = 0;
                $item->unit_price = (string) ($itemData['unit_price'] ?? 0);
                $item->batch_number = $itemData['batch_number'] ?? '';
                $item->expiry_date = $itemData['expiry_date'] ?? null;
                $item->notes = $itemData['notes'] ?? '';
                $item->save();
            }
            
            Db::commit();
            
            return Response::success([
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'status_text' => $order->status_text
            ], '入库单创建成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            Db::rollback();
            return Response::serverError('创建入库单失败：' . $e->getMessage());
        }
    }

    /**
     * 解析Excel文件
     */
    private function parseExcelFile($filePath)
    {
        try {
            $spreadsheet = IOFactory::load($filePath);
            $worksheet = $spreadsheet->getActiveSheet();
            $highestRow = $worksheet->getHighestRow();
            $data = [];
            
            // 从第2行开始读取数据（第1行为标题）
            for ($row = 2; $row <= $highestRow; $row++) {
                $orderNumber = $worksheet->getCell('A' . $row)->getCalculatedValue();
                $supplierName = $worksheet->getCell('B' . $row)->getCalculatedValue();
                $warehouseName = $worksheet->getCell('C' . $row)->getCalculatedValue();
                $expectedDate = $worksheet->getCell('D' . $row)->getCalculatedValue();
                $remark = $worksheet->getCell('E' . $row)->getCalculatedValue();
                $productCode = $worksheet->getCell('F' . $row)->getCalculatedValue();
                $productName = $worksheet->getCell('G' . $row)->getCalculatedValue();
                $quantity = $worksheet->getCell('H' . $row)->getCalculatedValue();
                $unit = $worksheet->getCell('I' . $row)->getCalculatedValue();
                
                // 跳过空行
                if (empty($orderNumber) && empty($supplierName)) {
                    continue;
                }
                
                // 处理日期格式
                if (is_numeric($expectedDate)) {
                    $expectedDate = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($expectedDate)->format('Y-m-d');
                }
                
                // 按入库单号分组
                $key = $orderNumber ?: 'IN' . date('YmdHis') . sprintf('%03d', $row - 1);
                
                if (!isset($data[$key])) {
                    $data[$key] = [
                        'order_number' => $key,
                        'supplier_name' => $supplierName,
                        'warehouse_name' => $warehouseName,
                        'expected_date' => $expectedDate,
                        'remark' => $remark,
                        'items' => []
                    ];
                }
                
                // 添加商品明细
                if (!empty($productCode)) {
                    $data[$key]['items'][] = [
                        'product_code' => $productCode,
                        'product_name' => $productName,
                        'quantity' => (int)$quantity,
                        'unit' => $unit ?: '件'
                    ];
                }
            }
            
            return array_values($data);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            throw new \Exception('Excel文件解析失败: ' . $e->getMessage());
        }
    }

    /**
     * 验证批量数据
     */
    private function validateBatchData($data)
    {
        $errors = [];
        $validData = [];
        
        foreach ($data as $index => $row) {
            $rowErrors = [];
            $rowIndex = $index + 2; // Excel行号（从第2行开始）
            
            // 验证必填字段
            if (empty($row['order_number'])) {
                $rowErrors[] = "第{$rowIndex}行：入库单号不能为空";
            }
            
            if (empty($row['warehouse_code'])) {
                $rowErrors[] = "第{$rowIndex}行：仓库编码不能为空";
            }
            
            if (empty($row['product_code'])) {
                $rowErrors[] = "第{$rowIndex}行：产品编码不能为空";
            }
            
            if (empty($row['quantity']) || !is_numeric($row['quantity']) || $row['quantity'] <= 0) {
                $rowErrors[] = "第{$rowIndex}行：数量必须为大于0的数字";
            }
            
            if (!empty($row['unit_price']) && (!is_numeric($row['unit_price']) || $row['unit_price'] < 0)) {
                $rowErrors[] = "第{$rowIndex}行：单价必须为非负数字";
            }
            
            // 验证仓库是否存在
            if (!empty($row['warehouse_code'])) {
                $warehouse = Warehouse::where('code', $row['warehouse_code'])->find();
                if (!$warehouse) {
                    $rowErrors[] = "第{$rowIndex}行：仓库编码'{$row['warehouse_code']}'不存在";
                } else {
                    $row['warehouse_id'] = $warehouse->id;
                }
            }
            
            // 验证供应商是否存在
            if (!empty($row['supplier_code'])) {
                $supplier = Supplier::where('code', $row['supplier_code'])->find();
                if (!$supplier) {
                    $rowErrors[] = "第{$rowIndex}行：供应商编码'{$row['supplier_code']}'不存在";
                } else {
                    $row['supplier_id'] = $supplier->id;
                }
            }
            
            // 验证产品是否存在
            if (!empty($row['product_code'])) {
                $product = Product::where('code', $row['product_code'])->find();
                if (!$product) {
                    $rowErrors[] = "第{$rowIndex}行：产品编码'{$row['product_code']}'不存在";
                } else {
                    $row['product_id'] = $product->id;
                }
            }
            
            if (!empty($rowErrors)) {
                $errors = array_merge($errors, $rowErrors);
            } else {
                $validData[] = $row;
            }
        }
        
        return [
            'success' => empty($errors),
            'errors' => $errors,
            'data' => $validData
        ];
    }

    /**
     * 批量创建入库单
     */
    private function createBatchInboundOrders($data)
    {
        $results = [
            'success_count' => 0,
            'error_count' => 0,
            'details' => []
        ];
        
        // 按入库单号分组
        $groupedData = [];
        foreach ($data as $row) {
            $orderNumber = $row['order_number'];
            if (!isset($groupedData[$orderNumber])) {
                $groupedData[$orderNumber] = [
                    'order_info' => $row,
                    'items' => []
                ];
            }
            $groupedData[$orderNumber]['items'][] = $row;
        }
        
        Db::startTrans();
        try {
            foreach ($groupedData as $orderNumber => $orderData) {
                try {
                    // 检查入库单是否已存在
                    $existingOrder = InboundOrder::where('order_number', $orderNumber)->find();
                    if ($existingOrder) {
                        $results['error_count']++;
                        $results['details'][] = [
                            'order_number' => $orderNumber,
                            'status' => 'error',
                            'message' => '入库单号已存在'
                        ];
                        continue;
                    }
                    
                    // 创建入库单
                    $order = new InboundOrder();
                    $order->order_number = $orderNumber;
                    $order->warehouse_id = $orderData['order_info']['warehouse_id'];
                    $order->supplier_id = $orderData['order_info']['supplier_id'] ?? null;
                    $order->status = InboundOrder::STATUS_PENDING;
                    $order->type = InboundOrder::TYPE_PURCHASE;
                    $order->notes = $orderData['order_info']['notes'] ?? '';
                    $order->operator_id = $this->request->user_id ?? 1;
                    $order->save();
                    
                    // 创建入库单明细
                    foreach ($orderData['items'] as $itemData) {
                        $item = new InboundOrderItem();
                        $item->inbound_order_id = $order->id;
                        $item->product_id = $itemData['product_id'];
                        $item->quantity = $itemData['quantity'];
                        $item->received_quantity = 0;
                        $item->unit_price = $itemData['unit_price'] ?? 0;
                        $item->batch_number = $itemData['batch_number'] ?? '';
                        $item->expiry_date = $itemData['expiry_date'] ?? null;
                        $item->notes = $itemData['notes'] ?? '';
                        $item->save();
                    }
                    
                    $results['success_count']++;
                    $results['details'][] = [
                        'order_number' => $orderNumber,
                        'status' => 'success',
                        'message' => '创建成功',
                        'id' => $order->id
                    ];
                    
                } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
                    $results['error_count']++;
                    $results['details'][] = [
                        'order_number' => $orderNumber,
                        'status' => 'error',
                        'message' => $e->getMessage()
                    ];
                }
            }
            
            Db::commit();
            return $results;
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            Db::rollback();
            throw $e;
        }
    }

    /**
     * 创建Excel模板
     */
    private function createTemplate($templatePath)
    {
        try {
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
            
            $sheet->setCellValue('A3', 'IN202401150001');
            $sheet->setCellValue('B3', '供应商A');
            $sheet->setCellValue('C3', '主仓库');
            $sheet->setCellValue('D3', '2024-01-15');
            $sheet->setCellValue('E3', '批量导入测试');
            $sheet->setCellValue('F3', 'P002');
            $sheet->setCellValue('G3', '商品2');
            $sheet->setCellValue('H3', '50');
            $sheet->setCellValue('I3', '件');
            
            // 设置样式
            $sheet->getStyle('A1:I1')->getFont()->setBold(true);
            $sheet->getStyle('A1:I1')->getFill()->setFillType(Fill::FILL_SOLID)
                  ->getStartColor()->setRGB('E6E6FA');
            
            // 设置边框
            $sheet->getStyle('A1:I3')->getBorders()->getAllBorders()
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
            
            // 添加说明
            $sheet->setCellValue('A5', '说明：');
            $sheet->setCellValue('A6', '1. 入库单号可以为空，系统会自动生成');
            $sheet->setCellValue('A7', '2. 相同入库单号的商品会归并到同一个入库单');
            $sheet->setCellValue('A8', '3. 预期到货日期格式：YYYY-MM-DD');
            $sheet->setCellValue('A9', '4. 数量必须为正整数');
            
            $sheet->getStyle('A5:A9')->getFont()->setSize(10)->setItalic(true);
            
            $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
            $writer->save($templatePath);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            throw new \Exception('创建模板失败：' . $e->getMessage());
        }
    }
    
    /**
     * 更新入库单
     */
    public function update(Request $request, $id)
    {
        $data = $request->put();
        
        // 验证参数
        $validate = Validate::rule([
            'warehouse_id' => 'integer',
            'supplier_id' => 'integer',
            'source' => 'in:purchase,transfer_in,return_in,project_return,borrow_return,inventory_gain,other',
            'received_at' => 'date',
            'type' => 'in:purchase,return,transfer,other',
            'expected_date' => 'date',
            'notes' => 'max:500'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            $order = InboundOrder::find($id);
            
            if (!$order) {
                return Response::notFound('入库单不存在');
            }
            
            Grant::assert('inbound:write', (int) $order->warehouse_id);
            
            // 只有待处理状态的订单才能修改
            if ($order->status != InboundOrder::STATUS_PENDING) {
                return Response::error('只有待处理状态的入库单才能修改');
            }
            
            // 验证仓库和供应商是否存在
            if (!empty($data['warehouse_id'])) {
                $warehouse = Warehouse::find($data['warehouse_id']);
                if (!$warehouse) {
                    return Response::error('仓库不存在');
                }
            }
            
            if (!empty($data['supplier_id'])) {
                $supplier = Supplier::find($data['supplier_id']);
                if (!$supplier) {
                    return Response::error('供应商不存在');
                }
            }
            
            // 更新字段（I2/C1：来源与入库时间同样可改）
            $updateFields = ['warehouse_id', 'supplier_id', 'type', 'expected_date', 'notes', 'source', 'received_at'];
            
            // I5：来源变更留痕
            $sourceBefore = (string) $order->source;
            $sourceAfter = isset($data['source']) ? (string) $data['source'] : $sourceBefore;
            
            foreach ($updateFields as $field) {
                if (isset($data[$field])) {
                    $order->$field = $data[$field];
                }
            }
            
            if ($sourceAfter !== $sourceBefore) {
                Db::name('operation_log')->insert([
                    'operator_id' => Current::idOrNull(),
                    'action'      => 'inbound_order:change_source',
                    'target_type' => 'inbound_order',
                    'target_id'   => (int) $order->id,
                    'before'      => json_encode(['source' => $sourceBefore], JSON_UNESCAPED_UNICODE),
                    'after'       => json_encode(['source' => $sourceAfter], JSON_UNESCAPED_UNICODE),
                    'method'      => 'PUT',
                    'path'        => 'inbound-orders/' . $order->id,
                    'ip'          => request()->ip(),
                    'created_at'  => date('Y-m-d H:i:s')
                ]);
            }
            
            $order->save();
            
            return Response::success([
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'status_text' => $order->status_text
            ], '入库单更新成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('更新入库单失败：' . $e->getMessage());
        }
    }
    
    /**
     * 删除入库单
     */
    public function delete(Request $request, $id)
    {
        try {
            // find() 默认排除已归档单，归档单不会重复归档
            $order = InboundOrder::find($id);

            if (!$order) {
                return Response::notFound('入库单不存在');
            }

            Grant::assert('inbound:write', (int) $order->warehouse_id);

            if (!$order->canDelete()) {
                return Response::error('入库单已开始收货，无法归档');
            }

            // 软删除（归档）：单据与明细物理数据全部保留，可在「已归档」筛选下翻查；
            // 明细不做任何删除动作，随主单一起保留
            $order->delete();

            return Response::success([], '入库单已归档，可在归档筛选中翻查');

        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('归档入库单失败：' . $e->getMessage());
        }
    }
    
    /**
     * 开始收货
     */
    public function startReceiving(Request $request, $id)
    {
        try {
            $order = InboundOrder::find($id);
            
            if (!$order) {
                return Response::notFound('入库单不存在');
            }
            
            Grant::assert('inbound:write', (int) $order->warehouse_id);
            
            $order->startReceiving($this->getCurrentUserId($request));
            
            return Response::success([
                'id' => $order->id,
                'status' => $order->status,
                'status_text' => $order->status_text
            ], '开始收货成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('开始收货失败：' . $e->getMessage());
        }
    }
    
    /**
     * 收货
     */
    public function receive(Request $request, $id)
    {
        $data = $request->post();
        
        // 验证参数
        $validate = Validate::rule([
            'item_id' => 'require|integer',
            'location_id' => 'require|integer',
            // A4：数量允许小数，计件类由 Service/Model 按计量方式二次校验
            'quantity' => 'require|float|>:0',
            'batch_number' => 'max:50',
            'expiry_date' => 'date'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            $order = InboundOrder::find($id);
            
            if (!$order) {
                return Response::notFound('入库单不存在');
            }
            
            // 收货真正增加库存，属于过账动作，仅仓库管理员可操作
            Grant::assert('inbound:post', (int) $order->warehouse_id);
            
            if ($order->status != InboundOrder::STATUS_RECEIVING) {
                return Response::error('入库单状态不正确，无法收货');
            }
            
            $item = InboundOrderItem::find($data['item_id']);
            if (!$item || $item->inbound_order_id != $id) {
                return Response::error('入库单明细不存在');
            }
            
            $location = Location::find($data['location_id']);
            if (!$location) {
                return Response::error('库位不存在');
            }
            
            // 执行收货
            $item->receive(
                $data['quantity'],
                $data['location_id'],
                $data['batch_number'] ?? null,
                $data['expiry_date'] ?? null
            );
            
            return Response::success([
                'item_id' => $item->id,
                'received_quantity' => $item->received_quantity,
                'remaining_quantity' => $item->getRemainingQuantity(),
                'completion_rate' => $item->getCompletionRate(),
                'order_status' => $order->status,
                'order_status_text' => $order->status_text
            ], '收货成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('收货失败：' . $e->getMessage());
        }
    }
    
    /**
     * 完成入库
     */
    public function complete(Request $request, $id)
    {
        try {
            $order = InboundOrder::find($id);
            
            if (!$order) {
                return Response::notFound('入库单不存在');
            }
            
            Grant::assert('inbound:post', (int) $order->warehouse_id);
            
            $order->complete();
            
            return Response::success([
                'id' => $order->id,
                'status' => $order->status,
                'status_text' => $order->status_text,
                'received_date' => $order->received_date
            ], '入库完成');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('完成入库失败：' . $e->getMessage());
        }
    }
    
    /**
     * 取消入库单
     */
    public function cancel(Request $request, $id)
    {
        $data = $request->post();
        
        // 验证参数
        $validate = Validate::rule([
            'reason' => 'require|max:255'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            $order = InboundOrder::find($id);
            
            if (!$order) {
                return Response::notFound('入库单不存在');
            }
            
            Grant::assert('inbound:write', (int) $order->warehouse_id);
            
            $order->cancel($data['reason']);
            
            return Response::success([
                'id' => $order->id,
                'status' => $order->status,
                'status_text' => $order->status_text
            ], '入库单取消成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('取消入库单失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取入库单统计
     */
    public function statistics(Request $request)
    {
        try {
            $params = $request->get();
            
            $query = InboundOrder::where('id', '>', 0);
            
            // 筛选条件
            if (!empty($params['warehouse_id'])) {
                $query->where('warehouse_id', $params['warehouse_id']);
            }
            
            if (!empty($params['supplier_id'])) {
                $query->where('supplier_id', $params['supplier_id']);
            }
            
            if (!empty($params['date_start'])) {
                $query->where('created_at', '>=', $params['date_start']);
            }
            
            if (!empty($params['date_end'])) {
                $query->where('created_at', '<=', $params['date_end'] . ' 23:59:59');
            }
            
            // 按状态汇总
            $statusRows = (clone $query)->field('status, COUNT(*) AS num')
                                        ->group('status')
                                        ->select()
                                        ->toArray();

            $byStatus = [];
            $total = 0;
            foreach ($statusRows as $row) {
                $byStatus[$row['status']] = (int) $row['num'];
                $total += (int) $row['num'];
            }

            // 汇总明细数量（收货进度）
            $orderIds = (clone $query)->column('id');
            $quantityRow = $orderIds
                ? Db::name('inbound_order_items')
                    ->whereIn('inbound_order_id', $orderIds)
                    ->field('SUM(quantity) AS quantity, SUM(received_quantity) AS received_quantity')
                    ->find()
                : null;

            $totalQuantity = (int) ($quantityRow['quantity'] ?? 0);
            $receivedQuantity = (int) ($quantityRow['received_quantity'] ?? 0);

            $statistics = [
                'total' => $total,
                'by_status' => $byStatus,
                'pending' => $byStatus[InboundOrder::STATUS_PENDING] ?? 0,
                'receiving' => $byStatus[InboundOrder::STATUS_RECEIVING] ?? 0,
                'completed' => $byStatus[InboundOrder::STATUS_COMPLETED] ?? 0,
                'cancelled' => $byStatus[InboundOrder::STATUS_CANCELLED] ?? 0,
                'total_quantity' => $totalQuantity,
                'received_quantity' => $receivedQuantity,
                'completion_rate' => $totalQuantity > 0
                    ? round($receivedQuantity / $totalQuantity * 100, 2)
                    : 0
            ];
            
            return Response::success($statistics);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('获取统计信息失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取当前用户ID（从JWT token中解析）
     */
    private function getCurrentUserId(Request $request)
    {
        // 这里应该从JWT中间件或认证服务中获取当前用户ID
        // 暂时返回1作为示例
        return 1;
    }
}
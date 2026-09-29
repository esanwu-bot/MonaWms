<?php

namespace app\controller;

use app\BaseController;
use app\common\Grant;
use app\model\Product;
use app\model\Category;
use app\common\library\Response;
use think\Request;
use think\facade\Db;
use think\facade\Validate;

/**
 * 商品管理控制器
 */
class ProductController extends BaseController
{
    /**
     * 获取商品统计信息
     */
    public function statistics(Request $request)
    {
        try {
            $total = Product::count();
            $active = Product::where('status', Product::STATUS_ACTIVE)->count();
            $inactive = $total - $active;

            // 低库存：库存量小于等于安全库存下限
            $lowStock = Product::whereRaw('stock_quantity <= IFNULL(min_stock_level, IFNULL(min_stock, 0))')
                               ->count();

            $categories = count(Db::name('products')
                                  ->whereNotNull('category_id')
                                  ->group('category_id')
                                  ->column('category_id'));

            return Response::success([
                'total' => $total,
                'active' => $active,
                'inactive' => $inactive,
                'lowStock' => $lowStock,
                'categories' => $categories
            ], '获取商品统计成功');

        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取商品统计失败: ' . $e->getMessage());
        }
    }

    /**
     * 获取商品列表
     */
    public function index(Request $request)
    {
        try {
            $params = $request->get();
            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 15;
            
            $query = Product::with(['category']);
            
            // 搜索条件：TP6 搜索器必须经 withSearch 触发模型 searchXxxAttr，
            // 直接 $query->searchXxx() 是无效魔法调用会 500
            $search = [];
            foreach (['sku', 'name', 'barcode', 'category_id', 'status', 'search'] as $field) {
                if (!empty($params[$field])) {
                    $search[$field] = $params[$field];
                }
            }
            if ($search) {
                $query->withSearch(array_keys($search), $search);
            }
            
            // 分页查询
            $result = $query->order('created_at', 'desc')
                          ->paginate([
                              'list_rows' => $limit,
                              'page' => $page
                          ]);
            
            $list = [];
            foreach ($result->items() as $product) {
                $item = $product->toArray();
                $item['status_text'] = $product->status_text;
                $item['category_name'] = $product->category->name ?? '';
                $item['volume'] = $product->volume;
                $item['total_stock'] = $product->getTotalStock();
                $item['available_stock'] = $product->getAvailableStock();
                $item['stock_status'] = $product->getStockStatus();
                $item['stock_status_text'] = $product->stock_status_text;
                $list[] = $item;
            }
            
            return Response::paginate($list, $result->total(), $page, $limit);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('获取商品列表失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取商品详情
     */
    public function read(Request $request, $id)
    {
        try {
            $product = Product::with(['category'])->find($id);
            
            if (!$product) {
                return Response::notFound('商品不存在');
            }
            
            $data = $product->getDetailInfo();
            
            return Response::success($data);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('获取商品详情失败：' . $e->getMessage());
        }
    }
    
    /**
     * 创建商品
     */
    public function save(Request $request)
    {
        Grant::assert('product:write');
        $data = $request->post();
        
        // 验证参数
        $validate = Validate::rule([
            'sku' => 'require|max:50|unique:products',
            'name' => 'require|max:100',
            'description' => 'max:500',
            'device_type' => 'max:50',
            'model_number' => 'max:100',
            'frequency_protocol' => 'max:100',
            'firmware_version' => 'max:50',
            'category_id' => 'require|integer',
            'barcode' => 'max:50|unique:products',
            'price' => 'float|>=:0',
            'unit' => 'max:20',
            'measure_type' => 'in:count,length,weight,area,volume',   // A1：计量方式
            'weight' => 'float|>=:0',
            'length' => 'float|>=:0',
            'width' => 'float|>=:0',
            'height' => 'float|>=:0',
            'min_stock' => 'integer|>=:0',
            'max_stock' => 'integer|>=:0',
            'project_id' => 'integer',
            'status' => 'in:active,inactive'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            // 验证分类是否存在
            $category = Category::find($data['category_id']);
            if (!$category) {
                return Response::error('指定的分类不存在');
            }
            
            // 验证库存上下限
            if (isset($data['min_stock']) && isset($data['max_stock'])) {
                if ($data['min_stock'] > $data['max_stock']) {
                    return Response::error('最小库存不能大于最大库存');
                }
            }
            
            $product = new Product();
            $product->sku = $data['sku'];
            $product->name = $data['name'];
            $product->description = $data['description'] ?? '';
            $product->device_type = $data['device_type'] ?? '';
            $product->model_number = $data['model_number'] ?? '';
            $product->frequency_protocol = $data['frequency_protocol'] ?? '';
            $product->firmware_version = $data['firmware_version'] ?? '';
            $product->category_id = $data['category_id'];
            $product->barcode = $data['barcode'] ?? '';
            $product->price = $data['price'] ?? 0;
            $product->unit = $data['unit'] ?? '件';
            $product->measure_type = $data['measure_type'] ?? Product::MEASURE_COUNT;
            // E1：是否需要序列号由计量方式推导（计件类要 SN，长度/重量类按数量走）
            $product->requires_serial = $product->requiresSerial() ? 1 : 0;
            $product->weight = $data['weight'] ?? 0;
            $product->length = $data['length'] ?? 0;
            $product->width = $data['width'] ?? 0;
            $product->height = $data['height'] ?? 0;
            $product->min_stock = $data['min_stock'] ?? 0;
            $product->max_stock = $data['max_stock'] ?? 0;
            $product->project_id = $data['project_id'] ?? null;
            $product->status = $data['status'] ?? Product::STATUS_ACTIVE;
            $product->save();
            
            return Response::success([
                'id' => $product->id,
                'sku' => $product->sku,
                'name' => $product->name,
                'category_id' => $product->category_id,
                'status' => $product->status,
                'status_text' => $product->status_text
            ], '商品创建成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('创建商品失败：' . $e->getMessage());
        }
    }
    
    /**
     * 更新商品
     */
    public function update(Request $request, $id)
    {
        Grant::assert('product:write');
        $data = $request->put();
        
        // 验证参数
        $validate = Validate::rule([
            'sku' => 'max:50|unique:products,sku,' . $id,
            'name' => 'max:100',
            'description' => 'max:500',
            'device_type' => 'max:50',
            'model_number' => 'max:100',
            'frequency_protocol' => 'max:100',
            'firmware_version' => 'max:50',
            'category_id' => 'integer',
            'barcode' => 'max:50|unique:products,barcode,' . $id,
            'price' => 'float|>=:0',
            'unit' => 'max:20',
            'measure_type' => 'in:count,length,weight,area,volume',   // A1
            'weight' => 'float|>=:0',
            'length' => 'float|>=:0',
            'width' => 'float|>=:0',
            'height' => 'float|>=:0',
            'min_stock' => 'integer|>=:0',
            'max_stock' => 'integer|>=:0',
            'project_id' => 'integer',
            'status' => 'in:active,inactive'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            $product = Product::find($id);
            
            if (!$product) {
                return Response::notFound('商品不存在');
            }
            
            // 验证分类是否存在
            if (!empty($data['category_id'])) {
                $category = Category::find($data['category_id']);
                if (!$category) {
                    return Response::error('指定的分类不存在');
                }
            }
            
            // 验证库存上下限
            $minStock = $data['min_stock'] ?? $product->min_stock;
            $maxStock = $data['max_stock'] ?? $product->max_stock;
            if ($minStock > $maxStock) {
                return Response::error('最小库存不能大于最大库存');
            }
            
            // 更新字段
            $updateFields = [
                'sku', 'name', 'description', 'category_id', 'barcode',
                'price', 'unit', 'measure_type', 'weight', 'length', 'width', 'height',
                'min_stock', 'max_stock', 'status', 'device_type', 'model_number',
                'frequency_protocol', 'firmware_version', 'project_id'
            ];
            
            foreach ($updateFields as $field) {
                if (isset($data[$field])) {
                    $product->$field = $data[$field];
                }
            }
            
            // E1：计量方式变化后同步推导 SN 要求
            $product->requires_serial = $product->requiresSerial() ? 1 : 0;
            
            $product->save();
            
            return Response::success([
                'id' => $product->id,
                'sku' => $product->sku,
                'name' => $product->name,
                'category_id' => $product->category_id,
                'status' => $product->status,
                'status_text' => $product->status_text
            ], '商品更新成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('更新商品失败：' . $e->getMessage());
        }
    }
    
    /**
     * 删除商品
     */
    public function delete(Request $request, $id)
    {
        Grant::assert('product:write');
        try {
            $product = Product::find($id);
            
            if (!$product) {
                return Response::notFound('商品不存在');
            }
            
            // 检查是否有库存
            if ($product->getTotalStock() > 0) {
                return Response::error('商品存在库存，无法删除');
            }
            
            // 检查是否有相关订单
            if ($product->inboundOrderItems()->count() > 0 || $product->outboundOrderItems()->count() > 0) {
                return Response::error('商品存在相关订单，无法删除');
            }
            
            $product->delete();
            
            return Response::success([], '商品删除成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('删除商品失败：' . $e->getMessage());
        }
    }
    
    /**
     * 根据SKU查找商品
     */
    public function findBySku(Request $request)
    {
        $sku = $request->get('sku');
        
        if (empty($sku)) {
            return Response::error('SKU不能为空');
        }
        
        try {
            $product = Product::findBySku($sku);
            
            if (!$product) {
                return Response::notFound('商品不存在');
            }
            
            $data = $product->getDetailInfo();
            
            return Response::success($data);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('查找商品失败：' . $e->getMessage());
        }
    }
    
    /**
     * 根据条码查找商品
     */
    public function findByBarcode(Request $request)
    {
        $barcode = $request->get('barcode');
        
        if (empty($barcode)) {
            return Response::error('条码不能为空');
        }
        
        try {
            $product = Product::findByBarcode($barcode);
            
            if (!$product) {
                return Response::notFound('商品不存在');
            }
            
            $data = $product->getDetailInfo();
            
            return Response::success($data);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('查找商品失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取商品库存信息
     */
    public function stock(Request $request, $id)
    {
        try {
            $product = Product::find($id);
            
            if (!$product) {
                return Response::notFound('商品不存在');
            }
            
            $stockInfo = [
                'product_id' => $product->id,
                'sku' => $product->sku,
                'name' => $product->name,
                'total_stock' => $product->getTotalStock(),
                'available_stock' => $product->getAvailableStock(),
                'min_stock' => $product->min_stock,
                'max_stock' => $product->max_stock,
                'stock_status' => $product->getStockStatus(),
                'stock_status_text' => $product->getStockStatusText(),
                'is_low_stock' => $product->isLowStock(),
                'is_over_stock' => $product->isOverStock()
            ];
            
            return Response::success($stockInfo);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('获取库存信息失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取商品选项列表（用于下拉选择）
     */
    public function options(Request $request)
    {
        try {
            $products = Product::where('status', Product::STATUS_ACTIVE)
                             ->field('id,sku,name')
                             ->order('sku')
                             ->select();
            
            $options = [];
            foreach ($products as $product) {
                $options[] = [
                    'value' => $product->id,
                    'label' => $product->sku . ' - ' . $product->name
                ];
            }
            
            return Response::success($options);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('获取商品选项失败：' . $e->getMessage());
        }
    }
    
    /**
     * 下载产品批量导入模板（xlsx）
     * 列：SKU* / 产品名称* / 分类 / 单位 / 计量方式 / 单价 / 成本价 / 最小库存 / 最大库存 / 备注
     */
    public function downloadTemplate()
    {
        try {
            $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            
            $headers = [
                'A1' => 'SKU*',
                'B1' => '产品名称*',
                'C1' => '分类',
                'D1' => '单位',
                'E1' => '计量方式',
                'F1' => '单价',
                'G1' => '成本价',
                'H1' => '最小库存',
                'I1' => '最大库存',
                'J1' => '备注'
            ];
            foreach ($headers as $cell => $value) {
                $sheet->setCellValue($cell, $value);
            }
            
            // 示例行
            $sheet->setCellValue('A2', 'SKU-DEMO-001');
            $sheet->setCellValue('B2', '5G基站设备');
            $sheet->setCellValue('C2', '基站设备');
            $sheet->setCellValue('D2', '台');
            $sheet->setCellValue('E2', 'count');
            $sheet->setCellValue('F2', '12000');
            $sheet->setCellValue('G2', '9000');
            $sheet->setCellValue('H2', '5');
            $sheet->setCellValue('I2', '100');
            $sheet->setCellValue('J2', '示例数据，导入前请删除本行');
            $sheet->setCellValue('A3', 'SKU-DEMO-002');
            $sheet->setCellValue('B3', '光缆-单模');
            $sheet->setCellValue('C3', '光缆');
            $sheet->setCellValue('D3', '米');
            $sheet->setCellValue('E3', 'length');
            $sheet->setCellValue('J3', '线材类按长度计量，无需序列号');
            
            foreach (['A' => 16, 'B' => 24, 'C' => 14, 'D' => 8, 'E' => 12, 'F' => 10, 'G' => 10, 'H' => 10, 'I' => 10, 'J' => 30] as $col => $width) {
                $sheet->getColumnDimension($col)->setWidth($width);
            }
            
            $sheet->getStyle('A1:J1')->applyFromArray([
                'font' => ['bold' => true],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'E6E6FA']
                ]
            ]);
            
            $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
            
            $filename = '产品导入模板_' . date('YmdHis') . '.xlsx';
            header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            header('Content-Disposition: attachment;filename="' . $filename . '"');
            header('Cache-Control: max-age=0');
            
            $writer->save('php://output');
            exit;
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('模板下载失败：' . $e->getMessage());
        }
    }
    
    /**
     * 产品批量导入（Excel）
     * 规则：
     * - SKU、产品名称必填；SKU 全局唯一（库内重复与文件内重复都报错，带行号）
     * - 分类按名称匹配 categories，匹配不到跳过该列（不影响导入）
     * - 单位填中文名时自动映射单位字典 code，映射不到按原文入库
     * - 计量方式仅允许 count/length/weight/area/volume，默认 count；requires_serial 由计量方式推导
     */
    public function batchImport(Request $request)
    {
        try {
            $file = $request->file('file');
            if (!$file) {
                return Response::validateError('请选择要上传的文件');
            }
            
            $extension = strtolower($file->getOriginalExtension());
            if (!in_array($extension, ['xlsx', 'xls'])) {
                return Response::validateError('只支持Excel文件格式(.xlsx, .xls)');
            }
            
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getPathname());
            $data = $spreadsheet->getActiveSheet()->toArray();
            
            // 移除表头并过滤空行
            array_shift($data);
            $data = array_filter($data, function ($row) {
                return !empty(array_filter($row));
            });
            if (empty($data)) {
                return Response::validateError('Excel文件中没有有效数据');
            }
            
            // 预加载：分类名称映射、单位字典（中文名 -> code）、已有 SKU
            $categoryMap = Category::column('id', 'name');
            // 两表均有 code/name 列，直接 column('code') 会产生 SQL 歧义，改用显式字段
            $unitDict = [];
            $unitRows = Db::name('dictionary_items')
                ->alias('i')
                ->join('dictionary_types t', 't.id = i.type_id')
                ->where('t.code', 'unit')
                ->where('i.status', 'active')
                ->field('i.code AS item_code, i.name AS item_name')
                ->select();
            foreach ($unitRows as $u) {
                $unitDict[$u['item_name']] = $u['item_code'];
            }
            $existingSkus = array_flip(Product::column('sku'));
            
            $allowedMeasure = ['count', 'length', 'weight', 'area', 'volume'];
            $skuSeen = [];
            $rows = [];
            $errors = [];
            $warnings = [];
            $line = 1; // Excel 表头占第 1 行
            
            foreach ($data as $row) {
                $line++;
                $sku = trim((string)($row[0] ?? ''));
                $name = trim((string)($row[1] ?? ''));
                
                if ($sku === '' && $name === '') {
                    continue;
                }
                if ($sku === '' || $name === '') {
                    $errors[] = ['row' => $line, 'message' => 'SKU 与产品名称均为必填'];
                    continue;
                }
                
                // SKU 唯一性：库内 + 文件内
                if (isset($existingSkus[$sku])) {
                    $errors[] = ['row' => $line, 'message' => "SKU[{$sku}] 已存在，请更换"];
                    continue;
                }
                if (isset($skuSeen[$sku])) {
                    $errors[] = ['row' => $line, 'message' => "文件内 SKU[{$sku}] 重复"];
                    continue;
                }
                $skuSeen[$sku] = true;
                
                // 计量方式
                $measure = strtolower(trim((string)($row[4] ?? '')));
                if ($measure === '') {
                    $measure = 'count';
                }
                if (!in_array($measure, $allowedMeasure, true)) {
                    $errors[] = ['row' => $line, 'message' => "计量方式[{$measure}] 无效，仅允许 " . implode('/', $allowedMeasure)];
                    continue;
                }
                
                // 分类（匹配不到仅警告，不阻塞）
                $categoryId = null;
                $categoryName = trim((string)($row[2] ?? ''));
                if ($categoryName !== '') {
                    if (isset($categoryMap[$categoryName])) {
                        $categoryId = (int) $categoryMap[$categoryName];
                    } else {
                        $warnings[] = "第 {$line} 行：分类[{$categoryName}] 不存在，已留空";
                    }
                }
                
                // 单位：中文名映射字典 code，否则原样入库
                $unitName = trim((string)($row[3] ?? ''));
                $unit = $unitName !== '' ? ($unitDict[$unitName] ?? $unitName) : 'pcs';
                
                // 数值字段
                $price = ($row[5] ?? '') === '' ? 0 : (float) $row[5];
                $costPrice = ($row[6] ?? '') === '' ? 0 : (float) $row[6];
                if ($price < 0 || $costPrice < 0) {
                    $errors[] = ['row' => $line, 'message' => '单价/成本价不能为负数'];
                    continue;
                }
                
                $rows[] = [
                    'sku'             => $sku,
                    'name'            => $name,
                    'category_id'     => $categoryId,
                    'unit'            => $unit,
                    'measure_type'    => $measure,
                    'requires_serial' => $measure === 'count' ? 1 : 0,
                    'price'           => number_format($price, 4, '.', ''),
                    'cost_price'      => number_format($costPrice, 4, '.', ''),
                    'min_stock'       => is_numeric($row[7] ?? '') ? (int) $row[7] : 0,
                    'max_stock'       => is_numeric($row[8] ?? '') ? (int) $row[8] : 0,
                    'status'          => 'active'
                ];
            }
            
            if (!empty($errors)) {
                return json([
                    'code'    => 400,
                    'success' => false,
                    'message' => '数据验证失败',
                    'errors'  => $errors
                ]);
            }
            if (empty($rows)) {
                return Response::validateError('没有可导入的有效数据');
            }
            
            Db::startTrans();
            try {
                $successCount = 0;
                foreach ($rows as $row) {
                    $row['created_at'] = date('Y-m-d H:i:s');
                    $row['updated_at'] = date('Y-m-d H:i:s');
                    Product::create($row);
                    $successCount++;
                }
                Db::commit();
            } catch (\app\common\BizException $e) {
                Db::rollback();
                throw $e;
            } catch (\Exception $e) {
                Db::rollback();
                throw $e;
            }
            
            return json([
                'code'    => 200,
                'success' => true,
                'message' => "批量导入成功，共导入 {$successCount} 条产品记录",
                'data'    => [
                    'success_count' => $successCount,
                    'total_count'   => count($rows),
                    'warnings'      => $warnings
                ]
            ]);
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('导入失败：' . $e->getMessage());
        }
    }
}
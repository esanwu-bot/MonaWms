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

            // 按仓库过滤：仅返回在该仓库存在库存记录的产品（仓库页「管理产品」跳转用）
            if (!empty($params['warehouse_id'])) {
                $query->whereRaw(
                    'id IN (SELECT DISTINCT product_id FROM inventory WHERE warehouse_id = ?)',
                    [(int)$params['warehouse_id']]
                );
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
            'brand' => 'max:100',
            'production_date' => 'date',
            'warranty_months' => 'integer|>=:0',
            'frequency_protocol' => 'max:100',
            'firmware_version' => 'max:50',
            'category_id' => 'require|integer',
            'barcode' => 'max:50|unique:products',
            'barcode_image' => 'max:255',
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
            $product->brand = $data['brand'] ?? '';
            $product->production_date = $data['production_date'] ?? null;
            $product->warranty_months = $data['warranty_months'] ?? 0;
            $product->frequency_protocol = $data['frequency_protocol'] ?? '';
            $product->firmware_version = $data['firmware_version'] ?? '';
            $product->category_id = $data['category_id'];
            $product->barcode = $data['barcode'] ?? '';
            $product->barcode_image = $data['barcode_image'] ?? '';
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
            'brand' => 'max:100',
            'production_date' => 'date',
            'warranty_months' => 'integer|>=:0',
            'frequency_protocol' => 'max:100',
            'firmware_version' => 'max:50',
            'category_id' => 'integer',
            'barcode' => 'max:50|unique:products,barcode,' . $id,
            'barcode_image' => 'max:255',
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
                'sku', 'name', 'description', 'category_id', 'barcode', 'barcode_image',
                'price', 'unit', 'measure_type', 'weight', 'length', 'width', 'height',
                'min_stock', 'max_stock', 'status', 'device_type', 'model_number',
                'brand', 'production_date', 'warranty_months',
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
    /**
     * 上传条码图片（产品表单「上传条码图片」）
     * 返回可访问 URL，前端将其写入 barcode_image 字段
     */
    public function uploadBarcodeImage(Request $request)
    {
        Grant::assert('product:write');
        try {
            $file = $request->file('image') ?: $request->file('file');
            if (!$file) {
                return Response::error('未选择图片文件');
            }
            if (!$file->isValid()) {
                return Response::error('文件上传失败');
            }

            $allowedExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
            $ext = strtolower($file->getOriginalExtension());
            if (!in_array($ext, $allowedExt, true)) {
                return Response::error('仅支持 jpg / png / gif / webp / bmp 图片');
            }
            if ($file->getSize() > 5 * 1024 * 1024) {
                return Response::error('图片不能超过 5MB');
            }

            $dir = public_path() . 'uploads/barcodes/' . date('Ymd');
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            $filename = uniqid('barcode_', true) . '.' . $ext;
            $file->move($dir, $filename);

            $url = '/uploads/barcodes/' . date('Ymd') . '/' . $filename;
            return Response::success(['url' => $url], '条码图片上传成功');

        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('条码图片上传失败：' . $e->getMessage());
        }
    }

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
                'A1' => '设备来源*',
                'B1' => '产品名称*',
                'C1' => '分类',
                'D1' => '品牌',
                'E1' => '型号',
                'F1' => '序列号',
                'G1' => '生产日期',
                'H1' => '保修期(月)',
                'I1' => '计量单位',
                'J1' => '计量方式',
                'K1' => '成本价',
                'L1' => '最小库存',
                'M1' => '最大库存',
                'N1' => '备注'
            ];
            foreach ($headers as $cell => $value) {
                $sheet->setCellValue($cell, $value);
            }
            
            // 示例行
            $sheet->setCellValue('A2', 'SKU-DEMO-001');
            $sheet->setCellValue('B2', '5G基站设备');
            $sheet->setCellValue('C2', '基站设备');
            $sheet->setCellValue('D2', '华为');
            $sheet->setCellValue('E2', 'AAU5613');
            $sheet->setCellValue('F2', 'SN-DEMO-0001');
            $sheet->setCellValue('G2', '2025-03-12');
            $sheet->setCellValue('H2', '36');
            $sheet->setCellValue('I2', '台');
            $sheet->setCellValue('J2', '计件');
            $sheet->setCellValue('K2', '9000');
            $sheet->setCellValue('L2', '5');
            $sheet->setCellValue('M2', '100');
            $sheet->setCellValue('N2', '示例数据，导入前请删除本行');
            $sheet->setCellValue('A3', 'SKU-DEMO-002');
            $sheet->setCellValue('B3', '光缆-单模');
            $sheet->setCellValue('C3', '光缆');
            $sheet->setCellValue('D3', '烽火');
            $sheet->setCellValue('E3', 'GYXTW-12');
            $sheet->setCellValue('G3', '2025-01-08');
            $sheet->setCellValue('H3', '12');
            $sheet->setCellValue('I3', '米');
            $sheet->setCellValue('J3', '长度');
            $sheet->setCellValue('N3', '线材类按长度计量，无需序列号');
            
            foreach (['A' => 16, 'B' => 24, 'C' => 14, 'D' => 14, 'E' => 16, 'F' => 18, 'G' => 14,
                      'H' => 12, 'I' => 8, 'J' => 12, 'K' => 10, 'L' => 10, 'M' => 10, 'N' => 30] as $col => $width) {
                $sheet->getColumnDimension($col)->setWidth($width);
            }

            $sheet->getStyle('A1:N1')->applyFromArray([
                'font' => ['bold' => true],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'E6E6FA']
                ]
            ]);
            
            $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
            
            // 不能用 header()+exit 直出：会绕过 Cors 中间件的响应头追加（$next 之后才加），
            // 跨域 dev 环境下浏览器无法读取响应导致"下载失败"；改为临时文件 + File 响应走完管道
            $filename = '产品导入模板_' . date('YmdHis') . '.xlsx';
            $dir = runtime_path() . 'downloads';
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            $fullPath = $dir . DIRECTORY_SEPARATOR . $filename;
            $writer->save($fullPath);
            
            // 清理 1 小时前的临时模板，避免堆积
            foreach (glob($dir . DIRECTORY_SEPARATOR . '产品导入模板_*.xlsx') ?: [] as $old) {
                if (is_file($old) && filemtime($old) < time() - 3600) {
                    @unlink($old);
                }
            }
            
            return download($fullPath, $filename);
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
    /**
     * 计量方式归一化：中文 → 库内 code
     * 支持：计件/长度/重量/面积/体积（含「计件（件/个/台/套）」等括号全称），以及英文 code
     * 无法识别返回原文（后续按非法值报错），空值返回空串
     */
    private function normalizeMeasureType(string $raw): string
    {
        $value = trim($raw);
        if ($value === '') {
            return '';
        }

        // 去掉括号补充说明：计件（件/个/台/套）→ 计件
        $base = trim(preg_split('/[（(]/u', $value)[0]);

        $map = [
            '计件' => 'count',
            '长度' => 'length',
            '重量' => 'weight',
            '面积' => 'area',
            '体积' => 'volume',
        ];

        return $map[$base] ?? strtolower($value);
    }

    /**
     * 导入列定位：按表头名称匹配（兼容新旧模板）
     * 表头含空格、*、全角括号都会被归一化；识别不到任何已知表头时回退旧模板列序
     */
    private function resolveImportColumns(array $data): array
    {
        $aliases = [
            'sku'             => ['设备来源', 'sku', '设备编号'],
            'name'            => ['产品名称', '设备名称', '名称'],
            'category'        => ['分类'],
            'brand'           => ['品牌'],
            'model'           => ['型号'],
            'barcode'         => ['序列号', '条码', '条形码'],
            'production_date' => ['生产日期', '购买日期'],
            'warranty'        => ['保修期(月)', '保修期（月）', '保修期'],
            'unit'            => ['单位', '计量单位'],
            'measure'         => ['计量方式'],
            'price'           => ['单价'],
            'cost'            => ['成本价'],
            'min'             => ['最小库存'],
            'max'             => ['最大库存'],
            'description'     => ['备注', '描述'],
        ];

        $header = $data[0] ?? [];
        $map = [];
        foreach ($header as $idx => $raw) {
            $key = strtolower(trim(str_replace(['*', ' ', '　'], '', (string)$raw)));
            if ($key === '') {
                continue;
            }
            foreach ($aliases as $field => $names) {
                if (in_array($key, $names, true) && !isset($map[$field])) {
                    $map[$field] = $idx;
                    break;
                }
            }
        }

        // 必须能定位 SKU / 产品名称，否则认定为无表头的旧文件，按固定列序兜底
        if (!isset($map['sku']) || !isset($map['name'])) {
            return [
                'sku' => 0, 'name' => 1, 'category' => 2, 'unit' => 3, 'measure' => 4,
                'price' => 5, 'cost' => 6, 'min' => 7, 'max' => 8, 'description' => 9,
            ];
        }

        return $map;
    }

    /**
     * 生产日期归一化：支持 YYYY-MM-DD / YYYY/MM/DD 文本与 Excel 日期序列号
     * 空值返回 null；无法解析返回 false
     */
    private function normalizeImportDate($value)
    {
        $raw = trim((string)($value ?? ''));
        if ($raw === '') {
            return null;
        }

        // Excel 日期序列号（1900 起算）
        if (is_numeric($raw) && (float)$raw > 20000) {
            $dt = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject((float)$raw);
            return $dt->format('Y-m-d');
        }

        $raw = str_replace(['/', '.'], '-', $raw);
        $ts = strtotime($raw);
        if ($ts === false) {
            return false;
        }
        return date('Y-m-d', $ts);
    }

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

            // 列定位：优先按表头名称匹配（模板已改名/加列），表头识别不了时回退旧模板固定列序
            $colMap = $this->resolveImportColumns($data);
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
            $codeToUnitName = [];
            $unitRows = Db::name('dictionary_items')
                ->alias('i')
                ->join('dictionary_types t', 't.id = i.type_id')
                ->where('t.code', 'unit')
                ->where('i.status', 'active')
                ->field('i.code AS item_code, i.name AS item_name')
                ->select();
            foreach ($unitRows as $u) {
                $unitDict[$u['item_name']] = $u['item_code'];
                $codeToUnitName[$u['item_code']] = $u['item_name'];
            }
            $existingSkus = array_flip(Product::column('sku'));
            $existingBarcodes = array_flip(array_filter(Product::column('barcode')));
            
            $allowedMeasure = ['count', 'length', 'weight', 'area', 'volume'];
            $skuSeen = [];
            $barcodeSeen = [];
            $rows = [];
            $errors = [];
            $warnings = [];
            $line = 1; // Excel 表头占第 1 行
            
            $col = function (array $row, string $key) use ($colMap) {
                $idx = $colMap[$key] ?? null;
                return $idx === null ? null : ($row[$idx] ?? null);
            };

            foreach ($data as $row) {
                $line++;
                $sku = trim((string)($col($row, 'sku') ?? ''));
                $name = trim((string)($col($row, 'name') ?? ''));
                
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
                
                // 计量方式：中文（计件/长度/重量/面积/体积，含括号全称）转库内 code，兼容英文 code
                $measureRaw = trim((string)($col($row, 'measure') ?? ''));
                $measure = $this->normalizeMeasureType($measureRaw);
                if ($measure === '') {
                    $measure = 'count';
                }
                if (!in_array($measure, $allowedMeasure, true)) {
                    $errors[] = ['row' => $line, 'message' => "计量方式[{$measureRaw}] 无效，允许：计件/长度/重量/面积/体积"];
                    continue;
                }
                
                // 分类（匹配不到仅警告，不阻塞）
                $categoryId = null;
                $categoryName = trim((string)($col($row, 'category') ?? ''));
                if ($categoryName !== '') {
                    if (isset($categoryMap[$categoryName])) {
                        $categoryId = (int) $categoryMap[$categoryName];
                    } else {
                        $warnings[] = "第 {$line} 行：分类[{$categoryName}] 不存在，已留空";
                    }
                }
                
                // 单位：与产品表单口径一致，直接存中文名（如 台/米/千克），填 code 时映射回中文名
                $unitName = trim((string)($col($row, 'unit') ?? ''));
                if ($unitName === '') {
                    $unit = '台';
                } else {
                    $unit = $codeToUnitName[$unitName] ?? $unitName;
                }

                // 新增设备字段：品牌 / 型号 / 序列号 / 生产日期 / 保修期 / 备注
                $brand = trim((string)($col($row, 'brand') ?? ''));
                $modelNumber = trim((string)($col($row, 'model') ?? ''));
                $barcode = trim((string)($col($row, 'barcode') ?? ''));
                if ($barcode !== '' && isset($barcodeSeen[$barcode])) {
                    $errors[] = ['row' => $line, 'message' => "文件内序列号[{$barcode}] 重复"];
                    continue;
                }
                if ($barcode !== '' && isset($existingBarcodes[$barcode])) {
                    $warnings[] = "第 {$line} 行：序列号[{$barcode}] 已存在，已留空";
                    $barcode = '';
                }
                if ($barcode !== '') {
                    $barcodeSeen[$barcode] = true;
                }
                $productionDate = $this->normalizeImportDate($col($row, 'production_date'));
                if ($productionDate === false) {
                    $errors[] = ['row' => $line, 'message' => '生产日期格式无效，应为 YYYY-MM-DD'];
                    continue;
                }
                $warrantyRaw = trim((string)($col($row, 'warranty') ?? ''));
                if ($warrantyRaw !== '' && (!is_numeric($warrantyRaw) || (int)$warrantyRaw < 0)) {
                    $errors[] = ['row' => $line, 'message' => '保修期(月) 必须为非负整数'];
                    continue;
                }
                $warrantyMonths = $warrantyRaw === '' ? 0 : (int) $warrantyRaw;
                $description = trim((string)($col($row, 'description') ?? ''));

                // 数值字段
                $priceRaw = $col($row, 'price');
                $costRaw = $col($row, 'cost');
                $price = ($priceRaw ?? '') === '' ? 0 : (float) $priceRaw;
                $costPrice = ($costRaw ?? '') === '' ? 0 : (float) $costRaw;
                if ($price < 0 || $costPrice < 0) {
                    $errors[] = ['row' => $line, 'message' => '单价/成本价不能为负数'];
                    continue;
                }

                $minRaw = $col($row, 'min');
                $maxRaw = $col($row, 'max');
                $rows[] = [
                    '_line'            => $line,   // 写库失败时用于回报行号
                    'sku'              => $sku,
                    'name'             => $name,
                    'category_id'      => $categoryId,
                    'brand'            => $brand !== '' ? $brand : null,
                    'model_number'     => $modelNumber !== '' ? $modelNumber : null,
                    'barcode'          => $barcode !== '' ? $barcode : null,
                    'production_date'  => $productionDate,
                    'warranty_months'  => $warrantyMonths,
                    'unit'             => $unit,
                    'measure_type'     => $measure,
                    'requires_serial'  => $measure === 'count' ? 1 : 0,
                    'price'            => number_format($price, 4, '.', ''),
                    'cost_price'       => number_format($costPrice, 4, '.', ''),
                    'min_stock'        => is_numeric($minRaw ?? '') ? (int) $minRaw : 0,
                    'max_stock'        => is_numeric($maxRaw ?? '') ? (int) $maxRaw : 0,
                    'description'      => $description !== '' ? $description : null,
                    'status'           => 'active'
                ];
            }
            
            // 失败行不阻塞：仅导入校验通过的行，失败原因按行返回
            if (empty($rows)) {
                return json([
                    'code'    => 400,
                    'success' => false,
                    'message' => '没有可导入的有效数据',
                    'data'    => [
                        'success_count' => 0,
                        'fail_count'    => count($errors),
                        'total_count'   => count($errors),
                        'errors'        => $errors,
                        'warnings'      => $warnings
                    ]
                ]);
            }

            Db::startTrans();
            try {
                $successCount = 0;
                foreach ($rows as $row) {
                    try {
                        $row['created_at'] = date('Y-m-d H:i:s');
                        $row['updated_at'] = date('Y-m-d H:i:s');
                        Product::create($row);
                        $successCount++;
                    } catch (\Exception $e) {
                        // 单行写库失败（唯一键冲突等）记为失败行，继续导入其余行
                        $errors[] = [
                            'row'     => $row['_line'] ?? null,
                            'message' => '写库失败：' . $e->getMessage()
                        ];
                    }
                }
                Db::commit();
            } catch (\app\common\BizException $e) {
                Db::rollback();
                throw $e;
            } catch (\Exception $e) {
                Db::rollback();
                throw $e;
            }

            $failCount = count($errors);
            $message = $failCount > 0
                ? "导入完成：成功 {$successCount} 行，失败 {$failCount} 行"
                : "批量导入成功，共导入 {$successCount} 条产品记录";

            return json([
                'code'    => 200,
                'success' => true,
                'message' => $message,
                'data'    => [
                    'success_count' => $successCount,
                    'fail_count'    => $failCount,
                    'total_count'   => $successCount + $failCount,
                    'errors'        => $errors,
                    'warnings'      => $warnings
                ]
            ]);
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('导入失败：' . $e->getMessage());
        }
    }
}
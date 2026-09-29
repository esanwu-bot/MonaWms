<?php

namespace app\controller;

use app\BaseController;
use app\model\SerialNumber;
use app\model\Product;
use app\common\Current;
use app\common\library\Response;
use app\service\BarcodeService;
use think\Request;
use think\facade\Validate;
use think\facade\Filesystem;

/**
 * 序列号管理控制器
 */
class SerialNumberController extends BaseController
{
    /**
     * 获取序列号列表
     */
    public function index(Request $request)
    {
        try {
            $params = $request->get();
            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 15;
            
            $query = SerialNumber::with(['product']);
            
            // 搜索条件
            if (!empty($params['serial_number'])) {
                $query->where('serial_number', 'like', '%' . $params['serial_number'] . '%');
            }
            
            if (!empty($params['product_id'])) {
                $query->where('product_id', $params['product_id']);
            }
            
            if (!empty($params['status'])) {
                $query->where('status', $params['status']);
            }
            
            // 分页查询
            $result = $query->order('created_at', 'desc')
                          ->paginate([
                              'list_rows' => $limit,
                              'page' => $page
                          ]);
            
            $list = [];
            foreach ($result->items() as $serialNumber) {
                $item = $serialNumber->toArray();
                $item['status_text'] = $serialNumber->status_text;
                $item['product_name'] = $serialNumber->product->name ?? '';
                $item['product_sku'] = $serialNumber->product->sku ?? '';
                $item['product_model'] = $serialNumber->product->model_number ?? '';
                $list[] = $item;
            }
            
            return Response::paginate($list, $result->total(), $page, $limit);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('获取序列号列表失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取序列号详情
     */
    public function read(Request $request, $id)
    {
        try {
            $serialNumber = SerialNumber::with(['product'])->find($id);
            
            if (!$serialNumber) {
                return Response::notFound('序列号不存在');
            }
            
            $data = $serialNumber->toArray();
            $data['status_text'] = $serialNumber->status_text;
            $data['product_info'] = $serialNumber->product ? $serialNumber->product->toArray() : null;
            
            return Response::success($data);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('获取序列号详情失败：' . $e->getMessage());
        }
    }
    
    /**
     * 创建序列号
     */
    public function save(Request $request)
    {
        $data = $request->post();
        
        // 验证参数
        $validate = Validate::rule([
            'serial_number' => 'require|max:100|unique:serial_numbers',
            'product_id' => 'require|integer',
            'manufacture_date' => 'date',
            'warranty_period' => 'integer',
            // B1：对齐客户口径 在库/已出库/正在用/返修中/待报废/已报废
            'status' => 'in:in_stock,sold,in_use,repairing,to_scrap,scrapped',
            'location' => 'max:200',
            'notes' => 'max:500'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            // 验证产品是否存在
            $product = Product::find($data['product_id']);
            if (!$product) {
                return Response::error('指定的产品不存在');
            }
            
            // 计算保修截止日期
            if (!empty($data['manufacture_date']) && !empty($data['warranty_period'])) {
                $warrantyEndDate = date('Y-m-d', strtotime($data['manufacture_date'] . ' +' . $data['warranty_period'] . ' months'));
                $data['warranty_end_date'] = $warrantyEndDate;
            }
            
            $serialNumber = new SerialNumber();
            $serialNumber->serial_number = $data['serial_number'];
            $serialNumber->product_id = $data['product_id'];
            $serialNumber->manufacture_date = $data['manufacture_date'] ?? null;
            $serialNumber->warranty_period = $data['warranty_period'] ?? null;
            $serialNumber->warranty_end_date = $data['warranty_end_date'] ?? null;
            $serialNumber->status = $data['status'] ?? SerialNumber::STATUS_IN_STOCK;
            $serialNumber->location = $data['location'] ?? '';
            $serialNumber->notes = $data['notes'] ?? '';
            $serialNumber->save();
            
            return Response::success([
                'id' => $serialNumber->id,
                'serial_number' => $serialNumber->serial_number,
                'product_id' => $serialNumber->product_id,
                'status' => $serialNumber->status,
                'status_text' => $serialNumber->status_text
            ], '序列号创建成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('创建序列号失败：' . $e->getMessage());
        }
    }
    
    /**
     * 更新序列号
     */
    public function update(Request $request, $id)
    {
        $data = $request->put();
        
        // 验证参数
        $validate = Validate::rule([
            'serial_number' => 'max:100|unique:serial_numbers,serial_number,' . $id,
            'product_id' => 'integer',
            'manufacture_date' => 'date',
            'warranty_period' => 'integer',
            // B1：对齐客户口径 在库/已出库/正在用/返修中/待报废/已报废
            'status' => 'in:in_stock,sold,in_use,repairing,to_scrap,scrapped',
            'location' => 'max:200',
            'notes' => 'max:500'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            $serialNumber = SerialNumber::find($id);
            
            if (!$serialNumber) {
                return Response::notFound('序列号不存在');
            }
            
            // 验证产品是否存在
            if (!empty($data['product_id'])) {
                $product = Product::find($data['product_id']);
                if (!$product) {
                    return Response::error('指定的产品不存在');
                }
            }
            
            // 计算保修截止日期
            if (!empty($data['manufacture_date']) && !empty($data['warranty_period'])) {
                $warrantyEndDate = date('Y-m-d', strtotime($data['manufacture_date'] . ' +' . $data['warranty_period'] . ' months'));
                $data['warranty_end_date'] = $warrantyEndDate;
            }
            
            // 更新字段
            if (isset($data['serial_number'])) {
                $serialNumber->serial_number = $data['serial_number'];
            }
            if (isset($data['product_id'])) {
                $serialNumber->product_id = $data['product_id'];
            }
            if (isset($data['manufacture_date'])) {
                $serialNumber->manufacture_date = $data['manufacture_date'];
            }
            if (isset($data['warranty_period'])) {
                $serialNumber->warranty_period = $data['warranty_period'];
            }
            if (isset($data['warranty_end_date'])) {
                $serialNumber->warranty_end_date = $data['warranty_end_date'];
            }
            if (isset($data['status'])) {
                // B2：状态变更走流转校验 + 留痕（SN 历史 + 操作日志）
                \think\facade\Db::name('operation_log')->insert([
                    'operator_id' => Current::idOrNull(),
                    'action'      => 'serial_number:update_status',
                    'target_type' => 'serial_number',
                    'target_id'   => (int) $serialNumber->id,
                    'before'      => json_encode(['status' => (string) $serialNumber->status], JSON_UNESCAPED_UNICODE),
                    'after'       => json_encode(['status' => $data['status']], JSON_UNESCAPED_UNICODE),
                    'method'      => 'PUT',
                    'path'        => 'serial-numbers/' . $serialNumber->id,
                    'ip'          => request()->ip(),
                    'created_at'  => date('Y-m-d H:i:s')
                ]);
                $serialNumber->changeStatus(
                    $data['status'],
                    (int) Current::idOrNull(),
                    $data['notes'] ?? '状态变更',
                    'serial_number',
                    (int) $serialNumber->id
                );
            }
            if (isset($data['location'])) {
                $serialNumber->location = $data['location'];
            }
            if (isset($data['notes'])) {
                $serialNumber->notes = $data['notes'];
            }
            
            $serialNumber->save();
            
            return Response::success([
                'id' => $serialNumber->id,
                'serial_number' => $serialNumber->serial_number,
                'product_id' => $serialNumber->product_id,
                'status' => $serialNumber->status,
                'status_text' => $serialNumber->status_text
            ], '序列号更新成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('更新序列号失败：' . $e->getMessage());
        }
    }
    
    /**
     * 删除序列号
     */
    public function delete(Request $request, $id)
    {
        try {
            $serialNumber = SerialNumber::find($id);
            
            if (!$serialNumber) {
                return Response::notFound('序列号不存在');
            }
            
            $serialNumber->delete();
            
            return Response::success([], '序列号删除成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('删除序列号失败：' . $e->getMessage());
        }
    }
    
    /**
     * 通过条码查询设备信息
     */
    public function queryByBarcode(Request $request)
    {
        try {
            $barcode = $request->get('barcode');
            
            if (empty($barcode)) {
                return Response::error('请提供条码');
            }
            
            // 先尝试在序列号表中查找
            $serialNumber = SerialNumber::with(['product'])->where('serial_number', $barcode)->find();
            
            if ($serialNumber) {
                $data = [
                    'type' => 'serial_number',
                    'info' => $serialNumber->toArray(),
                    'product' => $serialNumber->product ? $serialNumber->product->toArray() : null,
                    'status_text' => $serialNumber->status_text
                ];
                return Response::success($data, '查询成功');
            }
            
            // 如果没找到，尝试在产品表中查找
            $product = Product::where('barcode', $barcode)->find();
            
            if ($product) {
                $data = [
                    'type' => 'product',
                    'info' => $product->toArray(),
                    'status_text' => $product->status_text
                ];
                return Response::success($data, '查询成功');
            }
            
            return Response::notFound('未找到对应的设备信息');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('查询设备信息失败：' . $e->getMessage());
        }
    }
    
    /**
     * 批量导入序列号
     */
    public function bulkImport(Request $request)
    {
        try {
            $data = $request->post();
            $serialNumbers = $data['serial_numbers'] ?? [];
            
            if (empty($serialNumbers) || !is_array($serialNumbers)) {
                return Response::error('请提供有效的序列号数据');
            }
            
            $successCount = 0;
            $failures = [];
            
            foreach ($serialNumbers as $item) {
                try {
                    // 验证必填字段
                    if (empty($item['serial_number']) || empty($item['product_id'])) {
                        $failures[] = [
                            'data' => $item,
                            'reason' => '序列号和产品ID为必填项'
                        ];
                        continue;
                    }
                    
                    // 检查序列号是否已存在
                    $exists = SerialNumber::where('serial_number', $item['serial_number'])->find();
                    if ($exists) {
                        $failures[] = [
                            'data' => $item,
                            'reason' => '序列号已存在'
                        ];
                        continue;
                    }
                    
                    // 验证产品是否存在
                    $product = Product::find($item['product_id']);
                    if (!$product) {
                        $failures[] = [
                            'data' => $item,
                            'reason' => '指定的产品不存在'
                        ];
                        continue;
                    }
                    
                    // 计算保修截止日期
                    $warrantyEndDate = null;
                    if (!empty($item['manufacture_date']) && !empty($item['warranty_period'])) {
                        $warrantyEndDate = date('Y-m-d', strtotime($item['manufacture_date'] . ' +' . $item['warranty_period'] . ' months'));
                    }
                    
                    $serialNumber = new SerialNumber();
                    $serialNumber->serial_number = $item['serial_number'];
                    $serialNumber->product_id = $item['product_id'];
                    $serialNumber->manufacture_date = $item['manufacture_date'] ?? null;
                    $serialNumber->warranty_period = $item['warranty_period'] ?? null;
                    $serialNumber->warranty_end_date = $warrantyEndDate;
                    $serialNumber->status = $item['status'] ?? SerialNumber::STATUS_IN_STOCK;
                    $serialNumber->location = $item['location'] ?? '';
                    $serialNumber->notes = $item['notes'] ?? '';
                    $serialNumber->save();
                    
                    $successCount++;
                } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
                    $failures[] = [
                        'data' => $item,
                        'reason' => $e->getMessage()
                    ];
                }
            }
            
            return Response::success([
                'success_count' => $successCount,
                'failure_count' => count($failures),
                'failures' => $failures
            ], '批量导入完成');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('批量导入失败：' . $e->getMessage());
        }
    }
    
    /**
     * 设备登记
     */
    public function registerDevice(Request $request)
    {
        try {
            $data = $request->post();
            
            // 验证参数
            $validate = Validate::rule([
                'serial_number' => 'require|max:100',
                'product_id' => 'require|integer',
                'manufacture_date' => 'date',
                'warranty_period' => 'integer',
                'location' => 'max:200',
                'notes' => 'max:500'
            ]);
            
            if (!$validate->check($data)) {
                return Response::validateError($validate->getError());
            }
            
            // 验证产品是否存在
            $product = Product::find($data['product_id']);
            if (!$product) {
                return Response::error('指定的产品不存在');
            }
            
            // 检查序列号是否已存在
            $existingSerial = SerialNumber::where('serial_number', $data['serial_number'])->find();
            if ($existingSerial) {
                return Response::error('序列号已存在');
            }
            
            // 计算保修截止日期
            $warrantyEndDate = null;
            if (!empty($data['manufacture_date']) && !empty($data['warranty_period'])) {
                $warrantyEndDate = date('Y-m-d', strtotime($data['manufacture_date'] . ' +' . $data['warranty_period'] . ' months'));
            }
            
            // 创建序列号记录
            $serialNumber = new SerialNumber();
            $serialNumber->serial_number = $data['serial_number'];
            $serialNumber->product_id = $data['product_id'];
            $serialNumber->manufacture_date = $data['manufacture_date'] ?? null;
            $serialNumber->warranty_period = $data['warranty_period'] ?? null;
            $serialNumber->warranty_end_date = $warrantyEndDate;
            $serialNumber->status = SerialNumber::STATUS_IN_STOCK;
            $serialNumber->location = $data['location'] ?? '';
            $serialNumber->notes = $data['notes'] ?? '';
            $serialNumber->save();
            
            // 返回设备信息
            $result = [
                'id' => $serialNumber->id,
                'serial_number' => $serialNumber->serial_number,
                'product_id' => $serialNumber->product_id,
                'product_info' => $product->toArray(),
                'status' => $serialNumber->status,
                'status_text' => $serialNumber->status_text,
                'manufacture_date' => $serialNumber->manufacture_date,
                'warranty_period' => $serialNumber->warranty_period,
                'warranty_end_date' => $serialNumber->warranty_end_date,
                'location' => $serialNumber->location,
                'notes' => $serialNumber->notes,
                'created_at' => $serialNumber->created_at,
                'updated_at' => $serialNumber->updated_at
            ];
            
            return Response::success($result, '设备登记成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('设备登记失败：' . $e->getMessage());
        }
    }
    
    /**
     * 上传条码图片并识别序列号
     */
    public function uploadBarcode(Request $request)
    {
        try {
            // 获取上传的文件
            $file = $request->file('image');
            
            if (!$file || !$file->isValid()) {
                return Response::error('请上传有效的图片文件');
            }
            
            // 验证文件类型
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!in_array($file->getMime(), $allowedTypes)) {
                return Response::error('只支持JPEG、PNG、GIF格式的图片');
            }
            
            // 验证文件大小（最大5MB）
            if ($file->getSize() > 5 * 1024 * 1024) {
                return Response::error('图片文件大小不能超过5MB');
            }
            
            // 保存文件
            $saveName = Filesystem::putFile('barcodes', $file);
            
            if (!$saveName) {
                return Response::serverError('文件保存失败');
            }
            
            // 获取文件完整路径
            $filePath = Filesystem::path($saveName);
            
            // 使用条码识别服务识别图片中的条码
            $barcodeService = new BarcodeService();
            $serialNumber = $barcodeService->recognizeBarcode($filePath);
            
            if (empty($serialNumber)) {
                // 删除临时文件
                if (file_exists($filePath)) {
                    unlink($filePath);
                }
                return Response::error('无法识别图片中的条码');
            }
            
            // 删除临时文件
            if (file_exists($filePath)) {
                unlink($filePath);
            }
            
            return Response::success([
                'serialNumber' => $serialNumber
            ], '条码识别成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('条码识别失败：' . $e->getMessage());
        }
    }
    
    /**
     * 通过图片URL识别条码
     */
    public function recognizeBarcode(Request $request)
    {
        try {
            $data = $request->post();
            $imageUrl = $data['imageUrl'] ?? '';
            
            if (empty($imageUrl)) {
                return Response::error('请提供图片URL');
            }
            
            // 下载图片
            $imageContent = file_get_contents($imageUrl);
            if (!$imageContent) {
                return Response::error('无法下载图片');
            }
            
            // 使用条码识别服务识别图片中的条码
            $barcodeService = new BarcodeService();
            $serialNumber = $barcodeService->recognizeBarcodeFromContent($imageContent);
            
            if (empty($serialNumber)) {
                return Response::error('无法识别图片中的条码');
            }
            
            return Response::success([
                'serialNumber' => $serialNumber
            ], '条码识别成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('条码识别失败：' . $e->getMessage());
        }
    }
}
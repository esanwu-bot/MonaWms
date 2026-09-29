<?php

namespace app\controller;

use app\BaseController;
use app\common\Current;
use app\common\Grant;
use app\model\OutboundOrder;
use app\model\OutboundOrderItem;
use app\model\Warehouse;
use app\model\Customer;
use app\model\Product;
use app\model\Location;
use app\common\library\Response;
use think\Request;
use think\facade\Validate;
use think\facade\Db;

/**
 * 出库单管理控制器
 */
class OutboundOrderController extends BaseController
{
    /**
     * 获取出库单列表
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
                $query = OutboundOrder::onlyTrashed()->with(['warehouse', 'customer', 'operator']);
            } elseif ($archived === 'all') {
                $query = OutboundOrder::withTrashed()->with(['warehouse', 'customer', 'operator']);
            } else {
                $query = OutboundOrder::with(['warehouse', 'customer', 'operator']);
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
            
            if (!empty($params['customer_id'])) {
                $searchFields['customer_id'] = $params['customer_id'];
            }
            
            if (!empty($params['status'])) {
                $searchFields['status'] = $params['status'];
            }
            
            if (!empty($params['type'])) {
                $searchFields['type'] = $params['type'];
            }
            
            if (!empty($params['priority'])) {
                $searchFields['priority'] = $params['priority'];
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
                $item['priority_text'] = $order->getPriorityText();
                $item['warehouse_name'] = $order->warehouse->name ?? '';
                $item['customer_name'] = $order->customer->name ?? '';
                $item['operator_name'] = $order->operator->username ?? '';
                $item['statistics'] = $order->getStatistics();
                // 归档标记：前端据此展示「已归档」Tag
                $item['is_archived'] = !empty($order->getData('deleted_at'));
                $item['archived_at'] = $order->getData('deleted_at');
                $list[] = $item;
            }
            
            return Response::paginate($list, $result->total(), $page, $limit);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('获取出库单列表失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取出库单详情
     */
    public function read(Request $request, $id)
    {
        try {
            // withTrashed：已归档单据详情仍可翻查（物资追溯要求信息保留）
            $order = OutboundOrder::withTrashed()->with(['warehouse', 'customer', 'operator', 'items.product', 'items.location'])->find($id);

            if (!$order) {
                return Response::notFound('出库单不存在');
            }
            
            $data = $order->getDetailInfo();
            
            return Response::success($data);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('获取出库单详情失败：' . $e->getMessage());
        }
    }
    
    /**
     * 创建出库单
     */
    public function save(Request $request)
    {
        $data = $request->post();
        Grant::assert('outbound:write', (int) $data['warehouse_id']);
        
        // 验证参数：直接实例化 think\Validate，避免门面单例导致 items.* 通配规则失效
        $validate = new \think\Validate([
            'warehouse_id' => 'require|integer',
            'customer_id' => 'integer',                          // D2：与领用信息并存，非必填
            'receiver_unit' => 'max:100',                        // D2：领用单位
            'receiver_name' => 'max:50',                         // D2：领用人
            'receiver_phone' => 'mobile',                        // D4：手机号格式校验
            'shipped_at' => 'date',                              // C2：出库时间
            'type' => 'require|in:sale,return,transfer,other',
            'priority' => 'in:low,normal,high,urgent',
            'expected_date' => 'require|date',
            'notes' => 'max:500',
            'items' => 'require|array',
            'items.*.product_id' => 'require|integer',
            // A4：数量允许小数（计件类在下方按物资计量方式二次校验）
            'items.*.quantity' => 'require|float|>:0',
            'items.*.unit_price' => 'float|>=:0',
            'items.*.notes' => 'max:255'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        Db::startTrans();
        try {
            // 验证仓库和客户是否存在
            $warehouse = Warehouse::find($data['warehouse_id']);
            if (!$warehouse) {
                throw new \Exception('仓库不存在');
            }
            
            if (!empty($data['customer_id'])) {
                $customer = Customer::find($data['customer_id']);
                if (!$customer) {
                    throw new \Exception('客户不存在');
                }
            }
            
            // 创建出库单
            $order = new OutboundOrder();
            $order->order_number = OutboundOrder::generateOrderNumber();
            $order->warehouse_id = $data['warehouse_id'];
            $order->customer_id = $data['customer_id'] ?? null;
            $order->receiver_unit = $data['receiver_unit'] ?? null;   // D2：领用单位
            $order->receiver_name = $data['receiver_name'] ?? null;   // D2：领用人
            $order->receiver_phone = $data['receiver_phone'] ?? null; // D2：手机号
            $order->shipped_at = $data['shipped_at'] ?? null;         // C2：出库时间
            $order->operator_id = $this->getCurrentUserId($request);
            $order->created_by = Current::idOrNull();
            $order->status = OutboundOrder::STATUS_PENDING;
            $order->type = $data['type'];
            $order->priority = $data['priority'] ?? OutboundOrder::PRIORITY_NORMAL;
            $order->expected_date = $data['expected_date'];
            $order->notes = $data['notes'] ?? '';
            $order->save();
            
            // 创建出库单明细
            foreach ($data['items'] as $itemData) {
                // 验证商品是否存在
                $product = Product::find($itemData['product_id']);
                if (!$product) {
                    throw new \Exception('商品ID ' . $itemData['product_id'] . ' 不存在');
                }
                
                // A4：按物资计量方式校验数量
                try {
                    $product->assertQuantityValid((string) $itemData['quantity']);
                } catch (\InvalidArgumentException $e) {
                    throw new \Exception($product->name . '：' . $e->getMessage());
                }
                
                // 检查库存是否充足（缺料明细随错误返回）
                $availableStock = (string) $product->getAvailableStock();
                if (bccomp($availableStock, (string) $itemData['quantity'], 4) < 0) {
                    throw new \app\common\BizException('STOCK_INSUFFICIENT', '商品 ' . $product->name . ' 库存不足', [[
                        'product_id'   => $product->id,
                        'product_name' => $product->name,
                        'unit'         => $product->unit ?: '件',
                        'required'     => (string) $itemData['quantity'],
                        'available'    => $availableStock,
                        'shortage'     => bcsub((string) $itemData['quantity'], $availableStock, 4)
                    ]]);
                }
                
                $item = new OutboundOrderItem();
                $item->outbound_order_id = $order->id;
                $item->product_id = $itemData['product_id'];
                $item->unit = $product->unit ?: '件';                        // A6：单位快照
                $item->requires_serial = $product->requiresSerial() ? 1 : 0;  // E1：由计量方式推导
                $item->quantity = (string) $itemData['quantity'];
                $item->picked_quantity = 0;
                $item->unit_price = $itemData['unit_price'] ?? 0;
                $item->notes = $itemData['notes'] ?? '';
                $item->save();
            }
            
            Db::commit();
            
            return Response::success([
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'status_text' => $order->status_text
            ], '出库单创建成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            Db::rollback();
            return Response::serverError('创建出库单失败：' . $e->getMessage());
        }
    }
    
    /**
     * 更新出库单
     */
    public function update(Request $request, $id)
    {
        $data = $request->put();
        
        // 验证参数
        $validate = Validate::rule([
            'warehouse_id' => 'integer',
            'customer_id' => 'integer',
            'receiver_unit' => 'max:100',    // D2
            'receiver_name' => 'max:50',     // D2
            'receiver_phone' => 'mobile',    // D4
            'shipped_at' => 'date',          // C2
            'type' => 'in:sale,return,transfer,other',
            'priority' => 'in:low,normal,high,urgent',
            'expected_date' => 'date',
            'tracking_number' => 'max:100',
            'notes' => 'max:500'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            $order = OutboundOrder::find($id);
            
            if (!$order) {
                return Response::notFound('出库单不存在');
            }
            
            Grant::assert('outbound:write', (int) $order->warehouse_id);
            
            // 只有待处理状态的订单才能修改基本信息
            if ($order->status != OutboundOrder::STATUS_PENDING && 
                isset($data['warehouse_id'], $data['customer_id'], $data['type'], $data['expected_date'])) {
                return Response::error('只有待处理状态的出库单才能修改基本信息');
            }
            
            // 验证仓库和客户是否存在
            if (!empty($data['warehouse_id'])) {
                $warehouse = Warehouse::find($data['warehouse_id']);
                if (!$warehouse) {
                    return Response::error('仓库不存在');
                }
            }
            
            if (!empty($data['customer_id'])) {
                $customer = Customer::find($data['customer_id']);
                if (!$customer) {
                    return Response::error('客户不存在');
                }
            }
            
            // 更新字段
            $updateFields = [
                'warehouse_id', 'customer_id', 'type', 'priority', 'expected_date', 'tracking_number', 'notes',
                'receiver_unit', 'receiver_name', 'receiver_phone', 'shipped_at' // P8：领用信息与出库时间
            ];
            foreach ($updateFields as $field) {
                if (isset($data[$field])) {
                    $order->$field = $data[$field];
                }
            }
            
            $order->save();
            
            return Response::success([
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'status_text' => $order->status_text
            ], '出库单更新成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('更新出库单失败：' . $e->getMessage());
        }
    }
    
    /**
     * 删除出库单
     */
    public function delete(Request $request, $id)
    {
        try {
            // find() 默认排除已归档单，归档单不会重复归档
            $order = OutboundOrder::find($id);

            if (!$order) {
                return Response::notFound('出库单不存在');
            }

            Grant::assert('outbound:write', (int) $order->warehouse_id);

            if (!$order->canDelete()) {
                return Response::error('出库单已开始拣货，无法归档');
            }

            // 软删除（归档）：单据与明细物理数据全部保留，可在「已归档」筛选下翻查
            $order->delete();

            return Response::success([], '出库单已归档，可在归档筛选中翻查');

        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('归档出库单失败：' . $e->getMessage());
        }
    }
    
    /**
     * 开始拣货
     */
    public function startPicking(Request $request, $id)
    {
        try {
            $order = OutboundOrder::find($id);
            
            if (!$order) {
                return Response::notFound('出库单不存在');
            }
            
            Grant::assert('outbound:write', (int) $order->warehouse_id);
            
            $order->startPicking();
            
            return Response::success([
                'id' => $order->id,
                'status' => $order->status,
                'status_text' => $order->status_text
            ], '开始拣货成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('开始拣货失败：' . $e->getMessage());
        }
    }
    
    /**
     * 拣货
     */
    public function pick(Request $request, $id)
    {
        $data = $request->post();
        
        // 验证参数
        $validate = Validate::rule([
            'item_id' => 'require|integer',
            'location_id' => 'require|integer',
            // A4：数量允许小数，计件类由 Model 按计量方式二次校验
            'quantity' => 'require|float|>:0',
            'batch_number' => 'max:50',
            'serials' => 'array'   // E3：SN 批量录入（计件类必填，个数需等于数量）
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            $order = OutboundOrder::find($id);
            
            if (!$order) {
                return Response::notFound('出库单不存在');
            }
            
            Grant::assert('outbound:write', (int) $order->warehouse_id);
            
            if ($order->status != OutboundOrder::STATUS_PICKING) {
                return Response::error('出库单状态不正确，无法拣货');
            }
            
            $item = OutboundOrderItem::find($data['item_id']);
            if (!$item || $item->outbound_order_id != $id) {
                return Response::error('出库单明细不存在');
            }
            
            $location = Location::find($data['location_id']);
            if (!$location) {
                return Response::error('库位不存在');
            }
            
            // D3：执行拣货（同一事务内完成库存扣减 + SN 状态联动 + 流水）
            $serials = $data['serials'] ?? [];
            if (is_string($serials)) {
                $serials = preg_split('/[\r\n,\s]+/', trim($serials), -1, PREG_SPLIT_NO_EMPTY);
            }
            $item->pick(
                $data['quantity'],
                $data['location_id'],
                $data['batch_number'] ?? null,
                is_array($serials) ? array_values(array_filter(array_map('trim', $serials))) : [],
                (int) Current::idOrNull()
            );
            
            // 检查是否完成拣货
            $order->checkAndPack();
            
            return Response::success([
                'item_id' => $item->id,
                'picked_quantity' => $item->picked_quantity,
                'remaining_quantity' => $item->getRemainingQuantity(),
                'completion_rate' => $item->getCompletionRate(),
                'order_status' => $order->status,
                'order_status_text' => $order->status_text
            ], '拣货成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('拣货失败：' . $e->getMessage());
        }
    }
    
    /**
     * 打包
     */
    public function pack(Request $request, $id)
    {
        try {
            $order = OutboundOrder::find($id);
            
            if (!$order) {
                return Response::notFound('出库单不存在');
            }
            
            Grant::assert('outbound:write', (int) $order->warehouse_id);
            
            $order->pack();
            
            return Response::success([
                'id' => $order->id,
                'status' => $order->status,
                'status_text' => $order->status_text
            ], '打包完成');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('打包失败：' . $e->getMessage());
        }
    }
    
    /**
     * 发货
     */
    public function ship(Request $request, $id)
    {
        $data = $request->post();
        
        // 验证参数
        $validate = Validate::rule([
            'tracking_number' => 'max:100'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            $order = OutboundOrder::find($id);
            
            if (!$order) {
                return Response::notFound('出库单不存在');
            }
            
            Grant::assert('outbound:post', (int) $order->warehouse_id);
            
            $order->ship($data['tracking_number'] ?? null);
            
            return Response::success([
                'id' => $order->id,
                'status' => $order->status,
                'status_text' => $order->status_text,
                'shipped_date' => $order->shipped_date,
                'tracking_number' => $order->tracking_number
            ], '发货成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('发货失败：' . $e->getMessage());
        }
    }
    
    /**
     * 批量拣货
     */
    public function batchPicking(Request $request)
    {
        $data = $request->post();
        
        // 验证参数
        $validate = Validate::rule([
            'order_ids' => 'require|array',
            'order_ids.*' => 'integer|>:0'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            Db::startTrans();
            
            $orderIds = $data['order_ids'];
            $results = [];
            $successCount = 0;
            $failCount = 0;
            
            foreach ($orderIds as $orderId) {
                try {
                    $order = OutboundOrder::find($orderId);
                    
                    if (!$order) {
                        $results[] = [
                            'order_id' => $orderId,
                            'order_number' => '',
                            'success' => false,
                            'message' => '出库单不存在'
                        ];
                        $failCount++;
                        continue;
                    }
                    
                    // 检查状态是否可以开始拣货
                    if ($order->status !== OutboundOrder::STATUS_PENDING) {
                        $results[] = [
                            'order_id' => $orderId,
                            'order_number' => $order->order_number,
                            'success' => false,
                            'message' => '出库单状态不正确，当前状态：' . $order->status_text
                        ];
                        $failCount++;
                        continue;
                    }
                    
                    // 检查库存是否充足
                    $items = OutboundOrderItem::where('outbound_order_id', $orderId)->select();
                    $stockCheckFailed = false;
                    $stockMessage = '';
                    
                    foreach ($items as $item) {
                        $product = Product::find($item->product_id);
                        if (!$product) {
                            $stockCheckFailed = true;
                            $stockMessage = '商品不存在';
                            break;
                        }
                        
                        $availableStock = $product->getAvailableStock();
                        if ($availableStock < $item->quantity) {
                            $stockCheckFailed = true;
                            $stockMessage = '商品 ' . $product->name . ' 库存不足，需要：' . $item->quantity . '，可用：' . $availableStock;
                            break;
                        }
                    }
                    
                    if ($stockCheckFailed) {
                        $results[] = [
                            'order_id' => $orderId,
                            'order_number' => $order->order_number,
                            'success' => false,
                            'message' => $stockMessage
                        ];
                        $failCount++;
                        continue;
                    }
                    
                    // 开始拣货
                    $order->startPicking();
                    
                    $results[] = [
                        'order_id' => $orderId,
                        'order_number' => $order->order_number,
                        'success' => true,
                        'message' => '开始拣货成功',
                        'status' => $order->status,
                        'status_text' => $order->status_text
                    ];
                    $successCount++;
                    
                } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
                    $results[] = [
                        'order_id' => $orderId,
                        'order_number' => $order->order_number ?? '',
                        'success' => false,
                        'message' => '操作失败：' . $e->getMessage()
                    ];
                    $failCount++;
                }
            }
            
            Db::commit();
            
            return Response::success([
                'total' => count($orderIds),
                'success_count' => $successCount,
                'fail_count' => $failCount,
                'results' => $results
            ], "批量拣货完成，成功：{$successCount}个，失败：{$failCount}个");
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            Db::rollback();
            return Response::serverError('批量拣货失败：' . $e->getMessage());
        }
    }
    
    /**
     * 批量完成拣货
     */
    public function batchCompletePicking(Request $request)
    {
        $data = $request->post();
        
        // 验证参数
        $validate = Validate::rule([
            'order_ids' => 'require|array',
            'order_ids.*' => 'integer|>:0'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            Db::startTrans();
            
            $orderIds = $data['order_ids'];
            $results = [];
            $successCount = 0;
            $failCount = 0;
            
            foreach ($orderIds as $orderId) {
                try {
                    $order = OutboundOrder::find($orderId);
                    
                    if (!$order) {
                        $results[] = [
                            'order_id' => $orderId,
                            'order_number' => '',
                            'success' => false,
                            'message' => '出库单不存在'
                        ];
                        $failCount++;
                        continue;
                    }
                    
                    // 检查状态是否可以完成拣货
                    if ($order->status !== OutboundOrder::STATUS_PICKING) {
                        $results[] = [
                            'order_id' => $orderId,
                            'order_number' => $order->order_number,
                            'success' => false,
                            'message' => '出库单状态不正确，当前状态：' . $order->status_text
                        ];
                        $failCount++;
                        continue;
                    }
                    
                    // 自动完成所有未拣货的商品
                    $items = OutboundOrderItem::where('outbound_order_id', $orderId)
                        ->where('picked_quantity', '<', 'quantity')
                        ->select();
                    
                    foreach ($items as $item) {
                        $remainingQuantity = $item->quantity - $item->picked_quantity;
                        if ($remainingQuantity > 0) {
                            // 获取商品的默认库位
                            $product = Product::find($item->product_id);
                            $location = Location::where('product_id', $item->product_id)
                                ->where('quantity', '>', 0)
                                ->order('quantity', 'desc')
                                ->find();
                            
                            if ($location) {
                                $item->pick($remainingQuantity, $location->id);
                            }
                        }
                    }
                    
                    // 检查并打包
                    $order->checkAndPack();
                    
                    $results[] = [
                        'order_id' => $orderId,
                        'order_number' => $order->order_number,
                        'success' => true,
                        'message' => '完成拣货成功',
                        'status' => $order->status,
                        'status_text' => $order->status_text
                    ];
                    $successCount++;
                    
                } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
                    $results[] = [
                        'order_id' => $orderId,
                        'order_number' => $order->order_number ?? '',
                        'success' => false,
                        'message' => '操作失败：' . $e->getMessage()
                    ];
                    $failCount++;
                }
            }
            
            Db::commit();
            
            return Response::success([
                'total' => count($orderIds),
                'success_count' => $successCount,
                'fail_count' => $failCount,
                'results' => $results
            ], "批量完成拣货，成功：{$successCount}个，失败：{$failCount}个");
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            Db::rollback();
            return Response::serverError('批量完成拣货失败：' . $e->getMessage());
        }
    }
    
    /**
     * 确认送达
     */
    public function deliver(Request $request, $id)
    {
        try {
            $order = OutboundOrder::find($id);
            
            if (!$order) {
                return Response::notFound('出库单不存在');
            }
            
            $order->deliver();
            
            return Response::success([
                'id' => $order->id,
                'status' => $order->status,
                'status_text' => $order->status_text
            ], '确认送达成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('确认送达失败：' . $e->getMessage());
        }
    }
    
    /**
     * 取消出库单
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
            $order = OutboundOrder::find($id);
            
            if (!$order) {
                return Response::notFound('出库单不存在');
            }
            
            Grant::assert('outbound:write', (int) $order->warehouse_id);
            
            $order->cancel($data['reason']);
            
            return Response::success([
                'id' => $order->id,
                'status' => $order->status,
                'status_text' => $order->status_text
            ], '出库单取消成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('取消出库单失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取出库单统计
     */
    public function statistics(Request $request)
    {
        try {
            $params = $request->get();
            
            $query = OutboundOrder::where('id', '>', 0);
            
            // 筛选条件
            if (!empty($params['warehouse_id'])) {
                $query->where('warehouse_id', $params['warehouse_id']);
            }
            
            if (!empty($params['customer_id'])) {
                $query->where('customer_id', $params['customer_id']);
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

            // 汇总明细数量（拣货进度）
            $orderIds = (clone $query)->column('id');
            $quantityRow = $orderIds
                ? Db::name('outbound_order_items')
                    ->whereIn('outbound_order_id', $orderIds)
                    ->field('SUM(quantity) AS quantity, SUM(picked_quantity) AS picked_quantity')
                    ->find()
                : null;

            $totalQuantity = (int) ($quantityRow['quantity'] ?? 0);
            $pickedQuantity = (int) ($quantityRow['picked_quantity'] ?? 0);

            $statistics = [
                'total' => $total,
                'by_status' => $byStatus,
                'pending' => $byStatus[OutboundOrder::STATUS_PENDING] ?? 0,
                'picking' => $byStatus[OutboundOrder::STATUS_PICKING] ?? 0,
                'packed' => $byStatus[OutboundOrder::STATUS_PACKED] ?? 0,
                'shipped' => $byStatus[OutboundOrder::STATUS_SHIPPED] ?? 0,
                'delivered' => $byStatus[OutboundOrder::STATUS_DELIVERED] ?? 0,
                'cancelled' => $byStatus[OutboundOrder::STATUS_CANCELLED] ?? 0,
                'total_quantity' => $totalQuantity,
                'picked_quantity' => $pickedQuantity,
                'completion_rate' => $totalQuantity > 0
                    ? round($pickedQuantity / $totalQuantity * 100, 2)
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
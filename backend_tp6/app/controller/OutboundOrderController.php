<?php

namespace app\controller;

use app\BaseController;
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
            
            $query = OutboundOrder::with(['warehouse', 'customer', 'operator']);
            
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
                $list[] = $item;
            }
            
            return Response::paginate($list, $result->total(), $page, $limit);
            
        } catch (\Exception $e) {
            return Response::serverError('获取出库单列表失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取出库单详情
     */
    public function read(Request $request, $id)
    {
        try {
            $order = OutboundOrder::with(['warehouse', 'customer', 'operator', 'items.product', 'items.location'])->find($id);
            
            if (!$order) {
                return Response::notFound('出库单不存在');
            }
            
            $data = $order->getDetailInfo();
            
            return Response::success($data);
            
        } catch (\Exception $e) {
            return Response::serverError('获取出库单详情失败：' . $e->getMessage());
        }
    }
    
    /**
     * 创建出库单
     */
    public function save(Request $request)
    {
        $data = $request->post();
        
        // 验证参数
        $validate = Validate::rule([
            'warehouse_id' => 'require|integer',
            'customer_id' => 'require|integer',
            'type' => 'require|in:sale,return,transfer,other',
            'priority' => 'in:low,normal,high,urgent',
            'expected_date' => 'require|date',
            'notes' => 'max:500',
            'items' => 'require|array',
            'items.*.product_id' => 'require|integer',
            'items.*.quantity' => 'require|integer|>:0',
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
            
            $customer = Customer::find($data['customer_id']);
            if (!$customer) {
                throw new \Exception('客户不存在');
            }
            
            // 创建出库单
            $order = new OutboundOrder();
            $order->order_number = OutboundOrder::generateOrderNumber();
            $order->warehouse_id = $data['warehouse_id'];
            $order->customer_id = $data['customer_id'];
            $order->operator_id = $this->getCurrentUserId($request);
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
                
                // 检查库存是否充足
                $availableStock = $product->getAvailableStock();
                if ($availableStock < $itemData['quantity']) {
                    throw new \Exception('商品 ' . $product->name . ' 库存不足，可用库存：' . $availableStock);
                }
                
                $item = new OutboundOrderItem();
                $item->outbound_order_id = $order->id;
                $item->product_id = $itemData['product_id'];
                $item->quantity = $itemData['quantity'];
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
            
        } catch (\Exception $e) {
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
            $updateFields = ['warehouse_id', 'customer_id', 'type', 'priority', 'expected_date', 'tracking_number', 'notes'];
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
            
        } catch (\Exception $e) {
            return Response::serverError('更新出库单失败：' . $e->getMessage());
        }
    }
    
    /**
     * 删除出库单
     */
    public function delete(Request $request, $id)
    {
        try {
            $order = OutboundOrder::find($id);
            
            if (!$order) {
                return Response::notFound('出库单不存在');
            }
            
            if (!$order->canDelete()) {
                return Response::error('出库单已开始拣货，无法删除');
            }
            
            Db::startTrans();
            
            // 删除出库单明细
            OutboundOrderItem::where('outbound_order_id', $id)->delete();
            
            // 删除出库单
            $order->delete();
            
            Db::commit();
            
            return Response::success([], '出库单删除成功');
            
        } catch (\Exception $e) {
            Db::rollback();
            return Response::serverError('删除出库单失败：' . $e->getMessage());
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
            
            $order->startPicking();
            
            return Response::success([
                'id' => $order->id,
                'status' => $order->status,
                'status_text' => $order->status_text
            ], '开始拣货成功');
            
        } catch (\Exception $e) {
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
            'quantity' => 'require|integer|>:0',
            'batch_number' => 'max:50'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            $order = OutboundOrder::find($id);
            
            if (!$order) {
                return Response::notFound('出库单不存在');
            }
            
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
            
            // 执行拣货
            $item->pick(
                $data['quantity'],
                $data['location_id'],
                $data['batch_number'] ?? null
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
            
        } catch (\Exception $e) {
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
            
            $order->pack();
            
            return Response::success([
                'id' => $order->id,
                'status' => $order->status,
                'status_text' => $order->status_text
            ], '打包完成');
            
        } catch (\Exception $e) {
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
            
            $order->ship($data['tracking_number'] ?? null);
            
            return Response::success([
                'id' => $order->id,
                'status' => $order->status,
                'status_text' => $order->status_text,
                'shipped_date' => $order->shipped_date,
                'tracking_number' => $order->tracking_number
            ], '发货成功');
            
        } catch (\Exception $e) {
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
                    
                } catch (\Exception $e) {
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
            
        } catch (\Exception $e) {
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
                    
                } catch (\Exception $e) {
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
            
        } catch (\Exception $e) {
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
            
        } catch (\Exception $e) {
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
            
            $order->cancel($data['reason']);
            
            return Response::success([
                'id' => $order->id,
                'status' => $order->status,
                'status_text' => $order->status_text
            ], '出库单取消成功');
            
        } catch (\Exception $e) {
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
            
            $query = OutboundOrder::query();
            
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
            
            $statistics = OutboundOrder::getStatistics($query);
            
            return Response::success($statistics);
            
        } catch (\Exception $e) {
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
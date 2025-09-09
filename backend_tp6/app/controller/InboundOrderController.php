<?php

namespace app\controller;

use app\BaseController;
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
            
            $query = InboundOrder::with(['warehouse', 'supplier', 'operator']);
            
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
                $list[] = $item;
            }
            
            return Response::paginate($list, $result->total(), $page, $limit);
            
        } catch (\Exception $e) {
            return Response::serverError('获取入库单列表失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取入库单详情
     */
    public function read(Request $request, $id)
    {
        try {
            $order = InboundOrder::with(['warehouse', 'supplier', 'operator', 'items.product', 'items.location'])->find($id);
            
            if (!$order) {
                return Response::notFound('入库单不存在');
            }
            
            $data = $order->getDetailInfo();
            
            return Response::success($data);
            
        } catch (\Exception $e) {
            return Response::serverError('获取入库单详情失败：' . $e->getMessage());
        }
    }
    
    /**
     * 创建入库单
     */
    public function save(Request $request)
    {
        $data = $request->post();
        
        // 验证参数
        $validate = Validate::rule([
            'warehouse_id' => 'require|integer',
            'supplier_id' => 'require|integer',
            'type' => 'require|in:purchase,return,transfer,other',
            'expected_date' => 'require|date',
            'notes' => 'max:500',
            'items' => 'require|array',
            'items.*.product_id' => 'require|integer',
            'items.*.quantity' => 'require|integer|>:0',
            'items.*.unit_price' => 'float|>=:0',
            'items.*.batch_number' => 'max:50',
            'items.*.expiry_date' => 'date',
            'items.*.notes' => 'max:255'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        Db::startTrans();
        try {
            // 验证仓库和供应商是否存在
            $warehouse = Warehouse::find($data['warehouse_id']);
            if (!$warehouse) {
                throw new \Exception('仓库不存在');
            }
            
            $supplier = Supplier::find($data['supplier_id']);
            if (!$supplier) {
                throw new \Exception('供应商不存在');
            }
            
            // 创建入库单
            $order = new InboundOrder();
            $order->order_number = InboundOrder::generateOrderNumber();
            $order->warehouse_id = $data['warehouse_id'];
            $order->supplier_id = $data['supplier_id'];
            $order->operator_id = $this->getCurrentUserId($request);
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
            
            Db::commit();
            
            return Response::success([
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'status_text' => $order->status_text
            ], '入库单创建成功');
            
        } catch (\Exception $e) {
            Db::rollback();
            return Response::serverError('创建入库单失败：' . $e->getMessage());
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
            
            // 更新字段
            $updateFields = ['warehouse_id', 'supplier_id', 'type', 'expected_date', 'notes'];
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
            ], '入库单更新成功');
            
        } catch (\Exception $e) {
            return Response::serverError('更新入库单失败：' . $e->getMessage());
        }
    }
    
    /**
     * 删除入库单
     */
    public function delete(Request $request, $id)
    {
        try {
            $order = InboundOrder::find($id);
            
            if (!$order) {
                return Response::notFound('入库单不存在');
            }
            
            if (!$order->canDelete()) {
                return Response::error('入库单已开始收货，无法删除');
            }
            
            Db::startTrans();
            
            // 删除入库单明细
            InboundOrderItem::where('inbound_order_id', $id)->delete();
            
            // 删除入库单
            $order->delete();
            
            Db::commit();
            
            return Response::success([], '入库单删除成功');
            
        } catch (\Exception $e) {
            Db::rollback();
            return Response::serverError('删除入库单失败：' . $e->getMessage());
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
            
            $order->startReceiving();
            
            return Response::success([
                'id' => $order->id,
                'status' => $order->status,
                'status_text' => $order->status_text
            ], '开始收货成功');
            
        } catch (\Exception $e) {
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
            'quantity' => 'require|integer|>:0',
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
            
            // 检查是否完成收货
            $order->checkAndComplete();
            
            return Response::success([
                'item_id' => $item->id,
                'received_quantity' => $item->received_quantity,
                'remaining_quantity' => $item->getRemainingQuantity(),
                'completion_rate' => $item->getCompletionRate(),
                'order_status' => $order->status,
                'order_status_text' => $order->status_text
            ], '收货成功');
            
        } catch (\Exception $e) {
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
            
            $order->complete();
            
            return Response::success([
                'id' => $order->id,
                'status' => $order->status,
                'status_text' => $order->status_text,
                'received_date' => $order->received_date
            ], '入库完成');
            
        } catch (\Exception $e) {
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
            
            $order->cancel($data['reason']);
            
            return Response::success([
                'id' => $order->id,
                'status' => $order->status,
                'status_text' => $order->status_text
            ], '入库单取消成功');
            
        } catch (\Exception $e) {
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
            
            $query = InboundOrder::query();
            
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
            
            $statistics = InboundOrder::getStatistics($query);
            
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
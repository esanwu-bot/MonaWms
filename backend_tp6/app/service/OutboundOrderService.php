<?php

namespace app\service;

use app\model\OutboundOrder;
use app\model\OutboundOrderItem;
use app\model\Warehouse;
use app\model\Customer;
use app\model\Product;
use app\model\Location;
use app\model\Inventory;
use app\model\InventoryTransaction;
use think\exception\ValidateException;
use think\db\exception\DataNotFoundException;
use think\db\exception\ModelNotFoundException;
use think\facade\Db;

/**
 * 出库订单服务类
 */
class OutboundOrderService
{
    /**
     * 获取出库订单列表
     * @param array $params 查询参数
     * @return array
     */
    public function getList(array $params = []): array
    {
        $query = OutboundOrder::with(['warehouse', 'customer', 'operator']);

        // 搜索条件
        if (!empty($params['keyword'])) {
            $query->where(function($q) use ($params) {
                $q->whereLike('order_number', '%' . $params['keyword'] . '%')
                  ->whereOr('tracking_number', '%' . $params['keyword'] . '%')
                  ->whereOr('notes', '%' . $params['keyword'] . '%');
            });
        }

        if (!empty($params['order_number'])) {
            $query->where('order_number', $params['order_number']);
        }

        if (!empty($params['tracking_number'])) {
            $query->where('tracking_number', $params['tracking_number']);
        }

        if (isset($params['warehouse_id'])) {
            $query->where('warehouse_id', $params['warehouse_id']);
        }

        if (isset($params['customer_id'])) {
            $query->where('customer_id', $params['customer_id']);
        }

        if (isset($params['operator_id'])) {
            $query->where('operator_id', $params['operator_id']);
        }

        if (!empty($params['status'])) {
            $query->where('status', $params['status']);
        }

        if (!empty($params['type'])) {
            $query->where('type', $params['type']);
        }

        if (!empty($params['priority'])) {
            $query->where('priority', $params['priority']);
        }

        // 日期范围
        if (!empty($params['start_date'])) {
            $query->where('created_time', '>=', $params['start_date'] . ' 00:00:00');
        }

        if (!empty($params['end_date'])) {
            $query->where('created_time', '<=', $params['end_date'] . ' 23:59:59');
        }

        if (!empty($params['expected_start_date'])) {
            $query->where('expected_date', '>=', $params['expected_start_date']);
        }

        if (!empty($params['expected_end_date'])) {
            $query->where('expected_date', '<=', $params['expected_end_date']);
        }

        // 排序
        $order = $params['order'] ?? 'created_time';
        $sort = $params['sort'] ?? 'desc';
        $query->order($order, $sort);

        // 分页
        $page = $params['page'] ?? 1;
        $limit = $params['limit'] ?? 15;
        
        $result = $query->paginate([
            'list_rows' => $limit,
            'page' => $page
        ]);

        return [
            'list' => $result->items(),
            'total' => $result->total(),
            'page' => $page,
            'limit' => $limit
        ];
    }

    /**
     * 获取出库订单详情
     * @param int $id 订单ID
     * @return OutboundOrder
     * @throws ValidateException
     */
    public function getDetail(int $id): OutboundOrder
    {
        try {
            $order = OutboundOrder::with(['warehouse', 'customer', 'operator', 'items', 'items.product', 'items.location'])->find($id);
            if (!$order) {
                throw new ValidateException('出库订单不存在');
            }
            return $order;
        } catch (DataNotFoundException|ModelNotFoundException $e) {
            throw new ValidateException('出库订单不存在');
        }
    }

    /**
     * 创建出库订单
     * @param array $data 订单数据
     * @param int $operatorId 操作员ID
     * @return OutboundOrder
     * @throws ValidateException
     */
    public function create(array $data, int $operatorId): OutboundOrder
    {
        Db::startTrans();
        try {
            // 验证仓库
            if (!Warehouse::find($data['warehouse_id'])) {
                throw new ValidateException('仓库不存在');
            }

            // 验证客户
            if (isset($data['customer_id']) && !Customer::find($data['customer_id'])) {
                throw new ValidateException('客户不存在');
            }

            // 生成订单号
            $orderNumber = $this->generateOrderNumber();

            // 创建订单
            $orderData = [
                'order_number' => $orderNumber,
                'warehouse_id' => $data['warehouse_id'],
                'customer_id' => $data['customer_id'] ?? null,
                'operator_id' => $operatorId,
                'status' => 'pending',
                'type' => $data['type'] ?? 'sale',
                'priority' => $data['priority'] ?? 'normal',
                'expected_date' => $data['expected_date'] ?? null,
                'notes' => $data['notes'] ?? '',
                'created_time' => date('Y-m-d H:i:s')
            ];

            $order = OutboundOrder::create($orderData);

            // 创建订单明细
            if (!empty($data['items'])) {
                foreach ($data['items'] as $item) {
                    $this->createOrderItem($order->id, $item);
                }
            }

            Db::commit();
            return $this->getDetail($order->id);
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            Db::rollback();
            throw new ValidateException($e->getMessage());
        }
    }

    /**
     * 更新出库订单
     * @param int $id 订单ID
     * @param array $data 更新数据
     * @return OutboundOrder
     * @throws ValidateException
     */
    public function update(int $id, array $data): OutboundOrder
    {
        $order = $this->getDetail($id);

        // 检查订单状态
        if (!in_array($order->status, ['pending'])) {
            throw new ValidateException('当前状态不允许修改');
        }

        Db::startTrans();
        try {
            // 验证仓库
            if (isset($data['warehouse_id']) && !Warehouse::find($data['warehouse_id'])) {
                throw new ValidateException('仓库不存在');
            }

            // 验证客户
            if (isset($data['customer_id']) && !Customer::find($data['customer_id'])) {
                throw new ValidateException('客户不存在');
            }

            // 更新订单
            $updateData = array_intersect_key($data, array_flip([
                'warehouse_id', 'customer_id', 'type', 'priority', 'expected_date', 'notes'
            ]));
            $updateData['updated_time'] = date('Y-m-d H:i:s');
            $order->save($updateData);

            // 更新订单明细
            if (isset($data['items'])) {
                // 删除原有明细
                OutboundOrderItem::where('outbound_order_id', $id)->delete();
                
                // 创建新明细
                foreach ($data['items'] as $item) {
                    $this->createOrderItem($id, $item);
                }
            }

            Db::commit();
            return $this->getDetail($id);
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            Db::rollback();
            throw new ValidateException($e->getMessage());
        }
    }

    /**
     * 删除出库订单
     * @param int $id 订单ID
     * @return bool
     * @throws ValidateException
     */
    public function delete(int $id): bool
    {
        $order = $this->getDetail($id);

        // 检查订单状态
        if (!in_array($order->status, ['pending', 'cancelled'])) {
            throw new ValidateException('当前状态不允许删除');
        }

        Db::startTrans();
        try {
            // 删除订单明细
            OutboundOrderItem::where('outbound_order_id', $id)->delete();
            
            // 删除订单
            $order->delete();

            Db::commit();
            return true;
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            Db::rollback();
            throw new ValidateException($e->getMessage());
        }
    }

    /**
     * 开始拣货
     * @param int $id 订单ID
     * @param int $operatorId 操作员ID
     * @return bool
     * @throws ValidateException
     */
    public function startPicking(int $id, int $operatorId): bool
    {
        $order = $this->getDetail($id);

        if ($order->status !== 'pending') {
            throw new ValidateException('订单状态不正确');
        }

        // 检查库存是否充足
        $this->checkInventoryAvailability($id);

        // 预留库存
        $this->reserveInventory($id, $operatorId);

        $order->status = 'picking';
        $order->operator_id = $operatorId;
        $order->updated_time = date('Y-m-d H:i:s');
        
        return $order->save();
    }

    /**
     * 拣货
     * @param int $itemId 订单明细ID
     * @param int $pickedQuantity 拣货数量
     * @param int $operatorId 操作员ID
     * @param array $extraData 额外数据
     * @return bool
     * @throws ValidateException
     */
    public function pick(int $itemId, int $pickedQuantity, int $operatorId, array $extraData = []): bool
    {
        Db::startTrans();
        try {
            $item = OutboundOrderItem::with(['outboundOrder', 'product', 'location'])->find($itemId);
            if (!$item) {
                throw new ValidateException('订单明细不存在');
            }

            $order = $item->outboundOrder;
            if ($order->status !== 'picking') {
                throw new ValidateException('订单状态不正确');
            }

            $remainingQuantity = $item->quantity - $item->picked_quantity;
            if ($pickedQuantity > $remainingQuantity) {
                throw new ValidateException('拣货数量超过剩余数量');
            }

            // 更新拣货数量
            $item->picked_quantity += $pickedQuantity;
            $item->updated_time = date('Y-m-d H:i:s');
            $item->save();

            // 更新库存
            $this->updateInventory(
                $item->product_id,
                $item->location_id,
                $pickedQuantity,
                $item->batch_number,
                'decrease'
            );

            // 记录库存事务
            InventoryTransaction::create([
                'product_id' => $item->product_id,
                'location_id' => $item->location_id,
                'type' => 'out',
                'quantity' => $pickedQuantity,
                'operator_id' => $operatorId,
                'reason' => '出库拣货',
                'reference_type' => 'outbound_order',
                'reference_id' => $order->id,
                'created_time' => date('Y-m-d H:i:s')
            ]);

            // 检查是否所有明细都已拣货完成
            $this->checkPickingCompletion($order->id);

            Db::commit();
            return true;
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            Db::rollback();
            throw new ValidateException($e->getMessage());
        }
    }

    /**
     * 打包
     * @param int $id 订单ID
     * @param int $operatorId 操作员ID
     * @param array $packingData 打包数据
     * @return bool
     * @throws ValidateException
     */
    public function pack(int $id, int $operatorId, array $packingData = []): bool
    {
        $order = $this->getDetail($id);

        if ($order->status !== 'picked') {
            throw new ValidateException('订单状态不正确');
        }

        $order->status = 'packed';
        $order->operator_id = $operatorId;
        $order->updated_time = date('Y-m-d H:i:s');
        
        // 更新打包信息
        if (!empty($packingData['notes'])) {
            $order->notes = $order->notes . '\n打包备注：' . $packingData['notes'];
        }
        
        return $order->save();
    }

    /**
     * 发货
     * @param int $id 订单ID
     * @param int $operatorId 操作员ID
     * @param array $shippingData 发货数据
     * @return bool
     * @throws ValidateException
     */
    public function ship(int $id, int $operatorId, array $shippingData = []): bool
    {
        $order = $this->getDetail($id);

        if ($order->status !== 'packed') {
            throw new ValidateException('订单状态不正确');
        }

        $order->status = 'shipped';
        $order->shipped_date = date('Y-m-d H:i:s');
        $order->operator_id = $operatorId;
        $order->updated_time = date('Y-m-d H:i:s');
        
        // 更新物流信息
        if (!empty($shippingData['tracking_number'])) {
            $order->tracking_number = $shippingData['tracking_number'];
        }
        
        if (!empty($shippingData['notes'])) {
            $order->notes = $order->notes . '\n发货备注：' . $shippingData['notes'];
        }
        
        return $order->save();
    }

    /**
     * 确认送达
     * @param int $id 订单ID
     * @param int $operatorId 操作员ID
     * @return bool
     * @throws ValidateException
     */
    public function deliver(int $id, int $operatorId): bool
    {
        $order = $this->getDetail($id);

        if ($order->status !== 'shipped') {
            throw new ValidateException('订单状态不正确');
        }

        $order->status = 'delivered';
        $order->operator_id = $operatorId;
        $order->updated_time = date('Y-m-d H:i:s');
        
        return $order->save();
    }

    /**
     * 取消出库订单
     * @param int $id 订单ID
     * @param int $operatorId 操作员ID
     * @param string $reason 取消原因
     * @return bool
     * @throws ValidateException
     */
    public function cancel(int $id, int $operatorId, string $reason = ''): bool
    {
        $order = $this->getDetail($id);

        if (!in_array($order->status, ['pending', 'picking', 'picked', 'packed'])) {
            throw new ValidateException('当前状态不允许取消');
        }

        Db::startTrans();
        try {
            // 如果已经开始拣货，需要回滚库存和释放预留
            if (in_array($order->status, ['picking', 'picked', 'packed'])) {
                $this->rollbackInventory($id);
                $this->releaseReservedInventory($id);
            }

            $order->status = 'cancelled';
            $order->operator_id = $operatorId;
            $order->notes = $order->notes . '\n取消原因：' . $reason;
            $order->updated_time = date('Y-m-d H:i:s');
            $order->save();

            Db::commit();
            return true;
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            Db::rollback();
            throw new ValidateException($e->getMessage());
        }
    }

    /**
     * 获取出库订单统计
     * @param array $params 查询参数
     * @return array
     */
    public function getStatistics(array $params = []): array
    {
        $query = OutboundOrder::where('id', '>', 0);

        // 筛选条件
        if (isset($params['warehouse_id'])) {
            $query->where('warehouse_id', $params['warehouse_id']);
        }

        if (isset($params['customer_id'])) {
            $query->where('customer_id', $params['customer_id']);
        }

        if (!empty($params['start_date'])) {
            $query->where('created_time', '>=', $params['start_date'] . ' 00:00:00');
        }

        if (!empty($params['end_date'])) {
            $query->where('created_time', '<=', $params['end_date'] . ' 23:59:59');
        }

        // 状态统计
        $statusStats = $query->field('status, COUNT(*) as count')
            ->group('status')
            ->select()
            ->toArray();

        // 类型统计
        $typeStats = $query->field('type, COUNT(*) as count')
            ->group('type')
            ->select()
            ->toArray();

        // 优先级统计
        $priorityStats = $query->field('priority, COUNT(*) as count')
            ->group('priority')
            ->select()
            ->toArray();

        // 总计统计
        $totalStats = $query->field([
            'COUNT(*) as total_orders',
            'SUM(CASE WHEN status = "delivered" THEN 1 ELSE 0 END) as delivered_orders',
            'SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending_orders',
            'SUM(CASE WHEN status IN ("picking", "picked", "packed", "shipped") THEN 1 ELSE 0 END) as processing_orders',
            'SUM(CASE WHEN status = "cancelled" THEN 1 ELSE 0 END) as cancelled_orders'
        ])->find();

        return [
            'total_orders' => $totalStats['total_orders'] ?? 0,
            'delivered_orders' => $totalStats['delivered_orders'] ?? 0,
            'pending_orders' => $totalStats['pending_orders'] ?? 0,
            'processing_orders' => $totalStats['processing_orders'] ?? 0,
            'cancelled_orders' => $totalStats['cancelled_orders'] ?? 0,
            'status_stats' => $statusStats,
            'type_stats' => $typeStats,
            'priority_stats' => $priorityStats
        ];
    }

    /**
     * 生成订单号
     * @return string
     */
    private function generateOrderNumber(): string
    {
        $prefix = 'OUT';
        $date = date('Ymd');
        
        // 获取当天最大序号
        $maxOrder = OutboundOrder::where('order_number', 'like', $prefix . $date . '%')
            ->order('order_number', 'desc')
            ->value('order_number');
        
        if ($maxOrder) {
            $sequence = intval(substr($maxOrder, -4)) + 1;
        } else {
            $sequence = 1;
        }
        
        return $prefix . $date . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * 创建订单明细
     * @param int $orderId 订单ID
     * @param array $itemData 明细数据
     * @return OutboundOrderItem
     * @throws ValidateException
     */
    private function createOrderItem(int $orderId, array $itemData): OutboundOrderItem
    {
        // 验证产品
        if (!Product::find($itemData['product_id'])) {
            throw new ValidateException('产品不存在');
        }

        // 验证库位
        if (!Location::find($itemData['location_id'])) {
            throw new ValidateException('库位不存在');
        }

        $data = [
            'outbound_order_id' => $orderId,
            'product_id' => $itemData['product_id'],
            'location_id' => $itemData['location_id'],
            'quantity' => $itemData['quantity'],
            'picked_quantity' => 0,
            'unit_price' => $itemData['unit_price'] ?? 0,
            'batch_number' => $itemData['batch_number'] ?? null,
            'notes' => $itemData['notes'] ?? '',
            'created_time' => date('Y-m-d H:i:s')
        ];

        return OutboundOrderItem::create($data);
    }

    /**
     * 检查库存可用性
     * @param int $orderId 订单ID
     * @throws ValidateException
     */
    private function checkInventoryAvailability(int $orderId): void
    {
        $items = OutboundOrderItem::where('outbound_order_id', $orderId)->select();
        
        foreach ($items as $item) {
            $inventory = Inventory::where('product_id', $item->product_id)
                ->where('location_id', $item->location_id)
                ->where('batch_number', $item->batch_number)
                ->find();
            
            if (!$inventory) {
                throw new ValidateException('产品库存不存在：' . $item->product->name);
            }
            
            $availableQuantity = $inventory->quantity - $inventory->reserved_quantity;
            if ($availableQuantity < $item->quantity) {
                throw new ValidateException('产品库存不足：' . $item->product->name . '，可用库存：' . $availableQuantity);
            }
        }
    }

    /**
     * 预留库存
     * @param int $orderId 订单ID
     * @param int $operatorId 操作员ID
     * @throws ValidateException
     */
    private function reserveInventory(int $orderId, int $operatorId): void
    {
        $items = OutboundOrderItem::where('outbound_order_id', $orderId)->select();
        
        foreach ($items as $item) {
            $inventory = Inventory::where('product_id', $item->product_id)
                ->where('location_id', $item->location_id)
                ->where('batch_number', $item->batch_number)
                ->find();
            
            $inventory->reserved_quantity += $item->quantity;
            $inventory->updated_time = date('Y-m-d H:i:s');
            $inventory->save();
        }
    }

    /**
     * 释放预留库存
     * @param int $orderId 订单ID
     */
    private function releaseReservedInventory(int $orderId): void
    {
        $items = OutboundOrderItem::where('outbound_order_id', $orderId)->select();
        
        foreach ($items as $item) {
            $inventory = Inventory::where('product_id', $item->product_id)
                ->where('location_id', $item->location_id)
                ->where('batch_number', $item->batch_number)
                ->find();
            
            if ($inventory) {
                $inventory->reserved_quantity -= $item->quantity;
                $inventory->updated_time = date('Y-m-d H:i:s');
                $inventory->save();
            }
        }
    }

    /**
     * 更新库存
     * @param int $productId 产品ID
     * @param int $locationId 库位ID
     * @param int $quantity 数量
     * @param string $batchNumber 批次号
     * @param string $operation 操作类型
     */
    private function updateInventory(int $productId, int $locationId, int $quantity, string $batchNumber = null, string $operation = 'decrease'): void
    {
        $inventory = Inventory::where('product_id', $productId)
            ->where('location_id', $locationId)
            ->where('batch_number', $batchNumber)
            ->find();

        if ($inventory) {
            if ($operation === 'decrease') {
                $inventory->quantity -= $quantity;
                $inventory->reserved_quantity -= $quantity;
            } else {
                $inventory->quantity += $quantity;
            }
            $inventory->updated_time = date('Y-m-d H:i:s');
            $inventory->save();
        }
    }

    /**
     * 回滚库存（取消订单时使用）
     * @param int $orderId 订单ID
     */
    private function rollbackInventory(int $orderId): void
    {
        $items = OutboundOrderItem::where('outbound_order_id', $orderId)
            ->where('picked_quantity', '>', 0)
            ->select();

        foreach ($items as $item) {
            $inventory = Inventory::where('product_id', $item->product_id)
                ->where('location_id', $item->location_id)
                ->where('batch_number', $item->batch_number)
                ->find();

            if ($inventory) {
                $inventory->quantity += $item->picked_quantity;
                $inventory->updated_time = date('Y-m-d H:i:s');
                $inventory->save();

                // 记录回滚事务
                InventoryTransaction::create([
                    'product_id' => $item->product_id,
                    'location_id' => $item->location_id,
                    'type' => 'in',
                    'quantity' => $item->picked_quantity,
                    'operator_id' => 0,
                    'reason' => '出库订单取消回滚',
                    'reference_type' => 'outbound_order_cancel',
                    'reference_id' => $orderId,
                    'created_time' => date('Y-m-d H:i:s')
                ]);
            }
        }
    }

    /**
     * 检查拣货完成状态
     * @param int $orderId 订单ID
     */
    private function checkPickingCompletion(int $orderId): void
    {
        $uncompletedItems = OutboundOrderItem::where('outbound_order_id', $orderId)
            ->whereRaw('picked_quantity < quantity')
            ->count();

        if ($uncompletedItems == 0) {
            $order = OutboundOrder::find($orderId);
            $order->status = 'picked';
            $order->updated_time = date('Y-m-d H:i:s');
            $order->save();
        }
    }
}
<?php

namespace app\service;

use app\model\InboundOrder;
use app\model\InboundOrderItem;
use app\model\Warehouse;
use app\model\Supplier;
use app\model\Product;
use app\model\Location;
use app\model\Inventory;
use app\model\InventoryTransaction;
use think\exception\ValidateException;
use think\db\exception\DataNotFoundException;
use think\db\exception\ModelNotFoundException;
use think\facade\Db;

/**
 * 入库订单服务类
 */
class InboundOrderService
{
    /**
     * 获取入库订单列表
     * @param array $params 查询参数
     * @return array
     */
    public function getList(array $params = []): array
    {
        $query = InboundOrder::with(['warehouse', 'supplier', 'operator']);

        // 搜索条件
        if (!empty($params['keyword'])) {
            $query->where(function($q) use ($params) {
                $q->whereLike('order_number', '%' . $params['keyword'] . '%')
                  ->whereOr('notes', '%' . $params['keyword'] . '%');
            });
        }

        if (!empty($params['order_number'])) {
            $query->where('order_number', $params['order_number']);
        }

        if (isset($params['warehouse_id'])) {
            $query->where('warehouse_id', $params['warehouse_id']);
        }

        if (isset($params['supplier_id'])) {
            $query->where('supplier_id', $params['supplier_id']);
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
     * 获取入库订单详情
     * @param int $id 订单ID
     * @return InboundOrder
     * @throws ValidateException
     */
    public function getDetail(int $id): InboundOrder
    {
        try {
            $order = InboundOrder::with(['warehouse', 'supplier', 'operator', 'items', 'items.product', 'items.location'])->find($id);
            if (!$order) {
                throw new ValidateException('入库订单不存在');
            }
            return $order;
        } catch (DataNotFoundException|ModelNotFoundException $e) {
            throw new ValidateException('入库订单不存在');
        }
    }

    /**
     * 创建入库订单
     * @param array $data 订单数据
     * @param int $operatorId 操作员ID
     * @return InboundOrder
     * @throws ValidateException
     */
    public function create(array $data, int $operatorId): InboundOrder
    {
        Db::startTrans();
        try {
            // 验证仓库
            if (!Warehouse::find($data['warehouse_id'])) {
                throw new ValidateException('仓库不存在');
            }

            // 验证供应商
            if (isset($data['supplier_id']) && !Supplier::find($data['supplier_id'])) {
                throw new ValidateException('供应商不存在');
            }

            // 生成订单号
            $orderNumber = $this->generateOrderNumber();

            // 创建订单
            $orderData = [
                'order_number' => $orderNumber,
                'warehouse_id' => $data['warehouse_id'],
                'supplier_id' => $data['supplier_id'] ?? null,
                'operator_id' => $operatorId,
                'status' => 'pending',
                'type' => $data['type'] ?? 'purchase',
                'expected_date' => $data['expected_date'] ?? null,
                'notes' => $data['notes'] ?? '',
                'created_time' => date('Y-m-d H:i:s')
            ];

            $order = InboundOrder::create($orderData);

            // 创建订单明细
            if (!empty($data['items'])) {
                foreach ($data['items'] as $item) {
                    $this->createOrderItem($order->id, $item);
                }
            }

            Db::commit();
            return $this->getDetail($order->id);
        } catch (\Exception $e) {
            Db::rollback();
            throw new ValidateException($e->getMessage());
        }
    }

    /**
     * 更新入库订单
     * @param int $id 订单ID
     * @param array $data 更新数据
     * @return InboundOrder
     * @throws ValidateException
     */
    public function update(int $id, array $data): InboundOrder
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

            // 验证供应商
            if (isset($data['supplier_id']) && !Supplier::find($data['supplier_id'])) {
                throw new ValidateException('供应商不存在');
            }

            // 更新订单
            $updateData = array_intersect_key($data, array_flip([
                'warehouse_id', 'supplier_id', 'expected_date', 'notes'
            ]));
            $updateData['updated_time'] = date('Y-m-d H:i:s');
            $order->save($updateData);

            // 更新订单明细
            if (isset($data['items'])) {
                // 删除原有明细
                InboundOrderItem::where('inbound_order_id', $id)->delete();
                
                // 创建新明细
                foreach ($data['items'] as $item) {
                    $this->createOrderItem($id, $item);
                }
            }

            Db::commit();
            return $this->getDetail($id);
        } catch (\Exception $e) {
            Db::rollback();
            throw new ValidateException($e->getMessage());
        }
    }

    /**
     * 删除入库订单
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
            InboundOrderItem::where('inbound_order_id', $id)->delete();
            
            // 删除订单
            $order->delete();

            Db::commit();
            return true;
        } catch (\Exception $e) {
            Db::rollback();
            throw new ValidateException($e->getMessage());
        }
    }

    /**
     * 开始收货
     * @param int $id 订单ID
     * @param int $operatorId 操作员ID
     * @return bool
     * @throws ValidateException
     */
    public function startReceiving(int $id, int $operatorId): bool
    {
        $order = $this->getDetail($id);

        if ($order->status !== 'pending') {
            throw new ValidateException('订单状态不正确');
        }

        $order->status = 'receiving';
        $order->operator_id = $operatorId;
        $order->updated_time = date('Y-m-d H:i:s');
        
        return $order->save();
    }

    /**
     * 收货
     * @param int $itemId 订单明细ID
     * @param int $receivedQuantity 收货数量
     * @param int $operatorId 操作员ID
     * @param array $extraData 额外数据
     * @return bool
     * @throws ValidateException
     */
    public function receive(int $itemId, int $receivedQuantity, int $operatorId, array $extraData = []): bool
    {
        Db::startTrans();
        try {
            $item = InboundOrderItem::with(['inboundOrder', 'product', 'location'])->find($itemId);
            if (!$item) {
                throw new ValidateException('订单明细不存在');
            }

            $order = $item->inboundOrder;
            if ($order->status !== 'receiving') {
                throw new ValidateException('订单状态不正确');
            }

            $remainingQuantity = $item->quantity - $item->received_quantity;
            if ($receivedQuantity > $remainingQuantity) {
                throw new ValidateException('收货数量超过剩余数量');
            }

            // 更新收货数量
            $item->received_quantity += $receivedQuantity;
            $item->updated_time = date('Y-m-d H:i:s');
            $item->save();

            // 更新库存
            $this->updateInventory(
                $item->product_id,
                $item->location_id,
                $receivedQuantity,
                $item->batch_number,
                $item->expiry_date
            );

            // 记录库存事务
            InventoryTransaction::create([
                'product_id' => $item->product_id,
                'location_id' => $item->location_id,
                'type' => 'in',
                'quantity' => $receivedQuantity,
                'operator_id' => $operatorId,
                'reason' => '入库收货',
                'reference_type' => 'inbound_order',
                'reference_id' => $order->id,
                'created_time' => date('Y-m-d H:i:s')
            ]);

            Db::commit();
            return true;
        } catch (\Exception $e) {
            Db::rollback();
            throw new ValidateException($e->getMessage());
        }
    }

    /**
     * 完成入库
     * @param int $id 订单ID
     * @param int $operatorId 操作员ID
     * @return bool
     * @throws ValidateException
     */
    public function complete(int $id, int $operatorId): bool
    {
        $order = $this->getDetail($id);

        if ($order->status !== 'receiving') {
            throw new ValidateException('订单状态不正确');
        }

        // 检查是否所有明细都已收货
        $uncompletedItems = InboundOrderItem::where('inbound_order_id', $id)
            ->whereRaw('received_quantity < quantity')
            ->count();

        if ($uncompletedItems > 0) {
            throw new ValidateException('还有未完成收货的明细');
        }

        $order->status = 'completed';
        $order->received_date = date('Y-m-d H:i:s');
        $order->operator_id = $operatorId;
        $order->updated_time = date('Y-m-d H:i:s');
        
        return $order->save();
    }

    /**
     * 取消入库订单
     * @param int $id 订单ID
     * @param int $operatorId 操作员ID
     * @param string $reason 取消原因
     * @return bool
     * @throws ValidateException
     */
    public function cancel(int $id, int $operatorId, string $reason = ''): bool
    {
        $order = $this->getDetail($id);

        if (!in_array($order->status, ['pending', 'receiving'])) {
            throw new ValidateException('当前状态不允许取消');
        }

        // 如果已经开始收货，需要回滚库存
        if ($order->status === 'receiving') {
            $this->rollbackInventory($id);
        }

        $order->status = 'cancelled';
        $order->operator_id = $operatorId;
        $order->notes = $order->notes . '\n取消原因：' . $reason;
        $order->updated_time = date('Y-m-d H:i:s');
        
        return $order->save();
    }

    /**
     * 获取入库订单统计
     * @param array $params 查询参数
     * @return array
     */
    public function getStatistics(array $params = []): array
    {
        $query = InboundOrder::query();

        // 筛选条件
        if (isset($params['warehouse_id'])) {
            $query->where('warehouse_id', $params['warehouse_id']);
        }

        if (isset($params['supplier_id'])) {
            $query->where('supplier_id', $params['supplier_id']);
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

        // 总计统计
        $totalStats = $query->field([
            'COUNT(*) as total_orders',
            'SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed_orders',
            'SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending_orders',
            'SUM(CASE WHEN status = "receiving" THEN 1 ELSE 0 END) as receiving_orders',
            'SUM(CASE WHEN status = "cancelled" THEN 1 ELSE 0 END) as cancelled_orders'
        ])->find();

        return [
            'total_orders' => $totalStats['total_orders'] ?? 0,
            'completed_orders' => $totalStats['completed_orders'] ?? 0,
            'pending_orders' => $totalStats['pending_orders'] ?? 0,
            'receiving_orders' => $totalStats['receiving_orders'] ?? 0,
            'cancelled_orders' => $totalStats['cancelled_orders'] ?? 0,
            'status_stats' => $statusStats,
            'type_stats' => $typeStats
        ];
    }

    /**
     * 生成订单号
     * @return string
     */
    private function generateOrderNumber(): string
    {
        $prefix = 'IN';
        $date = date('Ymd');
        
        // 获取当天最大序号
        $maxOrder = InboundOrder::where('order_number', 'like', $prefix . $date . '%')
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
     * @return InboundOrderItem
     * @throws ValidateException
     */
    private function createOrderItem(int $orderId, array $itemData): InboundOrderItem
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
            'inbound_order_id' => $orderId,
            'product_id' => $itemData['product_id'],
            'location_id' => $itemData['location_id'],
            'quantity' => $itemData['quantity'],
            'received_quantity' => 0,
            'unit_price' => $itemData['unit_price'] ?? 0,
            'batch_number' => $itemData['batch_number'] ?? null,
            'expiry_date' => $itemData['expiry_date'] ?? null,
            'notes' => $itemData['notes'] ?? '',
            'created_time' => date('Y-m-d H:i:s')
        ];

        return InboundOrderItem::create($data);
    }

    /**
     * 更新库存
     * @param int $productId 产品ID
     * @param int $locationId 库位ID
     * @param int $quantity 数量
     * @param string $batchNumber 批次号
     * @param string $expiryDate 过期日期
     * @return void
     */
    private function updateInventory(int $productId, int $locationId, int $quantity, string $batchNumber = null, string $expiryDate = null): void
    {
        $inventory = Inventory::where('product_id', $productId)
            ->where('location_id', $locationId)
            ->where('batch_number', $batchNumber)
            ->find();

        if ($inventory) {
            $inventory->quantity += $quantity;
            $inventory->updated_time = date('Y-m-d H:i:s');
            $inventory->save();
        } else {
            Inventory::create([
                'product_id' => $productId,
                'location_id' => $locationId,
                'quantity' => $quantity,
                'reserved_quantity' => 0,
                'batch_number' => $batchNumber,
                'expiry_date' => $expiryDate,
                'created_time' => date('Y-m-d H:i:s')
            ]);
        }
    }

    /**
     * 回滚库存（取消订单时使用）
     * @param int $orderId 订单ID
     * @return void
     */
    private function rollbackInventory(int $orderId): void
    {
        $items = InboundOrderItem::where('inbound_order_id', $orderId)
            ->where('received_quantity', '>', 0)
            ->select();

        foreach ($items as $item) {
            $inventory = Inventory::where('product_id', $item->product_id)
                ->where('location_id', $item->location_id)
                ->where('batch_number', $item->batch_number)
                ->find();

            if ($inventory) {
                $inventory->quantity -= $item->received_quantity;
                $inventory->updated_time = date('Y-m-d H:i:s');
                $inventory->save();

                // 记录回滚事务
                InventoryTransaction::create([
                    'product_id' => $item->product_id,
                    'location_id' => $item->location_id,
                    'type' => 'out',
                    'quantity' => $item->received_quantity,
                    'operator_id' => 0,
                    'reason' => '入库订单取消回滚',
                    'reference_type' => 'inbound_order_cancel',
                    'reference_id' => $orderId,
                    'created_time' => date('Y-m-d H:i:s')
                ]);
            }
        }
    }
}
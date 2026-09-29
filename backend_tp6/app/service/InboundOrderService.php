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
use app\model\InventoryBatch;
use app\model\SerialNumber;
use app\model\SerialNumberHistory;
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
        
        // I3：来源筛选
        if (!empty($params['source'])) {
            $query->where('source', $params['source']);
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

            // I4：来源为采购入库时供应商必填，其他来源（调拨/归还/盘盈）可选
            $source = $data['source'] ?? 'purchase';
            if ($source === 'purchase' && empty($data['supplier_id'])) {
                throw new ValidateException('来源为采购入库时，供应商必填');
            }

            // 创建订单
            $orderData = [
                'order_number' => $orderNumber,
                'warehouse_id' => $data['warehouse_id'],
                'supplier_id' => $data['supplier_id'] ?? null,
                'source' => $source,                                  // I2：入库来源
                'received_at' => $data['received_at'] ?? null,        // C1：入库时间
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
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
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
                'warehouse_id', 'supplier_id', 'expected_date', 'notes', 'source', 'received_at'
            ]));
            
            // I4：改为采购来源时必须补供应商
            if (($updateData['source'] ?? $order->source) === 'purchase'
                && empty($updateData['supplier_id'] ?? $order->supplier_id)) {
                throw new ValidateException('来源为采购入库时，供应商必填');
            }
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
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
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
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
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
    public function receive(int $itemId, $receivedQuantity, int $operatorId, array $extraData = []): bool
    {
        // A3：数量按 string 处理，避免 float 精度与 int 截断
        $receivedQuantity = (string) $receivedQuantity;

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

            // P10：盘点期间冻结该仓库库存变动（收货会破坏盘点快照口径）
            StocktakeService::assertNotStocktaking((int)($order->warehouse_id ?? 0));

            // A4：按计量方式校验数量精度
            if ($item->product) {
                try {
                    $item->product->assertQuantityValid($receivedQuantity);
                } catch (\InvalidArgumentException $e) {
                    throw new ValidateException($e->getMessage());
                }
            }
            
            $remainingQuantity = bcsub((string)$item->quantity, (string)$item->received_quantity, 4);
            if (bccomp($receivedQuantity, $remainingQuantity, 4) > 0) {
                throw new ValidateException('收货数量超过剩余数量');
            }

            // 更新收货数量
            $item->received_quantity = bcadd((string)$item->received_quantity, $receivedQuantity, 4);
            $item->updated_time = date('Y-m-d H:i:s');
            $item->save();

            // 更新库存
            $this->updateInventory(
                $item->product_id,
                $item->location_id,
                $receivedQuantity,
                $item->batch_number,
                $item->expiry_date,
                (int) ($order->warehouse_id ?? 0)
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
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
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
        $order->received_date = date('Y-m-d');
        $order->received_at = $order->received_at ?: date('Y-m-d H:i:s'); // C1：入库时间落库
        $order->operator_id = $operatorId;
        $order->updated_time = date('Y-m-d H:i:s');
        
        return $order->save();
    }

    /**
     * 取消入库订单（P9：补事务——回滚总账/明细账与改状态必须同事务）
     * @param int $id 订单ID
     * @param int $operatorId 操作员ID
     * @param string $reason 取消原因
     * @return bool
     * @throws ValidateException
     */
    public function cancel(int $id, int $operatorId, string $reason = ''): bool
    {
        Db::startTrans();
        try {
            $order = $this->getDetail($id);

            if (!in_array($order->status, ['pending', 'receiving'])) {
                throw new ValidateException('当前状态不允许取消');
            }

            // 如果已经开始收货，需要回滚库存 + 明细账
            if ($order->status === 'receiving') {
                $this->rollbackInventory($id);
            }

            $order->status = 'cancelled';
            $order->operator_id = $operatorId;
            $order->notes = $order->notes . '\n取消原因：' . $reason;
            $order->updated_time = date('Y-m-d H:i:s');
            $order->save();

            Db::commit();
            return true;
        } catch (\app\common\BizException $e) {
            Db::rollback();
            throw $e;
        } catch (\Exception $e) {
            Db::rollback();
            throw new ValidateException($e->getMessage());
        }
    }

    /**
     * 获取入库订单统计
     * @param array $params 查询参数
     * @return array
     */
    public function getStatistics(array $params = []): array
    {
        $query = InboundOrder::where('id', '>', 0);

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
        $product = Product::find($itemData['product_id']);
        if (!$product) {
            throw new ValidateException('产品不存在');
        }

        // 验证库位
        if (!Location::find($itemData['location_id'])) {
            throw new ValidateException('库位不存在');
        }

        // A4：按物资计量方式校验数量（计件正整数 / 长度重量 4 位小数），后端必须校验
        try {
            $product->assertQuantityValid((string) $itemData['quantity']);
        } catch (\InvalidArgumentException $e) {
            throw new ValidateException($e->getMessage());
        }

        $data = [
            'inbound_order_id' => $orderId,
            'product_id' => $itemData['product_id'],
            'location_id' => $itemData['location_id'],
            'unit' => $product->unit ?: '件',                       // A6：单位快照
            'requires_serial' => $product->requiresSerial() ? 1 : 0, // E1：由计量方式推导
            'quantity' => (string) $itemData['quantity'],
            'received_quantity' => 0,
            'unit_price' => (string) ($itemData['unit_price'] ?? 0),
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
    private function updateInventory(int $productId, int $locationId, $quantity, string $batchNumber = null, string $expiryDate = null, int $warehouseId = 0): void
    {
        // 并发安全：行锁，禁止先查后改
        $inventory = Inventory::where('product_id', $productId)
            ->where('location_id', $locationId)
            ->where('batch_number', $batchNumber)
            ->lock(true)
            ->find();

        if ($inventory) {
            $inventory->quantity = bcadd((string)$inventory->quantity, (string)$quantity, 4);
            $inventory->available_quantity = bcsub((string)$inventory->quantity, (string)$inventory->reserved_quantity, 4);
            $inventory->updated_time = date('Y-m-d H:i:s');
            $inventory->save();
        } else {
            Inventory::create([
                'product_id' => $productId,
                'warehouse_id' => $warehouseId,
                'location_id' => $locationId,
                'quantity' => (string) $quantity,
                'reserved_quantity' => 0,
                'available_quantity' => (string) $quantity,
                'batch_number' => $batchNumber,
                'expiry_date' => $expiryDate,
                'created_time' => date('Y-m-d H:i:s')
            ]);
        }
    }

    /**
     * 回滚库存（取消订单时使用，P9：总账 + SN 台账 + 批次台账三方联动）
     * - 总账按已收数量扣回（行锁）
     * - 该单登记的 SN 撤销登记（删除记录 + 历史留痕；实物未入成库，撤销后 SN 应可重新登记，
     *   若走软删会被 serial_number 唯一键挡住，故删除 + serial_number_history 审计留痕）
     * - 散料批次回退：批次未被出库消耗时撤行；已被消耗则拒绝取消（改走红冲）
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
                ->where('batch_number', $item->batch_number ?: '')
                ->lock(true)
                ->find();

            if ($inventory) {
                $inventory->quantity = bcsub((string)$inventory->quantity, (string)$item->received_quantity, 4);
                $inventory->available_quantity = bcsub((string)$inventory->quantity, (string)$inventory->reserved_quantity, 4);
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

            // P9：撤销该单登记的 SN（实物退回，登记无效；删除以释放唯一键，历史表留痕）
            $sns = SerialNumber::where('inbound_id', $orderId)
                ->where('product_id', $item->product_id)
                ->select();
            foreach ($sns as $sn) {
                SerialNumberHistory::create([
                    'serial_number_id' => $sn->id,
                    'event_type'       => 'return',
                    'status_before'    => (string)$sn->status,
                    'status_after'     => 'cancelled',
                    'reference_type'   => 'inbound_order_cancel',
                    'reference_id'     => $orderId,
                    'operator_id'      => 0,
                    'notes'            => '入库单取消，撤销 SN 登记：' . $sn->serial_number,
                    'created_at'       => date('Y-m-d H:i:s')
                ]);
                $sn->delete();
            }

            // P9：散料批次回退——未被出库消耗（remaining==initial）则撤行，否则拒绝取消
            $batches = InventoryBatch::where('inbound_order_id', $orderId)
                ->where('product_id', $item->product_id)
                ->lock(true)
                ->select();
            foreach ($batches as $batch) {
                if (bccomp((string)$batch->remaining_quantity, (string)$batch->initial_quantity, 4) !== 0) {
                    throw new ValidateException(
                        '批次 ' . $batch->batch_no . ' 已被出库消耗，不能直接取消，请走红冲流程'
                    );
                }
                $batch->delete();
            }
        }
    }
}
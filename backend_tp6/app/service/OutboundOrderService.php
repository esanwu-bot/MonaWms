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
use app\model\InventoryBatch;
use app\model\SerialNumber;
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

            // D4：领用人手机号格式校验（客户明确要求该字段）
            if (!empty($data['receiver_phone']) && !preg_match('/^1[3-9]\d{9}$/', (string)$data['receiver_phone'])) {
                throw new ValidateException('领用人手机号格式不正确');
            }

            // 生成订单号
            $orderNumber = $this->generateOrderNumber();

            // 创建订单
            $orderData = [
                'order_number' => $orderNumber,
                'warehouse_id' => $data['warehouse_id'],
                'customer_id' => $data['customer_id'] ?? null,
                'receiver_unit' => $data['receiver_unit'] ?? null,   // D2：领用单位
                'receiver_name' => $data['receiver_name'] ?? null,   // D2：领用人
                'receiver_phone' => $data['receiver_phone'] ?? null, // D2：手机号
                'shipped_at' => $data['shipped_at'] ?? null,         // C2：出库时间
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
    /**
     * 拣货/出库（D3：不是单纯的加减）
     * 同一事务内完成：库存扣减（行锁）+ SN 单件状态联动 + 库存流水
     * @param int $itemId 明细ID
     * @param string|float|int $pickedQuantity 数量（按计量方式可带 4 位小数）
     * @param int $operatorId 操作人
     * @param array $extraData ['serials' => string[]|string] 序列号（计件类必填，支持批量粘贴）
     */
    public function pick(int $itemId, $pickedQuantity, int $operatorId, array $extraData = []): bool
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

            // E3：支持批量粘贴 SN（换行/逗号/空格分隔）
            $serials = $extraData['serials'] ?? [];
            if (is_string($serials)) {
                $serials = preg_split('/[\r\n,\s]+/', trim($serials), -1, PREG_SPLIT_NO_EMPTY);
            }
            $serials = is_array($serials) ? array_values(array_filter(array_map('trim', $serials))) : [];

            // 明细内完成：数量校验 + 行锁扣减 + SN 联动 + 流水
            $item->pick((string) $pickedQuantity, null, null, $serials, $operatorId);

            Db::commit();
            return true;
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            Db::rollback();
            throw new ValidateException($e->getMessage());
        }
    }

    /**
     * 打包（P9：终结拣货阶段，按实际拣货量出库）
     *
     * 状态 picking → packed；未拣完的计件部分释放预留（否则预留永远挂着，可用量虚减）。
     * 是否全部拣完由前端 confirm 提示兜底，此处不强制拦截（部分出库是合法业务）。
     * @param int $id 订单ID
     * @param int $operatorId 操作员ID
     * @param array $packingData 打包数据
     * @return bool
     * @throws ValidateException
     */
    public function pack(int $id, int $operatorId, array $packingData = []): bool
    {
        Db::startTrans();
        try {
            $order = $this->getDetail($id);

            if ($order->status !== 'picking') {
                throw new ValidateException('订单状态不正确，只有拣货中的订单可以打包');
            }

            // 未拣完的部分释放预留（计件类；散料未预留）
            $this->releaseReservedInventory($id);

            $order->status = 'packed';
            $order->operator_id = $operatorId;
            $order->updated_time = date('Y-m-d H:i:s');

            // 更新打包信息
            if (!empty($packingData['notes'])) {
                $order->notes = $order->notes . '\n打包备注：' . $packingData['notes'];
            }

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
        $order->shipped_date = date('Y-m-d');
        $order->shipped_at = $order->shipped_at ?: date('Y-m-d H:i:s'); // C2：出库时间落库
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

        // 状态机：pending → picking → packed → shipped → delivered；已发货后不可取消
        if (!in_array($order->status, ['pending', 'picking', 'packed'])) {
            throw new ValidateException('当前状态不允许取消');
        }

        Db::startTrans();
        try {
            // 如果已经开始拣货/打包，需要回滚已拣库存 + 释放未拣预留
            if (in_array($order->status, ['picking', 'packed'])) {
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
        $product = Product::find($itemData['product_id']);
        if (!$product) {
            throw new ValidateException('产品不存在');
        }

        // 验证库位
        if (!Location::find($itemData['location_id'])) {
            throw new ValidateException('库位不存在');
        }

        // A4：按计量方式校验数量
        try {
            $product->assertQuantityValid((string) $itemData['quantity']);
        } catch (\InvalidArgumentException $e) {
            throw new ValidateException($e->getMessage());
        }

        $data = [
            'outbound_order_id' => $orderId,
            'product_id' => $itemData['product_id'],
            'location_id' => $itemData['location_id'],
            'unit' => $product->unit ?: '件',                        // A6：单位快照
            'requires_serial' => $product->requiresSerial() ? 1 : 0, // E1：由计量方式推导
            'quantity' => (string) $itemData['quantity'],
            'picked_quantity' => 0,
            'unit_price' => (string) ($itemData['unit_price'] ?? 0),
            'batch_number' => $itemData['batch_number'] ?? null,
            'notes' => $itemData['notes'] ?? '',
            'created_time' => date('Y-m-d H:i:s')
        ];

        return OutboundOrderItem::create($data);
    }

    /**
     * 检查库存可用性（P9：按计量方式分流校验）
     *
     * 计件类：预留落在具体库位行上，按明细库位行校验（差多少直接反馈）
     * 散料类：拣货走 FIFO 跨批次行锁扣减，此处按仓库聚合校验总量即可
     * @param int $orderId 订单ID
     * @throws ValidateException
     */
    private function checkInventoryAvailability(int $orderId): void
    {
        $order = OutboundOrder::find($orderId);
        $items = OutboundOrderItem::where('outbound_order_id', $orderId)->select();

        foreach ($items as $item) {
            if ($item->requires_serial) {
                // 计件：行级校验（明细创建时已自动定位计划库位）
                $inventory = Inventory::where('product_id', $item->product_id)
                    ->where('location_id', $item->location_id)
                    ->where('batch_number', $item->batch_number ?: '')
                    ->find();

                if (!$inventory) {
                    throw new ValidateException('产品库存不存在：' . ($item->product->name ?? $item->product_id));
                }

                $availableQuantity = bcsub((string)$inventory->quantity, (string)$inventory->reserved_quantity, 4);
                $this->assertStockSufficient($item, (string) $item->quantity, $availableQuantity);
            } else {
                // 散料：仓库维度聚合校验（batch 行求和）。
                // 注意不能用 value('available')——think-orm 的 value() 会覆盖 fieldRaw 导致 Unknown column，
                // 须 find() 后取聚合别名
                $availableRow = Inventory::where('product_id', $item->product_id)
                    ->where('warehouse_id', (int) $order->warehouse_id)
                    ->fieldRaw('SUM(quantity - reserved_quantity) AS available')
                    ->find();
                $availableQuantity = (string) (($availableRow && $availableRow->available !== null) ? $availableRow->available : '0');
                $this->assertStockSufficient($item, (string) $item->quantity, $availableQuantity);
            }
        }
    }

    /**
     * 缺料校验（不足时抛 BizException，缺料明细随错误返回，便于前端即时反馈差多少）
     */
    private function assertStockSufficient(OutboundOrderItem $item, string $required, string $available): void
    {
        if (bccomp($available, $required, 4) < 0) {
            throw new \app\common\BizException('STOCK_INSUFFICIENT', '产品库存不足：' . ($item->product->name ?? ''), [[
                'product_id'   => $item->product_id,
                'product_name' => $item->product->name ?? '',
                'unit'         => $item->unit ?: ($item->product->unit ?? ''),
                'required'     => $required,
                'available'    => $available,
                'shortage'     => bcsub($required, $available, 4)
            ]]);
        }
    }

    /**
     * 预留库存（P9：只预留计件明细）
     *
     * 计件类预留落在明细计划库位行上（reserved 是库位行级字段）；
     * 散料类不预留——拣货 FIFO 跨批次行锁扣减，单行预留与实际扣减行对不上，反而制造脏预留。
     * 散料的并发安全由 pick() 的行锁 + 可用量校验兜底。
     * @param int $orderId 订单ID
     * @param int $operatorId 操作员ID
     * @throws ValidateException
     */
    private function reserveInventory(int $orderId, int $operatorId): void
    {
        $items = OutboundOrderItem::where('outbound_order_id', $orderId)->select();

        foreach ($items as $item) {
            if (!$item->requires_serial) {
                continue; // 散料：不预留
            }

            // P9：行锁 + batch 口径统一；库存行缺失时给出可读错误（原实现直接 fatal）
            $inventory = Inventory::where('product_id', $item->product_id)
                ->where('location_id', $item->location_id)
                ->where('batch_number', $item->batch_number ?: '')
                ->lock(true)
                ->find();

            if (!$inventory) {
                throw new ValidateException(
                    '库存不存在，无法预留：商品#' . $item->product_id . ' 库位#' . $item->location_id . ' 批次' . ($item->batch_number ?: '-')
                );
            }

            $inventory->reserved_quantity = bcadd((string)$inventory->reserved_quantity, (string)$item->quantity, 4);
            $inventory->available_quantity = bcsub((string)$inventory->quantity, (string)$inventory->reserved_quantity, 4);
            $inventory->updated_time = date('Y-m-d H:i:s');
            $inventory->save();
        }
    }

    /**
     * 释放预留库存（P9：只释放计件明细的未拣货部分）
     *
     * startPicking 按整单 quantity 预留；pick() 拣货时已同步消耗了 picked 部分的预留。
     * 取消/打包时只能释放剩余的（quantity - picked_quantity），否则会把 reserved 减成负数。
     * 散料从未预留，跳过，避免错减别的单据在同库位行上的预留。
     * @param int $orderId 订单ID
     */
    private function releaseReservedInventory(int $orderId): void
    {
        $items = OutboundOrderItem::where('outbound_order_id', $orderId)->select();

        foreach ($items as $item) {
            if (!$item->requires_serial) {
                continue; // 散料：未预留
            }

            // P9：未拣货部分才需要释放
            $toRelease = bcsub((string)$item->quantity, (string)$item->picked_quantity, 4);
            if (bccomp($toRelease, '0', 4) <= 0) {
                continue;
            }

            $inventory = Inventory::where('product_id', $item->product_id)
                ->where('location_id', $item->location_id)
                ->where('batch_number', $item->batch_number ?: '')
                ->lock(true)
                ->find();

            if ($inventory) {
                // 预留为 UNSIGNED，clamp 到 0
                $inventory->reserved_quantity = bccomp((string)$inventory->reserved_quantity, $toRelease, 4) >= 0
                    ? bcsub((string)$inventory->reserved_quantity, $toRelease, 4)
                    : '0';
                $inventory->available_quantity = bcsub((string)$inventory->quantity, (string)$inventory->reserved_quantity, 4);
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
    private function updateInventory(int $productId, int $locationId, $quantity, string $batchNumber = null, string $operation = 'decrease'): void
    {
        // 并发安全：行锁
        $inventory = Inventory::where('product_id', $productId)
            ->where('location_id', $locationId)
            ->where('batch_number', $batchNumber)
            ->lock(true)
            ->find();

        if ($inventory) {
            if ($operation === 'decrease') {
                $inventory->quantity = bcsub((string)$inventory->quantity, (string)$quantity, 4);
                $inventory->reserved_quantity = bcsub((string)$inventory->reserved_quantity, (string)$quantity, 4);
            } else {
                $inventory->quantity = bcadd((string)$inventory->quantity, (string)$quantity, 4);
            }
            $inventory->available_quantity = bcsub((string)$inventory->quantity, (string)$inventory->reserved_quantity, 4);
            $inventory->updated_time = date('Y-m-d H:i:s');
            $inventory->save();
        }
    }

    /**
     * 回滚库存（取消订单时使用，P9：总账 + SN 台账 + 批次台账三方联动）
     * 1) 计件类：总账按明细库位行加回已拣数量（行锁），该单 SN 回退为"在库"
     * 2) 散料类：按 picked_batches 扣减轨迹逐条回退——批次余量 + 对应库位/批次总账行
     *    （散料可能跨批次扣减，不能按明细单行回退，否则总账与批次台账背离）
     * @param int $orderId 订单ID
     */
    private function rollbackInventory(int $orderId): void
    {
        $items = OutboundOrderItem::where('outbound_order_id', $orderId)
            ->where('picked_quantity', '>', 0)
            ->select();

        foreach ($items as $item) {
            // 计件：单行回退（明细计划库位 + 空批次口径）
            if ($item->requires_serial && $item->location_id) {
                $inventory = Inventory::where('product_id', $item->product_id)
                    ->where('location_id', $item->location_id)
                    ->where('batch_number', $item->batch_number ?: '')
                    ->lock(true)
                    ->find();

                if ($inventory) {
                    $inventory->quantity = bcadd((string)$inventory->quantity, (string)$item->picked_quantity, 4);
                    $inventory->available_quantity = bcsub((string)$inventory->quantity, (string)$inventory->reserved_quantity, 4);
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

            // P9：该单出库的 SN 回退为在库（恢复可再出库状态；散料无 SN 自然跳过）
            $sns = SerialNumber::where('outbound_id', $orderId)
                ->where('product_id', $item->product_id)
                ->where('status', SerialNumber::STATUS_IN_USE)
                ->select();
            foreach ($sns as $sn) {
                $sn->revertToStock(0, '出库订单取消回退', 'outbound_order_cancel', $orderId);
            }

            // P9：散料按扣减轨迹逐条回退——批次余量 + 总账行（exhausted 恢复 active）
            if (!empty($item->picked_batches)) {
                $tracks = json_decode((string)$item->picked_batches, true);
                if (is_array($tracks)) {
                    foreach ($tracks as $track) {
                        $trackQty = (string)($track['quantity'] ?? '0');
                        if (bccomp($trackQty, '0', 4) <= 0) {
                            continue;
                        }

                        // 批次余量回退
                        $batch = InventoryBatch::where('id', (int)($track['batch_id'] ?? 0))->lock(true)->find();
                        if ($batch) {
                            $batch->remaining_quantity = bcadd((string)$batch->remaining_quantity, $trackQty, 4);
                            if (bccomp((string)$batch->remaining_quantity, '0', 4) > 0) {
                                $batch->status = InventoryBatch::STATUS_ACTIVE;
                            }
                            $batch->save();
                        }

                        // 总账行回退（按轨迹里的实际库位 + 批次号）
                        $inventory = Inventory::where('product_id', $item->product_id)
                            ->where('location_id', (int)($track['location_id'] ?? 0))
                            ->where('batch_number', (string)($track['batch_no'] ?? ''))
                            ->lock(true)
                            ->find();
                        if ($inventory) {
                            $inventory->quantity = bcadd((string)$inventory->quantity, $trackQty, 4);
                            $inventory->available_quantity = bcsub((string)$inventory->quantity, (string)$inventory->reserved_quantity, 4);
                            $inventory->updated_time = date('Y-m-d H:i:s');
                            $inventory->save();

                            InventoryTransaction::create([
                                'product_id' => $item->product_id,
                                'location_id' => (int)($track['location_id'] ?? 0),
                                'type' => 'in',
                                'quantity' => $trackQty,
                                'operator_id' => 0,
                                'reason' => '出库订单取消回滚（批次 ' . ($track['batch_no'] ?? '-') . '）',
                                'reference_type' => 'outbound_order_cancel',
                                'reference_id' => $orderId,
                                'created_time' => date('Y-m-d H:i:s')
                            ]);
                        }
                    }
                }
            }
        }
    }
}
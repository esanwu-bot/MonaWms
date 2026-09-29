<?php

namespace app\service;

use app\model\Inventory;
use app\model\InventoryTransaction;
use app\model\Product;
use app\model\Location;
use app\model\User;
use think\exception\ValidateException;
use think\db\exception\DataNotFoundException;
use think\db\exception\ModelNotFoundException;
use think\facade\Db;

/**
 * 库存服务类
 */
class InventoryService
{
    /**
     * 获取库存列表
     * @param array $params 查询参数
     * @return array
     */
    public function getList(array $params = []): array
    {
        $query = Inventory::with(['product', 'location', 'location.warehouse']);

        // 搜索条件
        if (!empty($params['keyword'])) {
            $query->whereHas('product', function($q) use ($params) {
                $q->whereLike('name', '%' . $params['keyword'] . '%')
                  ->whereOr('sku', '%' . $params['keyword'] . '%')
                  ->whereOr('barcode', '%' . $params['keyword'] . '%');
            });
        }

        if (isset($params['product_id'])) {
            $query->where('product_id', $params['product_id']);
        }

        if (isset($params['location_id'])) {
            $query->where('location_id', $params['location_id']);
        }

        if (isset($params['warehouse_id'])) {
            $query->whereHas('location', function($q) use ($params) {
                $q->where('warehouse_id', $params['warehouse_id']);
            });
        }

        if (!empty($params['batch_number'])) {
            $query->where('batch_number', $params['batch_number']);
        }

        // 库存状态筛选
        if (!empty($params['stock_status'])) {
            switch ($params['stock_status']) {
                case 'zero':
                    $query->where('quantity', 0);
                    break;
                case 'low':
                    $query->whereRaw('quantity > 0 AND quantity <= (SELECT min_stock FROM product WHERE id = inventory.product_id)');
                    break;
                case 'normal':
                    $query->whereRaw('quantity > (SELECT min_stock FROM product WHERE id = inventory.product_id) AND quantity < (SELECT max_stock FROM product WHERE id = inventory.product_id)');
                    break;
                case 'over':
                    $query->whereRaw('quantity >= (SELECT max_stock FROM product WHERE id = inventory.product_id)');
                    break;
            }
        }

        // 过期状态筛选
        if (!empty($params['expiry_status'])) {
            $today = date('Y-m-d');
            switch ($params['expiry_status']) {
                case 'expired':
                    $query->where('expiry_date', '<', $today);
                    break;
                case 'expiring':
                    $expiringDate = date('Y-m-d', strtotime('+30 days'));
                    $query->where('expiry_date', '>=', $today)
                          ->where('expiry_date', '<=', $expiringDate);
                    break;
                case 'normal':
                    $expiringDate = date('Y-m-d', strtotime('+30 days'));
                    $query->where('expiry_date', '>', $expiringDate)
                          ->whereOr('expiry_date', null);
                    break;
            }
        }

        // 排序
        $order = $params['order'] ?? 'updated_time';
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
     * 获取库存详情
     * @param int $id 库存ID
     * @return Inventory
     * @throws ValidateException
     */
    public function getDetail(int $id): Inventory
    {
        try {
            $inventory = Inventory::with(['product', 'location', 'location.warehouse'])->find($id);
            if (!$inventory) {
                throw new ValidateException('库存记录不存在');
            }
            return $inventory;
        } catch (DataNotFoundException|ModelNotFoundException $e) {
            throw new ValidateException('库存记录不存在');
        }
    }

    /**
     * 库存调整
     * @param array $data 调整数据
     * @param int $operatorId 操作员ID
     * @return bool
     * @throws ValidateException
     */
    public function adjust(array $data, int $operatorId): bool
    {
        Db::startTrans();
        try {
            $productId = $data['product_id'];
            $locationId = $data['location_id'];
            $adjustType = $data['adjust_type']; // 'increase' 或 'decrease'
            $quantity = abs($data['quantity']);
            $reason = $data['reason'] ?? '';
            $batchNumber = $data['batch_number'] ?? null;
            $expiryDate = $data['expiry_date'] ?? null;

            // 验证产品和库位
            $product = Product::find($productId);
            if (!$product) {
                throw new ValidateException('产品不存在');
            }

            $location = Location::find($locationId);
            if (!$location) {
                throw new ValidateException('库位不存在');
            }

            // 查找或创建库存记录
            $inventory = Inventory::where('product_id', $productId)
                ->where('location_id', $locationId)
                ->where('batch_number', $batchNumber)
                ->find();

            if (!$inventory) {
                if ($adjustType === 'decrease') {
                    throw new ValidateException('库存不足，无法减少');
                }
                
                // 创建新的库存记录
                $inventory = Inventory::create([
                    'product_id' => $productId,
                    'warehouse_id' => (int) ($location->warehouse_id ?? 0),
                    'location_id' => $locationId,
                    'quantity' => 0,
                    'reserved_quantity' => 0,
                    'batch_number' => $batchNumber,
                    'expiry_date' => $expiryDate,
                    'created_time' => date('Y-m-d H:i:s')
                ]);
            }

            $oldQuantity = $inventory->quantity;
            $newQuantity = $oldQuantity;

            if ($adjustType === 'increase') {
                $newQuantity = $oldQuantity + $quantity;
                $transactionType = 'in';
            } else {
                if ($oldQuantity < $quantity) {
                    throw new ValidateException('库存不足，当前库存：' . $oldQuantity);
                }
                $newQuantity = $oldQuantity - $quantity;
                $transactionType = 'out';
            }

            // 更新库存
            $inventory->quantity = $newQuantity;
            $inventory->updated_time = date('Y-m-d H:i:s');
            $inventory->save();

            // 记录库存事务
            InventoryTransaction::create([
                'product_id' => $productId,
                'location_id' => $locationId,
                'inventory_id' => $inventory->id,
                'type' => $transactionType,
                'quantity' => $quantity,
                'balance_quantity' => $newQuantity,
                'operator_id' => $operatorId,
                'reason' => $reason,
                'reference_type' => 'manual_adjust',
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
     * 预留库存
     * @param int $productId 产品ID
     * @param int $locationId 库位ID
     * @param int $quantity 预留数量
     * @param string $batchNumber 批次号
     * @param int $operatorId 操作员ID
     * @return bool
     * @throws ValidateException
     */
    public function reserve(int $productId, int $locationId, int $quantity, string $batchNumber = null, int $operatorId = 0): bool
    {
        Db::startTrans();
        try {
            $inventory = Inventory::where('product_id', $productId)
                ->where('location_id', $locationId)
                ->where('batch_number', $batchNumber)
                ->find();

            if (!$inventory) {
                throw new ValidateException('库存记录不存在');
            }

            $availableQuantity = $inventory->quantity - $inventory->reserved_quantity;
            if ($availableQuantity < $quantity) {
                throw new ValidateException('可用库存不足，当前可用：' . $availableQuantity);
            }

            // 更新预留数量
            $inventory->reserved_quantity += $quantity;
            $inventory->updated_time = date('Y-m-d H:i:s');
            $inventory->save();

            // 记录库存事务
            InventoryTransaction::create([
                'product_id' => $productId,
                'location_id' => $locationId,
                'inventory_id' => $inventory->id,
                'type' => 'reserve',
                'quantity' => $quantity,
                'balance_quantity' => $inventory->quantity,
                'operator_id' => $operatorId,
                'reason' => '库存预留',
                'reference_type' => 'reserve',
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
     * 释放预留库存
     * @param int $productId 产品ID
     * @param int $locationId 库位ID
     * @param int $quantity 释放数量
     * @param string $batchNumber 批次号
     * @param int $operatorId 操作员ID
     * @return bool
     * @throws ValidateException
     */
    public function release(int $productId, int $locationId, int $quantity, string $batchNumber = null, int $operatorId = 0): bool
    {
        Db::startTrans();
        try {
            $inventory = Inventory::where('product_id', $productId)
                ->where('location_id', $locationId)
                ->where('batch_number', $batchNumber)
                ->find();

            if (!$inventory) {
                throw new ValidateException('库存记录不存在');
            }

            if ($inventory->reserved_quantity < $quantity) {
                throw new ValidateException('预留库存不足，当前预留：' . $inventory->reserved_quantity);
            }

            // 更新预留数量
            $inventory->reserved_quantity -= $quantity;
            $inventory->updated_time = date('Y-m-d H:i:s');
            $inventory->save();

            // 记录库存事务
            InventoryTransaction::create([
                'product_id' => $productId,
                'location_id' => $locationId,
                'inventory_id' => $inventory->id,
                'type' => 'release',
                'quantity' => $quantity,
                'balance_quantity' => $inventory->quantity,
                'operator_id' => $operatorId,
                'reason' => '释放预留库存',
                'reference_type' => 'release',
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
     * 获取库存统计信息
     * @param array $params 查询参数
     * @return array
     */
    public function getStatistics(array $params = []): array
    {
        $query = Inventory::alias('i')
            ->join('product p', 'i.product_id = p.id')
            ->join('location l', 'i.location_id = l.id')
            ->join('warehouse w', 'l.warehouse_id = w.id');

        // 筛选条件
        if (isset($params['warehouse_id'])) {
            $query->where('w.id', $params['warehouse_id']);
        }

        if (isset($params['product_id'])) {
            $query->where('p.id', $params['product_id']);
        }

        // 总库存统计
        $totalStats = $query->field([
            'COUNT(DISTINCT p.id) as product_count',
            'SUM(i.quantity) as total_quantity',
            'SUM(i.reserved_quantity) as total_reserved',
            'SUM(i.quantity - i.reserved_quantity) as total_available'
        ])->find();

        // 库存状态统计
        $statusStats = Inventory::alias('i')
            ->join('product p', 'i.product_id = p.id')
            ->field([
                'SUM(CASE WHEN i.quantity = 0 THEN 1 ELSE 0 END) as zero_stock',
                'SUM(CASE WHEN i.quantity > 0 AND i.quantity <= p.min_stock THEN 1 ELSE 0 END) as low_stock',
                'SUM(CASE WHEN i.quantity > p.min_stock AND i.quantity < p.max_stock THEN 1 ELSE 0 END) as normal_stock',
                'SUM(CASE WHEN i.quantity >= p.max_stock THEN 1 ELSE 0 END) as over_stock'
            ])
            ->find();

        // 过期库存统计
        $today = date('Y-m-d');
        $expiringDate = date('Y-m-d', strtotime('+30 days'));
        
        $expiryStats = Inventory::field([
            'SUM(CASE WHEN expiry_date < "' . $today . '" THEN quantity ELSE 0 END) as expired_quantity',
            'SUM(CASE WHEN expiry_date >= "' . $today . '" AND expiry_date <= "' . $expiringDate . '" THEN quantity ELSE 0 END) as expiring_quantity'
        ])->find();

        return [
            'total_products' => $totalStats['product_count'] ?? 0,
            'total_quantity' => $totalStats['total_quantity'] ?? 0,
            'total_reserved' => $totalStats['total_reserved'] ?? 0,
            'total_available' => $totalStats['total_available'] ?? 0,
            'zero_stock_count' => $statusStats['zero_stock'] ?? 0,
            'low_stock_count' => $statusStats['low_stock'] ?? 0,
            'normal_stock_count' => $statusStats['normal_stock'] ?? 0,
            'over_stock_count' => $statusStats['over_stock'] ?? 0,
            'expired_quantity' => $expiryStats['expired_quantity'] ?? 0,
            'expiring_quantity' => $expiryStats['expiring_quantity'] ?? 0
        ];
    }

    /**
     * 获取即将过期的库存
     * @param int $days 天数（默认30天）
     * @param int $limit 限制数量
     * @return array
     */
    public function getExpiringInventory(int $days = 30, int $limit = 50): array
    {
        $today = date('Y-m-d');
        $expiringDate = date('Y-m-d', strtotime('+' . $days . ' days'));

        return Inventory::with(['product', 'location', 'location.warehouse'])
            ->where('expiry_date', '>=', $today)
            ->where('expiry_date', '<=', $expiringDate)
            ->where('quantity', '>', 0)
            ->order('expiry_date', 'asc')
            ->limit($limit)
            ->select()
            ->toArray();
    }

    /**
     * 获取已过期的库存
     * @param int $limit 限制数量
     * @return array
     */
    public function getExpiredInventory(int $limit = 50): array
    {
        $today = date('Y-m-d');

        return Inventory::with(['product', 'location', 'location.warehouse'])
            ->where('expiry_date', '<', $today)
            ->where('quantity', '>', 0)
            ->order('expiry_date', 'asc')
            ->limit($limit)
            ->select()
            ->toArray();
    }

    /**
     * 库存移动
     * @param int $inventoryId 库存ID
     * @param int $targetLocationId 目标库位ID
     * @param int $quantity 移动数量
     * @param int $operatorId 操作员ID
     * @return bool
     * @throws ValidateException
     */
    public function move(int $inventoryId, int $targetLocationId, int $quantity, int $operatorId): bool
    {
        Db::startTrans();
        try {
            $sourceInventory = $this->getDetail($inventoryId);
            
            if ($sourceInventory->quantity < $quantity) {
                throw new ValidateException('源库存不足');
            }

            $targetLocation = Location::find($targetLocationId);
            if (!$targetLocation) {
                throw new ValidateException('目标库位不存在');
            }

            // 查找或创建目标库存记录
            $targetInventory = Inventory::where('product_id', $sourceInventory->product_id)
                ->where('location_id', $targetLocationId)
                ->where('batch_number', $sourceInventory->batch_number)
                ->find();

            if (!$targetInventory) {
                $targetInventory = Inventory::create([
                    'product_id' => $sourceInventory->product_id,
                    'warehouse_id' => (int) ($sourceInventory->warehouse_id ?? 0),
                    'location_id' => $targetLocationId,
                    'quantity' => 0,
                    'reserved_quantity' => 0,
                    'batch_number' => $sourceInventory->batch_number,
                    'expiry_date' => $sourceInventory->expiry_date,
                    'created_time' => date('Y-m-d H:i:s')
                ]);
            }

            // 更新源库存
            $sourceInventory->quantity -= $quantity;
            $sourceInventory->updated_time = date('Y-m-d H:i:s');
            $sourceInventory->save();

            // 更新目标库存
            $targetInventory->quantity += $quantity;
            $targetInventory->updated_time = date('Y-m-d H:i:s');
            $targetInventory->save();

            // 记录库存事务 - 出库
            InventoryTransaction::create([
                'product_id' => $sourceInventory->product_id,
                'location_id' => $sourceInventory->location_id,
                'inventory_id' => $sourceInventory->id,
                'type' => 'out',
                'quantity' => $quantity,
                'balance_quantity' => $sourceInventory->quantity,
                'operator_id' => $operatorId,
                'reason' => '库存移动',
                'reference_type' => 'move',
                'reference_id' => $targetInventory->id,
                'created_time' => date('Y-m-d H:i:s')
            ]);

            // 记录库存事务 - 入库
            InventoryTransaction::create([
                'product_id' => $targetInventory->product_id,
                'location_id' => $targetInventory->location_id,
                'inventory_id' => $targetInventory->id,
                'type' => 'in',
                'quantity' => $quantity,
                'balance_quantity' => $targetInventory->quantity,
                'operator_id' => $operatorId,
                'reason' => '库存移动',
                'reference_type' => 'move',
                'reference_id' => $sourceInventory->id,
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
     * 获取产品在各库位的库存分布
     * @param int $productId 产品ID
     * @return array
     */
    public function getProductLocationDistribution(int $productId): array
    {
        return Inventory::with(['location', 'location.warehouse'])
            ->where('product_id', $productId)
            ->where('quantity', '>', 0)
            ->order('quantity', 'desc')
            ->select()
            ->toArray();
    }
}
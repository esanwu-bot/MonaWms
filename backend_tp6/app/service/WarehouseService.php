<?php

namespace app\service;

use app\model\Warehouse;
use app\model\Location;
use app\model\Inventory;
use app\model\InboundOrder;
use app\model\OutboundOrder;
use think\exception\ValidateException;
use think\db\exception\DataNotFoundException;
use think\db\exception\ModelNotFoundException;

/**
 * 仓库服务类
 */
class WarehouseService
{
    /**
     * 获取仓库列表
     * @param array $params 查询参数
     * @return array
     */
    public function getList(array $params = []): array
    {
        $query = Warehouse::with(['locations']);

        // 搜索条件
        if (!empty($params['keyword'])) {
            $query->where(function($q) use ($params) {
                $q->whereLike('name', '%' . $params['keyword'] . '%')
                  ->whereOr('code', '%' . $params['keyword'] . '%')
                  ->whereOr('address', '%' . $params['keyword'] . '%');
            });
        }

        if (isset($params['status'])) {
            $query->where('status', $params['status']);
        }

        if (!empty($params['type'])) {
            $query->where('type', $params['type']);
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
     * 获取仓库详情
     * @param int $id 仓库ID
     * @return Warehouse
     * @throws ValidateException
     */
    public function getDetail(int $id): Warehouse
    {
        try {
            $warehouse = Warehouse::with(['locations'])->find($id);
            if (!$warehouse) {
                throw new ValidateException('仓库不存在');
            }
            return $warehouse;
        } catch (DataNotFoundException|ModelNotFoundException $e) {
            throw new ValidateException('仓库不存在');
        }
    }

    /**
     * 创建仓库
     * @param array $data 仓库数据
     * @return Warehouse
     * @throws ValidateException
     */
    public function create(array $data): Warehouse
    {
        // 检查仓库代码是否已存在
        if (Warehouse::where('code', $data['code'])->find()) {
            throw new ValidateException('仓库代码已存在');
        }

        $data['created_time'] = date('Y-m-d H:i:s');
        $data['status'] = $data['status'] ?? 1;

        $warehouse = Warehouse::create($data);
        
        // 自动创建默认库位
        $this->createDefaultLocations($warehouse);
        
        return $warehouse;
    }

    /**
     * 更新仓库
     * @param int $id 仓库ID
     * @param array $data 更新数据
     * @return Warehouse
     * @throws ValidateException
     */
    public function update(int $id, array $data): Warehouse
    {
        $warehouse = $this->getDetail($id);

        // 检查仓库代码是否已存在（排除当前仓库）
        if (isset($data['code']) && $data['code'] !== $warehouse->code) {
            if (Warehouse::where('code', $data['code'])->where('id', '<>', $id)->find()) {
                throw new ValidateException('仓库代码已存在');
            }
        }

        $data['updated_time'] = date('Y-m-d H:i:s');
        $warehouse->save($data);
        
        return $warehouse;
    }

    /**
     * 删除仓库
     * @param int $id 仓库ID
     * @return bool
     * @throws ValidateException
     */
    public function delete(int $id): bool
    {
        $warehouse = $this->getDetail($id);

        // 检查是否可以删除
        if (!$this->canDelete($warehouse)) {
            throw new ValidateException('仓库存在关联数据，无法删除');
        }

        return $warehouse->delete();
    }

    /**
     * 检查仓库是否可以删除
     * @param Warehouse $warehouse 仓库对象
     * @return bool
     */
    private function canDelete(Warehouse $warehouse): bool
    {
        // 检查是否有库存
        if (Inventory::where('warehouse_id', $warehouse->id)->where('quantity', '>', 0)->count() > 0) {
            return false;
        }

        // 检查是否有未完成的入库单
        if (InboundOrder::where('warehouse_id', $warehouse->id)
            ->whereIn('status', ['pending', 'receiving'])->count() > 0) {
            return false;
        }

        // 检查是否有未完成的出库单
        if (OutboundOrder::where('warehouse_id', $warehouse->id)
            ->whereIn('status', ['pending', 'picking', 'picked', 'packed'])->count() > 0) {
            return false;
        }

        return true;
    }

    /**
     * 获取仓库统计信息
     * @param int $id 仓库ID
     * @return array
     * @throws ValidateException
     */
    public function getStatistics(int $id): array
    {
        $warehouse = $this->getDetail($id);

        // 库位统计
        $locationStats = Location::where('warehouse_id', $id)
            ->field('status, COUNT(*) as count')
            ->group('status')
            ->select()
            ->toArray();

        $locationCount = [
            'total' => 0,
            'active' => 0,
            'inactive' => 0
        ];

        foreach ($locationStats as $stat) {
            $locationCount['total'] += $stat['count'];
            if ($stat['status'] == 1) {
                $locationCount['active'] = $stat['count'];
            } else {
                $locationCount['inactive'] = $stat['count'];
            }
        }

        // 库存统计
        $inventoryStats = Inventory::alias('i')
            ->join('location l', 'i.location_id = l.id')
            ->where('l.warehouse_id', $id)
            ->field('COUNT(DISTINCT i.product_id) as product_count, SUM(i.quantity) as total_quantity')
            ->find();

        // 订单统计
        $inboundStats = InboundOrder::where('warehouse_id', $id)
            ->field('status, COUNT(*) as count')
            ->group('status')
            ->select()
            ->toArray();

        $outboundStats = OutboundOrder::where('warehouse_id', $id)
            ->field('status, COUNT(*) as count')
            ->group('status')
            ->select()
            ->toArray();

        return [
            'warehouse' => $warehouse,
            'locations' => $locationCount,
            'inventory' => [
                'product_count' => $inventoryStats['product_count'] ?? 0,
                'total_quantity' => $inventoryStats['total_quantity'] ?? 0
            ],
            'inbound_orders' => $this->formatOrderStats($inboundStats),
            'outbound_orders' => $this->formatOrderStats($outboundStats)
        ];
    }

    /**
     * 格式化订单统计数据
     * @param array $stats 统计数据
     * @return array
     */
    private function formatOrderStats(array $stats): array
    {
        $result = [
            'total' => 0,
            'pending' => 0,
            'processing' => 0,
            'completed' => 0,
            'cancelled' => 0
        ];

        foreach ($stats as $stat) {
            $result['total'] += $stat['count'];
            switch ($stat['status']) {
                case 'pending':
                    $result['pending'] = $stat['count'];
                    break;
                case 'receiving':
                case 'picking':
                case 'picked':
                case 'packed':
                    $result['processing'] += $stat['count'];
                    break;
                case 'completed':
                case 'delivered':
                    $result['completed'] = $stat['count'];
                    break;
                case 'cancelled':
                    $result['cancelled'] = $stat['count'];
                    break;
            }
        }

        return $result;
    }

    /**
     * 创建默认库位
     * @param Warehouse $warehouse 仓库对象
     * @return void
     */
    private function createDefaultLocations(Warehouse $warehouse): void
    {
        $defaultLocations = [
            [
                'warehouse_id' => $warehouse->id,
                'code' => 'A01-01-01',
                'name' => 'A区1排1层1位',
                'type' => 'storage',
                'zone' => 'A',
                'row' => '01',
                'shelf' => '01',
                'level' => '01',
                'status' => 1,
                'created_time' => date('Y-m-d H:i:s')
            ],
            [
                'warehouse_id' => $warehouse->id,
                'code' => 'RECEIVE-01',
                'name' => '收货区1',
                'type' => 'receive',
                'zone' => 'RECEIVE',
                'status' => 1,
                'created_time' => date('Y-m-d H:i:s')
            ],
            [
                'warehouse_id' => $warehouse->id,
                'code' => 'SHIP-01',
                'name' => '发货区1',
                'type' => 'ship',
                'zone' => 'SHIP',
                'status' => 1,
                'created_time' => date('Y-m-d H:i:s')
            ]
        ];

        foreach ($defaultLocations as $location) {
            Location::create($location);
        }
    }

    /**
     * 获取仓库选项列表
     * @param bool $onlyActive 是否只返回启用的仓库
     * @return array
     */
    public function getOptions(bool $onlyActive = true): array
    {
        $query = Warehouse::field('id, code, name');
        
        if ($onlyActive) {
            $query->where('status', 1);
        }
        
        return $query->order('code')->select()->toArray();
    }

    /**
     * 启用/禁用仓库
     * @param int $id 仓库ID
     * @param int $status 状态（1启用，0禁用）
     * @return bool
     * @throws ValidateException
     */
    public function changeStatus(int $id, int $status): bool
    {
        $warehouse = $this->getDetail($id);
        
        // 如果要禁用仓库，检查是否有未完成的业务
        if ($status == 0) {
            if (!$this->canDisable($warehouse)) {
                throw new ValidateException('仓库存在未完成的业务，无法禁用');
            }
        }
        
        $warehouse->status = $status;
        $warehouse->updated_time = date('Y-m-d H:i:s');
        
        return $warehouse->save();
    }

    /**
     * 检查仓库是否可以禁用
     * @param Warehouse $warehouse 仓库对象
     * @return bool
     */
    private function canDisable(Warehouse $warehouse): bool
    {
        // 检查是否有未完成的入库单
        if (InboundOrder::where('warehouse_id', $warehouse->id)
            ->whereIn('status', ['pending', 'receiving'])->count() > 0) {
            return false;
        }

        // 检查是否有未完成的出库单
        if (OutboundOrder::where('warehouse_id', $warehouse->id)
            ->whereIn('status', ['pending', 'picking', 'picked', 'packed'])->count() > 0) {
            return false;
        }

        return true;
    }
}
<?php

namespace app\service;

use app\model\InventoryTransaction;
use app\model\Product;
use app\model\Location;
use app\model\User;
use think\exception\ValidateException;
use think\db\exception\DataNotFoundException;
use think\db\exception\ModelNotFoundException;

/**
 * 库存事务服务类
 */
class InventoryTransactionService
{
    /**
     * 获取库存事务列表
     * @param array $params 查询参数
     * @return array
     */
    public function getList(array $params = []): array
    {
        $query = InventoryTransaction::with(['product', 'location', 'operator']);

        // 搜索条件
        if (!empty($params['keyword'])) {
            $query->where(function($q) use ($params) {
                $q->whereLike('reason', '%' . $params['keyword'] . '%')
                  ->whereOr('reference_type', '%' . $params['keyword'] . '%')
                  ->whereOr('notes', '%' . $params['keyword'] . '%');
            });
        }

        if (isset($params['product_id'])) {
            $query->where('product_id', $params['product_id']);
        }

        if (isset($params['location_id'])) {
            $query->where('location_id', $params['location_id']);
        }

        if (isset($params['operator_id'])) {
            $query->where('operator_id', $params['operator_id']);
        }

        if (!empty($params['type'])) {
            $query->where('type', $params['type']);
        }

        if (!empty($params['reason'])) {
            $query->whereLike('reason', '%' . $params['reason'] . '%');
        }

        if (!empty($params['reference_type'])) {
            $query->where('reference_type', $params['reference_type']);
        }

        if (isset($params['reference_id'])) {
            $query->where('reference_id', $params['reference_id']);
        }

        if (!empty($params['batch_number'])) {
            $query->where('batch_number', $params['batch_number']);
        }

        // 数量范围
        if (isset($params['min_quantity'])) {
            $query->where('quantity', '>=', $params['min_quantity']);
        }

        if (isset($params['max_quantity'])) {
            $query->where('quantity', '<=', $params['max_quantity']);
        }

        // 日期范围
        if (!empty($params['start_date'])) {
            $query->where('created_time', '>=', $params['start_date'] . ' 00:00:00');
        }

        if (!empty($params['end_date'])) {
            $query->where('created_time', '<=', $params['end_date'] . ' 23:59:59');
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
     * 获取库存事务详情
     * @param int $id 事务ID
     * @return InventoryTransaction
     * @throws ValidateException
     */
    public function getDetail(int $id): InventoryTransaction
    {
        try {
            $transaction = InventoryTransaction::with(['product', 'location', 'operator'])->find($id);
            if (!$transaction) {
                throw new ValidateException('库存事务不存在');
            }
            return $transaction;
        } catch (DataNotFoundException|ModelNotFoundException $e) {
            throw new ValidateException('库存事务不存在');
        }
    }

    /**
     * 创建库存事务记录
     * @param array $data 事务数据
     * @return InventoryTransaction
     * @throws ValidateException
     */
    public function create(array $data): InventoryTransaction
    {
        // 验证产品
        if (!Product::find($data['product_id'])) {
            throw new ValidateException('产品不存在');
        }

        // 验证库位
        if (!Location::find($data['location_id'])) {
            throw new ValidateException('库位不存在');
        }

        // 验证操作员
        if (isset($data['operator_id']) && $data['operator_id'] > 0 && !User::find($data['operator_id'])) {
            throw new ValidateException('操作员不存在');
        }

        $transactionData = [
            'product_id' => $data['product_id'],
            'location_id' => $data['location_id'],
            'type' => $data['type'],
            'quantity' => $data['quantity'],
            'operator_id' => $data['operator_id'] ?? 0,
            'reason' => $data['reason'] ?? '',
            'reference_type' => $data['reference_type'] ?? null,
            'reference_id' => $data['reference_id'] ?? null,
            'batch_number' => $data['batch_number'] ?? null,
            'expiry_date' => $data['expiry_date'] ?? null,
            'unit_price' => $data['unit_price'] ?? 0,
            'notes' => $data['notes'] ?? '',
            'created_time' => date('Y-m-d H:i:s')
        ];

        return InventoryTransaction::create($transactionData);
    }

    /**
     * 获取产品库存变动历史
     * @param int $productId 产品ID
     * @param array $params 查询参数
     * @return array
     */
    public function getProductHistory(int $productId, array $params = []): array
    {
        $params['product_id'] = $productId;
        return $this->getList($params);
    }

    /**
     * 获取库位库存变动历史
     * @param int $locationId 库位ID
     * @param array $params 查询参数
     * @return array
     */
    public function getLocationHistory(int $locationId, array $params = []): array
    {
        $params['location_id'] = $locationId;
        return $this->getList($params);
    }

    /**
     * 获取操作员操作历史
     * @param int $operatorId 操作员ID
     * @param array $params 查询参数
     * @return array
     */
    public function getOperatorHistory(int $operatorId, array $params = []): array
    {
        $params['operator_id'] = $operatorId;
        return $this->getList($params);
    }

    /**
     * 获取库存事务统计
     * @param array $params 查询参数
     * @return array
     */
    public function getStatistics(array $params = []): array
    {
        $query = InventoryTransaction::query();

        // 筛选条件
        if (isset($params['product_id'])) {
            $query->where('product_id', $params['product_id']);
        }

        if (isset($params['location_id'])) {
            $query->where('location_id', $params['location_id']);
        }

        if (isset($params['operator_id'])) {
            $query->where('operator_id', $params['operator_id']);
        }

        if (!empty($params['start_date'])) {
            $query->where('created_time', '>=', $params['start_date'] . ' 00:00:00');
        }

        if (!empty($params['end_date'])) {
            $query->where('created_time', '<=', $params['end_date'] . ' 23:59:59');
        }

        // 类型统计
        $typeStats = $query->field('type, COUNT(*) as count, SUM(quantity) as total_quantity')
            ->group('type')
            ->select()
            ->toArray();

        // 原因统计
        $reasonStats = $query->field('reason, COUNT(*) as count, SUM(quantity) as total_quantity')
            ->group('reason')
            ->select()
            ->toArray();

        // 引用类型统计
        $referenceStats = $query->field('reference_type, COUNT(*) as count, SUM(quantity) as total_quantity')
            ->group('reference_type')
            ->select()
            ->toArray();

        // 总计统计
        $totalStats = $query->field([
            'COUNT(*) as total_transactions',
            'SUM(CASE WHEN type = "in" THEN quantity ELSE 0 END) as total_in_quantity',
            'SUM(CASE WHEN type = "out" THEN quantity ELSE 0 END) as total_out_quantity',
            'SUM(CASE WHEN type = "adjust" THEN quantity ELSE 0 END) as total_adjust_quantity',
            'SUM(CASE WHEN type = "in" THEN 1 ELSE 0 END) as in_transactions',
            'SUM(CASE WHEN type = "out" THEN 1 ELSE 0 END) as out_transactions',
            'SUM(CASE WHEN type = "adjust" THEN 1 ELSE 0 END) as adjust_transactions'
        ])->find();

        // 按日期统计（最近30天）
        $dailyStats = InventoryTransaction::field([
            'DATE(created_time) as date',
            'type',
            'COUNT(*) as count',
            'SUM(quantity) as total_quantity'
        ])
            ->where('created_time', '>=', date('Y-m-d H:i:s', strtotime('-30 days')))
            ->group('DATE(created_time), type')
            ->order('date', 'desc')
            ->select()
            ->toArray();

        return [
            'total_transactions' => $totalStats['total_transactions'] ?? 0,
            'total_in_quantity' => $totalStats['total_in_quantity'] ?? 0,
            'total_out_quantity' => $totalStats['total_out_quantity'] ?? 0,
            'total_adjust_quantity' => $totalStats['total_adjust_quantity'] ?? 0,
            'in_transactions' => $totalStats['in_transactions'] ?? 0,
            'out_transactions' => $totalStats['out_transactions'] ?? 0,
            'adjust_transactions' => $totalStats['adjust_transactions'] ?? 0,
            'type_stats' => $typeStats,
            'reason_stats' => $reasonStats,
            'reference_stats' => $referenceStats,
            'daily_stats' => $dailyStats
        ];
    }

    /**
     * 获取产品库存流水
     * @param int $productId 产品ID
     * @param array $params 查询参数
     * @return array
     */
    public function getProductFlow(int $productId, array $params = []): array
    {
        $query = InventoryTransaction::with(['location', 'operator'])
            ->where('product_id', $productId);

        // 日期范围
        if (!empty($params['start_date'])) {
            $query->where('created_time', '>=', $params['start_date'] . ' 00:00:00');
        }

        if (!empty($params['end_date'])) {
            $query->where('created_time', '<=', $params['end_date'] . ' 23:59:59');
        }

        // 库位筛选
        if (isset($params['location_id'])) {
            $query->where('location_id', $params['location_id']);
        }

        // 类型筛选
        if (!empty($params['type'])) {
            $query->where('type', $params['type']);
        }

        $query->order('created_time', 'desc');

        // 分页
        $page = $params['page'] ?? 1;
        $limit = $params['limit'] ?? 20;
        
        $result = $query->paginate([
            'list_rows' => $limit,
            'page' => $page
        ]);

        // 计算累计库存
        $items = $result->items();
        $runningTotal = 0;
        
        // 获取期初库存（查询第一条记录之前的库存总量）
        if (!empty($items)) {
            $firstTransaction = $items[count($items) - 1];
            $runningTotal = InventoryTransaction::where('product_id', $productId)
                ->where('created_time', '<', $firstTransaction->created_time)
                ->sum('CASE WHEN type = "in" OR type = "adjust" AND quantity > 0 THEN quantity ELSE -quantity END');
        }

        // 为每条记录计算累计库存
        foreach (array_reverse($items) as $item) {
            if ($item->type === 'in' || ($item->type === 'adjust' && $item->quantity > 0)) {
                $runningTotal += $item->quantity;
            } else {
                $runningTotal -= abs($item->quantity);
            }
            $item->running_total = $runningTotal;
        }

        return [
            'list' => $items,
            'total' => $result->total(),
            'page' => $page,
            'limit' => $limit
        ];
    }

    /**
     * 获取库存变动趋势
     * @param array $params 查询参数
     * @return array
     */
    public function getTrend(array $params = []): array
    {
        $days = $params['days'] ?? 30;
        $startDate = date('Y-m-d', strtotime("-{$days} days"));
        $endDate = date('Y-m-d');

        $query = InventoryTransaction::query()
            ->where('created_time', '>=', $startDate . ' 00:00:00')
            ->where('created_time', '<=', $endDate . ' 23:59:59');

        // 筛选条件
        if (isset($params['product_id'])) {
            $query->where('product_id', $params['product_id']);
        }

        if (isset($params['location_id'])) {
            $query->where('location_id', $params['location_id']);
        }

        // 按日期和类型分组统计
        $trendData = $query->field([
            'DATE(created_time) as date',
            'type',
            'COUNT(*) as transaction_count',
            'SUM(quantity) as total_quantity'
        ])
            ->group('DATE(created_time), type')
            ->order('date', 'asc')
            ->select()
            ->toArray();

        // 格式化数据
        $formattedData = [];
        $dateRange = [];
        
        // 生成日期范围
        for ($i = 0; $i < $days; $i++) {
            $dateRange[] = date('Y-m-d', strtotime("-{$i} days"));
        }
        $dateRange = array_reverse($dateRange);

        // 初始化数据结构
        foreach ($dateRange as $date) {
            $formattedData[$date] = [
                'date' => $date,
                'in_count' => 0,
                'out_count' => 0,
                'adjust_count' => 0,
                'in_quantity' => 0,
                'out_quantity' => 0,
                'adjust_quantity' => 0
            ];
        }

        // 填充实际数据
        foreach ($trendData as $item) {
            if (isset($formattedData[$item['date']])) {
                $formattedData[$item['date']][$item['type'] . '_count'] = $item['transaction_count'];
                $formattedData[$item['date']][$item['type'] . '_quantity'] = $item['total_quantity'];
            }
        }

        return array_values($formattedData);
    }

    /**
     * 批量创建库存事务
     * @param array $transactions 事务数据数组
     * @return bool
     * @throws ValidateException
     */
    public function batchCreate(array $transactions): bool
    {
        if (empty($transactions)) {
            throw new ValidateException('事务数据不能为空');
        }

        try {
            foreach ($transactions as $transaction) {
                $this->create($transaction);
            }
            return true;
        } catch (\Exception $e) {
            throw new ValidateException('批量创建失败：' . $e->getMessage());
        }
    }

    /**
     * 获取最近的库存事务
     * @param int $limit 数量限制
     * @param array $params 查询参数
     * @return array
     */
    public function getRecent(int $limit = 10, array $params = []): array
    {
        $query = InventoryTransaction::with(['product', 'location', 'operator']);

        // 筛选条件
        if (isset($params['product_id'])) {
            $query->where('product_id', $params['product_id']);
        }

        if (isset($params['location_id'])) {
            $query->where('location_id', $params['location_id']);
        }

        if (isset($params['operator_id'])) {
            $query->where('operator_id', $params['operator_id']);
        }

        if (!empty($params['type'])) {
            $query->where('type', $params['type']);
        }

        return $query->order('created_time', 'desc')
            ->limit($limit)
            ->select()
            ->toArray();
    }
}
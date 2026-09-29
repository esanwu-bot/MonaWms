<?php

namespace app\service;

use app\model\StocktakeOrder;
use app\model\StocktakeItem;
use app\model\Inventory;
use app\model\InventoryBatch;
use app\model\InventoryTransaction;
use app\model\SerialNumber;
use app\model\Product;
use app\model\Location;
use app\model\Warehouse;
use app\common\BizException;
use think\exception\ValidateException;
use think\facade\Db;

/**
 * 库存盘点服务
 *
 * 核心口径：
 * - 快照：创建盘点单时按范围冻结账面（普件展开为每 SN 一行 + 无SN余数行；散料展开为每批次一行 + 无批次余数行）
 * - 盲盘（普件）：执行页不显示账面，扫 SN 打勾，扫不到的提交时自动盘亏
 * - 明盘（散料）：显示批次账面余量，录入实盘数量算差异，未录的批次视为与账面一致
 * - 审核过账：一个事务内按"实盘 vs 总账"生成调整（inventory + SN台账 + 批次台账 + 流水），禁止人工改库
 * - 冻结：counting/pending_review 期间该仓库禁止出入库/调整（出入库 Service 入口校验）
 */
class StocktakeService
{
    // ==================== 查询 ====================

    /**
     * 盘点单列表
     */
    public function getList(array $params = []): array
    {
        $query = StocktakeOrder::with(['warehouse', 'keeper', 'reviewer']);

        $search = [];
        if (!empty($params['order_number'])) {
            $search['order_number'] = $params['order_number'];
        }
        if (!empty($params['warehouse_id'])) {
            $search['warehouse_id'] = $params['warehouse_id'];
        }
        if (isset($params['status']) && $params['status'] !== '') {
            $search['status'] = $params['status'];
        }
        if (isset($params['type']) && $params['type'] !== '') {
            $search['type'] = $params['type'];
        }
        if ($search) {
            $query->withSearch(array_keys($search), $search);
        }

        $page = (int)($params['page'] ?? 1);
        $limit = (int)($params['limit'] ?? 15);

        $result = $query->order('id', 'desc')->paginate(['list_rows' => $limit, 'page' => $page]);

        $list = [];
        foreach ($result->items() as $order) {
            $item = $order->toArray();
            $item['status_text'] = StocktakeOrder::statusTexts()[$order->status] ?? $order->status;
            $item['warehouse_name'] = $order->warehouse->name ?? '';
            $item['keeper_name'] = $order->keeper->username ?? '';
            $item['reviewer_name'] = $order->reviewer->username ?? '';
            $list[] = $item;
        }

        return ['list' => $list, 'total' => $result->total(), 'page' => $page, 'limit' => $limit];
    }

    /**
     * 盘点单详情（含执行页汇总）
     */
    public function getDetail(int $id): array
    {
        $order = StocktakeOrder::with(['warehouse', 'keeper', 'reviewer'])->find($id);
        if (!$order) {
            throw new ValidateException('盘点单不存在');
        }

        $data = $order->toArray();
        $data['status_text'] = StocktakeOrder::statusTexts()[$order->status] ?? $order->status;
        $data['warehouse_name'] = $order->warehouse->name ?? '';
        $data['keeper_name'] = $order->keeper->username ?? '';
        $data['reviewer_name'] = $order->reviewer->username ?? '';
        $data['summary'] = $this->summaryOf($id);

        return $data;
    }

    /**
     * 盘点明细列表（执行页/审核页共用）
     */
    public function getItems(int $orderId, array $params = []): array
    {
        $order = StocktakeOrder::find($orderId);
        if (!$order) {
            throw new ValidateException('盘点单不存在');
        }

        $query = StocktakeItem::with(['product', 'location']);

        $search = ['stocktake_order_id' => $orderId];
        if (isset($params['status']) && $params['status'] !== '') {
            $search['status'] = $params['status'];
        }
        if (isset($params['is_piece']) && $params['is_piece'] !== '') {
            $search['is_piece'] = $params['is_piece'];
        }
        if (!empty($params['keyword'])) {
            $kw = trim($params['keyword']);
            // 综合搜索：SN / 批次号 / 商品名 / SKU
            $query->where(function ($q) use ($kw) {
                $q->whereLike('serial_number', '%' . $kw . '%')
                  ->whereOr('batch_no', 'like', '%' . $kw . '%')
                  ->whereOr('product_id', 'in', function ($sub) use ($kw) {
                      $sub->name('products')->whereLike('name', '%' . $kw . '%')
                          ->whereOr('sku', 'like', '%' . $kw . '%')
                          ->field('id');
                  });
            });
        }
        $query->withSearch(array_keys($search), $search);

        if (!empty($params['diff_only'])) {
            $query->where('diff_qty', '<>', '0');
        }

        $page = (int)($params['page'] ?? 1);
        $limit = (int)($params['limit'] ?? 20);

        $result = $query->order('id', 'asc')->paginate(['list_rows' => $limit, 'page' => $page]);

        $list = [];
        foreach ($result->items() as $item) {
            $list[] = $this->formatItem($item);
        }

        return [
            'list' => $list,
            'total' => $result->total(),
            'page' => $page,
            'limit' => $limit,
            'summary' => $this->summaryOf($orderId),
        ];
    }

    /**
     * 执行页汇总：已盘/未盘/差异统计
     */
    private function summaryOf(int $orderId): array
    {
        // think-orm 陷阱：聚合别名用 find() 后取属性，不能用 value()（会覆盖 fieldRaw）
        $agg = StocktakeItem::where('stocktake_order_id', $orderId)
            ->fieldRaw('COUNT(*) AS total_rows, SUM(status = \'counted\') AS counted_rows, SUM(diff_qty <> 0) AS diff_rows')
            ->find();

        $qty = StocktakeItem::where('stocktake_order_id', $orderId)
            ->fieldRaw('COALESCE(SUM(snapshot_qty),0) AS snapshot_qty, COALESCE(SUM(COALESCE(counted_qty,0)),0) AS counted_qty, COALESCE(SUM(diff_qty),0) AS diff_qty')
            ->find();

        return [
            'total_rows' => (int)($agg['total_rows'] ?? 0),
            'counted_rows' => (int)($agg['counted_rows'] ?? 0),
            'diff_rows' => (int)($agg['diff_rows'] ?? 0),
            'pending_rows' => (int)($agg['total_rows'] ?? 0) - (int)($agg['counted_rows'] ?? 0),
            'snapshot_qty' => (string)($qty['snapshot_qty'] ?? '0'),
            'counted_qty' => (string)($qty['counted_qty'] ?? '0'),
            'diff_qty' => (string)($qty['diff_qty'] ?? '0'),
        ];
    }

    private function formatItem(StocktakeItem $item): array
    {
        $data = $item->toArray();
        $data['product_name'] = $item->product->name ?? '';
        $data['product_sku'] = $item->product->sku ?? '';
        $data['unit'] = $item->product->unit ?? '';
        $data['measure_type'] = $item->product->measure_type ?? 'count';
        $data['location_code'] = $item->location->code ?? '';
        // 盲盘：普件 SN 行不回显账面数（快照本身即 1/件，无敏感信息）；散料行回显账面（明盘）
        $data['row_type'] = $item->serial_number !== '' ? 'sn'
            : ($item->is_piece ? 'piece_remainder' : 'batch');
        return $data;
    }

    // ==================== 创建（生成快照） ====================

    /**
     * 创建盘点单：按范围对账面做快照
     *
     * 快照规则（与 reconcile 口径一致，按商品 × 仓库展开）：
     * - 普件：在库 SN 每条一行（账面=1）；总账数量与 SN 数的差额 >0 时生成"无SN在账"余数行（录数量盘点）
     * - 散料：批次台账每条一行（账面=批次余量）；总账与批次合计的差额 >0 时生成"无批次在账"余数行
     */
    public function create(array $data, int $operatorId): StocktakeOrder
    {
        $warehouseId = (int)($data['warehouse_id'] ?? 0);
        if ($warehouseId <= 0 || !Warehouse::find($warehouseId)) {
            throw new ValidateException('仓库不存在');
        }

        // 同仓库不可并存多张进行中的盘点单（快照会互相打架）
        $active = StocktakeOrder::where('warehouse_id', $warehouseId)
            ->whereIn('status', [StocktakeOrder::STATUS_DRAFT, StocktakeOrder::STATUS_COUNTING, StocktakeOrder::STATUS_PENDING_REVIEW])
            ->count();
        if ($active > 0) {
            throw new BizException('WAREHOUSE_STOCKTAKING', '该仓库已有进行中的盘点单，不可重复创建');
        }

        $scopeType = $data['scope_type'] ?? StocktakeOrder::SCOPE_ALL;
        if (!in_array($scopeType, [StocktakeOrder::SCOPE_ALL, StocktakeOrder::SCOPE_CATEGORY, StocktakeOrder::SCOPE_LOCATION], true)) {
            throw new ValidateException('盘点范围类型无效');
        }
        $scopeValue = trim((string)($data['scope_value'] ?? ''));
        if ($scopeType !== StocktakeOrder::SCOPE_ALL && $scopeValue === '') {
            throw new ValidateException('请选择盘点范围（分类或库位）');
        }

        Db::startTrans();
        try {
            $order = StocktakeOrder::create([
                'order_number' => StocktakeOrder::generateOrderNumber(),
                'warehouse_id' => $warehouseId,
                'type' => in_array($data['type'] ?? '', [StocktakeOrder::TYPE_FULL, StocktakeOrder::TYPE_PARTIAL, StocktakeOrder::TYPE_DYNAMIC], true)
                    ? $data['type'] : StocktakeOrder::TYPE_FULL,
                'scope_type' => $scopeType,
                'scope_value' => $scopeValue,
                'status' => StocktakeOrder::STATUS_DRAFT,
                'keeper_id' => !empty($data['keeper_id']) ? (int)$data['keeper_id'] : $operatorId,
                'snapshot_at' => date('Y-m-d H:i:s'),
                'notes' => (string)($data['notes'] ?? ''),
                'created_by' => $operatorId,
            ]);

            $this->buildSnapshot($order);

            Db::commit();
            return $order;
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }
    }

    /**
     * 按范围生成账面快照明细
     */
    private function buildSnapshot(StocktakeOrder $order): void
    {
        $warehouseId = (int)$order->warehouse_id;
        $locationIds = $order->scope_type === StocktakeOrder::SCOPE_LOCATION
            ? array_filter(array_map('intval', explode(',', $order->scope_value)))
            : [];
        $categoryIds = $order->scope_type === StocktakeOrder::SCOPE_CATEGORY
            ? $this->expandCategoryIds(array_filter(array_map('intval', explode(',', $order->scope_value))))
            : [];

        // 范围内商品集合：先圈出涉及的 product_id（总账/批次台账/SN台账三者并集，避免漏账）
        $productIds = [];

        $invQuery = Db::name('inventory')->where('warehouse_id', $warehouseId)->where('quantity', '>', 0);
        if ($locationIds) {
            $invQuery->whereIn('location_id', $locationIds);
        }
        $invRows = $invQuery->select()->toArray();
        foreach ($invRows as $row) {
            $productIds[(int)$row['product_id']] = true;
        }

        $snQuery = Db::name('serial_numbers')
            ->where('warehouse_id', $warehouseId)
            ->where('status', SerialNumber::STATUS_IN_STOCK);
        if ($locationIds) {
            $snQuery->whereIn('location_id', $locationIds);
        }
        $snRows = $snQuery->select()->toArray();
        foreach ($snRows as $row) {
            $productIds[(int)$row['product_id']] = true;
        }

        $batchQuery = Db::name('inventory_batches')
            ->where('warehouse_id', $warehouseId)
            ->where('remaining_quantity', '>', 0);
        if ($locationIds) {
            $batchQuery->whereIn('location_id', $locationIds);
        }
        $batchRows = $batchQuery->select()->toArray();
        foreach ($batchRows as $row) {
            $productIds[(int)$row['product_id']] = true;
        }

        if ($categoryIds) {
            // 分类范围：只保留分类内的商品
            $inScope = Db::name('products')->whereIn('category_id', $categoryIds)->column('id');
            $inScopeMap = array_fill_keys(array_map('intval', $inScope), true);
            $productIds = array_intersect_key($productIds, $inScopeMap);
            $invRows = array_values(array_filter($invRows, fn($r) => isset($inScopeMap[(int)$r['product_id']])));
            $snRows = array_values(array_filter($snRows, fn($r) => isset($inScopeMap[(int)$r['product_id']])));
            $batchRows = array_values(array_filter($batchRows, fn($r) => isset($inScopeMap[(int)$r['product_id']])));
        }

        if (!$productIds) {
            // 范围内无账面：空盘点单（合法，直接结束）
            $this->recalcSummary($order);
            return;
        }

        // 计量方式分流：count=普件（SN 台账），其余=散料（批次台账）
        $measureMap = Db::name('products')->whereIn('id', array_keys($productIds))->column('measure_type', 'id');
        $pieceProductIds = [];
        $bulkProductIds = [];
        foreach ($measureMap as $pid => $measure) {
            if (($measure ?: 'count') === 'count') {
                $pieceProductIds[] = (int)$pid;
            } else {
                $bulkProductIds[] = (int)$pid;
            }
        }

        $now = date('Y-m-d H:i:s');
        $rows = [];

        // ---------- 普件：每在库 SN 一行 ----------
        $snByProduct = [];
        foreach ($snRows as $sn) {
            if (!in_array((int)$sn['product_id'], $pieceProductIds, true)) {
                continue; // 散料商品的 SN 不参与（理论不应存在）
            }
            $snByProduct[(int)$sn['product_id']][] = $sn;
            $rows[] = [
                'stocktake_order_id' => $order->id,
                'product_id' => (int)$sn['product_id'],
                'location_id' => $sn['location_id'] ?: null,
                'warehouse_id' => $warehouseId,
                'is_piece' => 1,
                'serial_number' => (string)$sn['serial_number'],
                'batch_no' => '',
                'snapshot_qty' => '1.0000',
                'counted_qty' => null,
                'diff_qty' => '0.0000',
                'status' => StocktakeItem::STATUS_PENDING,
                'is_surplus' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        // 普件余数行：总账 - SN数 > 0 时（P9 前存量无 SN 明细的账面），按数量录盘
        $invQtyByProduct = [];
        $firstLocByProduct = [];
        foreach ($invRows as $inv) {
            $pid = (int)$inv['product_id'];
            $invQtyByProduct[$pid] = bcadd((string)($invQtyByProduct[$pid] ?? '0'), (string)$inv['quantity'], 4);
            if (!isset($firstLocByProduct[$pid])) {
                $firstLocByProduct[$pid] = (int)$inv['location_id'];
            }
        }
        foreach ($pieceProductIds as $pid) {
            $snCount = count($snByProduct[$pid] ?? []);
            $invQty = (string)($invQtyByProduct[$pid] ?? '0');
            $remainder = bcsub($invQty, (string)$snCount, 4);
            if (bccomp($remainder, '0', 4) > 0) {
                $rows[] = [
                    'stocktake_order_id' => $order->id,
                    'product_id' => $pid,
                    'location_id' => $firstLocByProduct[$pid] ?? null,
                    'warehouse_id' => $warehouseId,
                    'is_piece' => 1,
                    'serial_number' => '',
                    'batch_no' => '',
                    'snapshot_qty' => $remainder,
                    'counted_qty' => null,
                    'diff_qty' => '0.0000',
                    'status' => StocktakeItem::STATUS_PENDING,
                    'is_surplus' => 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        // ---------- 散料：每批次一行（账面=批次余量） ----------
        $batchByProduct = [];
        foreach ($batchRows as $batch) {
            if (!in_array((int)$batch['product_id'], $bulkProductIds, true)) {
                continue;
            }
            $batchByProduct[(int)$batch['product_id']][] = $batch;
            $rows[] = [
                'stocktake_order_id' => $order->id,
                'product_id' => (int)$batch['product_id'],
                'location_id' => (int)$batch['location_id'],
                'warehouse_id' => $warehouseId,
                'is_piece' => 0,
                'serial_number' => '',
                'batch_no' => (string)$batch['batch_no'],
                'snapshot_qty' => (string)$batch['remaining_quantity'],
                'counted_qty' => null,
                'diff_qty' => '0.0000',
                'status' => StocktakeItem::STATUS_PENDING,
                'is_surplus' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        // 散料余数行：总账 - 批次合计 > 0 时（存量库存无批次明细），按数量录盘
        foreach ($bulkProductIds as $pid) {
            $batchSum = '0';
            foreach ($batchByProduct[$pid] ?? [] as $batch) {
                $batchSum = bcadd($batchSum, (string)$batch['remaining_quantity'], 4);
            }
            $invQty = (string)($invQtyByProduct[$pid] ?? '0');
            $remainder = bcsub($invQty, $batchSum, 4);
            if (bccomp($remainder, '0', 4) > 0) {
                $rows[] = [
                    'stocktake_order_id' => $order->id,
                    'product_id' => $pid,
                    'location_id' => $firstLocByProduct[$pid] ?? null,
                    'warehouse_id' => $warehouseId,
                    'is_piece' => 0,
                    'serial_number' => '',
                    'batch_no' => '',
                    'snapshot_qty' => $remainder,
                    'counted_qty' => null,
                    'diff_qty' => '0.0000',
                    'status' => StocktakeItem::STATUS_PENDING,
                    'is_surplus' => 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        if ($rows) {
            // 分批写入（快照可能上千行）
            foreach (array_chunk($rows, 500) as $chunk) {
                Db::name('stocktake_items')->insertAll($chunk);
            }
        }

        $this->recalcSummary($order);
    }

    /**
     * 分类范围展开：一级分类自动包含其下二级分类
     */
    private function expandCategoryIds(array $ids): array
    {
        if (!$ids) {
            return [];
        }
        $children = Db::name('categories')->whereIn('parent_id', $ids)->column('id');
        return array_values(array_unique(array_merge($ids, array_map('intval', $children))));
    }

    // ==================== 状态流转 ====================

    /**
     * 开始盘点：draft → counting（此后冻结该仓库出入库）
     */
    public function startCounting(int $id, int $operatorId): StocktakeOrder
    {
        $order = StocktakeOrder::lock(true)->find($id);
        if (!$order) {
            throw new ValidateException('盘点单不存在');
        }
        if ($order->status !== StocktakeOrder::STATUS_DRAFT) {
            throw new BizException('DOC_STATUS_INVALID', '只有草稿状态的盘点单才能开始盘点');
        }

        $order->status = StocktakeOrder::STATUS_COUNTING;
        $order->updated_by = $operatorId;
        $order->save();

        return $order;
    }

    /**
     * 普件扫 SN（盲盘核心动作）
     *
     * - 命中快照行且未盘 → 打勾已盘（counted=1）
     * - 已盘过 → duplicate（前端提示，不算错误）
     * - 台账有本仓在库但快照没有（范围外）→ 记盘盈行
     * - 完全陌生 SN → 需指定商品（product_id），记盘盈行
     */
    public function scanSn(int $orderId, string $sn, int $operatorId, ?int $productId = null, ?int $locationId = null): array
    {
        $sn = trim($sn);
        if ($sn === '') {
            throw new ValidateException('SN不能为空');
        }

        $order = StocktakeOrder::find($orderId);
        if (!$order) {
            throw new ValidateException('盘点单不存在');
        }
        if ($order->status !== StocktakeOrder::STATUS_COUNTING) {
            throw new BizException('DOC_STATUS_INVALID', '盘点单不在盘点中状态，无法扫码');
        }

        $item = StocktakeItem::where('stocktake_order_id', $orderId)
            ->where('serial_number', $sn)
            ->find();

        if ($item) {
            if ($item->status === StocktakeItem::STATUS_COUNTED) {
                return ['result' => 'duplicate', 'message' => '该SN已盘过', 'item' => $this->formatItem($item)];
            }
            $item->counted_qty = '1.0000';
            $item->diff_qty = bcsub('1.0000', (string)$item->snapshot_qty, 4);
            $item->status = StocktakeItem::STATUS_COUNTED;
            $item->counted_by = $operatorId;
            $item->counted_at = date('Y-m-d H:i:s');
            $item->save();

            return ['result' => 'matched', 'message' => '已盘', 'item' => $this->formatItem($item)];
        }

        // 快照中不存在 → 盘盈候选
        $snModel = SerialNumber::where('serial_number', $sn)->find();
        if ($snModel) {
            if ((int)$snModel->warehouse_id !== (int)$order->warehouse_id && $snModel->warehouse_id) {
                throw new BizException('SERIAL_NOT_AVAILABLE', '该SN不在本仓，无法盘入');
            }
            if ((string)$snModel->status !== SerialNumber::STATUS_IN_STOCK) {
                throw new BizException('SERIAL_NOT_AVAILABLE', '该SN当前状态为「' . $snModel->status_text . '」，不可盘入');
            }
            // 台账在库但快照没有 = 范围外（分类/库位范围未覆盖）。
            // 不能记盘盈：该商品的全部库存不在本单口径内，按组调整会把范围外库存清零。
            throw new BizException(
                'SN_OUT_OF_SCOPE',
                '该SN在库但不在本次盘点范围内（快照未包含），如需盘点请扩大盘点范围',
                ['sn' => $sn]
            );
        }

        // 完全陌生：必须指定商品，否则无法归属
        if (!$productId || !Product::find($productId)) {
            throw new BizException('SN_UNKNOWN', '系统无此SN，请选择归属商品后重扫', ['sn' => $sn, 'need_product' => true]);
        }
        $pid = (int)$productId;

        // 范围校验：盘盈归属必须落在本次盘点口径内，否则审核调账会误伤范围外库存
        if (!$this->isProductInScope($order, $pid)) {
            throw new BizException('SN_OUT_OF_SCOPE', '所选商品不在本次盘点范围内，请重新选择');
        }

        // 落位：优先操作员指定库位，其次商品在本仓首个有账库位，最后仓库默认库位
        $locId = $locationId ?: $this->firstLocationOfProduct($pid, (int)$order->warehouse_id);
        if (!$locId) {
            $locId = $this->defaultLocationOf((int)$order->warehouse_id);
        }
        if ($order->scope_type === StocktakeOrder::SCOPE_LOCATION && $locId) {
            $scopeLocations = array_filter(array_map('intval', explode(',', $order->scope_value)));
            if ($scopeLocations && !in_array((int)$locId, $scopeLocations, true)) {
                // 指定库位不在范围内：落到范围内第一个库位
                $locId = (int)reset($scopeLocations);
            }
        }

        $item = StocktakeItem::create([
            'stocktake_order_id' => $orderId,
            'product_id' => $pid,
            'location_id' => $locId,
            'warehouse_id' => (int)$order->warehouse_id,
            'is_piece' => 1,
            'serial_number' => $sn,
            'batch_no' => '',
            'snapshot_qty' => '0.0000',
            'counted_qty' => '1.0000',
            'diff_qty' => '1.0000',
            'status' => StocktakeItem::STATUS_COUNTED,
            'is_surplus' => 1,
            'counted_by' => $operatorId,
            'counted_at' => date('Y-m-d H:i:s'),
        ]);

        return ['result' => 'surplus', 'message' => '盘盈（系统无此设备账面）', 'item' => $this->formatItem($item)];
    }

    /**
     * 散料/余数行录入实盘数量（明盘：前端回显账面，此处只收实盘）
     */
    public function recordCounted(int $itemId, string $countedQty, int $operatorId, string $reason = ''): array
    {
        $item = StocktakeItem::find($itemId);
        if (!$item) {
            throw new ValidateException('盘点明细不存在');
        }
        $order = StocktakeOrder::find($item->stocktake_order_id);
        if (!$order || $order->status !== StocktakeOrder::STATUS_COUNTING) {
            throw new BizException('DOC_STATUS_INVALID', '盘点单不在盘点中状态，无法录盘');
        }
        if ($item->serial_number !== '') {
            throw new ValidateException('SN行请走扫码盘点');
        }

        $countedQty = (string)$countedQty;
        if (bccomp($countedQty, '0', 4) < 0) {
            throw new ValidateException('实盘数量不能为负');
        }
        if ($item->is_piece && bccomp($countedQty, (string)floor((float)$countedQty), 4) !== 0) {
            throw new ValidateException('计件物资实盘数量必须为整数');
        }

        $item->counted_qty = $countedQty;
        $item->diff_qty = bcsub($countedQty, (string)$item->snapshot_qty, 4);
        $item->status = StocktakeItem::STATUS_COUNTED;
        if ($reason !== '') {
            $item->reason = $reason;
        }
        $item->counted_by = $operatorId;
        $item->counted_at = date('Y-m-d H:i:s');
        $item->save();

        return $this->formatItem($item);
    }

    /**
     * 提交盘点结果：counting → pending_review
     *
     * 盲盘口径：未扫到的 SN 行自动置 counted=0（盘亏）
     * 明盘口径：未录的散料/余数行视为与账面一致（counted=snapshot，无差异）
     */
    public function submitCounting(int $id, int $operatorId): StocktakeOrder
    {
        Db::startTrans();
        try {
            $order = StocktakeOrder::lock(true)->find($id);
            if (!$order) {
                throw new ValidateException('盘点单不存在');
            }
            if ($order->status !== StocktakeOrder::STATUS_COUNTING) {
                throw new BizException('DOC_STATUS_INVALID', '盘点单不在盘点中状态，无法提交');
            }

            // 普件未扫 = 盘亏
            StocktakeItem::where('stocktake_order_id', $id)
                ->where('status', StocktakeItem::STATUS_PENDING)
                ->where('serial_number', '<>', '')
                ->update([
                    'counted_qty' => '0.0000',
                    'diff_qty' => Db::raw('-snapshot_qty'),
                    'status' => StocktakeItem::STATUS_COUNTED,
                    'counted_by' => $operatorId,
                    'counted_at' => date('Y-m-d H:i:s'),
                ]);

            // 散料批次/余数行未录 = 与账面一致（明盘：只录有差异的行）
            StocktakeItem::where('stocktake_order_id', $id)
                ->where('status', StocktakeItem::STATUS_PENDING)
                ->where('serial_number', '')
                ->where('is_piece', 0)
                ->update([
                    'counted_qty' => Db::raw('snapshot_qty'),
                    'diff_qty' => '0.0000',
                    'status' => StocktakeItem::STATUS_COUNTED,
                    'counted_by' => $operatorId,
                    'counted_at' => date('Y-m-d H:i:s'),
                ]);

            // 普件余数行（无SN在账）未录 = 0：盲盘语义，扫不到且未经人工确认即视为无，
            // 否则 P9 遗留的"无SN在账"虚账永远无法通过盘点消化
            StocktakeItem::where('stocktake_order_id', $id)
                ->where('status', StocktakeItem::STATUS_PENDING)
                ->where('serial_number', '')
                ->where('is_piece', 1)
                ->update([
                    'counted_qty' => '0.0000',
                    'diff_qty' => Db::raw('-snapshot_qty'),
                    'status' => StocktakeItem::STATUS_COUNTED,
                    'counted_by' => $operatorId,
                    'counted_at' => date('Y-m-d H:i:s'),
                ]);

            $order->status = StocktakeOrder::STATUS_PENDING_REVIEW;
            $order->submitted_at = date('Y-m-d H:i:s');
            $order->updated_by = $operatorId;
            $order->save();

            $this->recalcSummary($order);

            Db::commit();
            return $order;
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }
    }

    /**
     * 差异审核（过账）：pending_review → completed
     *
     * 一个事务内完成（禁止人工改库）：
     * 1) 按商品×库位×批次分组，以"实盘合计 vs 总账"生成库存调整（inventory 行锁）
     * 2) SN 台账：未扫到的快照 SN → lost（盘亏遗失）；盘盈陌生 SN → 新增在库
     * 3) 批次台账：批次行余量改为实盘值；无批次余数行盘盈 → 补建批次
     * 4) 全量库存流水（TYPE_CHECK / check_order）+ 差异原因留痕
     */
    public function review(int $id, int $operatorId, string $notes = '', array $reasons = []): array
    {
        Db::startTrans();
        try {
            $order = StocktakeOrder::lock(true)->find($id);
            if (!$order) {
                throw new ValidateException('盘点单不存在');
            }
            if ($order->status !== StocktakeOrder::STATUS_PENDING_REVIEW) {
                throw new BizException('DOC_STATUS_INVALID', '盘点单不在待审核状态');
            }

            $warehouseId = (int)$order->warehouse_id;

            // 差异原因补录（审核页提交的原因映射）
            if ($reasons) {
                foreach ($reasons as $itemId => $reason) {
                    $reason = trim((string)$reason);
                    if ($reason === '') {
                        continue;
                    }
                    Db::name('stocktake_items')
                        ->where('id', (int)$itemId)
                        ->where('stocktake_order_id', $id)
                        ->update(['reason' => mb_substr($reason, 0, 50)]);
                }
            }

            $items = StocktakeItem::where('stocktake_order_id', $id)->select();

            // ---------- 1) 总账调整：按 product × location × batch 分组 ----------
            $groups = [];
            foreach ($items as $item) {
                $key = $item->product_id . '|' . ($item->location_id ?: 0) . '|' . $item->batch_no;
                if (!isset($groups[$key])) {
                    $groups[$key] = [
                        'product_id' => (int)$item->product_id,
                        'location_id' => $item->location_id ? (int)$item->location_id : null,
                        'batch_no' => (string)$item->batch_no,
                        'counted' => '0',
                    ];
                }
                $groups[$key]['counted'] = bcadd($groups[$key]['counted'], (string)($item->counted_qty ?? '0'), 4);
            }

            $adjusted = 0;
            foreach ($groups as $group) {
                $countedTotal = $group['counted'];

                $locationId = $group['location_id'] ?: $this->firstLocationOfProduct($group['product_id'], $warehouseId);
                if (!$locationId) {
                    $locationId = $this->defaultLocationOf($warehouseId);
                }
                if (!$locationId) {
                    throw new BizException('LOCATION_MISSING', '仓库无可用库位，无法落账，请先维护库位');
                }

                $inventory = Inventory::where('product_id', $group['product_id'])
                    ->where('location_id', $locationId)
                    ->where('batch_number', $group['batch_no'])
                    ->lock(true)
                    ->find();

                if (!$inventory) {
                    if (bccomp($countedTotal, '0', 4) <= 0) {
                        continue;
                    }
                    // 盘盈组无总账行：新建
                    $inventory = Inventory::create([
                        'product_id' => $group['product_id'],
                        'warehouse_id' => $warehouseId,
                        'location_id' => $locationId,
                        'quantity' => '0.0000',
                        'reserved_quantity' => '0.0000',
                        'available_quantity' => '0.0000',
                        'batch_number' => $group['batch_no'],
                    ]);
                }

                $adjust = bcsub($countedTotal, (string)$inventory->quantity, 4);
                if (bccomp($adjust, '0', 4) === 0) {
                    continue;
                }

                $inventory->quantity = bcadd((string)$inventory->quantity, $adjust, 4);
                $inventory->available_quantity = bcsub((string)$inventory->quantity, (string)$inventory->reserved_quantity, 4);
                $inventory->save();

                InventoryTransaction::createTransaction([
                    'product_id' => $group['product_id'],
                    'location_id' => $locationId,
                    'inventory_id' => $inventory->id,
                    'type' => bccomp($adjust, '0', 4) > 0
                        ? InventoryTransaction::TYPE_ADJUST_IN
                        : InventoryTransaction::TYPE_ADJUST_OUT,
                    'quantity' => ltrim($adjust, '-'),
                    'balance_quantity' => $inventory->quantity,
                    'operator_id' => $operatorId,
                    'reason' => '盘点调整（' . $order->order_number . '）',
                    'reference_type' => InventoryTransaction::REFERENCE_CHECK,
                    'reference_id' => $order->id,
                ]);
                $adjusted++;
            }

            // ---------- 2) SN 台账 ----------
            $snLost = 0;
            $snGain = 0;
            foreach ($items as $item) {
                if ((int)$item->is_piece !== 1 || $item->serial_number === '') {
                    continue;
                }
                $isDeficit = bccomp((string)($item->counted_qty ?? '0'), '0', 4) <= 0
                    && (int)$item->is_surplus === 0
                    && bccomp((string)$item->snapshot_qty, '0', 4) > 0;

                if ($isDeficit) {
                    // 未扫到 = 盘亏：SN 在库 → lost（遗失）
                    $sn = SerialNumber::where('serial_number', $item->serial_number)->lock(true)->find();
                    if ($sn && (string)$sn->status === SerialNumber::STATUS_IN_STOCK) {
                        $sn->changeStatus(
                            SerialNumber::STATUS_LOST,
                            $operatorId,
                            '盘点盘亏：' . ($item->reason ?: '未注明原因'),
                            'stocktake_order',
                            $order->id
                        );
                        $snLost++;
                    }
                } elseif ((int)$item->is_surplus === 1) {
                    // 盘盈：陌生 SN 补建台账；台账已有的（范围外扫入）确保在库即可
                    $sn = SerialNumber::where('serial_number', $item->serial_number)->lock(true)->find();
                    if (!$sn) {
                        SerialNumber::create([
                            'serial_number' => $item->serial_number,
                            'product_id' => $item->product_id,
                            'warehouse_id' => $warehouseId,
                            'location_id' => $item->location_id,
                            'status' => SerialNumber::STATUS_IN_STOCK,
                            'location' => '',
                            'notes' => '盘点盘盈自动登记（' . $order->order_number . '）',
                        ]);
                        $snGain++;
                    } elseif ((string)$sn->status !== SerialNumber::STATUS_IN_STOCK) {
                        // 台账存在但状态异常（如 lost 后又找到）：恢复在库
                        if ($sn->status === SerialNumber::STATUS_LOST) {
                            $sn->status = SerialNumber::STATUS_IN_STOCK;
                            $sn->warehouse_id = $warehouseId;
                            $sn->location_id = $item->location_id ?: $sn->location_id;
                            $sn->notes = '盘点盘盈恢复在库（' . $order->order_number . '）';
                            $sn->save();
                            $snGain++;
                        }
                    }
                }
            }

            // ---------- 3) 批次台账 ----------
            $batchTouched = 0;
            foreach ($items as $item) {
                if ((int)$item->is_piece === 1) {
                    continue;
                }
                $counted = (string)($item->counted_qty ?? $item->snapshot_qty);

                if ($item->batch_no !== '') {
                    // 批次行：余量改为实盘值（行锁防并发）
                    $batch = InventoryBatch::where('product_id', $item->product_id)
                        ->where('warehouse_id', $warehouseId)
                        ->where('batch_no', $item->batch_no)
                        ->lock(true)
                        ->find();
                    if ($batch && bccomp($counted, (string)$batch->remaining_quantity, 4) !== 0) {
                        $batch->remaining_quantity = $counted;
                        $batch->status = bccomp($counted, '0', 4) <= 0
                            ? InventoryBatch::STATUS_EXHAUSTED
                            : InventoryBatch::STATUS_ACTIVE;
                        $batch->save();
                        $batchTouched++;
                    }
                } elseif (bccomp($counted, '0', 4) > 0) {
                    // 无批次余数行实盘>0：一律补建批次（存量"无批次在账"只有落成批次，对账才能平）
                    $locationId = $item->location_id ?: $this->firstLocationOfProduct((int)$item->product_id, $warehouseId)
                        ?: $this->defaultLocationOf($warehouseId);
                    if ($locationId) {
                        InventoryBatch::create([
                            'product_id' => $item->product_id,
                            'warehouse_id' => $warehouseId,
                            'location_id' => $locationId,
                            'batch_no' => 'PD-' . $order->id . '-' . $item->id,
                            'initial_quantity' => $counted,
                            'remaining_quantity' => $counted,
                            'unit' => (string)($item->product->unit ?? ''),
                            'status' => InventoryBatch::STATUS_ACTIVE,
                            'inbound_at' => date('Y-m-d H:i:s'),
                            'notes' => '盘点盘盈补建批次（' . $order->order_number . '）',
                        ]);
                        $batchTouched++;
                    }
                }
            }

            // ---------- 4) 收尾 ----------
            $order->status = StocktakeOrder::STATUS_COMPLETED;
            $order->reviewer_id = $operatorId;
            $order->reviewed_at = date('Y-m-d H:i:s');
            $order->review_notes = mb_substr($notes, 0, 500);
            $order->adjustment_number = $order->generateAdjustmentNumber();
            $order->updated_by = $operatorId;
            $order->save();

            $this->recalcSummary($order);

            Db::commit();

            return [
                'adjustment_number' => $order->adjustment_number,
                'adjusted_groups' => $adjusted,
                'sn_lost' => $snLost,
                'sn_gain' => $snGain,
                'batch_touched' => $batchTouched,
            ];
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }
    }

    /**
     * 取消盘点：draft/counting/pending_review → cancelled（解除冻结；completed 不可逆）
     */
    public function cancel(int $id, int $operatorId, string $reason = ''): StocktakeOrder
    {
        $order = StocktakeOrder::lock(true)->find($id);
        if (!$order) {
            throw new ValidateException('盘点单不存在');
        }
        if (!in_array($order->status, [StocktakeOrder::STATUS_DRAFT, StocktakeOrder::STATUS_COUNTING, StocktakeOrder::STATUS_PENDING_REVIEW], true)) {
            throw new BizException('DOC_STATUS_INVALID', '该状态不允许取消');
        }

        $order->status = StocktakeOrder::STATUS_CANCELLED;
        $order->review_notes = trim($order->review_notes . ($reason ? ($order->review_notes ? '；' : '') . '取消原因：' . $reason : ''));
        $order->updated_by = $operatorId;
        $order->save();

        return $order;
    }

    // ==================== 冻结校验（出入库 Service 调用） ====================

    /**
     * 断言仓库无进行中的盘点（counting/pending_review 冻结出入库与库存调整）
     */
    public static function assertNotStocktaking(int $warehouseId): void
    {
        if ($warehouseId <= 0) {
            return;
        }
        $active = StocktakeOrder::where('warehouse_id', $warehouseId)
            ->whereIn('status', StocktakeOrder::FREEZING_STATUSES)
            ->count();
        if ($active > 0) {
            throw new BizException(
                'WAREHOUSE_STOCKTAKING',
                '该仓库盘点进行中，已冻结出入库与库存调整，请先完成或取消盘点单',
                ['warehouse_id' => $warehouseId]
            );
        }
    }

    // ==================== 内部工具 ====================

    private function recalcSummary(StocktakeOrder $order): void
    {
        $agg = StocktakeItem::where('stocktake_order_id', $order->id)
            ->fieldRaw('COUNT(*) AS total_rows, SUM(status = \'counted\') AS counted_rows, SUM(diff_qty <> 0) AS diff_rows')
            ->find();
        $qty = StocktakeItem::where('stocktake_order_id', $order->id)
            ->fieldRaw('COALESCE(SUM(snapshot_qty),0) AS snapshot_qty, COALESCE(SUM(COALESCE(counted_qty,0)),0) AS counted_qty, COALESCE(SUM(diff_qty),0) AS diff_qty')
            ->find();

        $order->item_total = (int)($agg['total_rows'] ?? 0);
        $order->item_counted = (int)($agg['counted_rows'] ?? 0);
        $order->item_diff = (int)($agg['diff_rows'] ?? 0);
        $order->total_snapshot_qty = (string)($qty['snapshot_qty'] ?? '0');
        $order->total_counted_qty = (string)($qty['counted_qty'] ?? '0');
        $order->total_diff_qty = (string)($qty['diff_qty'] ?? '0');
        $order->save();
    }

    /** 商品是否在盘点范围内（全仓恒真；分类范围含二级展开） */
    private function isProductInScope(StocktakeOrder $order, int $productId): bool
    {
        if ($order->scope_type === StocktakeOrder::SCOPE_ALL) {
            return true;
        }
        if ($order->scope_type === StocktakeOrder::SCOPE_CATEGORY) {
            $ids = $this->expandCategoryIds(array_filter(array_map('intval', explode(',', $order->scope_value))));
            $categoryId = (int)Db::name('products')->where('id', $productId)->value('category_id');
            return in_array($categoryId, $ids, true);
        }
        // 库位范围：商品口径恒可盘（落位会强制到范围内库位）
        return true;
    }

    /** 商品在该仓库的第一个有账库位 */
    private function firstLocationOfProduct(int $productId, int $warehouseId): ?int
    {
        $locId = Inventory::where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->order('id', 'asc')
            ->value('location_id');
        return $locId ? (int)$locId : null;
    }

    /** 仓库默认（第一个）库位 */
    private function defaultLocationOf(int $warehouseId): ?int
    {
        $loc = Location::where('warehouse_id', $warehouseId)->order('id', 'asc')->find();
        return $loc ? (int)$loc->id : null;
    }
}

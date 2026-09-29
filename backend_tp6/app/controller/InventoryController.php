<?php

namespace app\controller;

use app\BaseController;
use app\common\Current;
use app\common\Grant;
use app\model\Inventory;
use app\model\Product;
use app\model\Location;
use app\model\InventoryTransaction;
use app\common\library\Response;
use think\Request;
use think\facade\Validate;
use think\facade\Db;

/**
 * 库存管理控制器
 */
class InventoryController extends BaseController
{
    /**
     * 获取库存列表
     */
    public function index(Request $request)
    {
        try {
            $params = $request->get();
            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 15;
            
            $query = Inventory::with(['product', 'location']);
            
            // 搜索条件
            if (!empty($params['product_id'])) {
                $query->searchProductId($params['product_id']);
            }
            
            if (!empty($params['location_id'])) {
                $query->searchLocationId($params['location_id']);
            }
            
            if (!empty($params['batch_number'])) {
                $query->searchBatchNumber($params['batch_number']);
            }
            
            if (!empty($params['expiry_date'])) {
                $query->searchExpiryDate($params['expiry_date']);
            }
            
            if (isset($params['is_expired'])) {
                $query->searchExpired($params['is_expired']);
            }
            
            // 只显示有库存的记录
            if (!isset($params['show_zero']) || !$params['show_zero']) {
                $query->where('quantity', '>', 0);
            }
            
            // 分页查询
            $result = $query->order('created_at', 'desc')
                          ->paginate([
                              'list_rows' => $limit,
                              'page' => $page
                          ]);
            
            $list = [];
            foreach ($result->items() as $inventory) {
                $item = $inventory->toArray();
                $item['product_sku'] = $inventory->product->sku ?? '';
                $item['product_name'] = $inventory->product->name ?? '';
                $item['location_code'] = $inventory->location->code ?? '';
                $item['available_quantity'] = $inventory->getAvailableQuantity();
                $item['is_expired'] = $inventory->isExpired();
                $item['days_to_expiry'] = $inventory->getDaysToExpiry();
                $list[] = $item;
            }
            
            return Response::paginate($list, $result->total(), $page, $limit);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('获取库存列表失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取库存详情
     */
    public function read(Request $request, $id)
    {
        try {
            $inventory = Inventory::with(['product', 'location'])->find($id);
            
            if (!$inventory) {
                return Response::notFound('库存记录不存在');
            }
            
            $data = $inventory->getDetailInfo();
            
            return Response::success($data);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('获取库存详情失败：' . $e->getMessage());
        }
    }
    
    /**
     * 库存调整
     */
    public function adjust(Request $request)
    {
        Grant::assert('inventory:adjust', Current::warehouseIdOrNull());
        $data = $request->post();
        
        // 验证参数
        $validate = Validate::rule([
            'product_id' => 'require|integer',
            'location_id' => 'require|integer',
            'quantity' => 'require|integer',
            'type' => 'require|in:increase,decrease',
            'reason' => 'require|max:255',
            'batch_number' => 'max:50',
            'expiry_date' => 'date'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            // 验证商品和库位是否存在
            $product = Product::find($data['product_id']);
            if (!$product) {
                return Response::error('商品不存在');
            }
            
            $location = Location::find($data['location_id']);
            if (!$location) {
                return Response::error('库位不存在');
            }
            
            if ($data['quantity'] <= 0) {
                return Response::error('调整数量必须大于0');
            }
            
            // 查找或创建库存记录
            $inventory = Inventory::where([
                'product_id' => $data['product_id'],
                'location_id' => $data['location_id'],
                'batch_number' => $data['batch_number'] ?? ''
            ])->find();
            
            if (!$inventory) {
                if ($data['type'] == 'decrease') {
                    return Response::error('库存记录不存在，无法减少库存');
                }
                
                $inventory = new Inventory();
                $inventory->product_id = $data['product_id'];
                $inventory->location_id = $data['location_id'];
                $inventory->quantity = 0;
                $inventory->reserved_quantity = 0;
                $inventory->batch_number = $data['batch_number'] ?? '';
                $inventory->expiry_date = $data['expiry_date'] ?? null;
            }
            
            // 执行调整
            if ($data['type'] == 'increase') {
                $inventory->increaseQuantity($data['quantity']);
                $transactionType = InventoryTransaction::TYPE_ADJUST_IN;
            } else {
                if ($inventory->quantity < $data['quantity']) {
                    return Response::error('库存不足，无法减少指定数量');
                }
                $inventory->decreaseQuantity($data['quantity']);
                $transactionType = InventoryTransaction::TYPE_ADJUST_OUT;
            }
            
            $inventory->save();
            
            // 记录库存变动
            InventoryTransaction::createTransaction([
                'product_id' => $data['product_id'],
                'location_id' => $data['location_id'],
                'inventory_id' => $inventory->id,
                'type' => $transactionType,
                'quantity' => $data['quantity'],
                'balance_quantity' => $inventory->quantity,
                'operator_id' => $this->getCurrentUserId($request),
                'reason' => $data['reason'],
                'reference_type' => InventoryTransaction::REFERENCE_ADJUST,
                'reference_id' => null
            ]);
            
            return Response::success([
                'inventory_id' => $inventory->id,
                'product_id' => $inventory->product_id,
                'location_id' => $inventory->location_id,
                'quantity' => $inventory->quantity,
                'available_quantity' => $inventory->getAvailableQuantity()
            ], '库存调整成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('库存调整失败：' . $e->getMessage());
        }
    }
    
    /**
     * 库存预留
     */
    public function reserve(Request $request)
    {
        Grant::assert('inventory:adjust', Current::warehouseIdOrNull());
        $data = $request->post();
        
        // 验证参数
        $validate = Validate::rule([
            'product_id' => 'require|integer',
            'location_id' => 'require|integer',
            'quantity' => 'require|integer|>:0',
            'reason' => 'require|max:255'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            $inventory = Inventory::where([
                'product_id' => $data['product_id'],
                'location_id' => $data['location_id']
            ])->find();
            
            if (!$inventory) {
                return Response::error('库存记录不存在');
            }
            
            if ($inventory->getAvailableQuantity() < $data['quantity']) {
                return Response::error('可用库存不足');
            }
            
            $inventory->reserveQuantity($data['quantity']);
            $inventory->save();
            
            // 记录库存变动
            InventoryTransaction::createTransaction([
                'product_id' => $data['product_id'],
                'location_id' => $data['location_id'],
                'inventory_id' => $inventory->id,
                'type' => InventoryTransaction::TYPE_RESERVE,
                'quantity' => $data['quantity'],
                'balance_quantity' => $inventory->quantity,
                'operator_id' => $this->getCurrentUserId($request),
                'reason' => $data['reason'],
                'reference_type' => InventoryTransaction::REFERENCE_RESERVE,
                'reference_id' => null
            ]);
            
            return Response::success([
                'inventory_id' => $inventory->id,
                'reserved_quantity' => $inventory->reserved_quantity,
                'available_quantity' => $inventory->getAvailableQuantity()
            ], '库存预留成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('库存预留失败：' . $e->getMessage());
        }
    }
    
    /**
     * 释放预留库存
     */
    public function release(Request $request)
    {
        Grant::assert('inventory:adjust', Current::warehouseIdOrNull());
        $data = $request->post();
        
        // 验证参数
        $validate = Validate::rule([
            'product_id' => 'require|integer',
            'location_id' => 'require|integer',
            'quantity' => 'require|integer|>:0',
            'reason' => 'require|max:255'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            $inventory = Inventory::where([
                'product_id' => $data['product_id'],
                'location_id' => $data['location_id']
            ])->find();
            
            if (!$inventory) {
                return Response::error('库存记录不存在');
            }
            
            if ($inventory->reserved_quantity < $data['quantity']) {
                return Response::error('预留库存不足');
            }
            
            $inventory->releaseQuantity($data['quantity']);
            $inventory->save();
            
            // 记录库存变动
            InventoryTransaction::createTransaction([
                'product_id' => $data['product_id'],
                'location_id' => $data['location_id'],
                'inventory_id' => $inventory->id,
                'type' => InventoryTransaction::TYPE_RELEASE,
                'quantity' => $data['quantity'],
                'balance_quantity' => $inventory->quantity,
                'operator_id' => $this->getCurrentUserId($request),
                'reason' => $data['reason'],
                'reference_type' => InventoryTransaction::REFERENCE_RELEASE,
                'reference_id' => null
            ]);
            
            return Response::success([
                'inventory_id' => $inventory->id,
                'reserved_quantity' => $inventory->reserved_quantity,
                'available_quantity' => $inventory->getAvailableQuantity()
            ], '预留库存释放成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('预留库存释放失败：' . $e->getMessage());
        }
    }
    
    /**
     * P9: 总账 ↔ 明细账对账
     *
     * 计件类：inventory.quantity 必须等于该仓 SN 台账 in_stock 计数
     * 散料类：inventory.quantity 必须等于批次台账 remaining 合计
     * 返回差异明细（product × warehouse 粒度），供盘点/修数依据
     */
    public function reconcile(Request $request)
    {
        try {
            // 按商品 × 仓库聚合总账
            $ledger = Db::name('inventory')
                ->field('product_id, warehouse_id, SUM(quantity) as total_qty')
                ->group('product_id, warehouse_id')
                ->select()->toArray();

            // 计件类明细账：SN 在库计数（忽略 warehouse 为 NULL 的存量 SN——无归属无法对账，单独列出）
            $snCount = Db::name('serial_numbers')
                ->field('product_id, warehouse_id, COUNT(*) as cnt')
                ->where('status', 'in_stock')
                ->where('warehouse_id', '>', 0)
                ->group('product_id, warehouse_id')
                ->select()->toArray();
            $snMap = [];
            foreach ($snCount as $row) {
                $snMap[$row['product_id'] . '-' . $row['warehouse_id']] = $row['cnt'];
            }

            // 散料明细账：批次余量合计
            $batchSum = Db::name('inventory_batches')
                ->field('product_id, warehouse_id, SUM(remaining_quantity) as total_remaining')
                ->group('product_id, warehouse_id')
                ->select()->toArray();
            $batchMap = [];
            foreach ($batchSum as $row) {
                $batchMap[$row['product_id'] . '-' . $row['warehouse_id']] = $row['total_remaining'];
            }

            // 商品计量方式（计件 → SN 对账；散料 → 批次对账）
            $products = Db::name('products')->column('measure_type, name, sku', 'id');

            $diffs = [];
            $checked = 0;
            foreach ($ledger as $row) {
                $pid = (int)$row['product_id'];
                $wid = (int)$row['warehouse_id'];
                $key = $pid . '-' . $wid;
                $isPiece = ($products[$pid]['measure_type'] ?? 'count') === 'count';
                $detailQty = $isPiece
                    ? ($snMap[$key] ?? '0')
                    : ($batchMap[$key] ?? '0');

                $checked++;
                if (bccomp((string)$row['total_qty'], (string)$detailQty, 4) !== 0) {
                    $diffs[] = [
                        'product_id'    => $pid,
                        'product_name'  => $products[$pid]['name'] ?? '',
                        'sku'           => $products[$pid]['sku'] ?? '',
                        'warehouse_id'  => $wid,
                        'ledger_type'   => $isPiece ? 'sn' : 'batch',
                        'inventory_qty' => $row['total_qty'],
                        'detail_qty'    => $detailQty,
                        'diff'          => bcsub((string)$row['total_qty'], (string)$detailQty, 4)
                    ];
                }
            }

            // 无归属的存量 SN（无法参与对账，提示人工补录 warehouse_id）
            $orphanSn = Db::name('serial_numbers')
                ->where('status', 'in_stock')
                ->whereNull('warehouse_id')
                ->count();

            return Response::success([
                'checked'     => $checked,          // 对账口径内的 商品×仓库 组合数
                'diff_count'  => count($diffs),     // 差异数
                'is_balanced' => count($diffs) === 0,
                'orphan_sn'   => $orphanSn,         // 无仓库归属的在库 SN（存量数据）
                'diffs'       => $diffs
            ], count($diffs) === 0 ? '对账平衡：总账与明细账一致' : '发现 ' . count($diffs) . ' 处差异');

        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('对账失败：' . $e->getMessage());
        }
    }

    /**
     * 库存统计
     */
    public function statistics(Request $request)
    {
        try {
            $params = $request->get();
            
            $query = Inventory::with(['product']);
            
            // 筛选条件
            if (!empty($params['product_id'])) {
                $query->where('product_id', $params['product_id']);
            }
            
            if (!empty($params['location_id'])) {
                $query->where('location_id', $params['location_id']);
            }
            
            $inventories = $query->where('quantity', '>', 0)->select();
            
            $statistics = [
                'total_products' => 0,
                'total_quantity' => 0,
                'total_available_quantity' => 0,
                'total_reserved_quantity' => 0,
                'expired_count' => 0,
                'expiring_soon_count' => 0, // 30天内过期
                'low_stock_count' => 0,
                'over_stock_count' => 0
            ];
            
            $productIds = [];
            
            foreach ($inventories as $inventory) {
                if (!in_array($inventory->product_id, $productIds)) {
                    $productIds[] = $inventory->product_id;
                }
                
                $statistics['total_quantity'] += $inventory->quantity;
                $statistics['total_available_quantity'] += $inventory->getAvailableQuantity();
                $statistics['total_reserved_quantity'] += $inventory->reserved_quantity;
                
                if ($inventory->isExpired()) {
                    $statistics['expired_count']++;
                } elseif ($inventory->getDaysToExpiry() <= 30 && $inventory->getDaysToExpiry() > 0) {
                    $statistics['expiring_soon_count']++;
                }
                
                if ($inventory->product && $inventory->product->isLowStock()) {
                    $statistics['low_stock_count']++;
                }
                
                if ($inventory->product && $inventory->product->isOverStock()) {
                    $statistics['over_stock_count']++;
                }
            }
            
            $statistics['total_products'] = count($productIds);
            
            return Response::success($statistics);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('获取库存统计失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取即将过期的库存
     */
    public function expiring(Request $request)
    {
        try {
            $days = $request->get('days', 30); // 默认30天内过期
            
            $inventories = Inventory::with(['product', 'location'])
                                  ->where('quantity', '>', 0)
                                  ->where('expiry_date', '<=', date('Y-m-d', strtotime("+{$days} days")))
                                  ->where('expiry_date', '>', date('Y-m-d'))
                                  ->order('expiry_date')
                                  ->select();
            
            $list = [];
            foreach ($inventories as $inventory) {
                $item = $inventory->toArray();
                $item['product_sku'] = $inventory->product->sku ?? '';
                $item['product_name'] = $inventory->product->name ?? '';
                $item['location_code'] = $inventory->location->code ?? '';
                $item['days_to_expiry'] = $inventory->getDaysToExpiry();
                $list[] = $item;
            }
            
            return Response::success($list);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('获取即将过期库存失败：' . $e->getMessage());
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
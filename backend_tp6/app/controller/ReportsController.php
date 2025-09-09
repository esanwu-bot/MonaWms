<?php

namespace app\controller;

use app\BaseController;
use app\model\Warehouse;
use app\model\Product;
use app\model\Inventory;
use app\model\InboundOrder;
use app\model\OutboundOrder;
use app\model\InventoryTransaction;
use app\common\library\Response;
use think\Request;
use think\facade\Db;

/**
 * 报表管理控制器
 */
class ReportsController extends BaseController
{
    /**
     * 仪表盘数据
     */
    public function dashboard(Request $request)
    {
        try {
            // 返回模拟数据进行测试
            $data = [
                'stats' => [
                    'total_warehouses' => 5,
                    'total_products' => 150,
                    'total_inventory' => 2500,
                    'low_stock_count' => 12,
                    'pending_inbound' => 8,
                    'pending_outbound' => 15
                ],
                'daily_orders' => [
                    'inbound_orders' => 3,
                    'outbound_orders' => 7,
                    'completed_inbound' => 2,
                    'completed_outbound' => 5
                ],
                'monthly_trends' => [
                    ['month' => '2024-08', 'inbound' => 45, 'outbound' => 67],
                    ['month' => '2024-09', 'inbound' => 52, 'outbound' => 73],
                    ['month' => '2024-10', 'inbound' => 48, 'outbound' => 69],
                    ['month' => '2024-11', 'inbound' => 55, 'outbound' => 81],
                    ['month' => '2024-12', 'inbound' => 61, 'outbound' => 89],
                    ['month' => '2025-01', 'inbound' => 58, 'outbound' => 76]
                ],
                'low_stock_products' => [],
                'popular_products' => [],
                'warehouse_utilization' => [],
                'recent_transactions' => []
            ];
            
            return Response::success($data, '获取仪表盘数据成功');
            
        } catch (\Exception $e) {
            return Response::error('获取仪表盘数据失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 获取月度趋势数据
     */
    private function getMonthlyTrend()
    {
        $trend = [];
        
        // 获取最近30天的数据
        for ($i = 29; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-{$i} days"));
            
            $inboundCount = InboundOrder::whereTime('created_at', $date)->count();
            $outboundCount = OutboundOrder::whereTime('created_at', $date)->count();
            
            $trend[] = [
                'date' => $date,
                'inbound' => $inboundCount,
                'outbound' => $outboundCount,
            ];
        }
        
        return $trend;
    }
    
    /**
     * 获取热门产品
     */
    private function getPopularProducts()
    {
        // 基于出库数量统计热门产品
        $popularProducts = Db::table('outbound_order_items')
            ->alias('ooi')
            ->join('products p', 'ooi.product_id = p.id')
            ->join('outbound_orders oo', 'ooi.outbound_order_id = oo.id')
            ->where('oo.created_at', '>=', date('Y-m-d', strtotime('-30 days')))
            ->field('p.id, p.name, p.sku, SUM(ooi.quantity) as total_quantity')
            ->group('p.id')
            ->order('total_quantity', 'desc')
            ->limit(10)
            ->select()
            ->toArray();
            
        return $popularProducts;
    }
    
    /**
     * 获取仓库利用率
     */
    private function getWarehouseUtilization()
    {
        $warehouses = Warehouse::field('id, name, total_capacity')
            ->select()
            ->toArray();
            
        $utilization = [];
        
        foreach ($warehouses as $warehouse) {
            $usedCapacity = Inventory::where('warehouse_id', $warehouse['id'])
                ->sum('quantity');
                
            $utilizationRate = $warehouse['total_capacity'] > 0 
                ? round(($usedCapacity / $warehouse['total_capacity']) * 100, 2)
                : 0;
                
            $utilization[] = [
                'warehouse_id' => $warehouse['id'],
                'warehouse_name' => $warehouse['name'],
                'total_capacity' => $warehouse['total_capacity'],
                'used_capacity' => $usedCapacity,
                'utilization_rate' => $utilizationRate,
            ];
        }
        
        return $utilization;
    }
    
    /**
     * 库存报表
     */
    public function inventory(Request $request)
    {
        try {
            $params = $request->get();
            
            // 库存总览
            $overview = [
                'total_products' => Product::count(),
                'total_inventory' => Inventory::sum('quantity'),
                'total_value' => Db::table('inventory')
                    ->alias('i')
                    ->join('products p', 'i.product_id = p.id')
                    ->sum('i.quantity * p.cost_price'),
                'low_stock_count' => Product::where('stock_quantity', '<=', Db::raw('min_stock_level'))->count(),
            ];
            
            // 按仓库分组的库存
            $warehouseInventory = Db::table('inventory')
                ->alias('i')
                ->join('warehouses w', 'i.warehouse_id = w.id')
                ->field('w.name as warehouse_name, COUNT(*) as product_count, SUM(i.quantity) as total_quantity')
                ->group('w.id')
                ->select()
                ->toArray();
            
            // 按分类分组的库存
            $categoryInventory = Db::table('inventory')
                ->alias('i')
                ->join('products p', 'i.product_id = p.id')
                ->join('categories c', 'p.category_id = c.id')
                ->field('c.name as category_name, COUNT(*) as product_count, SUM(i.quantity) as total_quantity')
                ->group('c.id')
                ->select()
                ->toArray();
            
            $data = [
                'overview' => $overview,
                'warehouse_inventory' => $warehouseInventory,
                'category_inventory' => $categoryInventory,
            ];
            
            return Response::success($data, '获取库存报表成功');
            
        } catch (\Exception $e) {
            return Response::error('获取库存报表失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 订单报表
     */
    public function orders(Request $request)
    {
        try {
            $params = $request->get();
            $startDate = $params['start_date'] ?? date('Y-m-01');
            $endDate = $params['end_date'] ?? date('Y-m-d');
            
            // 入库订单统计
            $inboundStats = [
                'total' => InboundOrder::whereBetweenTime('created_at', $startDate, $endDate)->count(),
                'pending' => InboundOrder::whereBetweenTime('created_at', $startDate, $endDate)
                    ->where('status', 'pending')->count(),
                'receiving' => InboundOrder::whereBetweenTime('created_at', $startDate, $endDate)
                    ->where('status', 'receiving')->count(),
                'completed' => InboundOrder::whereBetweenTime('created_at', $startDate, $endDate)
                    ->where('status', 'completed')->count(),
            ];
            
            // 出库订单统计
            $outboundStats = [
                'total' => OutboundOrder::whereBetweenTime('created_at', $startDate, $endDate)->count(),
                'pending' => OutboundOrder::whereBetweenTime('created_at', $startDate, $endDate)
                    ->where('status', 'pending')->count(),
                'picking' => OutboundOrder::whereBetweenTime('created_at', $startDate, $endDate)
                    ->where('status', 'picking')->count(),
                'shipped' => OutboundOrder::whereBetweenTime('created_at', $startDate, $endDate)
                    ->where('status', 'shipped')->count(),
                'delivered' => OutboundOrder::whereBetweenTime('created_at', $startDate, $endDate)
                    ->where('status', 'delivered')->count(),
            ];
            
            $data = [
                'inbound_stats' => $inboundStats,
                'outbound_stats' => $outboundStats,
                'date_range' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                ],
            ];
            
            return Response::success($data, '获取订单报表成功');
            
        } catch (\Exception $e) {
            return Response::error('获取订单报表失败: ' . $e->getMessage());
        }
    }
}
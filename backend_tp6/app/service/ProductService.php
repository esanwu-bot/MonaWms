<?php

namespace app\service;

use app\model\Product;
use app\model\Category;
use app\model\Inventory;
use app\model\InventoryTransaction;
use app\model\InboundOrderItem;
use app\model\OutboundOrderItem;
use think\exception\ValidateException;
use think\db\exception\DataNotFoundException;
use think\db\exception\ModelNotFoundException;

/**
 * 产品服务类
 */
class ProductService
{
    /**
     * 获取产品列表
     * @param array $params 查询参数
     * @return array
     */
    public function getList(array $params = []): array
    {
        $query = Product::with(['category']);

        // 搜索条件
        if (!empty($params['keyword'])) {
            $query->where(function($q) use ($params) {
                $q->whereLike('name', '%' . $params['keyword'] . '%')
                  ->whereOr('sku', '%' . $params['keyword'] . '%')
                  ->whereOr('barcode', '%' . $params['keyword'] . '%')
                  ->whereOr('description', '%' . $params['keyword'] . '%');
            });
        }

        if (!empty($params['sku'])) {
            $query->where('sku', $params['sku']);
        }

        if (!empty($params['barcode'])) {
            $query->where('barcode', $params['barcode']);
        }

        if (isset($params['category_id'])) {
            $query->where('category_id', $params['category_id']);
        }

        if (isset($params['status'])) {
            $query->where('status', $params['status']);
        }

        // 库存状态筛选
        if (!empty($params['stock_status'])) {
            switch ($params['stock_status']) {
                case 'low':
                    $query->whereRaw('(SELECT COALESCE(SUM(quantity), 0) FROM inventory WHERE product_id = product.id) <= min_stock');
                    break;
                case 'over':
                    $query->whereRaw('(SELECT COALESCE(SUM(quantity), 0) FROM inventory WHERE product_id = product.id) >= max_stock');
                    break;
                case 'normal':
                    $query->whereRaw('(SELECT COALESCE(SUM(quantity), 0) FROM inventory WHERE product_id = product.id) > min_stock')
                          ->whereRaw('(SELECT COALESCE(SUM(quantity), 0) FROM inventory WHERE product_id = product.id) < max_stock');
                    break;
                case 'zero':
                    $query->whereRaw('(SELECT COALESCE(SUM(quantity), 0) FROM inventory WHERE product_id = product.id) = 0');
                    break;
            }
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

        // 添加库存信息
        $items = $result->items();
        foreach ($items as &$item) {
            $item['stock_info'] = $this->getStockInfo($item['id']);
        }

        return [
            'list' => $items,
            'total' => $result->total(),
            'page' => $page,
            'limit' => $limit
        ];
    }

    /**
     * 获取产品详情
     * @param int $id 产品ID
     * @return Product
     * @throws ValidateException
     */
    public function getDetail(int $id): Product
    {
        try {
            $product = Product::with(['category'])->find($id);
            if (!$product) {
                throw new ValidateException('产品不存在');
            }
            
            // 添加库存信息
            $product['stock_info'] = $this->getStockInfo($id);
            
            return $product;
        } catch (DataNotFoundException|ModelNotFoundException $e) {
            throw new ValidateException('产品不存在');
        }
    }

    /**
     * 创建产品
     * @param array $data 产品数据
     * @return Product
     * @throws ValidateException
     */
    public function create(array $data): Product
    {
        // 检查SKU是否已存在
        if (Product::where('sku', $data['sku'])->find()) {
            throw new ValidateException('SKU已存在');
        }

        // 检查条形码是否已存在
        if (!empty($data['barcode']) && Product::where('barcode', $data['barcode'])->find()) {
            throw new ValidateException('条形码已存在');
        }

        // 检查分类是否存在
        if (isset($data['category_id']) && !Category::find($data['category_id'])) {
            throw new ValidateException('分类不存在');
        }

        $data['created_time'] = date('Y-m-d H:i:s');
        $data['status'] = $data['status'] ?? 1;

        return Product::create($data);
    }

    /**
     * 更新产品
     * @param int $id 产品ID
     * @param array $data 更新数据
     * @return Product
     * @throws ValidateException
     */
    public function update(int $id, array $data): Product
    {
        $product = $this->getDetail($id);

        // 检查SKU是否已存在（排除当前产品）
        if (isset($data['sku']) && $data['sku'] !== $product->sku) {
            if (Product::where('sku', $data['sku'])->where('id', '<>', $id)->find()) {
                throw new ValidateException('SKU已存在');
            }
        }

        // 检查条形码是否已存在（排除当前产品）
        if (isset($data['barcode']) && $data['barcode'] !== $product->barcode) {
            if (!empty($data['barcode']) && Product::where('barcode', $data['barcode'])->where('id', '<>', $id)->find()) {
                throw new ValidateException('条形码已存在');
            }
        }

        // 检查分类是否存在
        if (isset($data['category_id']) && !Category::find($data['category_id'])) {
            throw new ValidateException('分类不存在');
        }

        $data['updated_time'] = date('Y-m-d H:i:s');
        $product->save($data);
        
        return $product;
    }

    /**
     * 删除产品
     * @param int $id 产品ID
     * @return bool
     * @throws ValidateException
     */
    public function delete(int $id): bool
    {
        $product = $this->getDetail($id);

        // 检查是否可以删除
        if (!$this->canDelete($product)) {
            throw new ValidateException('产品存在关联数据，无法删除');
        }

        return $product->delete();
    }

    /**
     * 检查产品是否可以删除
     * @param Product $product 产品对象
     * @return bool
     */
    private function canDelete(Product $product): bool
    {
        // 检查是否有库存
        if (Inventory::where('product_id', $product->id)->where('quantity', '>', 0)->count() > 0) {
            return false;
        }

        // 检查是否有库存事务记录
        if (InventoryTransaction::where('product_id', $product->id)->count() > 0) {
            return false;
        }

        // 检查是否有入库单明细
        if (InboundOrderItem::where('product_id', $product->id)->count() > 0) {
            return false;
        }

        // 检查是否有出库单明细
        if (OutboundOrderItem::where('product_id', $product->id)->count() > 0) {
            return false;
        }

        return true;
    }

    /**
     * 根据SKU查找产品
     * @param string $sku SKU
     * @return Product|null
     */
    public function findBySku(string $sku): ?Product
    {
        $product = Product::with(['category'])->where('sku', $sku)->find();
        if ($product) {
            $product['stock_info'] = $this->getStockInfo($product->id);
        }
        return $product;
    }

    /**
     * 根据条形码查找产品
     * @param string $barcode 条形码
     * @return Product|null
     */
    public function findByBarcode(string $barcode): ?Product
    {
        $product = Product::with(['category'])->where('barcode', $barcode)->find();
        if ($product) {
            $product['stock_info'] = $this->getStockInfo($product->id);
        }
        return $product;
    }

    /**
     * 获取产品库存信息
     * @param int $productId 产品ID
     * @return array
     */
    public function getStockInfo(int $productId): array
    {
        $product = Product::find($productId);
        if (!$product) {
            return [];
        }

        // 总库存
        $totalStock = Inventory::where('product_id', $productId)->sum('quantity');
        
        // 可用库存
        $availableStock = Inventory::where('product_id', $productId)
            ->sum('quantity - reserved_quantity');
        
        // 预留库存
        $reservedStock = Inventory::where('product_id', $productId)->sum('reserved_quantity');

        // 库存状态
        $stockStatus = 'normal';
        if ($totalStock == 0) {
            $stockStatus = 'zero';
        } elseif ($totalStock <= $product->min_stock) {
            $stockStatus = 'low';
        } elseif ($totalStock >= $product->max_stock) {
            $stockStatus = 'over';
        }

        return [
            'total_stock' => $totalStock,
            'available_stock' => max(0, $availableStock),
            'reserved_stock' => $reservedStock,
            'min_stock' => $product->min_stock,
            'max_stock' => $product->max_stock,
            'stock_status' => $stockStatus,
            'stock_status_text' => $this->getStockStatusText($stockStatus)
        ];
    }

    /**
     * 获取库存状态文本
     * @param string $status 库存状态
     * @return string
     */
    private function getStockStatusText(string $status): string
    {
        $statusMap = [
            'zero' => '零库存',
            'low' => '库存不足',
            'normal' => '库存正常',
            'over' => '库存过多'
        ];
        
        return $statusMap[$status] ?? '未知';
    }

    /**
     * 获取产品选项列表
     * @param bool $onlyActive 是否只返回启用的产品
     * @return array
     */
    public function getOptions(bool $onlyActive = true): array
    {
        $query = Product::field('id, sku, name, unit');
        
        if ($onlyActive) {
            $query->where('status', 1);
        }
        
        return $query->order('sku')->select()->toArray();
    }

    /**
     * 启用/禁用产品
     * @param int $id 产品ID
     * @param int $status 状态（1启用，0禁用）
     * @return bool
     * @throws ValidateException
     */
    public function changeStatus(int $id, int $status): bool
    {
        $product = $this->getDetail($id);
        
        $product->status = $status;
        $product->updated_time = date('Y-m-d H:i:s');
        
        return $product->save();
    }

    /**
     * 批量导入产品
     * @param array $products 产品数据数组
     * @return array
     */
    public function batchImport(array $products): array
    {
        $successCount = 0;
        $failCount = 0;
        $errors = [];

        foreach ($products as $index => $productData) {
            try {
                $this->create($productData);
                $successCount++;
            } catch (ValidateException $e) {
                $failCount++;
                $errors[] = [
                    'row' => $index + 1,
                    'sku' => $productData['sku'] ?? '',
                    'error' => $e->getMessage()
                ];
            }
        }

        return [
            'success_count' => $successCount,
            'fail_count' => $failCount,
            'errors' => $errors
        ];
    }

    /**
     * 获取低库存产品列表
     * @param int $limit 限制数量
     * @return array
     */
    public function getLowStockProducts(int $limit = 50): array
    {
        return Product::alias('p')
            ->field('p.*, (SELECT COALESCE(SUM(quantity), 0) FROM inventory WHERE product_id = p.id) as total_stock')
            ->whereRaw('(SELECT COALESCE(SUM(quantity), 0) FROM inventory WHERE product_id = p.id) <= p.min_stock')
            ->where('p.status', 1)
            ->order('total_stock', 'asc')
            ->limit($limit)
            ->select()
            ->toArray();
    }

    /**
     * 获取零库存产品列表
     * @param int $limit 限制数量
     * @return array
     */
    public function getZeroStockProducts(int $limit = 50): array
    {
        return Product::alias('p')
            ->field('p.*')
            ->whereRaw('(SELECT COALESCE(SUM(quantity), 0) FROM inventory WHERE product_id = p.id) = 0')
            ->where('p.status', 1)
            ->order('p.updated_time', 'desc')
            ->limit($limit)
            ->select()
            ->toArray();
    }

    /**
     * 获取产品统计信息
     * @return array
     */
    public function getStatistics(): array
    {
        // 产品总数
        $totalProducts = Product::count();
        
        // 启用产品数
        $activeProducts = Product::where('status', 1)->count();
        
        // 低库存产品数
        $lowStockProducts = Product::whereRaw('(SELECT COALESCE(SUM(quantity), 0) FROM inventory WHERE product_id = product.id) <= min_stock')
            ->where('status', 1)->count();
        
        // 零库存产品数
        $zeroStockProducts = Product::whereRaw('(SELECT COALESCE(SUM(quantity), 0) FROM inventory WHERE product_id = product.id) = 0')
            ->where('status', 1)->count();
        
        // 分类统计
        $categoryStats = Product::alias('p')
            ->join('category c', 'p.category_id = c.id', 'left')
            ->field('c.name as category_name, COUNT(p.id) as product_count')
            ->group('p.category_id')
            ->select()
            ->toArray();

        return [
            'total_products' => $totalProducts,
            'active_products' => $activeProducts,
            'inactive_products' => $totalProducts - $activeProducts,
            'low_stock_products' => $lowStockProducts,
            'zero_stock_products' => $zeroStockProducts,
            'category_stats' => $categoryStats
        ];
    }
}
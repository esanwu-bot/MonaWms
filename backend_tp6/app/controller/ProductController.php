<?php

namespace app\controller;

use app\BaseController;
use app\model\Product;
use app\model\Category;
use app\common\library\Response;
use think\Request;
use think\facade\Validate;

/**
 * 商品管理控制器
 */
class ProductController extends BaseController
{
    /**
     * 获取商品列表
     */
    public function index(Request $request)
    {
        try {
            $params = $request->get();
            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 15;
            
            $query = Product::with(['category']);
            
            // 搜索条件
            if (!empty($params['sku'])) {
                $query->searchSku($params['sku']);
            }
            
            if (!empty($params['name'])) {
                $query->searchName($params['name']);
            }
            
            if (!empty($params['barcode'])) {
                $query->searchBarcode($params['barcode']);
            }
            
            if (!empty($params['category_id'])) {
                $query->searchCategoryId($params['category_id']);
            }
            
            if (!empty($params['status'])) {
                $query->searchStatus($params['status']);
            }
            
            // 分页查询
            $result = $query->order('created_at', 'desc')
                          ->paginate([
                              'list_rows' => $limit,
                              'page' => $page
                          ]);
            
            $list = [];
            foreach ($result->items() as $product) {
                $item = $product->toArray();
                $item['status_text'] = $product->status_text;
                $item['category_name'] = $product->category->name ?? '';
                $item['volume'] = $product->getVolume();
                $item['total_stock'] = $product->getTotalStock();
                $item['available_stock'] = $product->getAvailableStock();
                $item['stock_status'] = $product->getStockStatus();
                $item['stock_status_text'] = $product->stock_status_text;
                $list[] = $item;
            }
            
            return Response::paginate($list, $result->total(), $page, $limit);
            
        } catch (\Exception $e) {
            return Response::serverError('获取商品列表失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取商品详情
     */
    public function read(Request $request, $id)
    {
        try {
            $product = Product::with(['category'])->find($id);
            
            if (!$product) {
                return Response::notFound('商品不存在');
            }
            
            $data = $product->getDetailInfo();
            
            return Response::success($data);
            
        } catch (\Exception $e) {
            return Response::serverError('获取商品详情失败：' . $e->getMessage());
        }
    }
    
    /**
     * 创建商品
     */
    public function save(Request $request)
    {
        $data = $request->post();
        
        // 验证参数
        $validate = Validate::rule([
            'sku' => 'require|max:50|unique:products',
            'name' => 'require|max:100',
            'description' => 'max:500',
            'device_type' => 'max:50',
            'model_number' => 'max:100',
            'frequency_protocol' => 'max:100',
            'firmware_version' => 'max:50',
            'category_id' => 'require|integer',
            'barcode' => 'max:50|unique:products',
            'price' => 'float|>=:0',
            'unit' => 'max:20',
            'weight' => 'float|>=:0',
            'length' => 'float|>=:0',
            'width' => 'float|>=:0',
            'height' => 'float|>=:0',
            'min_stock' => 'integer|>=:0',
            'max_stock' => 'integer|>=:0',
            'project_id' => 'integer',
            'status' => 'in:active,inactive'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            // 验证分类是否存在
            $category = Category::find($data['category_id']);
            if (!$category) {
                return Response::error('指定的分类不存在');
            }
            
            // 验证库存上下限
            if (isset($data['min_stock']) && isset($data['max_stock'])) {
                if ($data['min_stock'] > $data['max_stock']) {
                    return Response::error('最小库存不能大于最大库存');
                }
            }
            
            $product = new Product();
            $product->sku = $data['sku'];
            $product->name = $data['name'];
            $product->description = $data['description'] ?? '';
            $product->device_type = $data['device_type'] ?? '';
            $product->model_number = $data['model_number'] ?? '';
            $product->frequency_protocol = $data['frequency_protocol'] ?? '';
            $product->firmware_version = $data['firmware_version'] ?? '';
            $product->category_id = $data['category_id'];
            $product->barcode = $data['barcode'] ?? '';
            $product->price = $data['price'] ?? 0;
            $product->unit = $data['unit'] ?? '个';
            $product->weight = $data['weight'] ?? 0;
            $product->length = $data['length'] ?? 0;
            $product->width = $data['width'] ?? 0;
            $product->height = $data['height'] ?? 0;
            $product->min_stock = $data['min_stock'] ?? 0;
            $product->max_stock = $data['max_stock'] ?? 0;
            $product->project_id = $data['project_id'] ?? null;
            $product->status = $data['status'] ?? Product::STATUS_ACTIVE;
            $product->save();
            
            return Response::success([
                'id' => $product->id,
                'sku' => $product->sku,
                'name' => $product->name,
                'category_id' => $product->category_id,
                'status' => $product->status,
                'status_text' => $product->status_text
            ], '商品创建成功');
            
        } catch (\Exception $e) {
            return Response::serverError('创建商品失败：' . $e->getMessage());
        }
    }
    
    /**
     * 更新商品
     */
    public function update(Request $request, $id)
    {
        $data = $request->put();
        
        // 验证参数
        $validate = Validate::rule([
            'sku' => 'max:50|unique:products,sku,' . $id,
            'name' => 'max:100',
            'description' => 'max:500',
            'device_type' => 'max:50',
            'model_number' => 'max:100',
            'frequency_protocol' => 'max:100',
            'firmware_version' => 'max:50',
            'category_id' => 'integer',
            'barcode' => 'max:50|unique:products,barcode,' . $id,
            'price' => 'float|>=:0',
            'unit' => 'max:20',
            'weight' => 'float|>=:0',
            'length' => 'float|>=:0',
            'width' => 'float|>=:0',
            'height' => 'float|>=:0',
            'min_stock' => 'integer|>=:0',
            'max_stock' => 'integer|>=:0',
            'project_id' => 'integer',
            'status' => 'in:active,inactive'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            $product = Product::find($id);
            
            if (!$product) {
                return Response::notFound('商品不存在');
            }
            
            // 验证分类是否存在
            if (!empty($data['category_id'])) {
                $category = Category::find($data['category_id']);
                if (!$category) {
                    return Response::error('指定的分类不存在');
                }
            }
            
            // 验证库存上下限
            $minStock = $data['min_stock'] ?? $product->min_stock;
            $maxStock = $data['max_stock'] ?? $product->max_stock;
            if ($minStock > $maxStock) {
                return Response::error('最小库存不能大于最大库存');
            }
            
            // 更新字段
            $updateFields = [
                'sku', 'name', 'description', 'category_id', 'barcode',
                'price', 'unit', 'weight', 'length', 'width', 'height',
                'min_stock', 'max_stock', 'status', 'device_type', 'model_number',
                'frequency_protocol', 'firmware_version', 'project_id'
            ];
            
            foreach ($updateFields as $field) {
                if (isset($data[$field])) {
                    $product->$field = $data[$field];
                }
            }
            
            $product->save();
            
            return Response::success([
                'id' => $product->id,
                'sku' => $product->sku,
                'name' => $product->name,
                'category_id' => $product->category_id,
                'status' => $product->status,
                'status_text' => $product->status_text
            ], '商品更新成功');
            
        } catch (\Exception $e) {
            return Response::serverError('更新商品失败：' . $e->getMessage());
        }
    }
    
    /**
     * 删除商品
     */
    public function delete(Request $request, $id)
    {
        try {
            $product = Product::find($id);
            
            if (!$product) {
                return Response::notFound('商品不存在');
            }
            
            // 检查是否有库存
            if ($product->getTotalStock() > 0) {
                return Response::error('商品存在库存，无法删除');
            }
            
            // 检查是否有相关订单
            if ($product->inboundOrderItems()->count() > 0 || $product->outboundOrderItems()->count() > 0) {
                return Response::error('商品存在相关订单，无法删除');
            }
            
            $product->delete();
            
            return Response::success([], '商品删除成功');
            
        } catch (\Exception $e) {
            return Response::serverError('删除商品失败：' . $e->getMessage());
        }
    }
    
    /**
     * 根据SKU查找商品
     */
    public function findBySku(Request $request)
    {
        $sku = $request->get('sku');
        
        if (empty($sku)) {
            return Response::error('SKU不能为空');
        }
        
        try {
            $product = Product::findBySku($sku);
            
            if (!$product) {
                return Response::notFound('商品不存在');
            }
            
            $data = $product->getDetailInfo();
            
            return Response::success($data);
            
        } catch (\Exception $e) {
            return Response::serverError('查找商品失败：' . $e->getMessage());
        }
    }
    
    /**
     * 根据条码查找商品
     */
    public function findByBarcode(Request $request)
    {
        $barcode = $request->get('barcode');
        
        if (empty($barcode)) {
            return Response::error('条码不能为空');
        }
        
        try {
            $product = Product::findByBarcode($barcode);
            
            if (!$product) {
                return Response::notFound('商品不存在');
            }
            
            $data = $product->getDetailInfo();
            
            return Response::success($data);
            
        } catch (\Exception $e) {
            return Response::serverError('查找商品失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取商品库存信息
     */
    public function stock(Request $request, $id)
    {
        try {
            $product = Product::find($id);
            
            if (!$product) {
                return Response::notFound('商品不存在');
            }
            
            $stockInfo = [
                'product_id' => $product->id,
                'sku' => $product->sku,
                'name' => $product->name,
                'total_stock' => $product->getTotalStock(),
                'available_stock' => $product->getAvailableStock(),
                'min_stock' => $product->min_stock,
                'max_stock' => $product->max_stock,
                'stock_status' => $product->getStockStatus(),
                'stock_status_text' => $product->getStockStatusText(),
                'is_low_stock' => $product->isLowStock(),
                'is_over_stock' => $product->isOverStock()
            ];
            
            return Response::success($stockInfo);
            
        } catch (\Exception $e) {
            return Response::serverError('获取库存信息失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取商品选项列表（用于下拉选择）
     */
    public function options(Request $request)
    {
        try {
            $products = Product::where('status', Product::STATUS_ACTIVE)
                             ->field('id,sku,name')
                             ->order('sku')
                             ->select();
            
            $options = [];
            foreach ($products as $product) {
                $options[] = [
                    'value' => $product->id,
                    'label' => $product->sku . ' - ' . $product->name
                ];
            }
            
            return Response::success($options);
            
        } catch (\Exception $e) {
            return Response::serverError('获取商品选项失败：' . $e->getMessage());
        }
    }
}
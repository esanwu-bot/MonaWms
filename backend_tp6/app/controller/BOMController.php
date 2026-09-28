<?php

namespace app\controller;

use app\BaseController;
use app\model\BOMHeader;
use app\model\BOMItem;
use app\model\Product;
use app\common\library\Response;
use think\Request;
use think\facade\Validate;
use think\facade\Db;

/**
 * BOM物料清单管理控制器
 */
class BOMController extends BaseController
{
    /**
     * 获取BOM列表
     */
    public function index(Request $request)
    {
        try {
            $params = $request->get();
            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 15;
            
            $query = BOMHeader::with(['product']);
            
            // 搜索条件
            if (!empty($params['bom_code'])) {
                $query->where('bom_code', 'like', '%' . $params['bom_code'] . '%');
            }
            
            if (!empty($params['product_id'])) {
                $query->where('product_id', $params['product_id']);
            }
            
            if (!empty($params['status'])) {
                $query->where('status', $params['status']);
            }
            
            // 分页查询
            $result = $query->order('created_at', 'desc')
                          ->paginate([
                              'list_rows' => $limit,
                              'page' => $page
                          ]);
            
            $list = [];
            foreach ($result->items() as $bom) {
                $item = $bom->toArray();
                $item['status_text'] = $bom->status_text;
                $item['product_name'] = $bom->product->name ?? '';
                $item['product_sku'] = $bom->product->sku ?? '';
                $list[] = $item;
            }
            
            return Response::paginate($list, $result->total(), $page, $limit);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('获取BOM列表失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取BOM详情
     */
    public function read(Request $request, $id)
    {
        try {
            $bom = BOMHeader::with(['product', 'items.product'])->find($id);
            
            if (!$bom) {
                return Response::notFound('BOM不存在');
            }
            
            $data = $bom->toArray();
            $data['status_text'] = $bom->status_text;
            
            // 处理BOM明细
            $items = [];
            foreach ($bom->items as $item) {
                $itemData = $item->toArray();
                $itemData['product_name'] = $item->product->name ?? '';
                $itemData['product_sku'] = $item->product->sku ?? '';
                $itemData['product_unit'] = $item->product->unit ?? '';
                $items[] = $itemData;
            }
            $data['items'] = $items;
            
            return Response::success($data);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('获取BOM详情失败：' . $e->getMessage());
        }
    }
    
    /**
     * 创建BOM
     */
    public function save(Request $request)
    {
        $data = $request->post();
        
        // 验证参数
        $validate = Validate::rule([
            'bom_code' => 'require|max:50|unique:bom_headers',
            'product_id' => 'require|integer',
            'version' => 'require|max:20',
            'description' => 'max:500',
            'items' => 'require|array'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        // 验证BOM明细
        if (empty($data['items'])) {
            return Response::error('BOM明细不能为空');
        }
        
        foreach ($data['items'] as $item) {
            if (empty($item['product_id']) || empty($item['quantity'])) {
                return Response::error('BOM明细中产品ID和数量为必填项');
            }
        }
        
        try {
            // 验证产品是否存在
            $product = Product::find($data['product_id']);
            if (!$product) {
                return Response::error('指定的产品不存在');
            }
            
            // 开启事务
            Db::startTrans();
            
            // 创建BOM头
            $bomHeader = new BOMHeader();
            $bomHeader->bom_code = $data['bom_code'];
            $bomHeader->product_id = $data['product_id'];
            $bomHeader->version = $data['version'];
            $bomHeader->description = $data['description'] ?? '';
            $bomHeader->status = $data['status'] ?? BOMHeader::STATUS_ACTIVE;
            $bomHeader->save();
            
            // 创建BOM明细
            foreach ($data['items'] as $item) {
                // 验证明细产品是否存在
                $itemProduct = Product::find($item['product_id']);
                if (!$itemProduct) {
                    throw new \Exception('BOM明细中的产品ID ' . $item['product_id'] . ' 不存在');
                }
                
                $bomItem = new BOMItem();
                $bomItem->bom_header_id = $bomHeader->id;
                $bomItem->product_id = $item['product_id'];
                $bomItem->quantity = $item['quantity'];
                $bomItem->unit = $item['unit'] ?? $itemProduct->unit;
                $bomItem->notes = $item['notes'] ?? '';
                $bomItem->save();
            }
            
            // 提交事务
            Db::commit();
            
            return Response::success([
                'id' => $bomHeader->id,
                'bom_code' => $bomHeader->bom_code,
                'product_id' => $bomHeader->product_id,
                'version' => $bomHeader->version,
                'status' => $bomHeader->status,
                'status_text' => $bomHeader->status_text
            ], 'BOM创建成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            Db::rollback();
            return Response::serverError('创建BOM失败：' . $e->getMessage());
        }
    }
    
    /**
     * 更新BOM
     */
    public function update(Request $request, $id)
    {
        $data = $request->put();
        
        // 验证参数
        $validate = Validate::rule([
            'bom_code' => 'max:50|unique:bom_headers,bom_code,' . $id,
            'product_id' => 'integer',
            'version' => 'max:20',
            'description' => 'max:500',
            'status' => 'in:active,inactive'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            $bomHeader = BOMHeader::find($id);
            
            if (!$bomHeader) {
                return Response::notFound('BOM不存在');
            }
            
            // 验证产品是否存在
            if (!empty($data['product_id'])) {
                $product = Product::find($data['product_id']);
                if (!$product) {
                    return Response::error('指定的产品不存在');
                }
            }
            
            // 开启事务
            Db::startTrans();
            
            // 更新BOM头
            if (isset($data['bom_code'])) {
                $bomHeader->bom_code = $data['bom_code'];
            }
            if (isset($data['product_id'])) {
                $bomHeader->product_id = $data['product_id'];
            }
            if (isset($data['version'])) {
                $bomHeader->version = $data['version'];
            }
            if (isset($data['description'])) {
                $bomHeader->description = $data['description'];
            }
            if (isset($data['status'])) {
                $bomHeader->status = $data['status'];
            }
            $bomHeader->save();
            
            // 更新BOM明细
            if (isset($data['items']) && is_array($data['items'])) {
                // 删除原有明细
                BOMItem::where('bom_header_id', $id)->delete();
                
                // 创建新明细
                foreach ($data['items'] as $item) {
                    if (empty($item['product_id']) || empty($item['quantity'])) {
                        throw new \Exception('BOM明细中产品ID和数量为必填项');
                    }
                    
                    // 验证明细产品是否存在
                    $itemProduct = Product::find($item['product_id']);
                    if (!$itemProduct) {
                        throw new \Exception('BOM明细中的产品ID ' . $item['product_id'] . ' 不存在');
                    }
                    
                    $bomItem = new BOMItem();
                    $bomItem->bom_header_id = $bomHeader->id;
                    $bomItem->product_id = $item['product_id'];
                    $bomItem->quantity = $item['quantity'];
                    $bomItem->unit = $item['unit'] ?? $itemProduct->unit;
                    $bomItem->notes = $item['notes'] ?? '';
                    $bomItem->save();
                }
            }
            
            // 提交事务
            Db::commit();
            
            return Response::success([
                'id' => $bomHeader->id,
                'bom_code' => $bomHeader->bom_code,
                'product_id' => $bomHeader->product_id,
                'version' => $bomHeader->version,
                'status' => $bomHeader->status,
                'status_text' => $bomHeader->status_text
            ], 'BOM更新成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            Db::rollback();
            return Response::serverError('更新BOM失败：' . $e->getMessage());
        }
    }
    
    /**
     * 删除BOM
     */
    public function delete(Request $request, $id)
    {
        try {
            $bomHeader = BOMHeader::find($id);
            
            if (!$bomHeader) {
                return Response::notFound('BOM不存在');
            }
            
            // 开启事务
            Db::startTrans();
            
            // 删除BOM明细
            BOMItem::where('bom_header_id', $id)->delete();
            
            // 删除BOM头
            $bomHeader->delete();
            
            // 提交事务
            Db::commit();
            
            return Response::success([], 'BOM删除成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            Db::rollback();
            return Response::serverError('删除BOM失败：' . $e->getMessage());
        }
    }
    
    /**
     * 复制BOM
     */
    public function copy(Request $request, $id)
    {
        try {
            $bomHeader = BOMHeader::with(['items'])->find($id);
            
            if (!$bomHeader) {
                return Response::notFound('BOM不存在');
            }
            
            $data = $request->post();
            $newBomCode = $data['bom_code'] ?? $bomHeader->bom_code . '_COPY';
            $newVersion = $data['version'] ?? $bomHeader->version . '_COPY';
            
            // 检查新BOM编码是否已存在
            $exists = BOMHeader::where('bom_code', $newBomCode)->find();
            if ($exists) {
                return Response::error('BOM编码已存在');
            }
            
            // 开启事务
            Db::startTrans();
            
            // 复制BOM头
            $newBomHeader = new BOMHeader();
            $newBomHeader->bom_code = $newBomCode;
            $newBomHeader->product_id = $bomHeader->product_id;
            $newBomHeader->version = $newVersion;
            $newBomHeader->description = $bomHeader->description;
            $newBomHeader->status = BOMHeader::STATUS_INACTIVE; // 复制的BOM默认为非激活状态
            $newBomHeader->save();
            
            // 复制BOM明细
            foreach ($bomHeader->items as $item) {
                $newBomItem = new BOMItem();
                $newBomItem->bom_header_id = $newBomHeader->id;
                $newBomItem->product_id = $item->product_id;
                $newBomItem->quantity = $item->quantity;
                $newBomItem->unit = $item->unit;
                $newBomItem->notes = $item->notes;
                $newBomItem->save();
            }
            
            // 提交事务
            Db::commit();
            
            return Response::success([
                'id' => $newBomHeader->id,
                'bom_code' => $newBomHeader->bom_code,
                'product_id' => $newBomHeader->product_id,
                'version' => $newBomHeader->version,
                'status' => $newBomHeader->status,
                'status_text' => $newBomHeader->status_text
            ], 'BOM复制成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            Db::rollback();
            return Response::serverError('复制BOM失败：' . $e->getMessage());
        }
    }
    
    /**
     * 展开BOM（获取完整的物料需求）
     */
    public function explode(Request $request, $id)
    {
        try {
            $bomHeader = BOMHeader::with(['items.product'])->find($id);
            
            if (!$bomHeader) {
                return Response::notFound('BOM不存在');
            }
            
            $quantity = $request->get('quantity', 1); // 生产数量，默认为1
            
            $explodedItems = [];
            
            foreach ($bomHeader->items as $item) {
                $totalQuantity = $item->quantity * $quantity;
                
                $explodedItems[] = [
                    'product_id' => $item->product_id,
                    'product_name' => $item->product->name,
                    'product_sku' => $item->product->sku,
                    'unit_quantity' => $item->quantity,
                    'total_quantity' => $totalQuantity,
                    'unit' => $item->unit,
                    'notes' => $item->notes
                ];
            }
            
            return Response::success([
                'bom_id' => $bomHeader->id,
                'bom_code' => $bomHeader->bom_code,
                'product_name' => $bomHeader->product->name ?? '',
                'production_quantity' => $quantity,
                'items' => $explodedItems
            ], 'BOM展开成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('BOM展开失败：' . $e->getMessage());
        }
    }
}
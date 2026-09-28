<?php

namespace app\controller;

use app\BaseController;
use app\model\Location;
use app\common\library\Response;
use think\Request;
use think\facade\Validate;

/**
 * 库位管理控制器
 */
class LocationController extends BaseController
{
    /**
     * 获取库位列表
     */
    public function index(Request $request)
    {
        try {
            $params = $request->get();
            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 15;
            
            $query = Location::with(['warehouse', 'zone', 'shelf']);
            
            // 搜索条件
            if (!empty($params['code'])) {
                $query->where('code', 'like', '%' . $params['code'] . '%');
            }
            
            if (!empty($params['warehouse_id'])) {
                $query->where('warehouse_id', $params['warehouse_id']);
            }
            
            if (!empty($params['zone_id'])) {
                $query->where('zone_id', $params['zone_id']);
            }
            
            if (!empty($params['shelf_id'])) {
                $query->where('shelf_id', $params['shelf_id']);
            }
            
            if (!empty($params['status'])) {
                $query->where('status', $params['status']);
            }
            
            if (!empty($params['type'])) {
                $query->where('type', $params['type']);
            }
            
            // 分页查询
            $result = $query->order('created_at', 'desc')
                          ->paginate([
                              'list_rows' => $limit,
                              'page' => $page
                          ]);
            
            return Response::success($result, '获取库位列表成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取库位列表失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 创建库位
     */
    public function save(Request $request)
    {
        try {
            $data = $request->post();
            
            // 验证数据
            $validate = Validate::rule([
                'code' => 'require|max:50|unique:locations',
                'warehouse_id' => 'require|integer',
                'zone_id' => 'integer',
                'shelf_id' => 'integer',
                'type' => 'require|in:storage,picking,staging,shipping',
                'capacity' => 'integer|egt:0',
                'length' => 'float|egt:0',
                'width' => 'float|egt:0',
                'height' => 'float|egt:0',
                'weight_limit' => 'float|egt:0',
            ]);
            
            if (!$validate->check($data)) {
                return Response::error($validate->getError());
            }
            
            $location = Location::create($data);
            
            return Response::success($location, '创建库位成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('创建库位失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 获取库位详情
     */
    public function read($id)
    {
        try {
            $location = Location::with(['warehouse', 'zone', 'shelf'])->find($id);
            
            if (!$location) {
                return Response::error('库位不存在', 404);
            }
            
            return Response::success($location, '获取库位详情成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取库位详情失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 更新库位
     */
    public function update(Request $request, $id)
    {
        try {
            $location = Location::find($id);
            
            if (!$location) {
                return Response::error('库位不存在', 404);
            }
            
            $data = $request->put();
            
            // 验证数据
            $validate = Validate::rule([
                'code' => 'require|max:50|unique:locations,code,' . $id,
                'warehouse_id' => 'require|integer',
                'zone_id' => 'integer',
                'shelf_id' => 'integer',
                'type' => 'require|in:storage,picking,staging,shipping',
                'capacity' => 'integer|egt:0',
                'length' => 'float|egt:0',
                'width' => 'float|egt:0',
                'height' => 'float|egt:0',
                'weight_limit' => 'float|egt:0',
            ]);
            
            if (!$validate->check($data)) {
                return Response::error($validate->getError());
            }
            
            $location->save($data);
            
            return Response::success($location, '更新库位成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('更新库位失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 删除库位
     */
    public function delete($id)
    {
        try {
            $location = Location::find($id);
            
            if (!$location) {
                return Response::error('库位不存在', 404);
            }
            
            // 检查是否有库存
            $hasInventory = \app\model\Inventory::where('location_id', $id)->count();
            if ($hasInventory > 0) {
                return Response::error('该库位还有库存，无法删除');
            }
            
            $location->delete();
            
            return Response::success(null, '删除库位成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('删除库位失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 获取库位选项
     */
    public function options(Request $request)
    {
        try {
            $params = $request->get();
            
            $query = Location::where('status', 'active')
                           ->field('id, code, warehouse_id, zone_id, shelf_id, type');
            
            // 按仓库筛选
            if (!empty($params['warehouse_id'])) {
                $query->where('warehouse_id', $params['warehouse_id']);
            }
            
            // 按区域筛选
            if (!empty($params['zone_id'])) {
                $query->where('zone_id', $params['zone_id']);
            }
            
            // 按货架筛选
            if (!empty($params['shelf_id'])) {
                $query->where('shelf_id', $params['shelf_id']);
            }
            
            // 按类型筛选
            if (!empty($params['type'])) {
                $query->where('type', $params['type']);
            }
            
            $locations = $query->select()->toArray();
            
            return Response::success($locations, '获取库位选项成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取库位选项失败: ' . $e->getMessage());
        }
    }
}
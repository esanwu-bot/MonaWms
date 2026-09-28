<?php

namespace app\controller;

use app\BaseController;
use app\common\Grant;
use app\model\Warehouse;
use app\model\User;
use app\common\library\Response;
use think\Request;
use think\facade\Validate;

/**
 * 仓库管理控制器
 */
class WarehouseController extends BaseController
{
    /**
     * 获取仓库列表
     */
    public function index(Request $request)
    {
        try {
            $params = $request->get();
            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 15;
            
            $query = Warehouse::with(['manager']);
            
            // 搜索条件
            if (!empty($params['code'])) {
                $query->searchCode($params['code']);
            }
            
            if (!empty($params['name'])) {
                $query->searchName($params['name']);
            }
            
            if (!empty($params['status'])) {
                $query->searchStatus($params['status']);
            }
            
            if (!empty($params['manager_id'])) {
                $query->searchManagerId($params['manager_id']);
            }
            
            // 分页查询
            $result = $query->order('created_at', 'desc')
                          ->paginate([
                              'list_rows' => $limit,
                              'page' => $page
                          ]);
            
            $list = [];
            foreach ($result->items() as $warehouse) {
                $item = $warehouse->toArray();
                $item['status_text'] = $warehouse->status_text;
                $item['manager_name'] = $warehouse->manager->username ?? '';
                $item['statistics'] = $warehouse->getStatistics();
                $list[] = $item;
            }
            
            return Response::paginate($list, $result->total(), $page, $limit);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('获取仓库列表失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取仓库详情
     */
    public function read(Request $request, $id)
    {
        try {
            $warehouse = Warehouse::with(['manager', 'zones'])->find($id);
            
            if (!$warehouse) {
                return Response::notFound('仓库不存在');
            }
            
            $data = $warehouse->toArray();
            $data['status_text'] = $warehouse->status_text;
            $data['manager_name'] = $warehouse->manager->username ?? '';
            $data['statistics'] = $warehouse->getStatistics();
            
            return Response::success($data);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('获取仓库详情失败：' . $e->getMessage());
        }
    }
    
    /**
     * 创建仓库
     */
    public function save(Request $request)
    {
        Grant::assert('warehouse:write');
        $data = $request->post();
        
        // 验证参数
        $validate = Validate::rule([
            'code' => 'require|max:20|unique:warehouses',
            'name' => 'require|max:100',
            'address' => 'max:255',
            'manager_id' => 'integer',
            'status' => 'in:active,inactive'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            // 验证管理员是否存在
            if (!empty($data['manager_id'])) {
                $manager = User::find($data['manager_id']);
                if (!$manager) {
                    return Response::error('指定的管理员不存在');
                }
            }
            
            $warehouse = new Warehouse();
            $warehouse->code = $data['code'];
            $warehouse->name = $data['name'];
            $warehouse->address = $data['address'] ?? '';
            $warehouse->manager_id = $data['manager_id'] ?? null;
            $warehouse->status = $data['status'] ?? Warehouse::STATUS_ACTIVE;
            $warehouse->save();
            
            return Response::success([
                'id' => $warehouse->id,
                'code' => $warehouse->code,
                'name' => $warehouse->name,
                'address' => $warehouse->address,
                'manager_id' => $warehouse->manager_id,
                'status' => $warehouse->status,
                'status_text' => $warehouse->status_text
            ], '仓库创建成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('创建仓库失败：' . $e->getMessage());
        }
    }
    
    /**
     * 更新仓库
     */
    public function update(Request $request, $id)
    {
        Grant::assert('warehouse:write');
        $data = $request->put();
        
        // 验证参数
        $validate = Validate::rule([
            'code' => 'max:20|unique:warehouses,code,' . $id,
            'name' => 'max:100',
            'address' => 'max:255',
            'manager_id' => 'integer',
            'status' => 'in:active,inactive'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            $warehouse = Warehouse::find($id);
            
            if (!$warehouse) {
                return Response::notFound('仓库不存在');
            }
            
            // 验证管理员是否存在
            if (!empty($data['manager_id'])) {
                $manager = User::find($data['manager_id']);
                if (!$manager) {
                    return Response::error('指定的管理员不存在');
                }
            }
            
            // 更新字段
            if (isset($data['code'])) {
                $warehouse->code = $data['code'];
            }
            if (isset($data['name'])) {
                $warehouse->name = $data['name'];
            }
            if (isset($data['address'])) {
                $warehouse->address = $data['address'];
            }
            if (isset($data['manager_id'])) {
                $warehouse->manager_id = $data['manager_id'];
            }
            if (isset($data['status'])) {
                $warehouse->status = $data['status'];
            }
            
            $warehouse->save();
            
            return Response::success([
                'id' => $warehouse->id,
                'code' => $warehouse->code,
                'name' => $warehouse->name,
                'address' => $warehouse->address,
                'manager_id' => $warehouse->manager_id,
                'status' => $warehouse->status,
                'status_text' => $warehouse->status_text
            ], '仓库更新成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('更新仓库失败：' . $e->getMessage());
        }
    }
    
    /**
     * 删除仓库
     */
    public function delete(Request $request, $id)
    {
        Grant::assert('warehouse:write');
        try {
            $warehouseService = new \app\service\WarehouseService();
            $warehouseService->delete($id);
            
            return Response::success([], '仓库删除成功');
            
        } catch (\think\exception\ValidateException $e) {
            return Response::error($e->getMessage());
        } catch (\think\exception\NotFoundException $e) {
            return Response::notFound($e->getMessage());
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('删除仓库失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取仓库统计信息
     */
    public function statistics(Request $request, $id)
    {
        try {
            $warehouse = Warehouse::find($id);
            
            if (!$warehouse) {
                return Response::notFound('仓库不存在');
            }
            
            $statistics = $warehouse->getStatistics();
            
            return Response::success($statistics);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('获取统计信息失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取仓库选项列表（用于下拉选择）
     */
    public function options(Request $request)
    {
        try {
            $warehouses = Warehouse::where('status', Warehouse::STATUS_ACTIVE)
                                 ->field('id,code,name')
                                 ->order('code')
                                 ->select();
            
            $options = [];
            foreach ($warehouses as $warehouse) {
                $options[] = [
                    'value' => $warehouse->id,
                    'label' => $warehouse->code . ' - ' . $warehouse->name
                ];
            }
            
            return Response::success($options);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('获取仓库选项失败：' . $e->getMessage());
        }
    }
}
<?php

namespace app\controller;

use app\BaseController;
use app\model\Project;
use app\model\ProjectInventoryReservation;
use app\model\Product;
use app\model\Inventory;
use app\common\library\Response;
use think\Request;
use think\facade\Validate;
use think\facade\Db;

/**
 * 项目管理控制器
 */
class ProjectController extends BaseController
{
    /**
     * 获取项目列表
     */
    public function index(Request $request)
    {
        try {
            $params = $request->get();
            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 15;
            
            $query = Project::where('id', '>', 0);
            
            // 搜索条件
            if (!empty($params['project_code'])) {
                $query->where('project_code', 'like', '%' . $params['project_code'] . '%');
            }
            
            if (!empty($params['project_name'])) {
                $query->where('project_name', 'like', '%' . $params['project_name'] . '%');
            }
            
            if (!empty($params['status'])) {
                $query->where('status', $params['status']);
            }
            
            if (!empty($params['manager'])) {
                $query->where('manager', 'like', '%' . $params['manager'] . '%');
            }
            
            // 分页查询
            $result = $query->order('created_at', 'desc')
                          ->paginate([
                              'list_rows' => $limit,
                              'page' => $page
                          ]);
            
            $list = [];
            foreach ($result->items() as $project) {
                $item = $project->toArray();
                $item['status_text'] = $project->status_text;
                
                // 统计项目库存预留情况
                $reservationCount = ProjectInventoryReservation::where('project_id', $project->id)->count();
                $item['reservation_count'] = $reservationCount;
                
                $list[] = $item;
            }
            
            return Response::paginate($list, $result->total(), $page, $limit);
            
        } catch (\Exception $e) {
            return Response::serverError('获取项目列表失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取项目详情
     */
    public function read(Request $request, $id)
    {
        try {
            $project = Project::find($id);
            
            if (!$project) {
                return Response::notFound('项目不存在');
            }
            
            $data = $project->toArray();
            $data['status_text'] = $project->status_text;
            
            // 获取项目库存预留信息
            $reservations = ProjectInventoryReservation::with(['product'])
                ->where('project_id', $id)
                ->select();
            
            $reservationList = [];
            foreach ($reservations as $reservation) {
                $item = $reservation->toArray();
                $item['product_name'] = $reservation->product->name ?? '';
                $item['product_sku'] = $reservation->product->sku ?? '';
                $reservationList[] = $item;
            }
            
            $data['reservations'] = $reservationList;
            
            return Response::success($data);
            
        } catch (\Exception $e) {
            return Response::serverError('获取项目详情失败：' . $e->getMessage());
        }
    }
    
    /**
     * 创建项目
     */
    public function save(Request $request)
    {
        $data = $request->post();
        
        // 验证参数
        $validate = Validate::rule([
            'project_code' => 'require|max:50|unique:projects',
            'project_name' => 'require|max:200',
            'description' => 'max:1000',
            'manager' => 'require|max:50',
            'contact_phone' => 'max:20',
            'contact_email' => 'email|max:100',
            'start_date' => 'date',
            'end_date' => 'date',
            'budget' => 'float',
            'address' => 'max:500',
            'status' => 'in:planning,executing,completed,cancelled'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        // 验证日期逻辑
        if (!empty($data['start_date']) && !empty($data['end_date'])) {
            if (strtotime($data['start_date']) > strtotime($data['end_date'])) {
                return Response::error('开始日期不能晚于结束日期');
            }
        }
        
        try {
            $project = new Project();
            $project->project_code = $data['project_code'];
            $project->project_name = $data['project_name'];
            $project->description = $data['description'] ?? '';
            $project->manager = $data['manager'];
            $project->contact_phone = $data['contact_phone'] ?? '';
            $project->contact_email = $data['contact_email'] ?? '';
            $project->start_date = $data['start_date'] ?? null;
            $project->end_date = $data['end_date'] ?? null;
            $project->budget = $data['budget'] ?? 0;
            $project->address = $data['address'] ?? '';
            $project->status = $data['status'] ?? Project::STATUS_PLANNING;
            $project->save();
            
            return Response::success([
                'id' => $project->id,
                'project_code' => $project->project_code,
                'project_name' => $project->project_name,
                'manager' => $project->manager,
                'status' => $project->status,
                'status_text' => $project->status_text
            ], '项目创建成功');
            
        } catch (\Exception $e) {
            return Response::serverError('创建项目失败：' . $e->getMessage());
        }
    }
    
    /**
     * 更新项目
     */
    public function update(Request $request, $id)
    {
        $data = $request->put();
        
        // 验证参数
        $validate = Validate::rule([
            'project_code' => 'max:50|unique:projects,project_code,' . $id,
            'project_name' => 'max:200',
            'description' => 'max:1000',
            'manager' => 'max:50',
            'contact_phone' => 'max:20',
            'contact_email' => 'email|max:100',
            'start_date' => 'date',
            'end_date' => 'date',
            'budget' => 'float',
            'address' => 'max:500',
            'status' => 'in:planning,executing,completed,cancelled'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            $project = Project::find($id);
            
            if (!$project) {
                return Response::notFound('项目不存在');
            }
            
            // 验证日期逻辑
            $startDate = $data['start_date'] ?? $project->start_date;
            $endDate = $data['end_date'] ?? $project->end_date;
            
            if (!empty($startDate) && !empty($endDate)) {
                if (strtotime($startDate) > strtotime($endDate)) {
                    return Response::error('开始日期不能晚于结束日期');
                }
            }
            
            // 更新字段
            if (isset($data['project_code'])) {
                $project->project_code = $data['project_code'];
            }
            if (isset($data['project_name'])) {
                $project->project_name = $data['project_name'];
            }
            if (isset($data['description'])) {
                $project->description = $data['description'];
            }
            if (isset($data['manager'])) {
                $project->manager = $data['manager'];
            }
            if (isset($data['contact_phone'])) {
                $project->contact_phone = $data['contact_phone'];
            }
            if (isset($data['contact_email'])) {
                $project->contact_email = $data['contact_email'];
            }
            if (isset($data['start_date'])) {
                $project->start_date = $data['start_date'];
            }
            if (isset($data['end_date'])) {
                $project->end_date = $data['end_date'];
            }
            if (isset($data['budget'])) {
                $project->budget = $data['budget'];
            }
            if (isset($data['address'])) {
                $project->address = $data['address'];
            }
            if (isset($data['status'])) {
                $project->status = $data['status'];
            }
            
            $project->save();
            
            return Response::success([
                'id' => $project->id,
                'project_code' => $project->project_code,
                'project_name' => $project->project_name,
                'manager' => $project->manager,
                'status' => $project->status,
                'status_text' => $project->status_text
            ], '项目更新成功');
            
        } catch (\Exception $e) {
            return Response::serverError('更新项目失败：' . $e->getMessage());
        }
    }
    
    /**
     * 删除项目
     */
    public function delete(Request $request, $id)
    {
        try {
            $project = Project::find($id);
            
            if (!$project) {
                return Response::notFound('项目不存在');
            }
            
            // 检查是否有库存预留
            $reservationCount = ProjectInventoryReservation::where('project_id', $id)->count();
            if ($reservationCount > 0) {
                return Response::error('项目存在库存预留记录，无法删除');
            }
            
            $project->delete();
            
            return Response::success([], '项目删除成功');
            
        } catch (\Exception $e) {
            return Response::serverError('删除项目失败：' . $e->getMessage());
        }
    }
    
    /**
     * 项目库存预留
     */
    public function reserveInventory(Request $request)
    {
        $data = $request->post();
        
        // 验证参数
        $validate = Validate::rule([
            'project_id' => 'require|integer',
            'product_id' => 'require|integer',
            'quantity' => 'require|float|>:0',
            'notes' => 'max:500'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            // 验证项目是否存在
            $project = Project::find($data['project_id']);
            if (!$project) {
                return Response::error('指定的项目不存在');
            }
            
            // 验证产品是否存在
            $product = Product::find($data['product_id']);
            if (!$product) {
                return Response::error('指定的产品不存在');
            }
            
            // 检查库存是否充足
            $inventory = Inventory::where('product_id', $data['product_id'])->find();
            if (!$inventory || $inventory->available_quantity < $data['quantity']) {
                return Response::error('库存不足，无法预留');
            }
            
            // 检查是否已有预留记录
            $existingReservation = ProjectInventoryReservation::where('project_id', $data['project_id'])
                ->where('product_id', $data['product_id'])
                ->find();
            
            // 开启事务
            Db::startTrans();
            
            if ($existingReservation) {
                // 更新预留数量
                $oldQuantity = $existingReservation->quantity;
                $existingReservation->quantity = $data['quantity'];
                $existingReservation->notes = $data['notes'] ?? '';
                $existingReservation->save();
                
                // 更新库存
                $quantityDiff = $data['quantity'] - $oldQuantity;
                $inventory->reserved_quantity += $quantityDiff;
                $inventory->available_quantity -= $quantityDiff;
            } else {
                // 创建新的预留记录
                $reservation = new ProjectInventoryReservation();
                $reservation->project_id = $data['project_id'];
                $reservation->product_id = $data['product_id'];
                $reservation->quantity = $data['quantity'];
                $reservation->notes = $data['notes'] ?? '';
                $reservation->save();
                
                // 更新库存
                $inventory->reserved_quantity += $data['quantity'];
                $inventory->available_quantity -= $data['quantity'];
            }
            
            $inventory->save();
            
            // 提交事务
            Db::commit();
            
            return Response::success([
                'project_id' => $data['project_id'],
                'product_id' => $data['product_id'],
                'quantity' => $data['quantity'],
                'available_quantity' => $inventory->available_quantity,
                'reserved_quantity' => $inventory->reserved_quantity
            ], '库存预留成功');
            
        } catch (\Exception $e) {
            Db::rollback();
            return Response::serverError('库存预留失败：' . $e->getMessage());
        }
    }
    
    /**
     * 取消项目库存预留
     */
    public function cancelReservation(Request $request)
    {
        $data = $request->post();
        
        // 验证参数
        $validate = Validate::rule([
            'project_id' => 'require|integer',
            'product_id' => 'require|integer'
        ]);
        
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }
        
        try {
            // 查找预留记录
            $reservation = ProjectInventoryReservation::where('project_id', $data['project_id'])
                ->where('product_id', $data['product_id'])
                ->find();
            
            if (!$reservation) {
                return Response::notFound('预留记录不存在');
            }
            
            // 获取库存记录
            $inventory = Inventory::where('product_id', $data['product_id'])->find();
            if (!$inventory) {
                return Response::error('库存记录不存在');
            }
            
            // 开启事务
            Db::startTrans();
            
            // 释放库存
            $inventory->reserved_quantity -= $reservation->quantity;
            $inventory->available_quantity += $reservation->quantity;
            $inventory->save();
            
            // 删除预留记录
            $reservation->delete();
            
            // 提交事务
            Db::commit();
            
            return Response::success([
                'project_id' => $data['project_id'],
                'product_id' => $data['product_id'],
                'released_quantity' => $reservation->quantity,
                'available_quantity' => $inventory->available_quantity,
                'reserved_quantity' => $inventory->reserved_quantity
            ], '取消预留成功');
            
        } catch (\Exception $e) {
            Db::rollback();
            return Response::serverError('取消预留失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取项目库存视图
     */
    public function getProjectInventory(Request $request, $id)
    {
        try {
            $project = Project::find($id);
            
            if (!$project) {
                return Response::notFound('项目不存在');
            }
            
            // 获取项目预留的库存
            $reservations = ProjectInventoryReservation::with(['product'])
                ->where('project_id', $id)
                ->select();
            
            $inventoryList = [];
            foreach ($reservations as $reservation) {
                $inventoryList[] = [
                    'product_id' => $reservation->product_id,
                    'product_name' => $reservation->product->name ?? '',
                    'product_sku' => $reservation->product->sku ?? '',
                    'product_unit' => $reservation->product->unit ?? '',
                    'reserved_quantity' => $reservation->quantity,
                    'notes' => $reservation->notes,
                    'reserved_at' => $reservation->created_at
                ];
            }
            
            return Response::success([
                'project_id' => $project->id,
                'project_code' => $project->project_code,
                'project_name' => $project->project_name,
                'inventory' => $inventoryList
            ], '获取项目库存成功');
            
        } catch (\Exception $e) {
            return Response::serverError('获取项目库存失败：' . $e->getMessage());
        }
    }
}
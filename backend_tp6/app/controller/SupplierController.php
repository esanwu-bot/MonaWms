<?php

namespace app\controller;

use app\BaseController;
use app\model\Supplier;
use app\common\library\Response;
use think\Request;
use think\facade\Validate;

/**
 * 供应商管理控制器
 */
class SupplierController extends BaseController
{
    /**
     * 获取供应商列表
     */
    public function index(Request $request)
    {
        try {
            $params = $request->get();
            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 15;
            
            $query = new Supplier();
            
            // 搜索条件
            if (!empty($params['name'])) {
                $query->where('name', 'like', '%' . $params['name'] . '%');
            }
            
            if (!empty($params['contact_person'])) {
                $query->where('contact_person', 'like', '%' . $params['contact_person'] . '%');
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
            
            return Response::success($result, '获取供应商列表成功');
            
        } catch (\Exception $e) {
            return Response::error('获取供应商列表失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 创建供应商
     */
    public function save(Request $request)
    {
        try {
            $data = $request->post();
            
            // 验证数据
            $validate = Validate::rule([
                'name' => 'require|max:100',
                'contact_person' => 'require|max:50',
                'phone' => 'require|max:20',
                'email' => 'email|max:100',
                'address' => 'max:200',
            ]);
            
            if (!$validate->check($data)) {
                return Response::error($validate->getError());
            }
            
            $supplier = Supplier::create($data);
            
            return Response::success($supplier, '创建供应商成功');
            
        } catch (\Exception $e) {
            return Response::error('创建供应商失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 获取供应商详情
     */
    public function read($id)
    {
        try {
            $supplier = Supplier::find($id);
            
            if (!$supplier) {
                return Response::error('供应商不存在', 404);
            }
            
            return Response::success($supplier, '获取供应商详情成功');
            
        } catch (\Exception $e) {
            return Response::error('获取供应商详情失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 更新供应商
     */
    public function update(Request $request, $id)
    {
        try {
            $supplier = Supplier::find($id);
            
            if (!$supplier) {
                return Response::error('供应商不存在', 404);
            }
            
            $data = $request->put();
            
            // 验证数据
            $validate = Validate::rule([
                'name' => 'require|max:100',
                'contact_person' => 'require|max:50',
                'phone' => 'require|max:20',
                'email' => 'email|max:100',
                'address' => 'max:200',
            ]);
            
            if (!$validate->check($data)) {
                return Response::error($validate->getError());
            }
            
            $supplier->save($data);
            
            return Response::success($supplier, '更新供应商成功');
            
        } catch (\Exception $e) {
            return Response::error('更新供应商失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 删除供应商
     */
    public function delete($id)
    {
        try {
            $supplier = Supplier::find($id);
            
            if (!$supplier) {
                return Response::error('供应商不存在', 404);
            }
            
            $supplier->delete();
            
            return Response::success(null, '删除供应商成功');
            
        } catch (\Exception $e) {
            return Response::error('删除供应商失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 获取供应商选项
     */
    public function options()
    {
        try {
            $suppliers = Supplier::where('status', 'active')
                               ->field('id, name')
                               ->select()
                               ->toArray();
            
            return Response::success($suppliers, '获取供应商选项成功');
            
        } catch (\Exception $e) {
            return Response::error('获取供应商选项失败: ' . $e->getMessage());
        }
    }
}
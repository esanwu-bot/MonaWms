<?php

namespace app\controller;

use app\BaseController;
use app\common\Grant;
use app\model\Customer;
use app\common\library\Response;
use think\Request;
use think\facade\Validate;

/**
 * 客户管理控制器
 */
class CustomerController extends BaseController
{
    /**
     * 获取客户列表
     */
    public function index(Request $request)
    {
        try {
            $params = $request->get();
            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 15;
            
            $query = Customer::field('*');
            
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
            
            return Response::success($result, '获取客户列表成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取客户列表失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 创建客户
     */
    public function save(Request $request)
    {
        Grant::assert('customer:write');
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
            
            $customer = Customer::create($data);
            
            return Response::success($customer, '创建客户成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('创建客户失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 获取客户详情
     */
    public function read($id)
    {
        try {
            $customer = Customer::find($id);
            
            if (!$customer) {
                return Response::error('客户不存在', 404);
            }
            
            return Response::success($customer, '获取客户详情成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取客户详情失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 更新客户
     */
    public function update(Request $request, $id)
    {
        Grant::assert('customer:write');
        try {
            $customer = Customer::find($id);
            
            if (!$customer) {
                return Response::error('客户不存在', 404);
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
            
            $customer->save($data);
            
            return Response::success($customer, '更新客户成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('更新客户失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 删除客户
     */
    public function delete($id)
    {
        Grant::assert('customer:write');
        try {
            $customer = Customer::find($id);
            
            if (!$customer) {
                return Response::error('客户不存在', 404);
            }
            
            $customer->delete();
            
            return Response::success(null, '删除客户成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('删除客户失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 获取客户选项
     */
    public function options()
    {
        try {
            $customers = Customer::where('status', 'active')
                               ->field('id, name')
                               ->select()
                               ->toArray();
            
            return Response::success($customers, '获取客户选项成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取客户选项失败: ' . $e->getMessage());
        }
    }
}
<?php

namespace app\controller;

use app\BaseController;
use app\common\Grant;
use app\model\User;
use app\common\library\Response;
use think\Request;
use think\facade\Validate;

/**
 * 用户管理控制器
 */
class UserController extends BaseController
{
    /**
     * 获取用户列表
     */
    public function index(Request $request)
    {
        try {
            $params = $request->get();
            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 15;
            
            $query = User::where('id', '>', 0);
            
            // 搜索条件
            if (!empty($params['username'])) {
                $query->where('username', 'like', '%' . $params['username'] . '%');
            }
            
            if (!empty($params['email'])) {
                $query->where('email', 'like', '%' . $params['email'] . '%');
            }
            
            if (!empty($params['role'])) {
                $query->where('role', $params['role']);
            }
            
            if (!empty($params['status'])) {
                $query->where('status', $params['status']);
            }
            
            // 分页查询
            $result = $query->field('id,username,email,real_name,phone,role,status,last_login_time,created_at')
                          ->order('created_at', 'desc')
                          ->paginate([
                              'list_rows' => $limit,
                              'page' => $page
                          ]);
            
            return Response::success($result, '获取用户列表成功');
            
        } catch (\Exception $e) {
            return Response::error('获取用户列表失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 创建用户
     */
    public function save(Request $request)
    {
        Grant::assert('user:manage');
        try {
            $data = $request->post();
            
            // 验证数据
            $validate = Validate::rule([
                'username' => 'require|max:50|unique:users',
                'email' => 'require|email|max:100|unique:users',
                'password' => 'require|min:6|max:20',
                'real_name' => 'require|max:50',
                'phone' => 'max:20',
                'role' => 'require|in:admin,manager,operator,viewer',
            ]);
            
            if (!$validate->check($data)) {
                return Response::error($validate->getError());
            }
            
            // 密码加密
            $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
            
            $user = User::create($data);
            
            // 移除密码字段
            unset($user['password']);
            
            return Response::success($user, '创建用户成功');
            
        } catch (\Exception $e) {
            return Response::error('创建用户失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 获取用户详情
     */
    public function read($id)
    {
        try {
            $user = User::field('id,username,email,real_name,phone,role,status,last_login_time,created_at')
                       ->find($id);
            
            if (!$user) {
                return Response::error('用户不存在', 404);
            }
            
            return Response::success($user, '获取用户详情成功');
            
        } catch (\Exception $e) {
            return Response::error('获取用户详情失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 更新用户
     */
    public function update(Request $request, $id)
    {
        Grant::assert('user:manage');
        try {
            $user = User::find($id);
            
            if (!$user) {
                return Response::error('用户不存在', 404);
            }
            
            $data = $request->put();
            
            // 验证数据
            $validate = Validate::rule([
                'username' => 'require|max:50|unique:users,username,' . $id,
                'email' => 'require|email|max:100|unique:users,email,' . $id,
                'real_name' => 'require|max:50',
                'phone' => 'max:20',
                'role' => 'require|in:admin,manager,operator,viewer',
            ]);
            
            if (!$validate->check($data)) {
                return Response::error($validate->getError());
            }
            
            // 移除密码字段（密码单独修改）
            unset($data['password']);
            
            $user->save($data);
            
            // 移除密码字段
            unset($user['password']);
            
            return Response::success($user, '更新用户成功');
            
        } catch (\Exception $e) {
            return Response::error('更新用户失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 删除用户
     */
    public function delete($id)
    {
        Grant::assert('user:manage');
        try {
            $user = User::find($id);
            
            if (!$user) {
                return Response::error('用户不存在', 404);
            }
            
            // 不能删除自己
            if ($id == $this->request->user_id) {
                return Response::error('不能删除自己');
            }
            
            $user->delete();
            
            return Response::success(null, '删除用户成功');
            
        } catch (\Exception $e) {
            return Response::error('删除用户失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 修改用户状态
     */
    public function changeStatus(Request $request, $id)
    {
        Grant::assert('user:manage');
        try {
            $user = User::find($id);
            
            if (!$user) {
                return Response::error('用户不存在', 404);
            }
            
            $data = $request->put();
            
            // 验证数据
            $validate = Validate::rule([
                'status' => 'require|in:active,inactive',
            ]);
            
            if (!$validate->check($data)) {
                return Response::error($validate->getError());
            }
            
            // 不能禁用自己
            if ($id == $this->request->user_id && $data['status'] == 'inactive') {
                return Response::error('不能禁用自己');
            }
            
            $user->save(['status' => $data['status']]);
            
            return Response::success(null, '修改用户状态成功');
            
        } catch (\Exception $e) {
            return Response::error('修改用户状态失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 修改用户密码
     */
    public function changePassword(Request $request, $id)
    {
        Grant::assert('user:manage');
        try {
            $user = User::find($id);
            
            if (!$user) {
                return Response::error('用户不存在', 404);
            }
            
            $data = $request->put();
            
            // 验证数据
            $validate = Validate::rule([
                'password' => 'require|min:6|max:20',
                'confirm_password' => 'require|confirm:password',
            ]);
            
            if (!$validate->check($data)) {
                return Response::error($validate->getError());
            }
            
            // 密码加密
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
            
            $user->save(['password' => $hashedPassword]);
            
            return Response::success(null, '修改密码成功');
            
        } catch (\Exception $e) {
            return Response::error('修改密码失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 获取用户选项
     */
    public function options()
    {
        try {
            $users = User::where('status', 'active')
                        ->field('id, username, real_name')
                        ->select()
                        ->toArray();
            
            return Response::success($users, '获取用户选项成功');
            
        } catch (\Exception $e) {
            return Response::error('获取用户选项失败: ' . $e->getMessage());
        }
    }
}
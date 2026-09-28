<?php

namespace app\controller;

use app\BaseController;
use app\common\Grant;
use app\model\Category;
use app\common\library\Response;
use think\Request;
use think\facade\Validate;

/**
 * 产品分类管理控制器
 */
class CategoryController extends BaseController
{
    /**
     * 获取分类列表
     */
    public function index(Request $request)
    {
        try {
            $params = $request->get();
            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 15;
            
            $query = Category::where('id', '>', 0);
            
            // 搜索条件
            if (!empty($params['name'])) {
                $query->where('name', 'like', '%' . $params['name'] . '%');
            }
            
            if (!empty($params['parent_id'])) {
                $query->where('parent_id', $params['parent_id']);
            }
            
            if (!empty($params['status'])) {
                $query->where('status', $params['status']);
            }
            
            // 分页查询
            $result = $query->order('id', 'asc')
                          ->paginate([
                              'list_rows' => $limit,
                              'page' => $page
                          ]);
            
            $list = [];
            foreach ($result->items() as $category) {
                $item = $category->toArray();
                $item['status_text'] = $category->status_text;
                $list[] = $item;
            }
            
            return Response::success([
                'list' => $list,
                'pagination' => [
                    'total' => $result->total(),
                    'page' => $page,
                    'limit' => $limit,
                    'pages' => ceil($result->total() / $limit)
                ]
            ]);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取分类列表失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 获取分类树
     */
    public function tree()
    {
        try {
            $categories = Category::order('id', 'asc')
                                ->select()
                                ->toArray();
            
            $tree = $this->buildTree($categories);
            
            return Response::success($tree, '获取分类树成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取分类树失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 构建分类树
     */
    private function buildTree($categories, $parentId = 0)
    {
        $tree = [];
        
        foreach ($categories as $category) {
            if ($category['parent_id'] == $parentId) {
                $children = $this->buildTree($categories, $category['id']);
                if ($children) {
                    $category['children'] = $children;
                }
                $tree[] = $category;
            }
        }
        
        return $tree;
    }
    
    /**
     * 创建分类
     */
    public function save(Request $request)
    {
        Grant::assert('category:write');
        try {
            $data = $request->post();
            
            // 验证数据
            $validate = Validate::rule([
                'name' => 'require|max:50',
                'parent_id' => 'integer',
                'sort_order' => 'integer',
                'description' => 'max:200',
                'status' => 'in:active,inactive'
            ]);
            
            if (!$validate->check($data)) {
                return Response::error($validate->getError());
            }
            
            $category = Category::create($data);
            
            return Response::success($category, '创建分类成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('创建分类失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 获取分类详情
     */
    public function read($id)
    {
        try {
            $category = Category::find($id);
            
            if (!$category) {
                return Response::error('分类不存在', 404);
            }
            
            $data = $category->toArray();
            $data['status_text'] = $category->status_text;
            
            return Response::success($data, '获取分类详情成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取分类详情失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 更新分类
     */
    public function update(Request $request, $id)
    {
        Grant::assert('category:write');
        try {
            $category = Category::find($id);
            
            if (!$category) {
                return Response::error('分类不存在', 404);
            }
            
            $data = $request->put();
            
            // 验证数据
            $validate = Validate::rule([
                'name' => 'require|max:50',
                'parent_id' => 'integer',
                'sort_order' => 'integer',
                'description' => 'max:200',
                'status' => 'in:active,inactive'
            ]);
            
            if (!$validate->check($data)) {
                return Response::error($validate->getError());
            }
            
            // 检查是否设置自己为父分类
            if (isset($data['parent_id']) && $data['parent_id'] == $id) {
                return Response::error('不能设置自己为父分类');
            }
            
            $category->save($data);
            
            return Response::success($category, '更新分类成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('更新分类失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 删除分类
     */
    public function delete($id)
    {
        Grant::assert('category:write');
        try {
            $category = Category::find($id);
            
            if (!$category) {
                return Response::error('分类不存在', 404);
            }
            
            // 检查是否有子分类
            $hasChildren = Category::where('parent_id', $id)->count();
            if ($hasChildren > 0) {
                return Response::error('该分类下还有子分类，无法删除');
            }
            
            // 检查是否有关联产品
            $hasProducts = \app\model\Product::where('category_id', $id)->count();
            if ($hasProducts > 0) {
                return Response::error('该分类下还有产品，无法删除');
            }
            
            $category->delete();
            
            return Response::success(null, '删除分类成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('删除分类失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 获取分类选项
     */
    public function options()
    {
        try {
            $categories = Category::where('status', 'active')
                                ->field('id, name, parent_id')
                                ->order('sort_order', 'asc')
                                ->select()
                                ->toArray();
            
            return Response::success($categories, '获取分类选项成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取分类选项失败: ' . $e->getMessage());
        }
    }
}
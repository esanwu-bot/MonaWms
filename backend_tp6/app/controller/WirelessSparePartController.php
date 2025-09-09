<?php

namespace app\controller;

use app\BaseController;
use app\model\WirelessSparePart;
use app\common\library\Response;
use think\Request;
use think\facade\Validate;

/**
 * 无线备件管理控制器
 */
class WirelessSparePartController extends BaseController
{
    /**
     * 获取无线备件列表
     */
    public function index(Request $request)
    {
        try {
            $params = $request->get();
            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 15;
            
            $query = WirelessSparePart::where('id', '>', 0);
            
            // 搜索条件
            if (!empty($params['part_name'])) {
                $query->where('part_name', 'like', '%' . $params['part_name'] . '%');
            }
            
            if (!empty($params['model'])) {
                $query->where('model', 'like', '%' . $params['model'] . '%');
            }
            
            if (!empty($params['type'])) {
                $query->where('type', $params['type']);
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
            foreach ($result->items() as $item) {
                $data = $item->toArray();
                $data['status_text'] = $item->status_text;
                $list[] = $data;
            }
            
            return Response::paginate($list, $result->total(), $page, $limit);
            
        } catch (\Exception $e) {
            return Response::serverError('获取无线备件列表失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取无线备件详情
     */
    public function read(Request $request, $id)
    {
        try {
            $item = WirelessSparePart::find($id);
            
            if (!$item) {
                return Response::notFound('无线备件不存在');
            }
            
            $data = $item->toArray();
            $data['status_text'] = $item->status_text;
            
            return Response::success($data);
            
        } catch (\Exception $e) {
            return Response::serverError('获取无线备件详情失败：' . $e->getMessage());
        }
    }
    
    /**
     * 创建无线备件
     */
    public function save(Request $request)
    {
        try {
            $data = $request->post();
            
            // 验证数据
            $validate = Validate::rule([
                'code' => 'require|max:50',
                'part_name' => 'require|max:100',
                'model' => 'max:100',
                'serial_number' => 'max:100',
                'type' => 'require|in:5G,4G,3G,2G,other',
                'quantity' => 'require|integer',
                'operator' => 'require|max:50',
                'project' => 'max:100',
                'status' => 'require|in:inbound,outbound,returned'
            ]);
            
            if (!$validate->check($data)) {
                return Response::validateError($validate->getError());
            }
            
            $item = new WirelessSparePart();
            $item->code = $data['code'];
            $item->part_name = $data['part_name'];
            $item->model = $data['model'] ?? '';
            $item->serial_number = $data['serial_number'] ?? '';
            $item->type = $data['type'];
            $item->quantity = $data['quantity'];
            $item->operator = $data['operator'];
            $item->project = $data['project'] ?? '';
            $item->status = $data['status'];
            $item->save();
            
            $result = $item->toArray();
            $result['status_text'] = $item->status_text;
            
            return Response::success($result, '创建无线备件成功');
            
        } catch (\Exception $e) {
            return Response::serverError('创建无线备件失败：' . $e->getMessage());
        }
    }
    
    /**
     * 更新无线备件
     */
    public function update(Request $request, $id)
    {
        try {
            $item = WirelessSparePart::find($id);
            
            if (!$item) {
                return Response::notFound('无线备件不存在');
            }
            
            $data = $request->put();
            
            // 验证数据
            $validate = Validate::rule([
                'code' => 'max:50',
                'part_name' => 'max:100',
                'model' => 'max:100',
                'serial_number' => 'max:100',
                'type' => 'in:5G,4G,3G,2G,other',
                'quantity' => 'integer',
                'operator' => 'max:50',
                'project' => 'max:100',
                'status' => 'in:inbound,outbound,returned'
            ]);
            
            if (!$validate->check($data)) {
                return Response::validateError($validate->getError());
            }
            
            // 更新字段
            if (isset($data['code'])) {
                $item->code = $data['code'];
            }
            if (isset($data['part_name'])) {
                $item->part_name = $data['part_name'];
            }
            if (isset($data['model'])) {
                $item->model = $data['model'];
            }
            if (isset($data['serial_number'])) {
                $item->serial_number = $data['serial_number'];
            }
            if (isset($data['type'])) {
                $item->type = $data['type'];
            }
            if (isset($data['quantity'])) {
                $item->quantity = $data['quantity'];
            }
            if (isset($data['operator'])) {
                $item->operator = $data['operator'];
            }
            if (isset($data['project'])) {
                $item->project = $data['project'];
            }
            if (isset($data['status'])) {
                $item->status = $data['status'];
            }
            
            $item->save();
            
            $result = $item->toArray();
            $result['status_text'] = $item->status_text;
            
            return Response::success($result, '更新无线备件成功');
            
        } catch (\Exception $e) {
            return Response::serverError('更新无线备件失败：' . $e->getMessage());
        }
    }
    
    /**
     * 删除无线备件
     */
    public function delete(Request $request, $id)
    {
        try {
            $item = WirelessSparePart::find($id);
            
            if (!$item) {
                return Response::notFound('无线备件不存在');
            }
            
            $item->delete();
            
            return Response::success(null, '删除无线备件成功');
            
        } catch (\Exception $e) {
            return Response::serverError('删除无线备件失败：' . $e->getMessage());
        }
    }
    
    /**
     * 批量删除无线备件
     */
    public function batchDelete(Request $request)
    {
        try {
            $data = $request->post();
            $ids = $data['ids'] ?? [];
            
            if (empty($ids) || !is_array($ids)) {
                return Response::error('请提供有效的ID列表');
            }
            
            WirelessSparePart::destroy($ids);
            
            return Response::success(null, '批量删除成功');
            
        } catch (\Exception $e) {
            return Response::serverError('批量删除失败：' . $e->getMessage());
        }
    }
}
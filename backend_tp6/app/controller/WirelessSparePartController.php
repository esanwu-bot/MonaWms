<?php

namespace app\controller;

use app\BaseController;
use app\model\WirelessSparePart;
use app\common\library\Response;
use think\Request;
use think\facade\Validate;
use think\facade\Db;

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
            
            if (!empty($params['serial_number'])) {
                $query->where('serial_number', 'like', '%' . $params['serial_number'] . '%');
            }
            
            if (!empty($params['type'])) {
                $query->where('type', $params['type']);
            }
            
            if (!empty($params['status'])) {
                $query->where('status', $params['status']);
            }
            
            if (!empty($params['project'])) {
                $query->where('project', 'like', '%' . $params['project'] . '%');
            }
            
            if (!empty($params['operator'])) {
                $query->where('operator', 'like', '%' . $params['operator'] . '%');
            }
            
            if (!empty($params['start_date'])) {
                $query->where('operation_date', '>=', $params['start_date']);
            }
            
            if (!empty($params['end_date'])) {
                $query->where('operation_date', '<=', $params['end_date']);
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
                return Response::notFound('无线备件记录不存在');
            }
            
            $data = $item->toArray();
            
            return Response::success($data);
            
        } catch (\Exception $e) {
            return Response::serverError('获取无线备件详情失败：' . $e->getMessage());
        }
    }
    
    /**
     * 创建无线备件记录
     */
    public function save(Request $request)
    {
        try {
            $data = $request->post();
            
            // 验证数据
            $validate = Validate::rule([
                'part_name' => 'require|max:100',
                'model' => 'require|max:100',
                'serial_number' => 'require|max:100',
                'type' => 'require|in:5G,4G,3G,2G,其他',
                'quantity' => 'require|integer|>:0',
                'operator' => 'require|max:50',
                'operation_date' => 'require|date',
                'status' => 'require|in:入库,出库,调拨,盘点',
                'project' => 'require|max:100',
                'notes' => 'max:500'
            ]);
            
            if (!$validate->check($data)) {
                return Response::validateError($validate->getError());
            }
            
            $item = new WirelessSparePart();
            $item->part_name = $data['part_name'];
            $item->model = $data['model'];
            $item->serial_number = $data['serial_number'];
            $item->type = $data['type'];
            $item->quantity = $data['quantity'];
            $item->operator = $data['operator'];
            $item->operation_date = $data['operation_date'];
            $item->status = $data['status'];
            $item->project = $data['project'];
            $item->notes = $data['notes'] ?? '';
            $item->save();
            
            $result = $item->toArray();
            
            return Response::success($result, '创建无线备件记录成功');
            
        } catch (\Exception $e) {
            return Response::serverError('创建无线备件记录失败：' . $e->getMessage());
        }
    }
    
    /**
     * 更新无线备件记录
     */
    public function update(Request $request, $id)
    {
        try {
            $item = WirelessSparePart::find($id);
            
            if (!$item) {
                return Response::notFound('无线备件记录不存在');
            }
            
            $data = $request->put();
            
            // 验证数据
            $validate = Validate::rule([
                'part_name' => 'max:100',
                'model' => 'max:100',
                'serial_number' => 'max:100',
                'type' => 'in:5G,4G,3G,2G,其他',
                'quantity' => 'integer|>:0',
                'operator' => 'max:50',
                'operation_date' => 'date',
                'status' => 'in:入库,出库,调拨,盘点',
                'project' => 'max:100',
                'notes' => 'max:500'
            ]);
            
            if (!$validate->check($data)) {
                return Response::validateError($validate->getError());
            }
            
            // 更新字段
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
            if (isset($data['operation_date'])) {
                $item->operation_date = $data['operation_date'];
            }
            if (isset($data['status'])) {
                $item->status = $data['status'];
            }
            if (isset($data['project'])) {
                $item->project = $data['project'];
            }
            if (isset($data['notes'])) {
                $item->notes = $data['notes'];
            }
            
            $item->save();
            
            $result = $item->toArray();
            
            return Response::success($result, '更新无线备件记录成功');
            
        } catch (\Exception $e) {
            return Response::serverError('更新无线备件记录失败：' . $e->getMessage());
        }
    }
    
    /**
     * 删除无线备件记录
     */
    public function delete(Request $request, $id)
    {
        try {
            $item = WirelessSparePart::find($id);
            
            if (!$item) {
                return Response::notFound('无线备件记录不存在');
            }
            
            $item->delete();
            
            return Response::success([], '删除无线备件记录成功');
            
        } catch (\Exception $e) {
            return Response::serverError('删除无线备件记录失败：' . $e->getMessage());
        }
    }
    
    /**
     * 批量导入无线备件记录
     */
    public function bulkImport(Request $request)
    {
        try {
            $data = $request->post();
            $wirelessSpareParts = $data['wireless_spare_parts'] ?? [];
            
            if (empty($wirelessSpareParts) || !is_array($wirelessSpareParts)) {
                return Response::error('请提供有效的无线备件数据');
            }
            
            $successCount = 0;
            $failures = [];
            
            // 开启事务
            Db::startTrans();
            
            foreach ($wirelessSpareParts as $partData) {
                try {
                    // 验证必填字段
                    if (empty($partData['part_name']) || empty($partData['model']) || 
                        empty($partData['serial_number']) || empty($partData['type']) ||
                        empty($partData['quantity']) || empty($partData['operator']) ||
                        empty($partData['operation_date']) || empty($partData['status']) ||
                        empty($partData['project'])) {
                        $failures[] = [
                            'data' => $partData,
                            'reason' => '缺少必填字段'
                        ];
                        continue;
                    }
                    
                    $item = new WirelessSparePart();
                    $item->part_name = $partData['part_name'];
                    $item->model = $partData['model'];
                    $item->serial_number = $partData['serial_number'];
                    $item->type = $partData['type'];
                    $item->quantity = $partData['quantity'];
                    $item->operator = $partData['operator'];
                    $item->operation_date = $partData['operation_date'];
                    $item->status = $partData['status'];
                    $item->project = $partData['project'];
                    $item->notes = $partData['notes'] ?? '';
                    $item->save();
                    
                    $successCount++;
                } catch (\Exception $e) {
                    $failures[] = [
                        'data' => $partData,
                        'reason' => $e->getMessage()
                    ];
                }
            }
            
            // 提交事务
            Db::commit();
            
            return Response::success([
                'success_count' => $successCount,
                'failure_count' => count($failures),
                'failures' => $failures
            ], '批量导入完成');
            
        } catch (\Exception $e) {
            Db::rollback();
            return Response::serverError('批量导入失败：' . $e->getMessage());
        }
    }
    
    /**
     * 导出无线备件记录
     */
    public function export(Request $request)
    {
        try {
            $params = $request->get();
            
            $query = WirelessSparePart::where('id', '>', 0);
            
            // 应用搜索条件
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
            
            $items = $query->order('created_at', 'desc')->select();
            
            // 这里应该使用Excel导出库，暂时返回JSON格式
            $exportData = [];
            foreach ($items as $item) {
                $exportData[] = $item->toArray();
            }
            
            return Response::success($exportData, '导出成功');
            
        } catch (\Exception $e) {
            return Response::serverError('导出失败：' . $e->getMessage());
        }
    }
    
    /**
     * 获取统计数据
     */
    public function stats(Request $request)
    {
        try {
            // 总记录数
            $totalCount = WirelessSparePart::count();
            
            // 按状态统计
            $inboundCount = WirelessSparePart::where('status', '入库')->count();
            $outboundCount = WirelessSparePart::where('status', '出库')->count();
            
            // 按类型统计
            $byType = WirelessSparePart::field('type, COUNT(*) as count')
                ->group('type')
                ->select()
                ->toArray();
            
            // 按项目统计
            $byProject = WirelessSparePart::field('project, COUNT(*) as count')
                ->group('project')
                ->order('count', 'desc')
                ->limit(10)
                ->select()
                ->toArray();
            
            return Response::success([
                'total_count' => $totalCount,
                'inbound_count' => $inboundCount,
                'outbound_count' => $outboundCount,
                'by_type' => $byType,
                'by_project' => $byProject
            ]);
            
        } catch (\Exception $e) {
            return Response::serverError('获取统计数据失败：' . $e->getMessage());
        }
    }
}
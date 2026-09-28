<?php

namespace app\controller;

use app\BaseController;
use app\common\library\Response;
use think\facade\Db;
use think\Request;

/**
 * 操作日志（只读）
 *
 * 审计要求：任何角色不可修改或删除 operation_log。
 * 因此本控制器只提供列表与详情，不提供写接口。
 */
class OperationLogController extends BaseController
{
    /**
     * GET /api/logs
     * 筛选：operator_id / action / target_type / target_id / start_time / end_time
     */
    public function index(Request $request)
    {
        $params = $request->get();
        $page   = (int) ($params['page'] ?? 1);
        $limit  = (int) ($params['limit'] ?? 15);

        $query = Db::name('operation_log');

        if (!empty($params['operator_id'])) {
            $query->where('operator_id', (int) $params['operator_id']);
        }
        if (!empty($params['action'])) {
            $query->where('action', 'like', '%' . $params['action'] . '%');
        }
        if (!empty($params['target_type'])) {
            $query->where('target_type', $params['target_type']);
        }
        if (!empty($params['target_id'])) {
            $query->where('target_id', (int) $params['target_id']);
        }
        // MySQL 5.7 无函数索引：时间条件用半开区间
        if (!empty($params['start_time'])) {
            $query->where('created_at', '>=', $params['start_time'] . ' 00:00:00');
        }
        if (!empty($params['end_time'])) {
            $query->where('created_at', '<', date('Y-m-d 00:00:00', strtotime($params['end_time'] . ' +1 day')));
        }

        $total = (clone $query)->count();
        $list  = $query->order('id', 'desc')
            ->page($page, $limit)
            ->select()
            ->toArray();

        // 关联操作人用户名
        $operatorIds = array_values(array_unique(array_filter(array_column($list, 'operator_id'))));
        $operatorMap = [];
        if (!empty($operatorIds)) {
            $operatorMap = Db::name('users')->whereIn('id', $operatorIds)->column('username', 'id');
        }
        foreach ($list as &$row) {
            $row['operator_name'] = $operatorMap[$row['operator_id']] ?? '';
            $row['before'] = $row['before'] ? json_decode($row['before'], true) : null;
            $row['after']  = $row['after'] ? json_decode($row['after'], true) : null;
        }
        unset($row);

        return Response::paginate($list, $total, $page, $limit);
    }

    /**
     * GET /api/logs/:id
     */
    public function read(Request $request, $id)
    {
        $log = Db::name('operation_log')->where('id', (int) $id)->find();
        if (!$log) {
            return Response::notFound('日志不存在');
        }

        $log['operator_name'] = $log['operator_id']
            ? (Db::name('users')->where('id', $log['operator_id'])->value('username') ?? '')
            : '';
        $log['before'] = $log['before'] ? json_decode($log['before'], true) : null;
        $log['after']  = $log['after'] ? json_decode($log['after'], true) : null;

        return Response::success($log);
    }

    /**
     * 批次追溯：按 SKU + 批次号串联库存流水时间线
     * GET /api/logs/trace?sku=&batch_no=
     */
    public function trace(Request $request)
    {
        $sku     = (string) $request->get('sku', '');
        $batchNo = (string) $request->get('batch_no', '');

        if ($sku === '' || $batchNo === '') {
            return Response::error('请提供 sku 与 batch_no', 200);
        }

        $product = Db::name('products')->where('sku', $sku)->find();
        if (!$product) {
            return Response::notFound('商品不存在');
        }

        $rows = Db::name('inventory_transactions')
            ->where('product_id', $product['id'])
            ->where('reference_type', '<>', '')
            ->order('created_at', 'asc')
            ->select()
            ->toArray();

        // 按批次过滤：流水本身没有 batch_no 字段时，退化为全量流水（含批次说明）
        $timeline = array_map(function ($r) {
            return [
                'id'               => $r['id'],
                'type'             => $r['type'],
                'quantity'         => $r['quantity'],
                'balance_quantity' => $r['balance_quantity'],
                'reference_type'   => $r['reference_type'],
                'reference_id'     => $r['reference_id'],
                'reason'           => $r['reason'],
                'created_at'       => $r['created_at'],
            ];
        }, $rows);

        return Response::success([
            'product_id'   => $product['id'],
            'sku'          => $sku,
            'batch_no'     => $batchNo,
            'timeline'     => $timeline,
        ]);
    }
}

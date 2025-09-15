<?php

namespace app\controller;

use app\BaseController;
use app\model\ScrapApplication;
use app\model\Product;
use app\model\User;
use app\common\library\Response;
use think\Request;
use think\facade\Db;
use think\exception\ValidateException;

/**
 * 报废管理控制器
 */
class ScrapController extends BaseController
{
    /**
     * 获取报废申请列表
     */
    public function index(Request $request)
    {
        try {
            $page = $request->param('page', 1);
            $limit = $request->param('limit', 10);
            $keyword = $request->param('keyword', '');
            $status = $request->param('status', '');
            $reasonType = $request->param('reason_type', '');
            $dateRange = $request->param('date_range', []);

            $query = ScrapApplication::with(['device', 'applicant', 'approver', 'processor']);

            // 关键词搜索（设备名称或序列号）
            if ($keyword) {
                $query->where(function($q) use ($keyword) {
                    $q->searchDeviceName($keyword)
                      ->whereOr(function($subQ) use ($keyword) {
                          $subQ->searchSerialNumber($keyword);
                      });
                });
            }

            // 状态筛选
            if ($status) {
                $query->searchStatus($status);
            }

            // 报废原因筛选
            if ($reasonType) {
                $query->searchReasonType($reasonType);
            }

            // 时间范围筛选
            if ($dateRange && is_array($dateRange) && count($dateRange) == 2) {
                $query->searchDateRange($dateRange);
            }

            $result = $query->order('created_at', 'desc')
                          ->paginate([
                              'list_rows' => $limit,
                              'page' => $page,
                          ]);

            // 格式化数据
            $data = [];
            foreach ($result->items() as $item) {
                $data[] = [
                    'id' => $item->id,
                    'scrap_number' => $item->scrap_number,
                    'device_info' => [
                        'id' => $item->device->id ?? null,
                        'name' => $item->device->name ?? '',
                        'serial_number' => $item->device->serial_number ?? '',
                        'model' => $item->device->model ?? '',
                    ],
                    'reason' => $item->reason_text,
                    'reason_type' => $item->reason_type,
                    'description' => $item->description,
                    'estimated_loss' => $item->estimated_loss,
                    'actual_loss' => $item->actual_loss,
                    'applicant' => [
                        'id' => $item->applicant->id ?? null,
                        'name' => $item->applicant->full_name ?? $item->applicant->username ?? '',
                    ],
                    'status' => $item->status,
                    'status_text' => $item->status_text,
                    'created_at' => $item->created_at->format('Y-m-d H:i:s'),
                    'approved_at' => $item->approved_at ? $item->approved_at->format('Y-m-d H:i:s') : null,
                    'processed_at' => $item->processed_at ? $item->processed_at->format('Y-m-d H:i:s') : null,
                ];
            }

            return Response::success([
                'list' => $data,
                'total' => $result->total(),
                'page' => $page,
                'limit' => $limit,
            ]);

        } catch (\Exception $e) {
            return Response::error('获取报废申请列表失败: ' . $e->getMessage());
        }
    }

    /**
     * 获取报废申请详情
     */
    public function read($id)
    {
        try {
            $scrapApplication = ScrapApplication::with(['device', 'applicant', 'approver', 'processor'])
                ->find($id);

            if (!$scrapApplication) {
                return Response::error('报废申请不存在', 404);
            }

            $data = [
                'id' => $scrapApplication->id,
                'scrap_number' => $scrapApplication->scrap_number,
                'device_info' => [
                    'id' => $scrapApplication->device->id ?? null,
                    'name' => $scrapApplication->device->name ?? '',
                    'serial_number' => $scrapApplication->device->serial_number ?? '',
                    'model' => $scrapApplication->device->model ?? '',
                    'category' => $scrapApplication->device->category ?? '',
                ],
                'reason' => $scrapApplication->reason_text,
                'reason_type' => $scrapApplication->reason_type,
                'description' => $scrapApplication->description,
                'estimated_loss' => $scrapApplication->estimated_loss,
                'actual_loss' => $scrapApplication->actual_loss,
                'applicant' => [
                    'id' => $scrapApplication->applicant->id ?? null,
                    'name' => $scrapApplication->applicant->full_name ?? $scrapApplication->applicant->username ?? '',
                ],
                'approver' => $scrapApplication->approver ? [
                    'id' => $scrapApplication->approver->id,
                    'name' => $scrapApplication->approver->full_name ?? $scrapApplication->approver->username,
                ] : null,
                'processor' => $scrapApplication->processor ? [
                    'id' => $scrapApplication->processor->id,
                    'name' => $scrapApplication->processor->full_name ?? $scrapApplication->processor->username,
                ] : null,
                'status' => $scrapApplication->status,
                'status_text' => $scrapApplication->status_text,
                'created_at' => $scrapApplication->created_at->format('Y-m-d H:i:s'),
                'approved_at' => $scrapApplication->approved_at ? $scrapApplication->approved_at->format('Y-m-d H:i:s') : null,
                'processed_at' => $scrapApplication->processed_at ? $scrapApplication->processed_at->format('Y-m-d H:i:s') : null,
                'approval_notes' => $scrapApplication->approval_notes,
                'processing_notes' => $scrapApplication->processing_notes,
            ];

            return Response::success($data);

        } catch (\Exception $e) {
            return Response::error('获取报废申请详情失败: ' . $e->getMessage());
        }
    }

    /**
     * 创建报废申请
     */
    public function save(Request $request)
    {
        try {
            $data = $request->param();
            
            // 验证必填字段
            $this->validateScrapData($data);

            // 检查设备是否存在
            $device = Product::find($data['device_id']);
            if (!$device) {
                return Response::error('设备不存在');
            }

            // 检查设备是否已有待处理的报废申请
            $existingScrap = ScrapApplication::where('device_id', $data['device_id'])
                ->whereIn('status', [ScrapApplication::STATUS_PENDING, ScrapApplication::STATUS_APPROVED])
                ->find();
            
            if ($existingScrap) {
                return Response::error('该设备已有待处理的报废申请');
            }

            Db::startTrans();
            try {
                // 生成报废申请编号
                $scrapNumber = ScrapApplication::generateScrapNumber();

                $scrapApplication = ScrapApplication::create([
                    'scrap_number' => $scrapNumber,
                    'device_id' => $data['device_id'],
                    'reason_type' => $data['reason_type'],
                    'description' => $data['description'] ?? '',
                    'estimated_loss' => $data['estimated_loss'] ?? 0,
                    'applicant_id' => $request->user_id, // 从中间件获取当前用户ID
                    'status' => ScrapApplication::STATUS_PENDING,
                ]);

                Db::commit();

                return Response::success([
                    'id' => $scrapApplication->id,
                    'scrap_number' => $scrapApplication->scrap_number,
                ], '报废申请提交成功');

            } catch (\Exception $e) {
                Db::rollback();
                throw $e;
            }

        } catch (ValidateException $e) {
            return Response::error($e->getError());
        } catch (\Exception $e) {
            return Response::error('创建报废申请失败: ' . $e->getMessage());
        }
    }

    /**
     * 审核报废申请
     */
    public function approve(Request $request, $id)
    {
        try {
            $data = $request->param();
            $action = $data['action'] ?? 'approve'; // approve 或 reject
            $notes = $data['notes'] ?? '';

            $scrapApplication = ScrapApplication::find($id);
            if (!$scrapApplication) {
                return Response::error('报废申请不存在', 404);
            }

            if ($scrapApplication->status !== ScrapApplication::STATUS_PENDING) {
                return Response::error('只能审核待审核状态的申请');
            }

            Db::startTrans();
            try {
                $updateData = [
                    'approved_by' => $request->user_id,
                    'approved_at' => date('Y-m-d H:i:s'),
                    'approval_notes' => $notes,
                ];

                if ($action === 'approve') {
                    $updateData['status'] = ScrapApplication::STATUS_APPROVED;
                    $message = '报废申请审核通过';
                } else {
                    $updateData['status'] = ScrapApplication::STATUS_REJECTED;
                    $message = '报废申请已拒绝';
                }

                $scrapApplication->save($updateData);

                Db::commit();

                return Response::success([], $message);

            } catch (\Exception $e) {
                Db::rollback();
                throw $e;
            }

        } catch (\Exception $e) {
            return Response::error('审核报废申请失败: ' . $e->getMessage());
        }
    }

    /**
     * 处理报废申请
     */
    public function process(Request $request, $id)
    {
        try {
            $data = $request->param();
            $actualLoss = $data['actual_loss'] ?? 0;
            $notes = $data['notes'] ?? '';

            $scrapApplication = ScrapApplication::find($id);
            if (!$scrapApplication) {
                return Response::error('报废申请不存在', 404);
            }

            if ($scrapApplication->status !== ScrapApplication::STATUS_APPROVED) {
                return Response::error('只能处理已审核通过的申请');
            }

            Db::startTrans();
            try {
                // 更新报废申请状态
                $scrapApplication->save([
                    'status' => ScrapApplication::STATUS_COMPLETED,
                    'actual_loss' => $actualLoss,
                    'processed_by' => $request->user_id,
                    'processed_at' => date('Y-m-d H:i:s'),
                    'processing_notes' => $notes,
                ]);

                // 更新设备状态为已报废（如果Product模型有status字段）
                $device = Product::find($scrapApplication->device_id);
                if ($device && method_exists($device, 'markAsScrap')) {
                    $device->markAsScrap();
                }

                Db::commit();

                return Response::success([], '报废申请处理完成');

            } catch (\Exception $e) {
                Db::rollback();
                throw $e;
            }

        } catch (\Exception $e) {
            return Response::error('处理报废申请失败: ' . $e->getMessage());
        }
    }

    /**
     * 获取报废统计数据
     */
    public function statistics(Request $request)
    {
        try {
            $dateRange = $request->param('date_range', []);
            
            $query = ScrapApplication::query();
            
            // 时间范围筛选
            if ($dateRange && is_array($dateRange) && count($dateRange) == 2) {
                $query->whereBetweenTime('created_at', $dateRange[0], $dateRange[1]);
            }

            $stats = [
                'pending' => (clone $query)->where('status', ScrapApplication::STATUS_PENDING)->count(),
                'approved' => (clone $query)->where('status', ScrapApplication::STATUS_APPROVED)->count(),
                'completed' => (clone $query)->where('status', ScrapApplication::STATUS_COMPLETED)->count(),
                'rejected' => (clone $query)->where('status', ScrapApplication::STATUS_REJECTED)->count(),
                'total_estimated_loss' => (clone $query)->sum('estimated_loss'),
                'total_actual_loss' => (clone $query)->where('status', ScrapApplication::STATUS_COMPLETED)->sum('actual_loss'),
            ];

            // 按原因分组统计
            $reasonStats = (clone $query)->field('reason_type, count(*) as count, sum(estimated_loss) as total_loss')
                ->group('reason_type')
                ->select()
                ->toArray();

            $stats['reason_breakdown'] = $reasonStats;

            return Response::success($stats);

        } catch (\Exception $e) {
            return Response::error('获取统计数据失败: ' . $e->getMessage());
        }
    }

    /**
     * 获取可报废的设备列表
     */
    public function getAvailableDevices(Request $request)
    {
        try {
            $keyword = $request->param('keyword', '');
            
            $query = Product::query();
            
            // 排除已有待处理报废申请的设备
            $excludeDeviceIds = ScrapApplication::whereIn('status', [
                ScrapApplication::STATUS_PENDING,
                ScrapApplication::STATUS_APPROVED
            ])->column('device_id');
            
            if ($excludeDeviceIds) {
                $query->whereNotIn('id', $excludeDeviceIds);
            }

            // 关键词搜索
            if ($keyword) {
                $query->where(function($q) use ($keyword) {
                    $q->where('name', 'like', '%' . $keyword . '%')
                      ->whereOr('serial_number', 'like', '%' . $keyword . '%')
                      ->whereOr('model', 'like', '%' . $keyword . '%');
                });
            }

            $devices = $query->field('id, name, serial_number, model, category')
                           ->limit(50)
                           ->select();

            $data = [];
            foreach ($devices as $device) {
                $data[] = [
                    'value' => $device->id,
                    'label' => $device->name . ' - ' . $device->serial_number,
                    'name' => $device->name,
                    'serial_number' => $device->serial_number,
                    'model' => $device->model,
                    'category' => $device->category,
                ];
            }

            return Response::success($data);

        } catch (\Exception $e) {
            return Response::error('获取设备列表失败: ' . $e->getMessage());
        }
    }

    /**
     * 验证报废申请数据
     */
    private function validateScrapData($data)
    {
        $rules = [
            'device_id' => 'require|integer',
            'reason_type' => 'require|in:damage,obsolete,expired,other',
            'description' => 'require|max:500',
            'estimated_loss' => 'number|>=:0',
        ];

        $messages = [
            'device_id.require' => '请选择设备',
            'device_id.integer' => '设备ID格式错误',
            'reason_type.require' => '请选择报废原因',
            'reason_type.in' => '报废原因类型无效',
            'description.require' => '请填写详细说明',
            'description.max' => '详细说明不能超过500字符',
            'estimated_loss.number' => '预估损失金额格式错误',
            'estimated_loss.>=' => '预估损失金额不能为负数',
        ];

        validate($rules, $messages)->check($data);
    }
}
<?php

namespace app\controller;

use app\common\BizException;
use app\common\Grant;
use app\common\library\Response;
use app\service\GrantService;
use think\facade\Validate;
use think\Request;

/**
 * 授权管理接口（仅系统管理员）
 *
 * 后端每个方法都再校验一次 grant:manage，前端隐藏菜单不构成任何安全保证。
 */
class GrantController
{
    private GrantService $service;

    public function __construct(GrantService $service)
    {
        $this->service = $service;
    }

    /**
     * GET /api/grants/matrix
     * 授权矩阵：行=账号，列=仓库。可选 ?vendor_id= 按代维方过滤
     */
    public function matrix(Request $request)
    {
        Grant::assert('grant:manage');
        $vendorId = $request->get('vendor_id/d');

        return Response::success($this->service->matrix($vendorId ? (int) $vendorId : null));
    }

    /**
     * GET /api/grants/warehouse/:id
     * 某仓库的已授权账号列表
     */
    public function byWarehouse(Request $request, $id)
    {
        Grant::assert('grant:manage');

        return Response::success($this->service->listByWarehouse((int) $id));
    }

    /**
     * GET /api/grants/user/:id
     * 某账号被授权的仓库列表（前端仓库切换器的数据源）
     */
    public function byUser(Request $request, $id)
    {
        // 查自己的授权不需要管理员权限
        return Response::success($this->service->listByUser((int) $id));
    }

    /**
     * POST /api/grants/grant
     * body: {user_id, warehouse_id, grant_role, remark}
     */
    public function grant(Request $request)
    {
        Grant::assert('grant:manage');

        $data = $request->post();
        $this->validateGrant($data, true);

        $result = $this->service->grant(
            (int) $data['user_id'],
            (int) $data['warehouse_id'],
            (string) $data['grant_role'],
            (string) ($data['remark'] ?? '')
        );

        return Response::success($result, '授权成功');
    }

    /**
     * POST /api/grants/revoke
     * body: {user_id, warehouse_id, remark}
     */
    public function revoke(Request $request)
    {
        Grant::assert('grant:manage');

        $data = $request->post();
        $this->validateGrant($data, false);

        $this->service->revoke(
            (int) $data['user_id'],
            (int) $data['warehouse_id'],
            (string) ($data['remark'] ?? '')
        );

        return Response::success(null, '已撤销授权');
    }

    /**
     * POST /api/grants/change-role
     * body: {user_id, warehouse_id, grant_role}
     */
    public function changeRole(Request $request)
    {
        Grant::assert('grant:manage');

        $data = $request->post();
        $this->validateGrant($data, true);

        $this->service->changeRole(
            (int) $data['user_id'],
            (int) $data['warehouse_id'],
            (string) $data['grant_role']
        );

        return Response::success(null, '角色已更新');
    }

    /**
     * POST /api/grants/batch
     * 批量授权（按代维方配多个账号 × 多个仓库）
     * body: {user_ids:[], warehouse_ids:[], grant_role, remark}
     */
    public function batch(Request $request)
    {
        Grant::assert('grant:manage');

        $data = $request->post();

        $userIds      = array_map('intval', (array) ($data['user_ids'] ?? []));
        $warehouseIds = array_map('intval', (array) ($data['warehouse_ids'] ?? []));
        $grantRole    = (string) ($data['grant_role'] ?? 'operator');

        if (empty($userIds) || empty($warehouseIds)) {
            throw new BizException('PARAM_ERROR', 'user_ids 与 warehouse_ids 不能为空', [], 200);
        }

        $count = $this->service->batchGrant(
            $userIds,
            $warehouseIds,
            $grantRole,
            isset($data['vendor_id']) ? (int) $data['vendor_id'] : null,
            (string) ($data['remark'] ?? '')
        );

        return Response::success(['count' => $count], "批量授权完成，共 {$count} 条");
    }

    /**
     * POST /api/grants/revoke-vendor
     * 按代维方批量撤销（更换代维方时一次性收回）
     * body: {vendor_id, remark}
     */
    public function revokeVendor(Request $request)
    {
        Grant::assert('grant:manage');

        $vendorId = (int) $request->post('vendor_id');
        if ($vendorId <= 0) {
            throw new BizException('PARAM_ERROR', 'vendor_id 非法', [], 200);
        }

        $count = $this->service->revokeByVendor($vendorId, (string) $request->post('remark', ''));

        return Response::success(['count' => $count], "已撤销 {$count} 条授权");
    }

    private function validateGrant(array $data, bool $needRole): void
    {
        $rules = [
            'user_id'      => 'require|integer|>:0',
            'warehouse_id' => 'require|integer|>:0',
        ];
        if ($needRole) {
            $rules['grant_role'] = 'require|in:manager,operator';
        }

        $validate = Validate::rule($rules);
        if (!$validate->check($data)) {
            throw new BizException('PARAM_ERROR', $validate->getError(), [], 200);
        }
    }
}

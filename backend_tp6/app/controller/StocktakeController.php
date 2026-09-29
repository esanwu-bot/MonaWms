<?php

namespace app\controller;

use app\BaseController;
use app\common\Current;
use app\common\Grant;
use app\common\library\Response;
use app\service\StocktakeService;
use app\model\StocktakeOrder;
use think\Request;
use think\facade\Validate;

/**
 * 库存盘点控制器
 *
 * 权限口径：
 * - 创建/开始/扫码/录盘/提交/取消 = stocktake:write（仓库 manager + operator）
 * - 差异审核过账 = stocktake:post（仅仓库 manager，等同过账动作）
 */
class StocktakeController extends BaseController
{
    private StocktakeService $service;

    public function __construct()
    {
        $this->service = new StocktakeService();
    }

    /** GET /api/stocktakes 盘点单列表 */
    public function index(Request $request)
    {
        try {
            $result = $this->service->getList($request->get());
            return Response::paginate($result['list'], $result['total'], $result['page'], $result['limit']);
        } catch (\app\common\BizException $e) {
            throw $e;
        } catch (\Exception $e) {
            return Response::serverError('获取盘点单列表失败：' . $e->getMessage());
        }
    }

    /** GET /api/stocktakes/:id 盘点单详情 */
    public function read(Request $request, $id)
    {
        try {
            return Response::success($this->service->getDetail((int)$id));
        } catch (\app\common\BizException $e) {
            throw $e;
        } catch (\Exception $e) {
            return Response::serverError('获取盘点单详情失败：' . $e->getMessage());
        }
    }

    /** GET /api/stocktakes/:id/items 盘点明细（执行页/审核页） */
    public function items(Request $request, $id)
    {
        try {
            return Response::success($this->service->getItems((int)$id, $request->get()));
        } catch (\app\common\BizException $e) {
            throw $e;
        } catch (\Exception $e) {
            return Response::serverError('获取盘点明细失败：' . $e->getMessage());
        }
    }

    /** POST /api/stocktakes 创建盘点单（生成账面快照） */
    public function save(Request $request)
    {
        $data = $request->post();

        $validate = Validate::rule([
            'warehouse_id' => 'require|integer|>:0',
            'type'         => 'in:full,partial,dynamic',
            'scope_type'   => 'in:all,category,location',
            'scope_value'  => 'max:255',
            'keeper_id'    => 'integer',
            'notes'        => 'max:500',
        ]);
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }

        $warehouseId = (int)$data['warehouse_id'];
        Grant::assert('stocktake:write', $warehouseId);

        try {
            $order = $this->service->create($data, Current::id());
            return Response::success($this->service->getDetail((int)$order->id), '盘点单已创建（账面快照已生成）');
        } catch (\app\common\BizException $e) {
            throw $e;
        } catch (\Exception $e) {
            return Response::serverError('创建盘点单失败：' . $e->getMessage());
        }
    }

    /** POST /api/stocktakes/:id/start 开始盘点（冻结该仓库出入库） */
    public function start(Request $request, $id)
    {
        $order = StocktakeOrder::find((int)$id);
        if (!$order) {
            return Response::notFound('盘点单不存在');
        }
        Grant::assert('stocktake:write', (int)$order->warehouse_id);

        try {
            $this->service->startCounting((int)$id, Current::id());
            return Response::success($this->service->getDetail((int)$id), '盘点已开始，该仓库出入库已冻结');
        } catch (\app\common\BizException $e) {
            throw $e;
        } catch (\Exception $e) {
            return Response::serverError('开始盘点失败：' . $e->getMessage());
        }
    }

    /** POST /api/stocktakes/:id/scan 普件扫SN（盲盘） */
    public function scan(Request $request, $id)
    {
        $order = StocktakeOrder::find((int)$id);
        if (!$order) {
            return Response::notFound('盘点单不存在');
        }
        Grant::assert('stocktake:write', (int)$order->warehouse_id);

        $data = $request->post();
        $validate = Validate::rule([
            'sn' => 'require|max:100',
        ]);
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }

        try {
            $result = $this->service->scanSn(
                (int)$id,
                (string)$data['sn'],
                Current::id(),
                !empty($data['product_id']) ? (int)$data['product_id'] : null,
                !empty($data['location_id']) ? (int)$data['location_id'] : null
            );
            return Response::success($result, $result['message'] ?? '');
        } catch (\app\common\BizException $e) {
            throw $e;
        } catch (\Exception $e) {
            return Response::serverError('扫码失败：' . $e->getMessage());
        }
    }

    /** POST /api/stocktakes/:id/record 散料/余数行录入实盘数量（明盘） */
    public function record(Request $request, $id)
    {
        $order = StocktakeOrder::find((int)$id);
        if (!$order) {
            return Response::notFound('盘点单不存在');
        }
        Grant::assert('stocktake:write', (int)$order->warehouse_id);

        $data = $request->post();
        $validate = Validate::rule([
            'item_id'     => 'require|integer',
            'counted_qty' => 'require',
        ]);
        if (!$validate->check($data)) {
            return Response::validateError($validate->getError());
        }

        try {
            $item = $this->service->recordCounted(
                (int)$data['item_id'],
                (string)$data['counted_qty'],
                Current::id(),
                (string)($data['reason'] ?? '')
            );
            return Response::success($item, '已记录实盘数量');
        } catch (\app\common\BizException $e) {
            throw $e;
        } catch (\Exception $e) {
            return Response::serverError('录盘失败：' . $e->getMessage());
        }
    }

    /** POST /api/stocktakes/:id/submit 提交盘点结果（生成差异待审核） */
    public function submit(Request $request, $id)
    {
        $order = StocktakeOrder::find((int)$id);
        if (!$order) {
            return Response::notFound('盘点单不存在');
        }
        Grant::assert('stocktake:write', (int)$order->warehouse_id);

        try {
            $this->service->submitCounting((int)$id, Current::id());
            return Response::success($this->service->getDetail((int)$id), '盘点结果已提交，待差异审核');
        } catch (\app\common\BizException $e) {
            throw $e;
        } catch (\Exception $e) {
            return Response::serverError('提交盘点失败：' . $e->getMessage());
        }
    }

    /** POST /api/stocktakes/:id/review 差异审核过账（仅 manager） */
    public function review(Request $request, $id)
    {
        $order = StocktakeOrder::find((int)$id);
        if (!$order) {
            return Response::notFound('盘点单不存在');
        }
        Grant::assert('stocktake:post', (int)$order->warehouse_id);

        $data = $request->post();
        $notes = (string)($data['notes'] ?? '');
        $reasons = is_array($data['reasons'] ?? null) ? $data['reasons'] : [];

        try {
            $result = $this->service->review((int)$id, Current::id(), $notes, $reasons);
            return Response::success($result, '审核通过，已生成调整单 ' . ($result['adjustment_number'] ?? ''));
        } catch (\app\common\BizException $e) {
            throw $e;
        } catch (\Exception $e) {
            return Response::serverError('审核失败：' . $e->getMessage());
        }
    }

    /** POST /api/stocktakes/:id/cancel 取消盘点（解除冻结） */
    public function cancel(Request $request, $id)
    {
        $order = StocktakeOrder::find((int)$id);
        if (!$order) {
            return Response::notFound('盘点单不存在');
        }
        Grant::assert('stocktake:write', (int)$order->warehouse_id);

        $reason = (string)($request->post('reason', ''));

        try {
            $this->service->cancel((int)$id, Current::id(), $reason);
            return Response::success($this->service->getDetail((int)$id), '盘点单已取消，仓库出入库已解冻');
        } catch (\app\common\BizException $e) {
            throw $e;
        } catch (\Exception $e) {
            return Response::serverError('取消盘点失败：' . $e->getMessage());
        }
    }
}

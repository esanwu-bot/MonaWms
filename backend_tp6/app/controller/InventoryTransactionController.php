<?php

namespace app\controller;

use app\service\InventoryTransactionService;
use app\common\library\Response;
use think\Request;
use think\exception\ValidateException;

/**
 * 库存事务控制器
 */
class InventoryTransactionController
{
    protected $service;

    public function __construct()
    {
        $this->service = new InventoryTransactionService();
    }

    /**
     * 获取库存事务列表
     * @param Request $request
     * @return \think\Response
     */
    public function index(Request $request)
    {
        try {
            $params = $request->param();
            $result = $this->service->getList($params);
            return Response::success($result);
        } catch (ValidateException $e) {
            return Response::error($e->getMessage());
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取库存事务列表失败');
        }
    }

    /**
     * 获取库存事务详情
     * @param Request $request
     * @param int $id
     * @return \think\Response
     */
    public function read(Request $request, int $id)
    {
        try {
            $transaction = $this->service->getDetail($id);
            return Response::success($transaction);
        } catch (ValidateException $e) {
            return Response::error($e->getMessage());
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取库存事务详情失败');
        }
    }

    /**
     * 获取库存事务统计
     * @param Request $request
     * @return \think\Response
     */
    public function statistics(Request $request)
    {
        try {
            $params = $request->param();
            $statistics = $this->service->getStatistics($params);
            return Response::success($statistics);
        } catch (ValidateException $e) {
            return Response::error($e->getMessage());
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取库存事务统计失败');
        }
    }

    /**
     * 获取库存变动趋势
     * @param Request $request
     * @return \think\Response
     */
    public function trend(Request $request)
    {
        try {
            $params = $request->param();
            $trend = $this->service->getTrend($params);
            return Response::success($trend);
        } catch (ValidateException $e) {
            return Response::error($e->getMessage());
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取库存变动趋势失败');
        }
    }

    /**
     * 获取最近的库存事务
     * @param Request $request
     * @return \think\Response
     */
    public function recent(Request $request)
    {
        try {
            $limit = $request->param('limit', 10);
            $params = $request->param();
            $recent = $this->service->getRecent($limit, $params);
            return Response::success($recent);
        } catch (ValidateException $e) {
            return Response::error($e->getMessage());
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取最近库存事务失败');
        }
    }

    /**
     * 获取产品库存变动历史
     * @param Request $request
     * @param int $product_id
     * @return \think\Response
     */
    public function productHistory(Request $request, int $product_id)
    {
        try {
            $params = $request->param();
            $history = $this->service->getProductHistory($product_id, $params);
            return Response::success($history);
        } catch (ValidateException $e) {
            return Response::error($e->getMessage());
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取产品库存历史失败');
        }
    }

    /**
     * 获取库位库存变动历史
     * @param Request $request
     * @param int $location_id
     * @return \think\Response
     */
    public function locationHistory(Request $request, int $location_id)
    {
        try {
            $params = $request->param();
            $history = $this->service->getLocationHistory($location_id, $params);
            return Response::success($history);
        } catch (ValidateException $e) {
            return Response::error($e->getMessage());
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取库位库存历史失败');
        }
    }

    /**
     * 获取操作员操作历史
     * @param Request $request
     * @param int $operator_id
     * @return \think\Response
     */
    public function operatorHistory(Request $request, int $operator_id)
    {
        try {
            $params = $request->param();
            $history = $this->service->getOperatorHistory($operator_id, $params);
            return Response::success($history);
        } catch (ValidateException $e) {
            return Response::error($e->getMessage());
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取操作员历史失败');
        }
    }

    /**
     * 获取产品库存流水
     * @param Request $request
     * @param int $product_id
     * @return \think\Response
     */
    public function productFlow(Request $request, int $product_id)
    {
        try {
            $params = $request->param();
            $flow = $this->service->getProductFlow($product_id, $params);
            return Response::success($flow);
        } catch (ValidateException $e) {
            return Response::error($e->getMessage());
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取产品库存流水失败');
        }
    }
}
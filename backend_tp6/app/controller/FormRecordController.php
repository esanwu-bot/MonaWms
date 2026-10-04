<?php

namespace app\controller;

use app\BaseController;
use app\service\FormRecordService;

/**
 * DIY 表单记录控制器（运行态 CRUD，全登录态）
 *
 * operator 只见/只能操作本人创建的记录（Service 内数据口径控制）；
 * 校验一律由服务端按 PUBLISHED 元数据重建，前端校验仅为体验。
 */
class FormRecordController extends BaseController
{
    private FormRecordService $recordService;

    public function __construct(\think\App $app, FormRecordService $recordService)
    {
        parent::__construct($app); // BaseController 内注入 $this->request，不可省
        $this->recordService = $recordService;
    }

    /** GET /api/forms/:formKey/meta 渲染所需元数据（等价 form-meta/latest，全登录态） */
    public function meta(string $formKey)
    {
        return json(['code' => 200, 'message' => 'success', 'data' => $this->recordService->getPublishedMeta($formKey)]);
    }

    /** POST /api/forms/:formKey/records 创建记录（Agent 代填走同一入口） */
    public function save(string $formKey)
    {
        $payload = $this->request->post();
        $bizRef = (string) ($this->request->header('X-Biz-Ref', $payload['biz_ref'] ?? ''));
        // biz_ref 非表单字段，从载荷中剥离，避免进入 ext_attrs
        unset($payload['biz_ref']);

        $record = $this->recordService->create($formKey, $payload, $bizRef);
        return json(['code' => 200, 'message' => '保存成功', 'data' => $record]);
    }

    /**
     * GET /api/forms/:formKey/records?filters=&sort=&page=&limit=&biz_ref=
     * filters 形如 {"patrol_result":"ABNORMAL","patrol_date__gte":"2026-01-01"}
     */
    public function index(string $formKey)
    {
        return json(['code' => 200, 'message' => 'success', 'data' => $this->recordService->getList($formKey, $this->request->param())]);
    }

    /** GET /api/forms/:formKey/records/:id 详情（附该版本字段定义） */
    public function read(string $formKey, int $id)
    {
        return json(['code' => 200, 'message' => 'success', 'data' => $this->recordService->getDetail($formKey, $id)]);
    }

    /** PUT /api/forms/:formKey/records/:id 更新（未提供的字段保留原值） */
    public function update(string $formKey, int $id)
    {
        $payload = $this->request->put();
        unset($payload['biz_ref']);
        $record = $this->recordService->update($formKey, $id, $payload);
        return json(['code' => 200, 'message' => '更新成功', 'data' => $record]);
    }

    /** DELETE /api/forms/:formKey/records/:id 软删除 */
    public function delete(string $formKey, int $id)
    {
        $this->recordService->delete($formKey, $id);
        return json(['code' => 200, 'message' => '已归档删除']);
    }

    /** GET /api/forms/:formKey/export CSV 导出（≤1万行同步导出） */
    public function export(string $formKey)
    {
        $result = $this->recordService->exportCsv($formKey, $this->request->param());
        return response($result['content'], 200, [
            'Content-Type'        => 'text/csv; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="' . $result['filename'] . '"',
        ]);
    }
}

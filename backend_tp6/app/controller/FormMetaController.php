<?php

namespace app\controller;

use app\BaseController;
use app\service\FormMetaService;

/**
 * DIY 表单元数据控制器（设计态 + Agent schema 读）
 *
 * 权限：设计/发布/diff/NL草稿 仅 admin（Service 二次校验）；
 *       published 列表与 latest 元数据全登录态可读（渲染/Agent 理解表单结构）。
 * 写操作由 operation_log 中间件统一留痕。
 */
class FormMetaController extends BaseController
{
    private FormMetaService $metaService;

    public function __construct(\think\App $app, FormMetaService $metaService)
    {
        parent::__construct($app); // BaseController 内注入 $this->request，不可省
        $this->metaService = $metaService;
    }

    /** GET /api/form-meta?form_key=&status=&page=&limit= 版本列表（admin） */
    public function index()
    {
        return json(['code' => 200, 'message' => 'success', 'data' => $this->metaService->getList($this->request->param())]);
    }

    /** GET /api/form-meta/published 全部已发布表单（菜单/Agent form list，全登录态） */
    public function published()
    {
        return json(['code' => 200, 'message' => 'success', 'data' => $this->metaService->getPublishedList()]);
    }

    /** GET /api/form-meta/latest/:formKey 最新已发布元数据（渲染入口，全登录态） */
    public function latest(string $formKey)
    {
        return json(['code' => 200, 'message' => 'success', 'data' => $this->metaService->getPublished($formKey)]);
    }

    /** GET /api/form-meta/:id 单版本详情（admin） */
    public function read(int $id)
    {
        return json(['code' => 200, 'message' => 'success', 'data' => $this->metaService->getDetail($id)]);
    }

    /**
     * POST /api/form-meta 保存草稿（admin）
     * body: {form_key, title, layout?, fields[] | schema_json, change_note?}
     */
    public function save()
    {
        $data = $this->request->post();
        return json(['code' => 200, 'message' => '草稿已保存', 'data' => $this->metaService->saveDraft($data)]);
    }

    /**
     * POST /api/form-meta/:id/publish 发布版本（admin，高风险）
     * body: {change_note?}
     */
    public function publish(int $id)
    {
        $note = (string) ($this->request->post('change_note', ''));
        $meta = $this->metaService->publish($id, $note);
        return json(['code' => 200, 'message' => "已发布 {$meta['formKey']} v{$meta['version']}", 'data' => $meta]);
    }

    /** GET /api/form-meta/:id/diff 草稿 vs 当前发布版 diff（Agent 确认卡数据源，admin） */
    public function diff(int $id)
    {
        return json(['code' => 200, 'message' => 'success', 'data' => $this->metaService->diff($id)]);
    }

    /**
     * POST /api/form-meta/draft-from-nl 自然语言 → schema 草稿（admin）
     * body: {form_key, description | fields[], title?, base_version?}
     * 返回 {meta, diff}，调用方（Agent）展示 diff 卡并走确认后再调 publish
     */
    public function draftFromNl()
    {
        $result = $this->metaService->draftFromNl($this->request->post());
        return json(['code' => 200, 'message' => '草稿 schema 已生成，确认后调用 publish 发布', 'data' => $result]);
    }
}

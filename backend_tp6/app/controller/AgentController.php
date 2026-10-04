<?php

namespace app\controller;

use app\BaseController;

/**
 * Agent 工具外露控制器（P3）
 *
 * 本系统不内置 LLM；"Agent 能力外露"= 把表单域操作封装为带 JSON Schema 的
 * 工具清单（本接口），供任意 Agent 客户端（对话 UI / CLI / SDK）发现与调用。
 * 工具执行即调用对应 REST 接口（JWT 鉴权同普通用户），写操作由
 * operation_log 统一留痕，高风险动作（publish）由 Service 侧 admin 校验兜底——
 * 前端确认卡只是体验，越权/未确认直连发布一律被拦。
 */
class AgentController extends BaseController
{
    /**
     * GET /api/agent/tools 工具清单（全登录态）
     *
     * 约定：Agent 客户端按 manifest 中 endpoint 调用；risk=high 的工具
     * 必须先向用户展示确认卡（diff/版本/影响面），用户确认后才发起请求。
     */
    public function tools()
    {
        return json(['code' => 200, 'message' => 'success', 'data' => ['tools' => self::toolManifest()]]);
    }

    /**
     * 工具清单：与 FormMetaService / FormRecordService 接口一一映射
     *
     * @return array<int, array{name, description, risk, endpoint, method, parameters: array}>
     */
    public static function toolManifest(): array
    {
        return [
            [
                'name'        => 'mona_form_get_schema',
                'description' => '获取指定表单最新已发布版本的元数据（字段/类型/必填/选项），Agent 理解表单结构的唯一入口',
                'risk'        => 'read',
                'endpoint'    => '/api/form-meta/latest/{formKey}',
                'method'      => 'GET',
                'parameters'  => [
                    'type'       => 'object',
                    'properties' => [
                        'formKey' => ['type' => 'string', 'description' => '表单标识，如 site_patrol'],
                    ],
                    'required'   => ['formKey'],
                ],
            ],
            [
                'name'        => 'mona_form_list_published',
                'description' => '列出全部已发布表单（form_key/标题/版本/字段数），用于"我的表单"菜单与表单选择',
                'risk'        => 'read',
                'endpoint'    => '/api/form-meta/published',
                'method'      => 'GET',
                'parameters'  => ['type' => 'object', 'properties' => new \stdClass(), 'required' => []],
            ],
            [
                'name'        => 'mona_form_create_record',
                'description' => '为指定表单代填一条记录；字段键必须来自 schema 的 fields[].prop，服务端按元数据二次校验',
                'risk'        => 'medium',
                'endpoint'    => '/api/forms/{formKey}/records',
                'method'      => 'POST',
                'parameters'  => [
                    'type'                 => 'object',
                    'properties'           => [
                        'formKey' => ['type' => 'string'],
                        'biz_ref' => ['type' => 'string', 'description' => '可选：挂接核心单号（如盘点单号）'],
                        'payload' => ['type' => 'object', 'additionalProperties' => true, 'description' => '字段值，键=prop'],
                    ],
                    'required'             => ['formKey', 'payload'],
                    'additionalProperties' => false,
                ],
                'notes'       => '调用前必须先 get_schema 并向用户展示将写入的字段值（确认卡）',
            ],
            [
                'name'        => 'mona_form_query_records',
                'description' => '按 formKey 与过滤条件查询记录；过滤键必须来自 schema 的 fields[].prop，支持 __eq/__neq/__like/__gt/__gte/__lt/__lte 后缀',
                'risk'        => 'read',
                'endpoint'    => '/api/forms/{formKey}/records',
                'method'      => 'GET',
                'parameters'  => [
                    'type'       => 'object',
                    'properties' => [
                        'formKey'  => ['type' => 'string'],
                        'filters'  => ['type' => 'object', 'additionalProperties' => true, 'description' => '如 {"patrol_result":"ABNORMAL","patrol_date__gte":"2026-01-01"}'],
                        'sort'     => ['type' => 'string', 'description' => '如 -created_at 或字段名'],
                        'page'     => ['type' => 'integer', 'default' => 1],
                        'pageSize' => ['type' => 'integer', 'default' => 20],
                    ],
                    'required'   => ['formKey'],
                ],
            ],
            [
                'name'        => 'mona_form_draft_schema',
                'description' => '生成表单新版本草稿：支持自然语言描述（服务端启发式解析）或显式 fields 数组（LLM 生成后传入）；返回 schema diff，供确认卡展示',
                'risk'        => 'medium',
                'endpoint'    => '/api/form-meta/draft-from-nl',
                'method'      => 'POST',
                'parameters'  => [
                    'type'       => 'object',
                    'properties' => [
                        'form_key'     => ['type' => 'string'],
                        'description' => ['type' => 'string', 'description' => '自然语言描述，如：加一个必填下拉"隐患等级"，选项：高/中/低'],
                        'fields'      => ['type' => 'array', 'description' => '显式字段定义（优先于 description）'],
                        'title'       => ['type' => 'string'],
                        'base_version'=> ['type' => 'integer', 'description' => '基线版本，默认当前 published'],
                    ],
                    'required'   => ['form_key'],
                ],
                'notes'       => 'admin only；产物是 DRAFT，未发布不影响线上',
            ],
            [
                'name'        => 'mona_form_publish_schema',
                'description' => '发布表单新版本（高风险）：旧 published 归档、新版本转正、历史记录按旧版宽容渲染不受影响',
                'risk'        => 'high',
                'endpoint'    => '/api/form-meta/{id}/publish',
                'method'      => 'POST',
                'parameters'  => [
                    'type'       => 'object',
                    'properties' => [
                        'id'          => ['type' => 'integer', 'description' => 'draft 版本 ID'],
                        'formKey'     => ['type' => 'string'],
                        'change_note' => ['type' => 'string'],
                    ],
                    'required'   => ['id'],
                ],
                'notes'       => '必须先展示琥珀色确认卡（版本号/diff/影响面），用户明确确认后才可调用；仅 admin，越权直连返回 403',
            ],
        ];
    }
}

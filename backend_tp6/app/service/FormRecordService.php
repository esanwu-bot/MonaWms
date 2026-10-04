<?php

namespace app\service;

use app\common\BizException;
use app\common\Current;
use app\model\FormRecord;
use think\facade\Db;

/**
 * DIY 表单记录服务（P2 运行态）
 *
 * 核心口径：
 * - 永不信任前端：写入前必须读 PUBLISHED 元数据重建校验规则（required/类型/枚举/长度/正则）
 * - DIY 数据只进 ext_attrs JSON，记录行携带 form_version 供历史记录按旧版宽容渲染
 * - 筛选/排序键必须来自元数据 fields[].prop 白名单，JSON 路径与值全部参数化绑定，杜绝注入
 * - operator 只见/只能改本人创建的记录（admin 全量），与核心单据数据口径一致
 */
class FormRecordService
{
    /** 筛选操作符白名单（op → SQL 片段，片段固定不拼接用户输入） */
    private const OP_MAP = [
        'eq'   => '=',
        'neq'  => '<>',
        'gt'   => '>',
        'gte'  => '>=',
        'lt'   => '<',
        'lte'  => '<=',
        'like' => 'LIKE',
    ];

    /** 允许直接排序的基础列（非 JSON 路径） */
    private const SORTABLE_BASE = ['id', 'created_at', 'updated_at', 'biz_ref', 'form_version'];

    public function __construct(private FormMetaService $metaService)
    {
    }

    /** 渲染入口：透出已发布元数据（带缓存，等价 form-meta/latest） */
    public function getPublishedMeta(string $formKey): array
    {
        return $this->metaService->getPublished($formKey);
    }

    // ==================== 写操作 ====================

    /**
     * 创建记录（全登录态可用；Agent 代填走同一入口，operation_log 自动留痕）
     */
    public function create(string $formKey, array $data, string $bizRef = ''): array
    {
        $meta = $this->metaService->getPublished($formKey);
        $this->validateData($meta, $data);

        $row = new FormRecord;
        $row->form_key     = $formKey;
        $row->form_version = $meta['version'];
        $row->biz_ref      = mb_substr($bizRef, 0, 64);
        $row->ext_attrs    = $this->normalizePayload($meta, $data);
        $row->created_by   = Current::idOrNull();
        $row->updated_by   = Current::idOrNull();
        $row->save();

        return $this->toRecord($row);
    }

    /**
     * 更新记录（operator 仅本人；未提供的字段保留原值）
     */
    public function update(string $formKey, int $id, array $data): array
    {
        $row = $this->findOrFail($formKey, $id);
        $this->assertWritable($row);

        $meta = $this->metaService->getPublished($formKey);
        // 合并校验：旧值 + 新值 合在一起过一遍完整校验，required 不因部分更新而绕过
        $merged = array_merge($row->ext_attrs, $data);
        $this->validateData($meta, $merged);

        $row->ext_attrs  = $this->normalizePayload($meta, $merged);
        $row->updated_by = Current::idOrNull();
        $row->biz_ref    = isset($data['biz_ref']) ? mb_substr((string) $data['biz_ref'], 0, 64) : $row->biz_ref;
        $row->save();

        return $this->toRecord($row);
    }

    /**
     * 软删除记录（operator 仅本人；审计留痕，禁止物理删除）
     */
    public function delete(string $formKey, int $id): void
    {
        $row = $this->findOrFail($formKey, $id);
        $this->assertWritable($row);
        $row->delete(); // SoftDelete → deleted_at
    }

    // ==================== 查询 ====================

    /**
     * 记录列表：动态筛选 + 排序 + 分页
     *
     * @param array $params filters(JSON字符串或数组) / sort / page / limit / biz_ref / keyword
     */
    public function getList(string $formKey, array $params = []): array
    {
        $meta = $this->metaService->getPublished($formKey);

        $query = FormRecord::where('form_key', $formKey);

        // operator 只看本人创建的，admin 看全量（与核心单据列表口径一致）
        if (!Current::isAdmin()) {
            $query->where('created_by', Current::id());
        }

        if (!empty($params['biz_ref'])) {
            $query->where('biz_ref', (string) $params['biz_ref']);
        }

        // 动态筛选：白名单 + 参数化 JSON 路径
        $filters = $params['filters'] ?? null;
        if (is_string($filters) && $filters !== '') {
            $filters = json_decode($filters, true);
            if (!is_array($filters)) {
                throw new BizException('FORM_FILTER_INVALID', 'filters 必须是合法 JSON 对象');
            }
        }
        if (is_array($filters) && $filters !== []) {
            $this->applyFilters($query, $meta, $filters);
        }

        // 排序白名单：-created_at / patrol_date 等
        $sort = (string) ($params['sort'] ?? '-created_at');
        $this->applySort($query, $meta, $sort);

        $page  = max(1, (int) ($params['page'] ?? 1));
        $limit = min(200, max(1, (int) ($params['limit'] ?? 20)));
        $result = $query->order('id', 'desc')->paginate(['list_rows' => $limit, 'page' => $page]);

        return [
            'list'  => array_map(fn ($r) => $this->toRecord($r), $result->items()),
            'total' => $result->total(),
            'page'  => $page,
            'limit' => $limit,
        ];
    }

    /**
     * 记录详情：附该记录版本对应的字段元数据（前端宽容渲染依据）
     */
    public function getDetail(string $formKey, int $id): array
    {
        $row = $this->findOrFail($formKey, $id);
        if (!Current::isAdmin() && $row->created_by !== Current::id()) {
            throw new BizException('PERMISSION_DENIED', '只能查看本人创建的记录', [], 403);
        }

        $record = $this->toRecord($row);
        $record['fields'] = $this->fieldsForVersion($formKey, (int) $row->form_version);
        return $record;
    }

    /**
     * CSV 导出（同步流；>1万行拒绝并提示走异步队列——本期限流兜底）
     */
    public function exportCsv(string $formKey, array $params = []): array
    {
        $meta = $this->metaService->getPublished($formKey);

        $query = FormRecord::where('form_key', $formKey);
        if (!Current::isAdmin()) {
            $query->where('created_by', Current::id());
        }
        if (!empty($params['biz_ref'])) {
            $query->where('biz_ref', (string) $params['biz_ref']);
        }
        $filters = $params['filters'] ?? null;
        if (is_string($filters) && $filters !== '') {
            $filters = json_decode($filters, true);
            if (is_array($filters) && $filters !== []) {
                $this->applyFilters($query, $meta, $filters);
            }
        }

        $total = (clone $query)->count();
        if ($total > 10000) {
            throw new BizException('EXPORT_TOO_LARGE', '超过 1 万行请接入异步导出任务（think-queue）');
        }

        $visibleFields = array_values(array_filter(
            $meta['fields'],
            fn ($f) => empty($f['deprecated']) && ($f['listVisible'] ?? true)
        ));

        $rows = $query->order('id', 'asc')->limit(10000)->select();

        // 内存组装（≤1万行 × 数百字节，峰值可控）；带 BOM 便于 Excel 识别 UTF-8
        $out = fopen('php://temp', 'r+');
        fputcsv($out, array_merge(['id', 'form_version', 'biz_ref', 'created_by', 'created_at'], array_column($visibleFields, 'label')));
        foreach ($rows as $r) {
            $line = [(string) $r->id, (string) $r->form_version, (string) $r->biz_ref, (string) $r->created_by, (string) $r->created_at];
            $attrs = is_array($r->ext_attrs) ? $r->ext_attrs : [];
            foreach ($visibleFields as $f) {
                $v = $attrs[$f['prop']] ?? '';
                $line[] = is_array($v) ? implode('|', $v) : (string) $v;
            }
            fputcsv($out, $line);
        }
        rewind($out);
        $csv = stream_get_contents($out);
        fclose($out);

        return [
            'filename' => "{$formKey}_" . date('Ymd_His') . '.csv',
            'content'  => "\xEF\xBB\xBF" . $csv,
        ];
    }

    // ==================== 服务端校验器（引擎心脏） ====================

    /**
     * 按元数据重建规则逐字段校验，错误明细 [{prop, msg}]
     *
     * @throws BizException FORM_VALIDATION_FAILED，data 携带全部错误
     */
    public function validateData(array $meta, array $data): void
    {
        $errors = [];
        $fieldsByProp = [];
        foreach ($meta['fields'] as $f) {
            $fieldsByProp[$f['prop']] = $f;
        }

        // 未知字段直接拒绝（防脏数据混入 ext_attrs）
        foreach (array_keys($data) as $prop) {
            if (!isset($fieldsByProp[$prop])) {
                $errors[] = ['prop' => $prop, 'msg' => '未知字段（不在表单元数据中）'];
            }
        }

        foreach ($meta['fields'] as $f) {
            if (!empty($f['deprecated'])) {
                continue; // 隐藏字段不再强制校验，历史值保留
            }
            $prop = $f['prop'];
            $exists = array_key_exists($prop, $data);
            $val = $data[$prop] ?? null;

            if (!$exists || $val === null || $val === '' || $val === []) {
                if (!empty($f['required'])) {
                    $errors[] = ['prop' => $prop, 'msg' => $f['label'] . ' 为必填项'];
                }
                continue;
            }

            $msg = $this->checkField($f, $val);
            if ($msg !== null) {
                $errors[] = ['prop' => $prop, 'msg' => $f['label'] . '：' . $msg];
            }
        }

        if ($errors) {
            throw new BizException('FORM_VALIDATION_FAILED', '表单数据校验未通过', ['errors' => $errors]);
        }
    }

    /** 单字段类型校验，返回错误消息或 null */
    private function checkField(array $f, $val): ?string
    {
        $type = (string) $f['type'];

        switch ($type) {
            case 'text':
                if (!is_string($val)) {
                    return '必须为文本';
                }
                if (mb_strlen($val) > (int) ($f['maxLen'] ?? 500)) {
                    return '超出长度上限 ' . ($f['maxLen'] ?? 500);
                }
                return $this->checkPattern($f, $val);

            case 'textarea':
                if (!is_string($val)) {
                    return '必须为文本';
                }
                if (mb_strlen($val) > (int) ($f['maxLen'] ?? 5000)) {
                    return '超出长度上限 ' . ($f['maxLen'] ?? 5000);
                }
                return $this->checkPattern($f, $val);

            case 'number':
                if (!is_numeric($val)) {
                    return '必须为数字';
                }
                if (isset($f['min']) && bccomp((string) $val, (string) $f['min'], 4) < 0) {
                    return '不能小于 ' . $f['min'];
                }
                if (isset($f['max']) && bccomp((string) $val, (string) $f['max'], 4) > 0) {
                    return '不能大于 ' . $f['max'];
                }
                return null;

            case 'date':
                return (is_string($val) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $val))
                    ? (strtotime($val) ? null : '日期不存在') : '格式须为 YYYY-MM-DD';

            case 'datetime':
                return (is_string($val) && preg_match('/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/', $val))
                    ? null : '格式须为 YYYY-MM-DD HH:mm[:ss]';

            case 'select':
            case 'radio':
            case 'dict':
                if (!is_string($val)) {
                    return '必须为字符串';
                }
                if ($type === 'dict') {
                    return $this->checkDictValue((string) $f['dict_code'], $val);
                }
                $allowed = array_column($f['options'] ?? [], 'value');
                return in_array($val, $allowed, true) ? null : '取值不在选项范围内';

            case 'checkbox':
                if (!is_array($val)) {
                    return '必须为数组';
                }
                $allowed = array_column($f['options'] ?? [], 'value');
                foreach ($val as $v) {
                    if (!in_array($v, $allowed, true)) {
                        return '存在非法选项值';
                    }
                }
                if (isset($f['max']) && count($val) > (int) $f['max']) {
                    return '选项数量超上限 ' . $f['max'];
                }
                return null;

            case 'switch':
                return is_bool($val) ? null : '必须为布尔值';

            case 'file':
                if (!is_array($val)) {
                    return '必须为文件数组';
                }
                if (count($val) > (int) ($f['max'] ?? 9)) {
                    return '文件数量超上限 ' . ($f['max'] ?? 9);
                }
                foreach ($val as $url) {
                    if (!is_string($url) || !preg_match('#^(https?://|/uploads/)#', $url)) {
                        return '文件项必须为合法 URL';
                    }
                }
                return null;

            case 'sn-scan':
                $list = isset($f['multiple']) && $f['multiple'] ? (array) $val : [$val];
                foreach ($list as $sn) {
                    if (!is_string($sn) || $sn === '') {
                        return 'SN 必须为非空字符串';
                    }
                    // SN 存在性校验可选开启（默认关闭：巡检场景允许录入尚未入库台账的临设）
                    if (!empty($f['validate_sn'])) {
                        $exists = Db::name('serial_numbers')->where('sn_code', $sn)->count() > 0;
                        if (!$exists) {
                            return "SN {$sn} 不在台账中";
                        }
                    }
                }
                return null;

            case 'warehouse-select':
                if (!is_string($val)) {
                    return '必须为字符串';
                }
                $exists = Db::name('warehouses')->where('id', (int) $val)->count() > 0;
                return $exists ? null : '仓库不存在';

            default:
                return "未知字段类型 {$type}";
        }
    }

    /** 自定义正则校验（pattern 可选，对 text/textarea 生效） */
    private function checkPattern(array $f, string $val): ?string
    {
        if (!empty($f['pattern']) && !preg_match((string) $f['pattern'], $val)) {
            return '格式不符合要求';
        }
        return null;
    }

    private function checkDictValue(string $dictCode, string $val): ?string
    {
        $type = Db::name('dictionary_types')->where('code', $dictCode)->find();
        if (!$type) {
            return "字典 {$dictCode} 不存在";
        }
        $ok = Db::name('dictionary_items')
            ->where('type_id', $type['id'])
            ->where('code', $val)
            ->count() > 0;
        return $ok ? null : "取值不在字典 {$dictCode} 范围内";
    }

    // ==================== 筛选/排序翻译 ====================

    /**
     * 动态筛选翻译：prop 白名单（来自元数据）+ 操作符白名单 + 全参数化绑定
     *
     * 形如 {"patrol_result":"ABNORMAL","patrol_date__gte":"2026-01-01","site_code__like":"MJ"}
     */
    private function applyFilters($query, array $meta, array $filters): void
    {
        $props = [];
        foreach ($meta['fields'] as $f) {
            if (empty($f['deprecated'])) {
                $props[$f['prop']] = $f;
            }
        }

        foreach ($filters as $key => $value) {
            if ($value === null || $value === '') {
                continue;
            }
            // 拆 key → [prop, op]
            $op = 'eq';
            $prop = (string) $key;
            if (str_contains($key, '__')) {
                [$prop, $op] = explode('__', $key, 2);
            }

            if (!isset($props[$prop])) {
                // 白名单外一律拒绝：防注入、防探测未定义字段
                throw new BizException('FORM_FILTER_INVALID', "筛选字段 {$prop} 未在表单元数据中定义", ['prop' => $prop]);
            }
            $field = $props[$prop];

            // checkbox（JSON 数组值）等值 → JSON_CONTAINS；其余走标量比较
            if ($field['type'] === 'checkbox' && $op === 'eq') {
                $query->whereRaw(
                    'JSON_CONTAINS(JSON_EXTRACT(ext_attrs, ?), ?)',
                    ['$.' . $prop, json_encode((string) $value)]
                );
                continue;
            }

            if (!isset(self::OP_MAP[$op])) {
                throw new BizException('FORM_FILTER_INVALID', "不支持的操作符 __{$op}");
            }

            $sql = 'JSON_UNQUOTE(JSON_EXTRACT(ext_attrs, ?)) ' . self::OP_MAP[$op];
            $bindPath = '$.' . $prop;

            if ($op === 'like') {
                $value = str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], (string) $value);
                $query->whereRaw(
                    'JSON_UNQUOTE(JSON_EXTRACT(ext_attrs, ?)) LIKE ?',
                    [$bindPath, '%' . $value . '%']
                );
            } else {
                $query->whereRaw($sql . ' ?', [$bindPath, $value]);
            }
        }
    }

    /** 排序翻译：-created_at 降序 / prop 按 JSON 值升序，白名单外拒绝 */
    private function applySort($query, array $meta, string $sort): void
    {
        $sort = trim($sort);
        if ($sort === '') {
            return;
        }
        $dir = 'ASC';
        if ($sort[0] === '-') {
            $dir = 'DESC';
            $sort = substr($sort, 1);
        }
        if (in_array($sort, self::SORTABLE_BASE, true)) {
            $query->order($sort, $dir);
            return;
        }
        foreach ($meta['fields'] as $f) {
            if ($f['prop'] === $sort && empty($f['deprecated'])) {
                // prop 已过白名单，orderRaw 片段无用户输入拼接
                $query->orderRaw("JSON_UNQUOTE(JSON_EXTRACT(ext_attrs, '$.{$sort}')) {$dir}");
                return;
            }
        }
        throw new BizException('FORM_FILTER_INVALID', "排序字段 {$sort} 未在表单元数据中定义");
    }

    // ==================== 内部工具 ====================

    /**
     * 取记录写入版本对应的字段定义（宽容渲染依据）
     *
     * 优先按 form_version 精确取版本元数据；取不到（历史版本被归档清理等）回退当前 PUBLISHED。
     */
    private function fieldsForVersion(string $formKey, int $version): array
    {
        $row = \app\model\FormMetadata::where('form_key', $formKey)
            ->where('version', $version)
            ->find();

        if ($row && is_array($row->schema_json)) {
            return array_values($row->schema_json['fields'] ?? []);
        }
        // 回退：当前发布版
        $meta = $this->metaService->getPublished($formKey);
        return $meta['fields'];
    }

    private function findOrFail(string $formKey, int $id): FormRecord
    {
        $row = FormRecord::where('form_key', $formKey)->find($id);
        if (!$row) {
            throw new BizException('RECORD_NOT_FOUND', '记录不存在', [], 404);
        }
        return $row;
    }

    private function assertWritable(FormRecord $row): void
    {
        if (!Current::isAdmin() && $row->created_by !== Current::id()) {
            throw new BizException('PERMISSION_DENIED', '只能操作本人创建的记录', [], 403);
        }
    }

    /** 归一化落库载荷：只保留元数据定义过的 prop + biz_ref 由参数单独控制 */
    private function normalizePayload(array $meta, array $data): array
    {
        $allowed = [];
        foreach ($meta['fields'] as $f) {
            $allowed[$f['prop']] = true;
        }
        $payload = [];
        foreach ($data as $k => $v) {
            if (isset($allowed[$k])) {
                $payload[$k] = $v;
            }
        }
        return $payload;
    }

    private function toRecord(FormRecord $r): array
    {
        return [
            'id'           => (int) $r->id,
            'form_key'     => (string) $r->form_key,
            'form_version' => (int) $r->form_version,
            'biz_ref'      => (string) $r->biz_ref,
            'ext_attrs'    => is_array($r->ext_attrs) ? $r->ext_attrs : [],
            'created_by'   => $r->created_by,
            'updated_by'   => $r->updated_by,
            'created_at'   => (string) $r->created_at,
            'updated_at'   => (string) $r->updated_at,
        ];
    }
}

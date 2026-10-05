<?php

namespace app\service;

use app\common\BizException;
use app\common\Current;
use app\model\FormMetadata;
use think\facade\Cache;
use think\facade\Db;

/**
 * DIY 表单元数据服务（P1 设计态 + P3 Agent 外露）
 *
 * 核心口径：
 * - 元数据 JSON 是唯一事实来源；版本只增不改（draft → published → archived）
 * - 同 form_key 仅允许一个 published；发布 = 事务内旧 published 归档 + 新版本转 published + 清缓存
 * - prop（字段名）一旦发布即冻结：禁止改名（改名=新增 prop）、禁止换类型，只能 deprecated:true 隐藏
 * - 所有写操作仅系统管理员（表单属系统级资源，等同主数据管理权限）
 */
class FormMetaService
{
    /** 支持的字段类型（前后端契约，新增类型必须同步渲染器与校验器） */
    public const FIELD_TYPES = [
        'text', 'textarea', 'number', 'date', 'datetime',
        'select', 'radio', 'checkbox', 'switch',
        'file', 'sn-scan', 'warehouse-select', 'dict',
    ];

    /** 需要非空 options 的类型 */
    private const OPTION_TYPES = ['select', 'radio', 'checkbox'];

    private const CACHE_PREFIX = 'form_meta_pub_';
    private const CACHE_TTL = 300; // 5 分钟，与前端渲染缓存对齐

    // ==================== 查询 ====================

    /**
     * 表单版本列表（admin）
     */
    public function getList(array $params = []): array
    {
        $this->requireAdmin();

        $query = FormMetadata::order('form_key', 'asc')->order('version', 'desc');

        if (!empty($params['form_key'])) {
            $query->where('form_key', trim($params['form_key']));
        }
        if (!empty($params['status'])) {
            $query->where('status', $params['status']);
        }

        $page = max(1, (int) ($params['page'] ?? 1));
        $limit = min(100, max(1, (int) ($params['limit'] ?? 20)));
        $result = $query->paginate(['list_rows' => $limit, 'page' => $page]);

        return [
            'list'  => array_map(fn ($m) => $this->toMetaSummary($m), $result->items()),
            'total' => $result->total(),
            'page'  => $page,
            'limit' => $limit,
        ];
    }

    /**
     * 某表单最新已发布元数据（渲染/校验/Agent 读 schema 的唯一入口，全登录态可读）
     * 带 5 分钟缓存；发布时主动清除
     */
    public function getPublished(string $formKey): array
    {
        $meta = $this->findPublishedCached($formKey);
        if (!$meta) {
            throw new BizException('FORM_NOT_FOUND', "表单 {$formKey} 不存在或未发布");
        }
        return $meta;
    }

    /**
     * 全部已发布表单（供前端"我的表单"菜单 / Agent form list）
     */
    public function getPublishedList(): array
    {
        $rows = FormMetadata::where('status', FormMetadata::STATUS_PUBLISHED)
            ->order('form_key', 'asc')
            ->group('form_key')
            ->fieldRaw('form_key, MAX(version) AS version')
            ->select()->toArray();

        $list = [];
        foreach ($rows as $row) {
            $meta = $this->findPublishedCached($row['form_key']);
            if ($meta) {
                $list[] = [
                    'form_key'     => $meta['formKey'],
                    'title'        => $meta['title'],
                    'version'      => $meta['version'],
                    'field_count'  => count($meta['fields']),
                    'published_at' => $meta['publishedAt'] ?? null,
                ];
            }
        }
        return $list;
    }

    /**
     * 单个版本详情（admin；Agent 确认卡可读任意版本）
     */
    public function getDetail(int $id): array
    {
        $this->requireAdmin();
        $row = FormMetadata::find($id);
        if (!$row) {
            throw new BizException('FORM_NOT_FOUND', '表单版本不存在', [], 404);
        }
        return $this->toFullMeta($row);
    }

    // ==================== 设计态写操作 ====================

    /**
     * 保存草稿（admin）
     *
     * 版本策略：同表单若最新版本仍是 draft（尚未发布过任何更新），原地更新该草稿；
     * 否则新建 version = max(version)+1。避免设计器反复保存堆出僵尸草稿版本。
     */
    public function saveDraft(array $data): array
    {
        $this->requireAdmin();

        $formKey = (string) ($data['form_key'] ?? '');
        $title   = (string) ($data['title'] ?? '');
        $fields  = $data['fields'] ?? null;

        if ($fields === null) {
            // 允许整体 schema_json 一把传入（Agent/设计器适配器两种形态都兼容）
            $schema = $data['schema_json'] ?? null;
            if (is_string($schema)) {
                $schema = json_decode($schema, true);
            }
            if (!is_array($schema)) {
                throw new BizException('FORM_SCHEMA_INVALID', '缺少 fields 或 schema_json');
            }
            $fields = $schema['fields'] ?? null;
            $title  = $title ?: (string) ($schema['title'] ?? '');
        }

        $meta = [
            'formKey' => $formKey,
            'title'   => $title,
            'layout'  => is_array($data['layout'] ?? null) ? $data['layout'] : ($schema['layout'] ?? ['columns' => 2]),
            'fields'  => is_array($fields) ? array_values($fields) : null,
        ];

        $published = FormMetadata::findPublished($formKey);
        $this->validateSchema($meta, $published ? $this->toFullMeta($published) : null);

        $latest = FormMetadata::findLatest($formKey);

        Db::startTrans();
        try {
            if ($latest && $latest->status === FormMetadata::STATUS_DRAFT) {
                // 原地更新既有草稿，版本号不变
                $latest->title   = $meta['title'];
                $latest->schema_json = $this->buildSchemaJson($meta);
                if (isset($data['change_note'])) {
                    $latest->change_note = (string) $data['change_note'];
                }
                $latest->updated_by = Current::idOrNull();
                $latest->save();
                $row = $latest;
            } else {
                $row = new FormMetadata;
                $row->form_key     = $formKey;
                $row->version      = ($latest ? (int) $latest->version : 0) + 1;
                $row->title        = $meta['title'];
                $row->schema_json  = $this->buildSchemaJson($meta);
                $row->status       = FormMetadata::STATUS_DRAFT;
                $row->change_note  = (string) ($data['change_note'] ?? '');
                $row->created_by   = Current::idOrNull();
                $row->updated_by   = Current::idOrNull();
                $row->save();
            }
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }

        return $this->toFullMeta($row);
    }

    /**
     * 发布版本（admin，高风险动作：Agent 调用必须先经用户确认卡）
     *
     * 同一事务内：旧 published → archived；目标 draft → published + published_at；清缓存。
     * 失败整体回滚，旧 published 不受影响。
     */
    public function publish(int $id, string $changeNote = ''): array
    {
        $this->requireAdmin();

        $row = FormMetadata::find($id);
        if (!$row || $row->status !== FormMetadata::STATUS_DRAFT) {
            throw new BizException('DOC_STATUS_INVALID', '仅草稿版本可发布');
        }

        // 二次校验 prop 不可变约束（草稿保存后仍可能有并发发布）
        $published = FormMetadata::findPublished($row->form_key);
        if ($published && $published->id !== $id) {
            $this->validateSchema($this->toFullMeta($row), $this->toFullMeta($published));
        }

        Db::startTrans();
        try {
            if ($published) {
                FormMetadata::where('id', $published->id)
                    ->update(['status' => FormMetadata::STATUS_ARCHIVED, 'updated_at' => date('Y-m-d H:i:s')]);
            }
            FormMetadata::where('id', $id)->update([
                'status'       => FormMetadata::STATUS_PUBLISHED,
                'change_note'  => $changeNote !== '' ? $changeNote : $row->change_note,
                'published_at' => date('Y-m-d H:i:s'),
                'updated_at'   => date('Y-m-d H:i:s'),
            ]);
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }

        Cache::delete(self::CACHE_PREFIX . $row->form_key);

        return $this->toFullMeta(FormMetadata::find($id));
    }

    /**
     * 草稿 vs 当前已发布版本的 diff（Agent 确认卡数据源）
     *
     * 返回 { added, modified, hidden }，每项含 prop/label/type 及对照明细
     */
    public function diff(int $id): array
    {
        $this->requireAdmin();

        $draft = FormMetadata::find($id);
        if (!$draft) {
            throw new BizException('FORM_NOT_FOUND', '表单版本不存在', [], 404);
        }

        $published = FormMetadata::findPublished($draft->form_key);
        return $this->buildDiff(
            $published ? $this->toFullMeta($published) : null,
            $this->toFullMeta($draft)
        );
    }

    /**
     * 自然语言 → schema 草稿（P3 Agent 对话 DIY 入口，admin）
     *
     * 优先级：请求显式携带 fields（LLM 生成）> 服务端规则解析（关键词启发式）。
     * 服务端启发式只覆盖常见中文表单描述，产物是 DRAFT 草稿，发布前仍要走确认卡。
     */
    public function draftFromNl(array $data): array
    {
        $this->requireAdmin();

        $formKey = (string) ($data['form_key'] ?? '');
        if (!preg_match('/^[a-z][a-z0-9_]{1,63}$/', $formKey)) {
            throw new BizException('FORM_SCHEMA_INVALID', 'form_key 需符合 ^[a-z][a-z0-9_]{1,63}$');
        }

        // 基线：显式 base_version > 当前 published；全新表单基线为空
        $base = null;
        if (!empty($data['base_version'])) {
            $baseRow = FormMetadata::where('form_key', $formKey)
                ->where('version', (int) $data['base_version'])->find();
            $base = $baseRow ? $this->toFullMeta($baseRow) : null;
        }
        if (!$base) {
            $published = FormMetadata::findPublished($formKey);
            $base = $published ? $this->toFullMeta($published) : null;
        }

        $explicitFields = $data['fields'] ?? null;
        if (is_array($explicitFields) && $explicitFields !== []) {
            $newFields = array_values($explicitFields);
        } else {
            $description = (string) ($data['description'] ?? '');
            if ($description === '') {
                throw new BizException('FORM_SCHEMA_INVALID', '缺少 description 或 fields');
            }
            $newFields = $this->parseNlFields($description, $base);
            if (!$newFields) {
                throw new BizException('FORM_SCHEMA_INVALID', '无法从描述中解析出字段，请显式传 fields');
            }
        }

        // 基线字段全量保留（prop 冻结），叠加新字段
        $fields = $base ? $base['fields'] : [];
        foreach ($newFields as $f) {
            $fields[] = $f;
        }

        $meta = [
            'formKey' => $formKey,
            'title'   => (string) ($data['title'] ?? ($base['title'] ?? ($formKey === '' ? '新建表单' : $formKey))),
            'layout'  => $base['layout'] ?? ['columns' => 2],
            'fields'  => $fields,
        ];

        $this->validateSchema($meta, $base);

        return ['meta' => $meta, 'diff' => $this->buildDiff($base, $meta)];
    }

    // ==================== 元数据契约校验 ====================

    /**
     * 校验元数据契约 + prop 冻结约束
     *
     * @param array      $meta      待校验的归一化元数据
     * @param array|null $published 当前已发布元数据（null 表示全新表单）
     * @throws BizException FORM_SCHEMA_INVALID，data 携带 [{prop, msg}] 明细
     */
    public function validateSchema(array $meta, ?array $published): void
    {
        $errors = [];

        if (!preg_match('/^[a-z][a-z0-9_]{1,63}$/', (string) ($meta['formKey'] ?? ''))) {
            $errors[] = ['prop' => 'form_key', 'msg' => 'form_key 需符合 ^[a-z][a-z0-9_]{1,63}$'];
        }
        $title = trim((string) ($meta['title'] ?? ''));
        if ($title === '' || mb_strlen($title) > 128) {
            $errors[] = ['prop' => 'title', 'msg' => 'title 必填且不超过 128 字'];
        }

        $fields = $meta['fields'] ?? [];
        if (!is_array($fields) || $fields === []) {
            $errors[] = ['prop' => 'fields', 'msg' => 'fields 必须为非空数组'];
            $this->throwSchemaInvalid($errors);
        }

        $seen = [];
        foreach ($fields as $i => $f) {
            $prop  = (string) ($f['prop'] ?? '');
            $label = (string) ($f['label'] ?? '');
            $type  = (string) ($f['type'] ?? '');

            if (!preg_match('/^[a-z][a-z0-9_]{0,62}$/', $prop)) {
                $errors[] = ['prop' => "fields[$i].prop", 'msg' => "字段名 {$prop} 需符合 ^[a-z][a-z0-9_]{0,62}$"];
                continue;
            }
            if (isset($seen[$prop])) {
                $errors[] = ['prop' => $prop, 'msg' => '字段名重复'];
                continue;
            }
            $seen[$prop] = true;

            if ($label === '' || mb_strlen($label) > 64) {
                $errors[] = ['prop' => $prop, 'msg' => 'label 必填且不超过 64 字'];
            }
            if (!in_array($type, self::FIELD_TYPES, true)) {
                $errors[] = ['prop' => $prop, 'msg' => "type {$type} 不在支持列表"];
                continue;
            }
            if (in_array($type, self::OPTION_TYPES, true)) {
                $opts = $f['options'] ?? null;
                if (!is_array($opts) || $opts === []) {
                    $errors[] = ['prop' => $prop, 'msg' => "{$type} 类型必须提供非空 options"];
                } else {
                    $vals = [];
                    foreach ($opts as $opt) {
                        if (!isset($opt['value'], $opt['label']) || $opt['value'] === '') {
                            $errors[] = ['prop' => $prop, 'msg' => 'options 每项必须含 label 与 value'];
                            break;
                        }
                        $vals[$opt['value']] = true;
                    }
                    if (count($vals) !== count($opts)) {
                        $errors[] = ['prop' => $prop, 'msg' => 'options 的 value 不得重复'];
                    }
                }
            }
            if ($type === 'number') {
                foreach (['min', 'max'] as $bound) {
                    if (isset($f[$bound]) && !is_numeric($f[$bound])) {
                        $errors[] = ['prop' => $prop, 'msg' => "min/max 必须为数字"];
                    }
                }
            }
            if ($type === 'dict' && empty($f['dict_code'])) {
                $errors[] = ['prop' => $prop, 'msg' => 'dict 类型必须提供 dict_code'];
            }
            if (isset($f['pattern']) && @preg_match((string) $f['pattern'], '') === false) {
                $errors[] = ['prop' => $prop, 'msg' => 'pattern 不是合法的正则表达式'];
            }
            if (isset($f['maxLen']) && (int) $f['maxLen'] > 5000) {
                $errors[] = ['prop' => $prop, 'msg' => 'maxLen 上限 5000'];
            }
        }

        // prop 冻结：对照已发布版本逐字段检查
        if ($published) {
            $newByProp = [];
            foreach ($fields as $f) {
                $newByProp[(string) ($f['prop'] ?? '')] = $f;
            }
            foreach ($published['fields'] as $old) {
                $prop = $old['prop'];
                if (!isset($newByProp[$prop])) {
                    // 发布过的字段不允许物理删除，只能 deprecated:true 隐藏（历史记录仍按旧版渲染）
                    $errors[] = ['prop' => $prop, 'msg' => '已发布字段禁止删除，请改为 deprecated:true 隐藏'];
                    continue;
                }
                if ((string) $newByProp[$prop]['type'] !== (string) $old['type']) {
                    $errors[] = ['prop' => $prop, 'msg' => '已发布字段禁止修改类型（' . $old['type'] . ' → ' . $newByProp[$prop]['type'] . '），需新增字段替代'];
                }
            }
        }

        $this->throwSchemaInvalid($errors);
    }

    // ==================== 内部工具 ====================

    private function requireAdmin(): void
    {
        if (!Current::isAdmin()) {
            throw new BizException('PERMISSION_DENIED', '仅系统管理员可设计/发布表单', [], 403);
        }
    }

    private function throwSchemaInvalid(array $errors): void
    {
        if ($errors) {
            throw new BizException('FORM_SCHEMA_INVALID', '元数据契约校验失败', ['errors' => $errors]);
        }
    }

    private function findPublishedCached(string $formKey): ?array
    {
        $cacheKey = self::CACHE_PREFIX . $formKey;
        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return $cached;
        }
        $row = FormMetadata::findPublished($formKey);
        if (!$row) {
            return null;
        }
        $meta = $this->toFullMeta($row);
        Cache::set($cacheKey, $meta, self::CACHE_TTL);
        return $meta;
    }

    /** 模型行 → 归一化元数据（对外契约形态） */
    private function toFullMeta(FormMetadata $row): array
    {
        $schema = is_array($row->schema_json) ? $row->schema_json : [];
        return [
            'id'           => (int) $row->id,
            'formKey'      => (string) $row->form_key,
            'title'        => (string) $row->title,
            'version'      => (int) $row->version,
            'status'       => (string) $row->status,
            'changeNote'   => (string) $row->change_note,
            'layout'       => $schema['layout'] ?? ['columns' => 2],
            'fields'       => array_values($schema['fields'] ?? []),
            'publishedAt'  => $row->published_at,
            'createdAt'    => $row->created_at,
        ];
    }

    private function toMetaSummary(FormMetadata $row): array
    {
        return [
            'id'          => (int) $row->id,
            'form_key'    => $row->form_key,
            'version'     => (int) $row->version,
            'title'       => $row->title,
            'status'      => $row->status,
            'change_note' => $row->change_note,
            'created_by'  => $row->created_by,
            'published_at'=> $row->published_at,
            'created_at'  => $row->created_at,
            'updated_at'  => $row->updated_at,
        ];
    }

    private function buildSchemaJson(array $meta): array
    {
        return [
            'formKey' => $meta['formKey'],
            'title'   => $meta['title'],
            'layout'  => $meta['layout'],
            'fields'  => $meta['fields'],
        ];
    }

    /**
     * 构造 发布版 vs 新版 的字段 diff（Agent 确认卡）
     */
    public function buildDiff(?array $base, array $next): array
    {
        $baseFields = [];
        foreach (($base['fields'] ?? []) as $f) {
            $baseFields[$f['prop']] = $f;
        }

        $added = $modified = $hidden = [];
        foreach ($next['fields'] as $f) {
            $prop = $f['prop'];
            if (!isset($baseFields[$prop])) {
                $added[] = [
                    'prop' => $prop, 'label' => $f['label'], 'type' => $f['type'],
                    'required' => (bool) ($f['required'] ?? false),
                    'deprecated' => (bool) ($f['deprecated'] ?? false),
                ];
                continue;
            }
            $old = $baseFields[$prop];
            $wasDeprecated = (bool) ($old['deprecated'] ?? false);
            $nowDeprecated = (bool) ($f['deprecated'] ?? false);
            if ($nowDeprecated && !$wasDeprecated) {
                $hidden[] = ['prop' => $prop, 'label' => $f['label'], 'type' => $f['type']];
                continue;
            }
            // 同名字段属性变化（label/required/options 等，类型变化会在发布校验被拦）
            $diffKeys = [];
            foreach (['label', 'required', 'options', 'multiple', 'max', 'maxLen', 'min', 'pattern', 'dict_code'] as $k) {
                if ((isset($old[$k]) !== isset($f[$k]))
                    || (isset($old[$k]) && $old[$k] !== $f[$k])) {
                    $diffKeys[] = $k;
                }
            }
            if ($wasDeprecated && !$nowDeprecated) {
                $diffKeys[] = 'deprecated(恢复显示)';
            }
            if ($diffKeys) {
                $modified[] = ['prop' => $prop, 'label' => $f['label'], 'type' => $f['type'], 'changes' => $diffKeys];
            }
        }

        return [
            'base_version'   => $base['version'] ?? 0,
            'next_version'   => $next['version'] ?? null,
            'added'          => $added,
            'modified'       => $modified,
            'hidden'         => $hidden,
            'added_count'    => count($added),
            'modified_count' => count($modified),
            'hidden_count'   => count($hidden),
        ];
    }

    /**
     * 中文描述 → 字段定义（启发式，产物仅作 DRAFT，发布前有人工确认卡把关）
     *
     * 支持："加一个必填下拉字段'隐患等级'，选项：高/中/低，以及一个'整改照片'上传，最多6张"
     */
    private function parseNlFields(string $description, ?array $base): array
    {
        $fields = [];
        $seq = 0;

        // 按 和/以及/并且/逗号/分号/句号 切分为子句。
        // 必须带 u 修饰符：字节模式下 [，,;；。] 会被拆成单字节字符类，
        // 在 UTF-8 汉字字节中间乱切（E3/80/9C 等字节在汉字中大量出现）
        $clauses = preg_split('/[，,;；。]|以及|并且|和(?=[^，。]{0,24}(字段|下拉|日期|数字|文本|多选|开关|上传|照片|备注|输入框))/u', $description) ?: [];
        $usedProps = [];
        foreach (($base['fields'] ?? []) as $f) {
            $usedProps[$f['prop']] = true;
        }

        foreach ($clauses as $clause) {
            $clause = trim($clause);
            if ($clause === '') {
                continue;
            }
            // 续接子句一："选项：高/中/低" —— 挂到上一个缺 options 的 select/radio 字段
            if (preg_match('/^选项\s*[:：]?\s*(.+)$/u', $clause, $m)) {
                $opts = $this->parseNlOptions($m[1]);
                for ($i = count($fields) - 1; $i >= 0; $i--) {
                    if (in_array($fields[$i]['type'], ['select', 'radio'], true)
                        && ($fields[$i]['options'] ?? []) === []) {
                        $fields[$i]['options'] = $opts;
                        break;
                    }
                }
                continue;
            }
            // 续接子句二："最多6张" —— 挂到上一个 file/checkbox 字段的数量上限
            if (preg_match('/^(?:最多|上限)\s*(\d+)\s*(?:张|个|份|条)/u', $clause, $m)) {
                for ($i = count($fields) - 1; $i >= 0; $i--) {
                    if (in_array($fields[$i]['type'], ['file', 'checkbox'], true)) {
                        $fields[$i]['max'] = (int) $m[1];
                        break;
                    }
                }
                continue;
            }
            $field = $this->parseNlClause($clause, $usedProps, $seq);
            if ($field) {
                $fields[] = $field;
                $usedProps[$field['prop']] = true;
            }
        }
        return $fields;
    }

    /** 解析单个子句 → 一个字段定义 */
    private function parseNlClause(string $clause, array $usedProps, int &$seq): ?array
    {
        $required = (bool) preg_match('/必填|必录|必须填写/', $clause);

        // 类型识别（关键词 → 类型）
        $type = 'text';
        if (preg_match('/多选|复选/', $clause)) {
            $type = 'checkbox';
        } elseif (preg_match('/下拉|单选|选择框/', $clause)) {
            $type = 'select';
        } elseif (preg_match('/扫码|序列号|SN/i', $clause)) {
            $type = 'sn-scan';
        } elseif (preg_match('/上传|照片|图片|附件/', $clause)) {
            $type = 'file';
        } elseif (preg_match('/日期时间|精确到(日|时)/', $clause)) {
            $type = 'datetime';
        } elseif (preg_match('/日期/', $clause)) {
            $type = 'date';
        } elseif (preg_match('/数字|数量|整数|金额/', $clause)) {
            $type = 'number';
        } elseif (preg_match('/是否|开关/', $clause)) {
            $type = 'switch';
        } elseif (preg_match('/仓库/', $clause)) {
            $type = 'warehouse-select';
        } elseif (preg_match('/长文本|备注|说明|多行/', $clause)) {
            $type = 'textarea';
        }

        // 标签：优先取引号内文本，其次「XX字段」「XX下拉」结构（均须 u 修饰符，
        // 否则 [「『] 是字节字符类，汉字中的 80 等字节会导致错位命中）
        $label = '';
        if (preg_match('/[\'"]([^\'"]{1,32})[\'"]/u', $clause, $m)) {
            $label = $m[1];
        } elseif (preg_match('/[「『]([^」』]{1,32})[」』]/u', $clause, $m)) {
            $label = $m[1];
        } elseif (preg_match('/(?:加|新增|添加|增加)一个?(.{1,16}?)(?:必填)?(?:下拉|日期|数字|文本|多选|开关|上传|照片|备注|字段|输入)/u', $clause, $m)) {
            // trim 的字符列表是按字节剥离的，会切掉汉字尾字节，改用 UTF-8 安全的正则剥离
            $label = preg_replace('/^[\'「」『』的]+|[\'「」『』的]+$/u', '', $m[1]);
        }
        if ($label === '') {
            return null; // 无法识别出标签，宁缺毋滥
        }

        $field = [
            'prop'     => $this->deriveProp($label, $usedProps, $seq),
            'label'    => $label,
            'type'     => $type,
            'required' => $required,
        ];

        // 选项：选项[:：]A/B/C 或 （A、B、C），与主描述同句时直接解析；
        // 跨子句的"选项：..."由 parseNlFields 的续接逻辑挂载
        if (in_array($type, ['select', 'checkbox', 'radio'], true)) {
            $options = [];
            if (preg_match('/选项\s*[:：]?\s*(.+)$/u', $clause, $m)) {
                $options = $this->parseNlOptions($m[1]);
            } elseif (preg_match('/[（(]([^（）()]{1,64})[）)]/u', $clause, $m)) {
                $options = $this->parseNlOptions($m[1]);
            }
            if ($options) {
                $field['options'] = $options;
            } elseif ($type !== 'checkbox' && $type !== 'radio') {
                // select 无选项兜底：占位，等人工在设计器补全后才能通过发布校验
                $field['options'] = [];
            }
        }
        if ($type === 'file' && preg_match('/(?:最多|上限)?(\d+)\s*(?:张|个|份|条)/u', $clause, $m)) {
            $field['max'] = (int) $m[1];
        }
        if ($type === 'number' && preg_match('/(?:最大|不超过|≤)\s*(\d+(?:\.\d+)?)/u', $clause, $m)) {
            $field['max'] = (int) $m[1];
        }
        if ($type === 'sn-scan') {
            $field['multiple'] = true;
        }

        return $field;
    }

    /** 解析 "高/中/低"、"高、中、低" 形式的选项串 → [{label, value}] */
    private function parseNlOptions(string $raw): array
    {
        $options = [];
        foreach (preg_split('/[\/、|]|和/u', $raw) ?: [] as $opt) {
            // 正则剥离首尾标点/空白（trim 的字节列表会切汉字尾字节）
            $opt = preg_replace('/^[。，,\s]+|[。，,\s]+$/u', '', $opt);
            if ($opt !== '') {
                $options[] = ['label' => $opt, 'value' => $opt];
            }
        }
        return $options;
    }

    /** 由中文标签推导 prop：转拼音不可行，用 field_N 保底 + 英文标签直用 */
    private function deriveProp(string $label, array $usedProps, int &$seq): string
    {
        // 英文/数字标签直接规范化
        if (preg_match('/^[A-Za-z][A-Za-z0-9 _-]{0,62}$/', $label)) {
            $prop = strtolower(preg_replace('/[^a-z0-9]+/i', '_', trim($label)));
            $prop = trim($prop, '_');
            if ($prop !== '' && !isset($usedProps[$prop])) {
                return $prop;
            }
        }
        do {
            $seq++;
            $prop = 'field_' . $seq;
        } while (isset($usedProps[$prop]));
        return $prop;
    }
}

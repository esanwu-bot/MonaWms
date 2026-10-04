<?php

namespace app\model;

use think\Model;

/**
 * DIY 表单元数据模型
 *
 * 版本链：draft → published → archived，同 form_key 内 version 只增；
 * 元数据 JSON（schema_json）是唯一事实来源，渲染与校验都以它为准。
 */
class FormMetadata extends Model
{
    protected $name = 'form_metadata';
    protected $pk = 'id';

    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';

    /** schema_json 自动 json_encode/decode，关联数组形式读写 */
    protected $json = ['schema_json'];
    protected $jsonAssoc = true;

    protected $type = [
        'id' => 'integer',
        'version' => 'integer',
        'created_by' => 'integer',
    ];

    protected $readonly = ['id', 'form_key', 'created_at'];

    protected $field = [
        'id',
        'form_key',
        'version',
        'title',
        'schema_json',
        'status',
        'change_note',
        'created_by',
        'published_at',
        'created_at',
        'updated_at',
    ];

    public const STATUS_DRAFT = 'draft';
    public const STATUS_PUBLISHED = 'published';
    public const STATUS_ARCHIVED = 'archived';

    /**
     * 某表单最新已发布版本（渲染/校验/Agent 读 schema 的唯一入口）
     */
    public static function findPublished(string $formKey): ?self
    {
        return self::where('form_key', $formKey)
            ->where('status', self::STATUS_PUBLISHED)
            ->order('version', 'desc')
            ->find();
    }

    /**
     * 某表单最新版本（任意状态，草稿编辑用）
     */
    public static function findLatest(string $formKey): ?self
    {
        return self::where('form_key', $formKey)
            ->order('version', 'desc')
            ->find();
    }
}

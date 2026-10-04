<?php

namespace app\model;

use think\Model;
use think\model\concern\SoftDelete;

/**
 * DIY 表单记录模型
 *
 * DIY 字段值全部存 ext_attrs JSON（键 = 元数据 fields[].prop），
 * 不给核心表加物理列；form_version 记录写入时的表单版本，历史记录按旧版宽容渲染。
 */
class FormRecord extends Model
{
    use SoftDelete;

    protected $name = 'form_records';
    protected $pk = 'id';

    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';
    protected $deleteTime = 'deleted_at';

    /** ext_attrs 自动 json_encode/decode，关联数组形式读写 */
    protected $json = ['ext_attrs'];
    protected $jsonAssoc = true;

    protected $type = [
        'id' => 'integer',
        'form_version' => 'integer',
        'created_by' => 'integer',
        'updated_by' => 'integer',
    ];

    protected $readonly = ['id', 'form_key', 'created_at'];

    protected $field = [
        'id',
        'form_key',
        'form_version',
        'biz_ref',
        'ext_attrs',
        'created_by',
        'updated_by',
        'created_at',
        'updated_at',
        'deleted_at',
    ];
}

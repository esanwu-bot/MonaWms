<?php
declare (strict_types = 1);

namespace app\model;

use think\Model;

class DictionaryType extends Model
{
    protected $name = 'dictionary_types';
    protected $pk = 'id';
    
    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';
    
    // 字段类型转换
    protected $type = [
        'id' => 'integer',
        'status' => 'string',
    ];
    
    // 关联字典项
    public function items()
    {
        return $this->hasMany(DictionaryItem::class, 'type_id', 'id');
    }
    
    // 获取活跃的字典类型
    public static function getActive()
    {
        return self::where('status', 'active')->select();
    }
    
    // 根据编码获取字典类型
    public static function getByCode($code)
    {
        return self::where('code', $code)->find();
    }
}
<?php
declare (strict_types = 1);

namespace app\model;

use think\Model;

class DictionaryItem extends Model
{
    protected $name = 'dictionary_items';
    protected $pk = 'id';
    
    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';
    
    // 字段类型转换
    protected $type = [
        'id' => 'integer',
        'type_id' => 'integer',
        'sort_order' => 'integer',
        'status' => 'string',
    ];
    
    // 关联字典类型
    public function type()
    {
        return $this->belongsTo(DictionaryType::class, 'type_id', 'id');
    }
    
    // 获取指定类型的字典项
    public static function getByTypeId($typeId, $onlyActive = true)
    {
        $query = self::where('type_id', $typeId);
        if ($onlyActive) {
            $query->where('status', 'active');
        }
        return $query->order('sort_order', 'asc')->select();
    }
    
    // 根据类型编码和项编码获取字典项
    public static function getByTypeCodeAndItemCode($typeCode, $itemCode)
    {
        $type = DictionaryType::getByCode($typeCode);
        if (!$type) {
            return null;
        }
        
        return self::where([
            'type_id' => $type->id,
            'code' => $itemCode
        ])->find();
    }
}
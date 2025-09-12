<?php

namespace app\model;

use think\Model;

/**
 * BOM头表模型
 */
class BOMHeader extends Model
{
    // 表名
    protected $name = 'bom_headers';
    
    // 主键
    protected $pk = 'id';
    
    // 自动时间戳
    protected $autoWriteTimestamp = 'datetime';
    
    // 时间字段
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';
    
    // 字段类型转换
    protected $type = [
        'id' => 'integer',
        'product_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];
    
    // 只读字段
    protected $readonly = ['id', 'created_at'];
    
    // 字段映射
    protected $field = [
        'id',
        'bom_code',          // BOM编号
        'product_id',        // 主产品ID
        'version',           // 版本号
        'description',       // 描述
        'status',            // 状态：active（激活）, inactive（非激活）
        'created_at',
        'updated_at'
    ];
    
    /**
     * 状态枚举
     */
    const STATUS_ACTIVE = 'active';
    const STATUS_INACTIVE = 'inactive';
    
    /**
     * 获取状态中文名
     */
    public function getStatusTextAttr($value, $data)
    {
        $statuses = [
            self::STATUS_ACTIVE => '激活',
            self::STATUS_INACTIVE => '非激活'
        ];
        
        return $statuses[$data['status']] ?? '未知';
    }
    
    /**
     * 关联主产品
     */
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
    
    /**
     * 关联BOM明细
     */
    public function items()
    {
        return $this->hasMany(BOMItem::class, 'bom_header_id');
    }
}
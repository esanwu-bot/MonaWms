<?php

namespace app\model;

use think\Model;

/**
 * BOM主表模型
 */
class BomMaster extends Model
{
    // 表名
    protected $name = 'bom_masters';
    
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
        'updated_at' => 'datetime',
        'effective_date' => 'date',
        'expiry_date' => 'date'
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
        'status',            // 状态：draft（草稿）, active（生效）, obsolete（废弃）
        'effective_date',    // 生效日期
        'expiry_date',       // 失效日期
        'created_by',        // 创建人
        'notes',             // 备注
        'created_at',
        'updated_at'
    ];
    
    /**
     * 状态枚举
     */
    const STATUS_DRAFT = 'draft';
    const STATUS_ACTIVE = 'active';
    const STATUS_OBSOLETE = 'obsolete';
    
    /**
     * 获取状态中文名
     */
    public function getStatusTextAttr($value, $data)
    {
        $statuses = [
            self::STATUS_DRAFT => '草稿',
            self::STATUS_ACTIVE => '生效',
            self::STATUS_OBSOLETE => '废弃'
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
    public function bomItems()
    {
        return $this->hasMany(BomItem::class, 'bom_id');
    }
}
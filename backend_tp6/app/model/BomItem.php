<?php

namespace app\model;

use think\Model;

/**
 * BOM明细模型
 */
class BomItem extends Model
{
    // 表名
    protected $name = 'bom_items';
    
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
        'bom_id' => 'integer',
        'component_product_id' => 'integer',
        'quantity' => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];
    
    // 只读字段
    protected $readonly = ['id', 'created_at'];
    
    // 字段映射
    protected $field = [
        'id',
        'bom_id',                // BOM主表ID
        'component_product_id',  // 组件产品ID
        'quantity',              // 数量
        'unit',                  // 单位
        'position',              // 位置/安装位置
        'is_key_component',      // 是否关键组件
        'notes',                 // 备注
        'created_at',
        'updated_at'
    ];
    
    /**
     * 关联BOM主表
     */
    public function bomMaster()
    {
        return $this->belongsTo(BomMaster::class, 'bom_id');
    }
    
    /**
     * 关联组件产品
     */
    public function componentProduct()
    {
        return $this->belongsTo(Product::class, 'component_product_id');
    }
}
<?php

namespace app\model;

use think\Model;

/**
 * 项目库存预留模型
 */
class ProjectInventoryReservation extends Model
{
    // 表名
    protected $name = 'project_inventory_reservations';
    
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
        'project_id' => 'integer',
        'product_id' => 'integer',
        'quantity' => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];
    
    // 只读字段
    protected $readonly = ['id', 'created_at'];
    
    // 字段映射
    protected $field = [
        'id',
        'project_id',        // 项目ID
        'product_id',        // 产品ID
        'quantity',          // 预留数量
        'notes',             // 备注
        'created_at',
        'updated_at'
    ];
    
    /**
     * 关联项目
     */
    public function project()
    {
        return $this->belongsTo(Project::class, 'project_id');
    }
    
    /**
     * 关联产品
     */
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
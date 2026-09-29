<?php

namespace app\model;

use think\Model;

/**
 * 序列号历史记录模型（SN 单件状态变更留痕，B2）
 */
class SerialNumberHistory extends Model
{
    // 表名
    protected $name = 'serial_number_history';
    
    // 主键
    protected $pk = 'id';
    
    // 自动时间戳
    protected $autoWriteTimestamp = false;
    
    // 时间字段
    protected $createTime = 'created_at';
    protected $updateTime = false;
    
    // 字段类型转换
    protected $type = [
        'id' => 'integer',
        'serial_number_id' => 'integer',
        'location_before' => 'integer',
        'location_after' => 'integer',
        'operator_id' => 'integer',
        'reference_id' => 'integer',
        'created_at' => 'datetime'
    ];
    
    // 字段映射
    protected $field = [
        'id',
        'serial_number_id',
        'event_type',
        'status_before',
        'status_after',
        'location_before',
        'location_after',
        'reference_type',
        'reference_id',
        'operator_id',
        'notes',
        'created_at'
    ];
    
    /**
     * 关联序列号
     */
    public function serialNumber()
    {
        return $this->belongsTo(SerialNumber::class, 'serial_number_id');
    }
    
    /**
     * 关联操作人
     */
    public function operator()
    {
        return $this->belongsTo(User::class, 'operator_id');
    }
}

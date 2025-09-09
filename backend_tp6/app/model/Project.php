<?php

namespace app\model;

use think\Model;

/**
 * 项目模型
 */
class Project extends Model
{
    // 表名
    protected $name = 'projects';
    
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
        'customer_id' => 'integer',
        'manager_id' => 'integer',
        'budget' => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'start_date' => 'date',
        'end_date' => 'date'
    ];
    
    // 只读字段
    protected $readonly = ['id', 'created_at'];
    
    // 字段映射
    protected $field = [
        'id',
        'project_code',      // 项目编号
        'name',              // 项目名称
        'description',       // 项目描述
        'customer_id',       // 客户ID
        'manager_id',        // 项目经理ID
        'location',          // 项目地点
        'status',            // 状态：planning（规划中）, in_progress（进行中）, completed（已完成）, cancelled（已取消）
        'budget',            // 预算
        'start_date',        // 开始日期
        'end_date',          // 结束日期
        'notes',             // 备注
        'created_at',
        'updated_at'
    ];
    
    /**
     * 状态枚举
     */
    const STATUS_PLANNING = 'planning';
    const STATUS_IN_PROGRESS = 'in_progress';
    const STATUS_COMPLETED = 'completed';
    const STATUS_CANCELLED = 'cancelled';
    
    /**
     * 获取状态中文名
     */
    public function getStatusTextAttr($value, $data)
    {
        $statuses = [
            self::STATUS_PLANNING => '规划中',
            self::STATUS_IN_PROGRESS => '进行中',
            self::STATUS_COMPLETED => '已完成',
            self::STATUS_CANCELLED => '已取消'
        ];
        
        return $statuses[$data['status']] ?? '未知';
    }
    
    /**
     * 关联客户
     */
    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }
    
    /**
     * 关联项目经理（用户）
     */
    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_id');
    }
    
    /**
     * 关联产品
     */
    public function products()
    {
        return $this->hasMany(Product::class, 'project_id');
    }
}
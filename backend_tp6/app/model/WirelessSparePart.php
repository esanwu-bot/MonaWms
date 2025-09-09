<?php

namespace app\model;

use think\Model;

/**
 * 无线备件模型
 */
class WirelessSparePart extends Model
{
    // 表名
    protected $name = 'wireless_spare_parts';
    
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
        'quantity' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];
    
    // 只读字段
    protected $readonly = ['id', 'created_at'];
    
    // 字段映射
    protected $field = [
        'id',
        'code',
        'part_name',
        'model',
        'serial_number',
        'type',
        'quantity',
        'operator',
        'project',
        'status',
        'created_at',
        'updated_at'
    ];
    
    /**
     * 状态枚举
     */
    const STATUS_INBOUND = 'inbound';
    const STATUS_OUTBOUND = 'outbound';
    const STATUS_RETURNED = 'returned';
    
    /**
     * 获取状态中文名
     */
    public function getStatusTextAttr($value, $data)
    {
        $statuses = [
            self::STATUS_INBOUND => '入库',
            self::STATUS_OUTBOUND => '出库',
            self::STATUS_RETURNED => '退货'
        ];
        
        return $statuses[$data['status']] ?? '未知';
    }
    
    /**
     * 类型枚举
     */
    const TYPE_5G = '5G';
    const TYPE_4G = '4G';
    const TYPE_3G = '3G';
    const TYPE_2G = '2G';
    const TYPE_OTHER = 'other';
    
    /**
     * 获取类型中文名
     */
    public function getTypeTextAttr($value, $data)
    {
        $types = [
            self::TYPE_5G => '5G',
            self::TYPE_4G => '4G',
            self::TYPE_3G => '3G',
            self::TYPE_2G => '2G',
            self::TYPE_OTHER => '其他'
        ];
        
        return $types[$data['type']] ?? '未知';
    }
    
    /**
     * 搜索器：备件名称
     */
    public function searchPartNameAttr($query, $value)
    {
        $query->where('part_name', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：型号
     */
    public function searchModelAttr($query, $value)
    {
        $query->where('model', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：类型
     */
    public function searchTypeAttr($query, $value)
    {
        $query->where('type', $value);
    }
    
    /**
     * 搜索器：状态
     */
    public function searchStatusAttr($query, $value)
    {
        $query->where('status', $value);
    }
}
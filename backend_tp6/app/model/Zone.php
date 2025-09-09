<?php

namespace app\model;

use think\Model;

/**
 * 库区模型
 */
class Zone extends Model
{
    // 表名
    protected $name = 'zones';
    
    // 主键
    protected $pk = 'id';
    
    // 自动时间戳
    protected $autoWriteTimestamp = 'datetime';
    
    // 时间字段
    protected $createTime = 'created_at';
    protected $updateTime = false;
    
    // 字段类型转换
    protected $type = [
        'id' => 'integer',
        'warehouse_id' => 'integer',
        'created_at' => 'datetime'
    ];
    
    // 只读字段
    protected $readonly = ['id', 'created_at'];
    
    // 字段映射
    protected $field = [
        'id',
        'warehouse_id',
        'code',
        'name',
        'type',
        'description',
        'created_at'
    ];
    
    /**
     * 库区类型枚举
     */
    const TYPE_STORAGE = 'storage';
    const TYPE_PICKING = 'picking';
    const TYPE_STAGING = 'staging';
    const TYPE_SHIPPING = 'shipping';
    const TYPE_RECEIVING = 'receiving';
    
    /**
     * 获取类型中文名
     */
    public function getTypeTextAttr($value, $data)
    {
        $types = [
            self::TYPE_STORAGE => '存储区',
            self::TYPE_PICKING => '拣货区',
            self::TYPE_STAGING => '暂存区',
            self::TYPE_SHIPPING => '发货区',
            self::TYPE_RECEIVING => '收货区'
        ];
        
        return $types[$data['type']] ?? '未知';
    }
    
    /**
     * 关联仓库
     */
    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }
    
    /**
     * 关联货架
     */
    public function shelves()
    {
        return $this->hasMany(Shelf::class, 'zone_id');
    }
    
    /**
     * 搜索器：库区编码
     */
    public function searchCodeAttr($query, $value)
    {
        $query->where('code', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：库区名称
     */
    public function searchNameAttr($query, $value)
    {
        $query->where('name', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：库区类型
     */
    public function searchTypeAttr($query, $value)
    {
        $query->where('type', $value);
    }
    
    /**
     * 搜索器：仓库ID
     */
    public function searchWarehouseIdAttr($query, $value)
    {
        $query->where('warehouse_id', $value);
    }
    
    /**
     * 获取库区统计信息
     */
    public function getStatistics()
    {
        $statistics = [
            'shelves_count' => $this->shelves()->count(),
            'locations_count' => 0,
            'occupied_locations' => 0,
            'available_locations' => 0,
            'utilization_rate' => 0
        ];
        
        // 统计库位信息
        $shelves = $this->shelves()->with(['locations.inventory'])->select();
        
        foreach ($shelves as $shelf) {
            $statistics['locations_count'] += $shelf->locations->count();
            
            foreach ($shelf->locations as $location) {
                if ($location->inventory->count() > 0) {
                    $statistics['occupied_locations']++;
                } else {
                    $statistics['available_locations']++;
                }
            }
        }
        
        // 计算利用率
        if ($statistics['locations_count'] > 0) {
            $statistics['utilization_rate'] = round(
                ($statistics['occupied_locations'] / $statistics['locations_count']) * 100,
                2
            );
        }
        
        return $statistics;
    }
}
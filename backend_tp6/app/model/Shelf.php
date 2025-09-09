<?php

namespace app\model;

use think\Model;

/**
 * 货架模型
 */
class Shelf extends Model
{
    // 表名
    protected $name = 'shelves';
    
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
        'zone_id' => 'integer',
        'created_at' => 'datetime'
    ];
    
    // 只读字段
    protected $readonly = ['id', 'created_at'];
    
    // 字段映射
    protected $field = [
        'id',
        'zone_id',
        'code',
        'name',
        'description',
        'created_at'
    ];
    
    /**
     * 关联库区
     */
    public function zone()
    {
        return $this->belongsTo(Zone::class, 'zone_id');
    }
    
    /**
     * 关联库位
     */
    public function locations()
    {
        return $this->hasMany(Location::class, 'shelf_id');
    }
    
    /**
     * 搜索器：货架编码
     */
    public function searchCodeAttr($query, $value)
    {
        $query->where('code', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：货架名称
     */
    public function searchNameAttr($query, $value)
    {
        $query->where('name', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：库区ID
     */
    public function searchZoneIdAttr($query, $value)
    {
        $query->where('zone_id', $value);
    }
    
    /**
     * 获取货架统计信息
     */
    public function getStatistics()
    {
        $statistics = [
            'locations_count' => $this->locations()->count(),
            'occupied_locations' => 0,
            'available_locations' => 0,
            'utilization_rate' => 0,
            'total_quantity' => 0
        ];
        
        // 统计库位信息
        $locations = $this->locations()->with(['inventory'])->select();
        
        foreach ($locations as $location) {
            if ($location->inventory->count() > 0) {
                $statistics['occupied_locations']++;
                
                // 统计总库存数量
                foreach ($location->inventory as $inventory) {
                    $statistics['total_quantity'] += $inventory->quantity;
                }
            } else {
                $statistics['available_locations']++;
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
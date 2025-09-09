<?php

namespace app\model;

use think\Model;

/**
 * 仓库模型
 */
class Warehouse extends Model
{
    // 表名
    protected $name = 'warehouses';
    
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
        'manager_id' => 'integer',
        'created_at' => 'datetime'
    ];
    
    // 只读字段
    protected $readonly = ['id', 'created_at'];
    
    // 字段映射
    protected $field = [
        'id',
        'code',
        'name',
        'address',
        'manager_id',
        'status',
        'created_at'
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
            self::STATUS_ACTIVE => '启用',
            self::STATUS_INACTIVE => '禁用'
        ];
        
        return $statuses[$data['status']] ?? '未知';
    }
    
    /**
     * 关联管理员
     */
    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_id');
    }
    
    /**
     * 关联库区
     */
    public function zones()
    {
        return $this->hasMany(Zone::class, 'warehouse_id');
    }
    
    /**
     * 关联入库单
     */
    public function inboundOrders()
    {
        return $this->hasMany(InboundOrder::class, 'warehouse_id');
    }
    
    /**
     * 关联出库单
     */
    public function outboundOrders()
    {
        return $this->hasMany(OutboundOrder::class, 'warehouse_id');
    }
    
    /**
     * 搜索器：仓库编码
     */
    public function searchCodeAttr($query, $value)
    {
        $query->where('code', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：仓库名称
     */
    public function searchNameAttr($query, $value)
    {
        $query->where('name', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：状态
     */
    public function searchStatusAttr($query, $value)
    {
        $query->where('status', $value);
    }
    
    /**
     * 搜索器：管理员
     */
    public function searchManagerIdAttr($query, $value)
    {
        $query->where('manager_id', $value);
    }
    
    /**
     * 获取仓库统计信息
     */
    public function getStatistics()
    {
        $statistics = [
            'zones_count' => $this->zones()->count(),
            'products_count' => 0,
            'inventory_count' => 0,
            'inbound_orders_count' => $this->inboundOrders()->count(),
            'outbound_orders_count' => $this->outboundOrders()->count()
        ];
        
        // 通过库区->货架->库位->库存统计商品和库存数量
        $zones = $this->zones()->with(['shelves.locations.inventory'])->select();
        $productsSet = [];
        $totalInventory = 0;
        
        foreach ($zones as $zone) {
            foreach ($zone->shelves as $shelf) {
                foreach ($shelf->locations as $location) {
                    foreach ($location->inventory as $inventory) {
                        $productsSet[$inventory->product_id] = true;
                        $totalInventory += $inventory->quantity;
                    }
                }
            }
        }
        
        $statistics['products_count'] = count($productsSet);
        $statistics['inventory_count'] = $totalInventory;
        
        return $statistics;
    }
}
<?php

namespace app\model;

use think\Model;

/**
 * 库位模型
 */
class Location extends Model
{
    // 表名
    protected $name = 'locations';
    
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
        'shelf_id' => 'integer',
        'created_at' => 'datetime'
    ];
    
    // 只读字段
    protected $readonly = ['id', 'created_at'];
    
    // 字段映射
    protected $field = [
        'id',
        'shelf_id',
        'code',
        'name',
        'barcode',
        'description',
        'created_at'
    ];
    
    /**
     * 关联货架
     */
    public function shelf()
    {
        return $this->belongsTo(Shelf::class, 'shelf_id');
    }
    
    /**
     * 关联库存
     */
    public function inventory()
    {
        return $this->hasMany(Inventory::class, 'location_id');
    }
    
    /**
     * 关联库存变动记录
     */
    public function inventoryTransactions()
    {
        return $this->hasMany(InventoryTransaction::class, 'location_id');
    }
    
    /**
     * 搜索器：库位编码
     */
    public function searchCodeAttr($query, $value)
    {
        $query->where('code', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：库位名称
     */
    public function searchNameAttr($query, $value)
    {
        $query->where('name', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：条码
     */
    public function searchBarcodeAttr($query, $value)
    {
        $query->where('barcode', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：货架ID
     */
    public function searchShelfIdAttr($query, $value)
    {
        $query->where('shelf_id', $value);
    }
    
    /**
     * 检查库位是否为空
     */
    public function isEmpty()
    {
        return $this->inventory()->count() === 0;
    }
    
    /**
     * 获取库位总库存数量
     */
    public function getTotalQuantity()
    {
        return $this->inventory()->sum('quantity');
    }
    
    /**
     * 获取库位商品种类数
     */
    public function getProductCount()
    {
        return $this->inventory()->count();
    }
    
    /**
     * 获取库位详细信息
     */
    public function getDetailInfo()
    {
        $info = [
            'location' => $this->toArray(),
            'is_empty' => $this->isEmpty(),
            'total_quantity' => $this->getTotalQuantity(),
            'product_count' => $this->getProductCount(),
            'inventory_list' => []
        ];
        
        // 获取库存详情
        $inventoryList = $this->inventory()->with(['product'])->select();
        foreach ($inventoryList as $inventory) {
            $info['inventory_list'][] = [
                'product_id' => $inventory->product_id,
                'product_name' => $inventory->product->name ?? '',
                'product_sku' => $inventory->product->sku ?? '',
                'quantity' => $inventory->quantity,
                'updated_at' => $inventory->updated_at
            ];
        }
        
        return $info;
    }
    
    /**
     * 根据条码查找库位
     */
    public static function findByBarcode($barcode)
    {
        return self::where('barcode', $barcode)->find();
    }
}
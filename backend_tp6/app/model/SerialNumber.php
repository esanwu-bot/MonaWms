<?php

namespace app\model;

use think\Model;

/**
 * 序列号模型
 */
class SerialNumber extends Model
{
    // 表名
    protected $name = 'serial_numbers';
    
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
        'stock_id' => 'integer',
        'inbound_id' => 'integer',
        'outbound_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];
    
    // 只读字段
    protected $readonly = ['id', 'created_at'];
    
    // 字段映射
    protected $field = [
        'id',
        'serial_number',      // 序列号
        'product_id',         // 关联产品ID
        'stock_id',           // 当前库存ID（如果在库存中）
        'inbound_id',         // 入库单ID
        'outbound_id',        // 出库单ID（如果已出库）
        'manufacture_date',   // 生产日期
        'warranty_period',    // 保修期（月）
        'warranty_end_date',  // 保修截止日期
        'status',             // 状态：in_stock（在库）, sold（已售出）, scrapped（已报废）
        'location',           // 当前位置（如：仓库A-01-02，或客户现场）
        'notes',              // 备注
        'created_at',
        'updated_at'
    ];
    
    /**
     * 状态枚举
     */
    const STATUS_IN_STOCK = 'in_stock';
    const STATUS_SOLD = 'sold';
    const STATUS_SCRAPPED = 'scrapped';
    
    /**
     * 获取状态中文名
     */
    public function getStatusTextAttr($value, $data)
    {
        $statuses = [
            self::STATUS_IN_STOCK => '在库',
            self::STATUS_SOLD => '已售出',
            self::STATUS_SCRAPPED => '已报废'
        ];
        
        return $statuses[$data['status']] ?? '未知';
    }
    
    /**
     * 关联产品
     */
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
    
    /**
     * 关联库存
     */
    public function stock()
    {
        return $this->belongsTo(Stock::class, 'stock_id');
    }
    
    /**
     * 关联入库单
     */
    public function inbound()
    {
        return $this->belongsTo(Inbound::class, 'inbound_id');
    }
    
    /**
     * 关联出库单
     */
    public function outbound()
    {
        return $this->belongsTo(Outbound::class, 'outbound_id');
    }
}
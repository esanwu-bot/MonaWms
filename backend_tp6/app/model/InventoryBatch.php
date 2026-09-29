<?php

namespace app\model;

use think\Model;

/**
 * 散料批次台账模型（P9）
 *
 * 普件（计件）走 serial_numbers 台账"状态流转"；
 * 散料（长度/重量等）走本表"余量扣减"：入库 initial=remaining，出库按 FIFO/指定批次扣 remaining，
 * 扣到 0 置 exhausted。总账 inventory.quantity 必须与 remaining 合计一致（对账校验）。
 */
class InventoryBatch extends Model
{
    protected $name = 'inventory_batches';

    protected $pk = 'id';

    protected $autoWriteTimestamp = 'datetime';

    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';

    // P8: DECIMAL(18,4) 按 string 处理，禁止 float 累加
    protected $type = [
        'id' => 'integer',
        'product_id' => 'integer',
        'warehouse_id' => 'integer',
        'location_id' => 'integer',
        'initial_quantity' => 'string',
        'remaining_quantity' => 'string',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    protected $readonly = ['id', 'created_at'];

    protected $field = [
        'id',
        'product_id',
        'warehouse_id',
        'location_id',
        'batch_no',
        'initial_quantity',
        'remaining_quantity',
        'unit',
        'status',
        'inbound_item_id',
        'inbound_order_id',
        'inbound_at',
        'notes',
        'created_at',
        'updated_at'
    ];

    const STATUS_ACTIVE = 'active';         // 在用（有余量）
    const STATUS_EXHAUSTED = 'exhausted';   // 已用完

    /**
     * 关联商品
     */
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /**
     * 关联库位
     */
    public function location()
    {
        return $this->belongsTo(Location::class, 'location_id');
    }

    /**
     * 关联入库单
     */
    public function inboundOrder()
    {
        return $this->belongsTo(InboundOrder::class, 'inbound_order_id');
    }

    /**
     * 获取批次状态中文名
     */
    public function getStatusTextAttr($value, $data)
    {
        $texts = [
            self::STATUS_ACTIVE => '在用',
            self::STATUS_EXHAUSTED => '已用完'
        ];
        return $texts[$data['status'] ?? ''] ?? '未知';
    }
}

<?php

namespace app\model;

use think\Model;

/**
 * 出库单明细模型
 */
class OutboundOrderItem extends Model
{
    // 表名
    protected $name = 'outbound_order_items';
    
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
        'outbound_order_id' => 'integer',
        'product_id' => 'integer',
        'location_id' => 'integer',
        // P8: DECIMAL(18,4) 按 string 处理
        'quantity' => 'string',
        'picked_quantity' => 'string',
        'unit_price' => 'string',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];
    
    // 只读字段
    protected $readonly = ['id', 'created_at'];
    
    // 字段映射
    protected $field = [
        'id',
        'outbound_order_id',
        'product_id',
        'location_id',
        'unit',              // P8: 单位快照（A6）
        'quantity',
        'picked_quantity',
        'unit_price',
        'requires_serial',
        'batch_number',
        'notes',
        'created_at',
        'updated_at'
    ];
    
    /**
     * 获取剩余数量
     */
    public function getRemainingQuantityAttr($value, $data)
    {
        return bcsub((string)($data['quantity'] ?? '0'), (string)($data['picked_quantity'] ?? '0'), 4);
    }
    
    /**
     * 获取完成率
     */
    public function getCompletionRateAttr($value, $data)
    {
        $quantity = (string)($data['quantity'] ?? '0');
        if (bccomp($quantity, '0', 4) <= 0) {
            return 0;
        }
        
        $pickedQuantity = (string)($data['picked_quantity'] ?? '0');
        return (float) bcmul(bcdiv($pickedQuantity, $quantity, 6), '100', 2);
    }
    
    /**
     * 获取总金额（A7：bcmul）
     */
    public function getTotalAmountAttr($value, $data)
    {
        return bcmul((string)($data['quantity'] ?? '0'), (string)($data['unit_price'] ?? '0'), 4);
    }
    
    /**
     * 关联出库单
     */
    public function outboundOrder()
    {
        return $this->belongsTo(OutboundOrder::class, 'outbound_order_id');
    }
    
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
     * 搜索器：出库单ID
     */
    public function searchOutboundOrderIdAttr($query, $value)
    {
        $query->where('outbound_order_id', $value);
    }
    
    /**
     * 搜索器：商品ID
     */
    public function searchProductIdAttr($query, $value)
    {
        $query->where('product_id', $value);
    }
    
    /**
     * 搜索器：库位ID
     */
    public function searchLocationIdAttr($query, $value)
    {
        $query->where('location_id', $value);
    }
    
    /**
     * 搜索器：批次号
     */
    public function searchBatchNumberAttr($query, $value)
    {
        $query->where('batch_number', 'like', '%' . $value . '%');
    }
    
    /**
     * 拣货
     */
    /**
     * 拣货/出库（D3：不是单纯的加减）
     * 同一事务内完成：库存扣减（行锁）+ SN 状态联动 + 库存流水
     * @param string|float|int $quantity 数量（按计量方式可带 4 位小数）
     * @param int|null $locationId 库位
     * @param string|null $batchNumber 批次
     * @param array $serials SN 编码数组（计件类必填，个数必须等于数量）
     * @param int $operatorId 操作人
     * @return bool
     */
    public function pick($quantity, $locationId = null, $batchNumber = null, array $serials = [], int $operatorId = 0)
    {
        $quantity = (string) $quantity;
        
        if (bccomp($quantity, '0', 4) <= 0) {
            throw new \InvalidArgumentException('拣货数量必须大于0');
        }
        
        // A4：按计量方式校验数量精度
        if ($this->product) {
            $this->product->assertQuantityValid($quantity);
        }
        
        if (bccomp(bcadd((string)$this->picked_quantity, $quantity, 4), (string)$this->quantity, 4) > 0) {
            throw new \InvalidArgumentException('拣货数量不能超过计划数量');
        }
        
        // E1：计件类必须按件录 SN，长度/重量类跳过
        $needSerial = $this->product ? $this->product->requiresSerial() : false;
        if ($needSerial) {
            $needCount = (int) bcmul($quantity, '1', 0);
            if (count($serials) !== $needCount) {
                throw new \InvalidArgumentException(
                    '计件类物资必须按件录入序列号，本次需 ' . $needCount . ' 个 SN，实到 ' . count($serials) . ' 个'
                );
            }
        }
        
        $this->startTrans();
        try {
            // 更新拣货数量
            $this->picked_quantity = bcadd((string)$this->picked_quantity, $quantity, 4);
            
            if ($locationId) {
                $this->location_id = $locationId;
            }
            if ($batchNumber) {
                $this->batch_number = $batchNumber;
            }
            $this->save();
            
            // 更新库存（并发安全：行锁，禁止先查后改）
            if ($this->location_id) {
                $inventory = Inventory::where([
                    'product_id'   => $this->product_id,
                    'location_id'  => $this->location_id,
                    'batch_number' => $this->batch_number ?: ''
                ])->lock(true)->find();
                
                if (!$inventory) {
                    throw new \app\common\BizException('STOCK_INSUFFICIENT', '库存不存在', [[
                        'product_id' => $this->product_id,
                        'required'   => $quantity,
                        'available'  => '0'
                    ]]);
                }
                
                // 可用库存 = 现有 - 预留；不足时抛缺料明细
                $available = bcsub((string)$inventory->quantity, (string)$inventory->reserved_quantity, 4);
                if (bccomp($available, $quantity, 4) < 0) {
                    throw new \app\common\BizException('STOCK_INSUFFICIENT', '可用库存不足', [[
                        'product_id'   => $this->product_id,
                        'product_name' => $this->product->name ?? '',
                        'unit'         => $this->unit ?: ($this->product->unit ?? ''),
                        'required'     => $quantity,
                        'available'    => $available,
                        'shortage'     => bcsub($quantity, $available, 4)
                    ]]);
                }
                
                $inventory->quantity = bcsub((string)$inventory->quantity, $quantity, 4);
                $inventory->available_quantity = bcsub((string)$inventory->quantity, (string)$inventory->reserved_quantity, 4);
                $inventory->save();
                
                // 记录库存变动
                InventoryTransaction::createTransaction([
                    'product_id' => $this->product_id,
                    'location_id' => $this->location_id,
                    'type' => InventoryTransaction::TYPE_OUT,
                    'quantity' => $quantity,
                    'balance_quantity' => $inventory->quantity,
                    'operator_id' => $operatorId ?: ($this->outboundOrder->operator_id ?? 0),
                    'reason' => '出库拣货',
                    'reference_type' => InventoryTransaction::REFERENCE_OUTBOUND,
                    'reference_id' => $this->outbound_order_id
                ]);
            }
            
            // D3：SN 单件状态联动（在库 → 正在用），并写 SN 历史
            foreach ($serials as $snCode) {
                $sn = SerialNumber::where('serial_number', trim((string)$snCode))->lock(true)->find();
                if (!$sn) {
                    throw new \app\common\BizException('SERIAL_NOT_FOUND', '序列号不存在：' . $snCode);
                }
                if ($sn->product_id != $this->product_id) {
                    throw new \app\common\BizException('SERIAL_PRODUCT_MISMATCH', '序列号与物资不匹配：' . $snCode);
                }
                if (!in_array((string)$sn->status, [SerialNumber::STATUS_IN_STOCK, SerialNumber::STATUS_REPAIRING], true)) {
                    throw new \app\common\BizException('SERIAL_NOT_AVAILABLE', '序列号当前状态不可出库：' . $snCode);
                }
                
                $sn->outbound_id = $this->outbound_order_id;
                $sn->save();
                $sn->changeStatus(
                    SerialNumber::STATUS_IN_USE,
                    $operatorId,
                    '出库领用',
                    'outbound_order',
                    (int) $this->outbound_order_id
                );
            }
            
            $this->commit();
            return true;
        } catch (\Exception $e) {
            $this->rollback();
            throw $e;
        }
    }
    
    /**
     * 检查是否已完成拣货
     */
    public function isCompleted()
    {
        return $this->picked_quantity >= $this->quantity;
    }
    
    /**
     * 检查是否部分拣货
     */
    public function isPartiallyPicked()
    {
        return $this->picked_quantity > 0 && $this->picked_quantity < $this->quantity;
    }
    
    /**
     * 获取拣货状态
     */
    public function getPickStatus()
    {
        if ($this->picked_quantity == 0) {
            return 'pending';
        } elseif ($this->picked_quantity < $this->quantity) {
            return 'partial';
        } else {
            return 'completed';
        }
    }
    
    /**
     * 获取剩余数量
     */
    public function getRemainingQuantity()
    {
        return bcsub((string)($this->quantity ?? '0'), (string)($this->picked_quantity ?? '0'), 4);
    }

    /**
     * 获取完成率
     */
    public function getCompletionRate()
    {
        $quantity = (string)($this->quantity ?? '0');
        if (bccomp($quantity, '0', 4) <= 0) {
            return 0;
        }

        return (float) bcmul(bcdiv((string)($this->picked_quantity ?? '0'), $quantity, 6), '100', 2);
    }

    /**
     * 获取拣货状态中文名
     */
    public function getPickStatusText()
    {
        $status = $this->getPickStatus();
        $statusTexts = [
            'pending' => '待拣货',
            'partial' => '部分拣货',
            'completed' => '已完成'
        ];
        
        return $statusTexts[$status] ?? '未知';
    }
    
    /**
     * 获取明细详细信息
     */
    public function getDetailInfo()
    {
        $info = $this->toArray();
        $info['product_name'] = $this->product->name ?? '';
        $info['product_sku'] = $this->product->sku ?? '';
        $info['location_code'] = $this->location->code ?? '';
        $info['remaining_quantity'] = $this->remaining_quantity;
        $info['completion_rate'] = $this->completion_rate;
        $info['total_amount'] = $this->total_amount;
        $info['pick_status'] = $this->getPickStatus();
        $info['pick_status_text'] = $this->getPickStatusText();
        
        return $info;
    }
}
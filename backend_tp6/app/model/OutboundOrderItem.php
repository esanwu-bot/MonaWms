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
        'quantity' => 'integer',
        'picked_quantity' => 'integer',
        'unit_price' => 'float',
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
        'quantity',
        'picked_quantity',
        'unit_price',
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
        return ($data['quantity'] ?? 0) - ($data['picked_quantity'] ?? 0);
    }
    
    /**
     * 获取完成率
     */
    public function getCompletionRateAttr($value, $data)
    {
        $quantity = $data['quantity'] ?? 0;
        if ($quantity <= 0) {
            return 0;
        }
        
        $pickedQuantity = $data['picked_quantity'] ?? 0;
        return round(($pickedQuantity / $quantity) * 100, 2);
    }
    
    /**
     * 获取总金额
     */
    public function getTotalAmountAttr($value, $data)
    {
        return ($data['quantity'] ?? 0) * ($data['unit_price'] ?? 0);
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
    public function pick($quantity, $locationId = null, $batchNumber = null)
    {
        if ($quantity <= 0) {
            throw new \InvalidArgumentException('拣货数量必须大于0');
        }
        
        if ($this->picked_quantity + $quantity > $this->quantity) {
            throw new \InvalidArgumentException('拣货数量不能超过计划数量');
        }
        
        $this->startTrans();
        try {
            // 更新拣货数量
            $this->picked_quantity += $quantity;
            
            // 更新库位（如果提供）
            if ($locationId) {
                $this->location_id = $locationId;
            }
            
            // 更新批次号（如果提供）
            if ($batchNumber) {
                $this->batch_number = $batchNumber;
            }
            
            $this->save();
            
            // 更新库存
            if ($this->location_id) {
                $inventory = Inventory::where([
                    'product_id' => $this->product_id,
                    'location_id' => $this->location_id,
                    'batch_number' => $this->batch_number ?: ''
                ])->find();
                
                if (!$inventory) {
                    throw new \Exception('库存不存在');
                }
                
                if ($inventory->available_quantity < $quantity) {
                    throw new \Exception('可用库存不足');
                }
                
                $inventory->quantity -= $quantity;
                $inventory->save();
                
                // 记录库存变动
                InventoryTransaction::createTransaction([
                    'product_id' => $this->product_id,
                    'location_id' => $this->location_id,
                    'type' => InventoryTransaction::TYPE_OUT,
                    'quantity' => $quantity,
                    'balance_quantity' => $inventory->quantity,
                    'operator_id' => $this->outboundOrder->operator_id,
                    'reason' => '出库拣货',
                    'reference_type' => InventoryTransaction::REFERENCE_OUTBOUND,
                    'reference_id' => $this->outbound_order_id
                ]);
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
        return (int) ($this->quantity ?? 0) - (int) ($this->picked_quantity ?? 0);
    }

    /**
     * 获取完成率
     */
    public function getCompletionRate()
    {
        $quantity = (int) ($this->quantity ?? 0);
        if ($quantity <= 0) {
            return 0;
        }

        return round(((int) ($this->picked_quantity ?? 0) / $quantity) * 100, 2);
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
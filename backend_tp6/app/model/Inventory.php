<?php

namespace app\model;

use think\Model;

/**
 * 库存模型
 */
class Inventory extends Model
{
    // 表名
    protected $name = 'inventory';
    
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
        'location_id' => 'integer',
        // P8: DECIMAL(18,4) 一律按 string 处理，禁止 float 累加
        'quantity' => 'string',
        'reserved_quantity' => 'string',
        'available_quantity' => 'string',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];
    
    // 只读字段
    protected $readonly = ['id', 'created_at'];
    
    // 字段映射
    protected $field = [
        'id',
        'product_id',
        'location_id',
        'quantity',
        'reserved_quantity',
        'available_quantity',
        'batch_number',
        'production_date',
        'expiry_date',
        'created_at',
        'updated_at'
    ];
    
    /**
     * 获取可用数量（bcsub 保证小数精度）
     */
    public function getAvailableQuantityAttr($value, $data)
    {
        return bcsub((string)($data['quantity'] ?? '0'), (string)($data['reserved_quantity'] ?? '0'), 4);
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
     * 关联库存变动记录
     */
    public function transactions()
    {
        return $this->hasMany(InventoryTransaction::class, 'inventory_id');
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
     * 搜索器：过期日期范围
     */
    public function searchExpiryDateAttr($query, $value)
    {
        if (is_array($value) && count($value) == 2) {
            $query->whereBetween('expiry_date', $value);
        } else {
            $query->where('expiry_date', $value);
        }
    }
    
    /**
     * 搜索器：即将过期（天数）
     */
    public function searchExpiringInDaysAttr($query, $days)
    {
        $expiryDate = date('Y-m-d', strtotime("+{$days} days"));
        $query->where('expiry_date', '<=', $expiryDate)
              ->where('expiry_date', '>', date('Y-m-d'));
    }
    
    /**
     * 搜索器：已过期
     */
    public function searchExpiredAttr($query, $value)
    {
        if ($value) {
            $query->where('expiry_date', '<', date('Y-m-d'));
        }
    }
    
    /**
     * 增加库存
     */
    public function increaseQuantity($quantity, $operatorId = null, $reason = '')
    {
        if ($quantity <= 0) {
            throw new \InvalidArgumentException('增加数量必须大于0');
        }
        
        $this->startTrans();
        try {
            // 更新库存数量
            $this->quantity += $quantity;
            $this->save();
            
            // 记录库存变动
            InventoryTransaction::create([
                'product_id' => $this->product_id,
                'location_id' => $this->location_id,
                'inventory_id' => $this->id,
                'type' => 'in',
                'quantity' => $quantity,
                'balance_quantity' => $this->quantity,
                'operator_id' => $operatorId,
                'reason' => $reason ?: '库存增加',
                'reference_type' => 'manual',
                'reference_id' => null
            ]);
            
            $this->commit();
            return true;
        } catch (\Exception $e) {
            $this->rollback();
            throw $e;
        }
    }
    
    /**
     * 减少库存
     */
    public function decreaseQuantity($quantity, $operatorId = null, $reason = '')
    {
        if ($quantity <= 0) {
            throw new \InvalidArgumentException('减少数量必须大于0');
        }
        
        if ($this->available_quantity < $quantity) {
            throw new \InvalidArgumentException('可用库存不足');
        }
        
        $this->startTrans();
        try {
            // 更新库存数量
            $this->quantity -= $quantity;
            $this->save();
            
            // 记录库存变动
            InventoryTransaction::create([
                'product_id' => $this->product_id,
                'location_id' => $this->location_id,
                'inventory_id' => $this->id,
                'type' => 'out',
                'quantity' => $quantity,
                'balance_quantity' => $this->quantity,
                'operator_id' => $operatorId,
                'reason' => $reason ?: '库存减少',
                'reference_type' => 'manual',
                'reference_id' => null
            ]);
            
            $this->commit();
            return true;
        } catch (\Exception $e) {
            $this->rollback();
            throw $e;
        }
    }
    
    /**
     * 预留库存
     */
    public function reserveQuantity($quantity)
    {
        if ($quantity <= 0) {
            throw new \InvalidArgumentException('预留数量必须大于0');
        }
        
        if ($this->available_quantity < $quantity) {
            throw new \InvalidArgumentException('可用库存不足');
        }
        
        $this->reserved_quantity += $quantity;
        return $this->save();
    }
    
    /**
     * 释放预留库存
     */
    public function releaseReservedQuantity($quantity)
    {
        if ($quantity <= 0) {
            throw new \InvalidArgumentException('释放数量必须大于0');
        }
        
        if ($this->reserved_quantity < $quantity) {
            throw new \InvalidArgumentException('预留库存不足');
        }
        
        $this->reserved_quantity -= $quantity;
        return $this->save();
    }
    
    /**
     * 获取可用库存数量
     */
    public function getAvailableQuantity(): int
    {
        return (int) ($this->quantity ?? 0) - (int) ($this->reserved_quantity ?? 0);
    }

    /**
     * 获取距过期天数
     */
    public function getDaysToExpiry()
    {
        if (empty($this->expiry_date)) {
            return null;
        }

        $diff = strtotime($this->expiry_date) - strtotime(date('Y-m-d'));
        return (int) floor($diff / 86400);
    }

    /**
     * 检查是否即将过期
     */
    public function isExpiringSoon($days = 30)
    {
        if (!$this->expiry_date) {
            return false;
        }
        
        $expiryTimestamp = strtotime($this->expiry_date);
        $warningTimestamp = strtotime("+{$days} days");
        
        return $expiryTimestamp <= $warningTimestamp && $expiryTimestamp > time();
    }
    
    /**
     * 检查是否已过期
     */
    public function isExpired()
    {
        if (!$this->expiry_date) {
            return false;
        }
        
        return strtotime($this->expiry_date) < time();
    }
    
    /**
     * 获取库存详细信息
     */
    public function getDetailInfo()
    {
        $info = $this->toArray();
        $info['product_name'] = $this->product->name ?? '';
        $info['product_sku'] = $this->product->sku ?? '';
        $info['location_code'] = $this->location->code ?? '';
        $info['available_quantity'] = $this->available_quantity;
        $info['is_expiring_soon'] = $this->isExpiringSoon();
        $info['is_expired'] = $this->isExpired();
        
        return $info;
    }
}
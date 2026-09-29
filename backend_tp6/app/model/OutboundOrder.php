<?php

namespace app\model;

use think\Model;
use think\model\concern\SoftDelete;

/**
 * 出库单模型
 */
class OutboundOrder extends Model
{
    // 软删除：删除即归档，默认查询自动排除已归档单据
    use SoftDelete;
    
    // 表名
    protected $name = 'outbound_orders';
    
    // 主键
    protected $pk = 'id';
    
    // 自动时间戳
    protected $autoWriteTimestamp = 'datetime';
    
    // 时间字段
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';
    
    // 软删除字段（delete() 写入该列，物理数据保留）
    protected $deleteTime = 'deleted_at';
    
    // 字段类型转换
    protected $type = [
        'id' => 'integer',
        'warehouse_id' => 'integer',
        'customer_id' => 'integer',
        'operator_id' => 'integer',
        'expected_date' => 'date',
        'shipped_date' => 'date',
        'shipped_at' => 'datetime', // C2：出库业务时间
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime'
    ];
    
    // 只读字段
    protected $readonly = ['id', 'created_at'];
    
    // 字段映射
    protected $field = [
        'id',
        'order_number',
        'warehouse_id',
        'customer_id',
        'receiver_unit',   // D2：领用单位
        'receiver_name',   // D2：领用人
        'receiver_phone',  // D2：领用人手机号
        'operator_id',
        'created_by',
        'status',
        'type',
        'priority',
        'expected_date',
        'shipped_date',
        'shipped_at',      // C2：出库时间
        'tracking_number',
        'notes',
        'created_at',
        'updated_at',
        'deleted_at'
    ];
    
    /**
     * 状态枚举
     */
    const STATUS_PENDING = 'pending';       // 待处理
    const STATUS_PICKING = 'picking';       // 拣货中
    const STATUS_PACKED = 'packed';         // 已打包
    const STATUS_SHIPPED = 'shipped';       // 已发货
    const STATUS_DELIVERED = 'delivered';   // 已送达
    const STATUS_COMPLETED = 'completed';   // 已完成（历史数据口径，与 delivered 同级终态）
    const STATUS_CANCELLED = 'cancelled';   // 已取消
    
    /**
     * 类型枚举
     */
    const TYPE_SALE = 'sale';               // 销售出库
    const TYPE_TRANSFER = 'transfer';       // 调拨出库
    const TYPE_RETURN = 'return';           // 退货出库
    const TYPE_OTHER = 'other';             // 其他出库
    
    /**
     * 优先级枚举
     */
    const PRIORITY_LOW = 'low';             // 低优先级
    const PRIORITY_NORMAL = 'normal';       // 普通优先级
    const PRIORITY_HIGH = 'high';           // 高优先级
    const PRIORITY_URGENT = 'urgent';       // 紧急优先级
    
    /**
     * 获取状态中文名
     */
    public function getStatusTextAttr($value, $data)
    {
        $statuses = [
            self::STATUS_PENDING => '待处理',
            self::STATUS_PICKING => '拣货中',
            self::STATUS_PACKED => '已打包',
            self::STATUS_SHIPPED => '已发货',
            self::STATUS_DELIVERED => '已送达',
            self::STATUS_COMPLETED => '已完成',
            self::STATUS_CANCELLED => '已取消'
        ];
        
        return $statuses[$data['status']] ?? '未知';
    }
    
    /**
     * 获取类型中文名
     */
    public function getTypeTextAttr($value, $data)
    {
        $types = [
            self::TYPE_SALE => '销售出库',
            self::TYPE_TRANSFER => '调拨出库',
            self::TYPE_RETURN => '退货出库',
            self::TYPE_OTHER => '其他出库'
        ];
        
        return $types[$data['type']] ?? '未知';
    }
    
    /**
     * 获取优先级中文名
     */
    public function getPriorityTextAttr($value, $data)
    {
        $priorities = [
            self::PRIORITY_LOW => '低',
            self::PRIORITY_NORMAL => '普通',
            self::PRIORITY_HIGH => '高',
            self::PRIORITY_URGENT => '紧急'
        ];
        
        return $priorities[$data['priority']] ?? '未知';
    }
    
    /**
     * 获取类型中文名
     */
    public function getTypeText()
    {
        $types = [
            self::TYPE_SALE => '销售出库',
            self::TYPE_TRANSFER => '调拨出库',
            self::TYPE_RETURN => '退货出库',
            self::TYPE_OTHER => '其他出库'
        ];

        return $types[$this->getData('type')] ?? '未知';
    }

    /**
     * 获取优先级中文名
     */
    public function getPriorityText()
    {
        $priorities = [
            self::PRIORITY_LOW => '低',
            self::PRIORITY_NORMAL => '普通',
            self::PRIORITY_HIGH => '高',
            self::PRIORITY_URGENT => '紧急'
        ];

        return $priorities[$this->priority] ?? '未知';
    }

    /**
     * 关联仓库
     */
    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }
    
    /**
     * 关联客户
     */
    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }
    
    /**
     * 关联操作员
     */
    public function operator()
    {
        return $this->belongsTo(User::class, 'operator_id');
    }
    
    /**
     * 关联出库单明细
     */
    public function items()
    {
        return $this->hasMany(OutboundOrderItem::class, 'outbound_order_id');
    }
    
    /**
     * 搜索器：订单号
     */
    public function searchOrderNumberAttr($query, $value)
    {
        $query->where('order_number', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：仓库ID
     */
    public function searchWarehouseIdAttr($query, $value)
    {
        $query->where('warehouse_id', $value);
    }
    
    /**
     * 搜索器：客户ID
     */
    public function searchCustomerIdAttr($query, $value)
    {
        $query->where('customer_id', $value);
    }
    
    /**
     * 搜索器：状态
     */
    public function searchStatusAttr($query, $value)
    {
        $query->where('status', $value);
    }
    
    /**
     * 搜索器：类型
     */
    public function searchTypeAttr($query, $value)
    {
        $query->where('type', $value);
    }
    
    /**
     * 搜索器：优先级
     */
    public function searchPriorityAttr($query, $value)
    {
        $query->where('priority', $value);
    }
    
    /**
     * 搜索器：预期日期范围
     */
    public function searchExpectedDateAttr($query, $value)
    {
        if (is_array($value) && count($value) == 2) {
            $query->whereBetween('expected_date', $value);
        } else {
            $query->where('expected_date', $value);
        }
    }
    
    /**
     * 搜索器：发货日期范围
     */
    public function searchShippedDateAttr($query, $value)
    {
        if (is_array($value) && count($value) == 2) {
            $query->whereBetween('shipped_date', $value);
        } else {
            $query->where('shipped_date', $value);
        }
    }
    
    /**
     * 搜索器：快递单号
     */
    public function searchTrackingNumberAttr($query, $value)
    {
        $query->where('tracking_number', 'like', '%' . $value . '%');
    }
    
    /**
     * 生成订单号
     */
    public static function generateOrderNumber()
    {
        $prefix = 'OUT';
        $date = date('Ymd');
        $sequence = str_pad(self::whereTime('created_at', 'today')->count() + 1, 4, '0', STR_PAD_LEFT);
        
        return $prefix . $date . $sequence;
    }
    
    /**
     * 开始拣货
     */
    public function startPicking($operatorId)
    {
        if ($this->status !== self::STATUS_PENDING) {
            throw new \Exception('只有待处理状态的出库单才能开始拣货');
        }
        
        $this->status = self::STATUS_PICKING;
        $this->operator_id = $operatorId;
        return $this->save();
    }
    
    /**
     * 完成拣货（打包）
     */
    public function pack()
    {
        if ($this->status !== self::STATUS_PICKING) {
            throw new \Exception('只有拣货中状态的出库单才能打包');
        }
        
        $this->status = self::STATUS_PACKED;
        return $this->save();
    }
    
    /**
     * 发货
     */
    public function ship($trackingNumber = '')
    {
        if ($this->status !== self::STATUS_PACKED) {
            throw new \Exception('只有已打包状态的出库单才能发货');
        }
        
        $this->status = self::STATUS_SHIPPED;
        $this->shipped_date = date('Y-m-d');
        if ($trackingNumber) {
            $this->tracking_number = $trackingNumber;
        }
        return $this->save();
    }
    
    /**
     * 确认送达
     */
    public function deliver()
    {
        if ($this->status !== self::STATUS_SHIPPED) {
            throw new \Exception('只有已发货状态的出库单才能确认送达');
        }
        
        $this->status = self::STATUS_DELIVERED;
        return $this->save();
    }
    
    /**
     * 取消出库单
     */
    public function cancel($reason = '')
    {
        if (in_array($this->status, [self::STATUS_SHIPPED, self::STATUS_DELIVERED, self::STATUS_CANCELLED])) {
            throw new \Exception('已发货、已送达或已取消的出库单不能再次取消');
        }
        
        $this->status = self::STATUS_CANCELLED;
        if ($reason) {
            $this->notes = ($this->notes ? $this->notes . '\n' : '') . '取消原因：' . $reason;
        }
        return $this->save();
    }
    
    /**
     * 获取出库单统计信息
     */
    public function getStatistics()
    {
        $statistics = [
            'total_items' => $this->items()->count(),
            'total_quantity' => $this->items()->sum('quantity'),
            'picked_quantity' => $this->items()->sum('picked_quantity'),
            'total_amount' => 0,
            'completion_rate' => 0
        ];
        
        // 计算总金额（A7：bcmath）
        $items = $this->items()->select();
        $totalAmount = '0';
        $totalQty = '0';
        $pickedQty = '0';
        foreach ($items as $item) {
            $totalAmount = bcadd($totalAmount, bcmul((string)$item->quantity, (string)($item->unit_price ?? '0'), 4), 4);
            $totalQty = bcadd($totalQty, (string)$item->quantity, 4);
            $pickedQty = bcadd($pickedQty, (string)$item->picked_quantity, 4);
        }
        $statistics['total_amount'] = $totalAmount;
        $statistics['total_quantity'] = $totalQty;
        $statistics['picked_quantity'] = $pickedQty;
        
        // 计算完成率
        if (bccomp($totalQty, '0', 4) > 0) {
            $statistics['completion_rate'] = (float) bcmul(bcdiv($pickedQty, $totalQty, 6), '100', 2);
        }
        
        return $statistics;
    }
    
    /**
     * 检查是否可以删除
     */
    public function canDelete()
    {
        // 只有待处理状态的出库单可以删除
        return $this->status === self::STATUS_PENDING;
    }
    
    /**
     * 获取出库单详细信息
     */
    public function getDetailInfo()
    {
        $info = $this->toArray();
        $info['warehouse_name'] = $this->warehouse->name ?? '';
        $info['customer_name'] = $this->customer->name ?? '';
        $info['operator_name'] = $this->operator->username ?? '';
        $info['statistics'] = $this->getStatistics();
        $info['items'] = $this->items()->with(['product'])->select()->toArray();
        
        return $info;
    }
}
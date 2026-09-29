<?php

namespace app\model;

use think\Model;
use think\model\concern\SoftDelete;

/**
 * 入库单模型
 */
class InboundOrder extends Model
{
    // 软删除：删除即归档，默认查询自动排除已归档单据
    use SoftDelete;
    
    // 表名
    protected $name = 'inbound_orders';
    
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
        'supplier_id' => 'integer',
        'operator_id' => 'integer',
        'expected_date' => 'date',
        'received_date' => 'date',
        'received_at' => 'datetime', // C1：入库业务时间（精确到时分秒）
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
        'supplier_id',
        'operator_id',
        'created_by',
        'status',
        'type',
        'expected_date',
        'received_date',
        'received_at',   // C1：入库时间
        'source',        // I2：入库来源（字典 inbound_source）
        'transfer_from',     // P9+：调出仓库/地点（从哪里调拨）
        'transfer_remark',   // P9+：调拨说明（无设备编号调拨须注明从哪到哪）
        'handler_name',      // P9+：经手人姓名
        'handler_phone',     // P9+：经手人电话
        'notes',
        'created_at',
        'updated_at',
        'deleted_at'
    ];
    
    /**
     * 状态枚举
     */
    const STATUS_PENDING = 'pending';       // 待处理
    const STATUS_RECEIVING = 'receiving';   // 收货中
    const STATUS_COMPLETED = 'completed';   // 已完成
    const STATUS_CANCELLED = 'cancelled';   // 已取消
    
    /**
     * 类型枚举
     */
    const TYPE_PURCHASE = 'purchase';       // 采购入库
    const TYPE_RETURN = 'return';           // 退货入库
    const TYPE_TRANSFER = 'transfer';       // 调拨入库
    const TYPE_OTHER = 'other';             // 其他入库
    
    /**
     * 获取状态中文名
     */
    public function getStatusTextAttr($value, $data)
    {
        $statuses = [
            self::STATUS_PENDING => '待处理',
            self::STATUS_RECEIVING => '收货中',
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
            self::TYPE_PURCHASE => '采购入库',
            self::TYPE_RETURN => '退货入库',
            self::TYPE_TRANSFER => '调拨入库',
            self::TYPE_OTHER => '其他入库'
        ];
        
        return $types[$data['type']] ?? '未知';
    }
    
    /**
     * 获取类型中文名
     */
    public function getTypeText()
    {
        $types = [
            self::TYPE_PURCHASE => '采购入库',
            self::TYPE_RETURN => '退货入库',
            self::TYPE_TRANSFER => '调拨入库',
            self::TYPE_OTHER => '其他入库'
        ];

        return $types[$this->getData('type')] ?? '未知';
    }

    /**
     * 关联仓库
     */
    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }
    
    /**
     * 关联供应商
     */
    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }
    
    /**
     * 关联操作员
     */
    public function operator()
    {
        return $this->belongsTo(User::class, 'operator_id');
    }
    
    /**
     * 关联入库单明细
     */
    public function items()
    {
        return $this->hasMany(InboundOrderItem::class, 'inbound_order_id');
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
     * 搜索器：供应商ID
     */
    public function searchSupplierIdAttr($query, $value)
    {
        $query->where('supplier_id', $value);
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
     * 搜索器：收货日期范围
     */
    public function searchReceivedDateAttr($query, $value)
    {
        if (is_array($value) && count($value) == 2) {
            $query->whereBetween('received_date', $value);
        } else {
            $query->where('received_date', $value);
        }
    }
    
    /**
     * 生成订单号
     */
    public static function generateOrderNumber()
    {
        $prefix = 'IN';
        $date = date('Ymd');
        $sequence = str_pad(self::whereTime('created_at', 'today')->count() + 1, 4, '0', STR_PAD_LEFT);
        
        return $prefix . $date . $sequence;
    }
    
    /**
     * 开始收货
     */
    public function startReceiving($operatorId)
    {
        if ($this->status !== self::STATUS_PENDING) {
            throw new \Exception('只有待处理状态的入库单才能开始收货');
        }
        
        $this->status = self::STATUS_RECEIVING;
        $this->operator_id = $operatorId;
        return $this->save();
    }
    
    /**
     * 完成入库
     */
    public function complete()
    {
        if ($this->status !== self::STATUS_RECEIVING) {
            throw new \Exception('只有收货中状态的入库单才能完成');
        }
        
        $this->status = self::STATUS_COMPLETED;
        $this->received_date = date('Y-m-d');
        $this->received_at = $this->received_at ?: date('Y-m-d H:i:s'); // C1：落库入库时间
        return $this->save();
    }
    
    /**
     * 取消入库单
     */
    public function cancel($reason = '')
    {
        if (in_array($this->status, [self::STATUS_COMPLETED, self::STATUS_CANCELLED])) {
            throw new \Exception('已完成或已取消的入库单不能再次取消');
        }
        
        $this->status = self::STATUS_CANCELLED;
        if ($reason) {
            $this->notes = ($this->notes ? $this->notes . '\n' : '') . '取消原因：' . $reason;
        }
        return $this->save();
    }
    
    /**
     * 获取入库单统计信息
     */
    public function getStatistics()
    {
        $statistics = [
            'total_items' => $this->items()->count(),
            'total_quantity' => $this->items()->sum('quantity'),
            'received_quantity' => $this->items()->sum('received_quantity'),
            'total_amount' => 0,
            'completion_rate' => 0
        ];
        
        // 计算总金额（A7：bcmul/bcadd，禁止 float 累加）
        $items = $this->items()->select();
        $totalAmount = '0';
        $totalQty = '0';
        $receivedQty = '0';
        foreach ($items as $item) {
            $totalAmount = bcadd($totalAmount, bcmul((string)$item->quantity, (string)($item->unit_price ?? '0'), 4), 4);
            $totalQty = bcadd($totalQty, (string)$item->quantity, 4);
            $receivedQty = bcadd($receivedQty, (string)$item->received_quantity, 4);
        }
        $statistics['total_amount'] = $totalAmount;
        $statistics['total_quantity'] = $totalQty;
        $statistics['received_quantity'] = $receivedQty;
        
        // 计算完成率
        if (bccomp($totalQty, '0', 4) > 0) {
            $statistics['completion_rate'] = (float) bcmul(bcdiv($receivedQty, $totalQty, 6), '100', 2);
        }
        
        return $statistics;
    }
    
    /**
     * 检查是否可以删除
     */
    public function canDelete()
    {
        // 只有待处理状态的入库单可以删除
        return $this->status === self::STATUS_PENDING;
    }
    
    /**
     * 获取入库单详细信息
     */
    public function getDetailInfo()
    {
        $info = $this->toArray();
        $info['warehouse_name'] = $this->warehouse->name ?? '';
        $info['supplier_name'] = $this->supplier->name ?? '';
        $info['operator_name'] = $this->operator->username ?? '';
        $info['statistics'] = $this->getStatistics();
        $info['items'] = $this->items()->with(['product'])->select()->toArray();
        
        return $info;
    }
}
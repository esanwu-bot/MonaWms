<?php

namespace app\model;

use think\Model;

/**
 * 供应商模型
 */
class Supplier extends Model
{
    // 表名
    protected $name = 'suppliers';
    
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
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];
    
    // 只读字段
    protected $readonly = ['id', 'created_at'];
    
    // 字段映射
    protected $field = [
        'id',
        'code',
        'name',
        'contact_person',
        'phone',
        'email',
        'address',
        'status',
        'created_at',
        'updated_at'
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
     * 关联入库单
     */
    public function inboundOrders()
    {
        return $this->hasMany(InboundOrder::class, 'supplier_id');
    }
    
    /**
     * 搜索器：供应商编码
     */
    public function searchCodeAttr($query, $value)
    {
        $query->where('code', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：供应商名称
     */
    public function searchNameAttr($query, $value)
    {
        $query->where('name', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：联系人
     */
    public function searchContactPersonAttr($query, $value)
    {
        $query->where('contact_person', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：电话
     */
    public function searchPhoneAttr($query, $value)
    {
        $query->where('phone', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：邮箱
     */
    public function searchEmailAttr($query, $value)
    {
        $query->where('email', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：状态
     */
    public function searchStatusAttr($query, $value)
    {
        $query->where('status', $value);
    }
    
    /**
     * 根据编码查找供应商
     */
    public static function findByCode($code)
    {
        return self::where('code', $code)->find();
    }
    
    /**
     * 获取供应商统计信息
     */
    public function getStatistics()
    {
        $statistics = [
            'total_orders' => $this->inboundOrders()->count(),
            'pending_orders' => $this->inboundOrders()->where('status', 'pending')->count(),
            'completed_orders' => $this->inboundOrders()->where('status', 'completed')->count(),
            'total_amount' => 0,
            'last_order_date' => null
        ];
        
        // 获取最近订单日期
        $lastOrder = $this->inboundOrders()
            ->order('created_at', 'desc')
            ->find();
        
        if ($lastOrder) {
            $statistics['last_order_date'] = $lastOrder->created_at;
        }
        
        // 计算总金额（需要通过入库单明细计算）
        $totalAmount = 0;
        $orders = $this->inboundOrders()->with(['items'])->select();
        foreach ($orders as $order) {
            foreach ($order->items as $item) {
                $totalAmount += $item->quantity * ($item->unit_price ?? 0);
            }
        }
        $statistics['total_amount'] = $totalAmount;
        
        return $statistics;
    }
    
    /**
     * 检查是否可以删除
     */
    public function canDelete()
    {
        // 有入库单时不能删除
        return $this->inboundOrders()->count() === 0;
    }
}
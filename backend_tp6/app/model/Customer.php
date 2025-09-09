<?php

namespace app\model;

use think\Model;

/**
 * 客户模型
 */
class Customer extends Model
{
    // 表名
    protected $name = 'customers';
    
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
     * 关联出库单
     */
    public function outboundOrders()
    {
        return $this->hasMany(OutboundOrder::class, 'customer_id');
    }
    
    /**
     * 搜索器：客户编码
     */
    public function searchCodeAttr($query, $value)
    {
        $query->where('code', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：客户名称
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
     * 根据编码查找客户
     */
    public static function findByCode($code)
    {
        return self::where('code', $code)->find();
    }
    
    /**
     * 获取客户统计信息
     */
    public function getStatistics()
    {
        $statistics = [
            'total_orders' => $this->outboundOrders()->count(),
            'pending_orders' => $this->outboundOrders()->where('status', 'pending')->count(),
            'completed_orders' => $this->outboundOrders()->where('status', 'completed')->count(),
            'total_amount' => 0,
            'last_order_date' => null
        ];
        
        // 获取最近订单日期
        $lastOrder = $this->outboundOrders()
            ->order('created_at', 'desc')
            ->find();
        
        if ($lastOrder) {
            $statistics['last_order_date'] = $lastOrder->created_at;
        }
        
        // 计算总金额（需要通过出库单明细计算）
        $totalAmount = 0;
        $orders = $this->outboundOrders()->with(['items'])->select();
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
        // 有出库单时不能删除
        return $this->outboundOrders()->count() === 0;
    }
}
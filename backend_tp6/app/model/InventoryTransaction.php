<?php

namespace app\model;

use think\Model;

/**
 * 库存变动记录模型
 */
class InventoryTransaction extends Model
{
    // 表名
    protected $name = 'inventory_transactions';
    
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
        'product_id' => 'integer',
        'location_id' => 'integer',
        'inventory_id' => 'integer',
        'quantity' => 'integer',
        'balance_quantity' => 'integer',
        'operator_id' => 'integer',
        'reference_id' => 'integer',
        'created_at' => 'datetime'
    ];
    
    // 只读字段
    protected $readonly = ['id', 'created_at'];
    
    // 字段映射
    protected $field = [
        'id',
        'product_id',
        'location_id',
        'inventory_id',
        'type',
        'quantity',
        'balance_quantity',
        'operator_id',
        'reason',
        'reference_type',
        'reference_id',
        'created_at'
    ];
    
    /**
     * 变动类型枚举
     */
    const TYPE_IN = 'in';           // 入库
    const TYPE_OUT = 'out';         // 出库
    const TYPE_TRANSFER = 'transfer'; // 移库
    const TYPE_ADJUST = 'adjust';   // 调整
    const TYPE_CHECK = 'check';     // 盘点
    
    /**
     * 参考类型枚举
     */
    const REFERENCE_INBOUND = 'inbound_order';   // 入库单
    const REFERENCE_OUTBOUND = 'outbound_order'; // 出库单
    const REFERENCE_TRANSFER = 'transfer_order'; // 移库单
    const REFERENCE_ADJUST = 'adjust_order';     // 调整单
    const REFERENCE_CHECK = 'check_order';       // 盘点单
    const REFERENCE_MANUAL = 'manual';           // 手动操作
    
    /**
     * 获取变动类型中文名
     */
    public function getTypeTextAttr($value, $data)
    {
        $types = [
            self::TYPE_IN => '入库',
            self::TYPE_OUT => '出库',
            self::TYPE_TRANSFER => '移库',
            self::TYPE_ADJUST => '调整',
            self::TYPE_CHECK => '盘点'
        ];
        
        return $types[$data['type']] ?? '未知';
    }
    
    /**
     * 获取参考类型中文名
     */
    public function getReferenceTypeTextAttr($value, $data)
    {
        $types = [
            self::REFERENCE_INBOUND => '入库单',
            self::REFERENCE_OUTBOUND => '出库单',
            self::REFERENCE_TRANSFER => '移库单',
            self::REFERENCE_ADJUST => '调整单',
            self::REFERENCE_CHECK => '盘点单',
            self::REFERENCE_MANUAL => '手动操作'
        ];
        
        return $types[$data['reference_type']] ?? '未知';
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
     * 关联库存
     */
    public function inventory()
    {
        return $this->belongsTo(Inventory::class, 'inventory_id');
    }
    
    /**
     * 关联操作员
     */
    public function operator()
    {
        return $this->belongsTo(User::class, 'operator_id');
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
     * 搜索器：变动类型
     */
    public function searchTypeAttr($query, $value)
    {
        $query->where('type', $value);
    }
    
    /**
     * 搜索器：操作员ID
     */
    public function searchOperatorIdAttr($query, $value)
    {
        $query->where('operator_id', $value);
    }
    
    /**
     * 搜索器：参考类型
     */
    public function searchReferenceTypeAttr($query, $value)
    {
        $query->where('reference_type', $value);
    }
    
    /**
     * 搜索器：参考ID
     */
    public function searchReferenceIdAttr($query, $value)
    {
        $query->where('reference_id', $value);
    }
    
    /**
     * 搜索器：时间范围
     */
    public function searchCreatedAtAttr($query, $value)
    {
        if (is_array($value) && count($value) == 2) {
            $query->whereBetween('created_at', $value);
        } else {
            $query->whereTime('created_at', 'between', [$value . ' 00:00:00', $value . ' 23:59:59']);
        }
    }
    
    /**
     * 创建库存变动记录
     */
    public static function createTransaction($data)
    {
        // 验证必要字段
        $required = ['product_id', 'location_id', 'type', 'quantity'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                throw new \InvalidArgumentException("缺少必要字段: {$field}");
            }
        }
        
        // 设置默认值
        $data['created_at'] = $data['created_at'] ?? date('Y-m-d H:i:s');
        $data['reason'] = $data['reason'] ?? '';
        $data['reference_type'] = $data['reference_type'] ?? self::REFERENCE_MANUAL;
        
        return self::create($data);
    }
    
    /**
     * 获取商品的库存变动历史
     */
    public static function getProductHistory($productId, $limit = 50)
    {
        return self::where('product_id', $productId)
            ->with(['location', 'operator'])
            ->order('created_at', 'desc')
            ->limit($limit)
            ->select();
    }
    
    /**
     * 获取库位的库存变动历史
     */
    public static function getLocationHistory($locationId, $limit = 50)
    {
        return self::where('location_id', $locationId)
            ->with(['product', 'operator'])
            ->order('created_at', 'desc')
            ->limit($limit)
            ->select();
    }
    
    /**
     * 获取操作员的操作历史
     */
    public static function getOperatorHistory($operatorId, $limit = 50)
    {
        return self::where('operator_id', $operatorId)
            ->with(['product', 'location'])
            ->order('created_at', 'desc')
            ->limit($limit)
            ->select();
    }
    
    /**
     * 获取统计数据
     */
    public static function getStatistics($startDate = null, $endDate = null)
    {
        $query = self::query();
        
        if ($startDate) {
            $query->where('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->where('created_at', '<=', $endDate);
        }
        
        $statistics = [
            'total_transactions' => $query->count(),
            'in_transactions' => $query->where('type', self::TYPE_IN)->count(),
            'out_transactions' => $query->where('type', self::TYPE_OUT)->count(),
            'transfer_transactions' => $query->where('type', self::TYPE_TRANSFER)->count(),
            'adjust_transactions' => $query->where('type', self::TYPE_ADJUST)->count(),
            'check_transactions' => $query->where('type', self::TYPE_CHECK)->count()
        ];
        
        return $statistics;
    }
}
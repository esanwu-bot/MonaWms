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
    // P8 B1：对齐客户口径，状态挂在单件实物（SN）上
    const STATUS_IN_USE   = 'in_use';     // 正在用
    const STATUS_REPAIRING = 'repairing'; // 返修中
    const STATUS_TO_SCRAP = 'to_scrap';   // 待报废
    
    /**
     * 允许的状态流转（B3：待报废只能由管理员推进到已报废，不允许跳过）
     * @return array
     */
    public static function statusTransitions(): array
    {
        return [
            self::STATUS_IN_STOCK  => [self::STATUS_IN_USE, self::STATUS_REPAIRING, self::STATUS_TO_SCRAP, self::STATUS_SCRAPPED],
            self::STATUS_SOLD      => [self::STATUS_IN_USE, self::STATUS_REPAIRING, self::STATUS_TO_SCRAP, self::STATUS_SCRAPPED],
            self::STATUS_IN_USE    => [self::STATUS_REPAIRING, self::STATUS_TO_SCRAP, self::STATUS_SCRAPPED],
            self::STATUS_REPAIRING => [self::STATUS_IN_USE, self::STATUS_TO_SCRAP, self::STATUS_SCRAPPED],
            self::STATUS_TO_SCRAP  => [self::STATUS_SCRAPPED],
            self::STATUS_SCRAPPED  => []
        ];
    }
    
    /**
     * 获取状态中文名
     */
    public function getStatusTextAttr($value, $data)
    {
        $statuses = [
            self::STATUS_IN_STOCK  => '在库',
            self::STATUS_SOLD      => '已出库',
            self::STATUS_SCRAPPED  => '已报废',
            self::STATUS_IN_USE    => '正在用',
            self::STATUS_REPAIRING => '返修中',
            self::STATUS_TO_SCRAP  => '待报废'
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
        return $this->belongsTo(Inventory::class, 'stock_id');
    }
    
    /**
     * 关联入库单
     */
    public function inbound()
    {
        return $this->belongsTo(InboundOrder::class, 'inbound_id');
    }
    
    /**
     * 关联出库单
     */
    public function outbound()
    {
        return $this->belongsTo(OutboundOrder::class, 'outbound_id');
    }
    
    /**
     * 关联变更历史
     */
    public function histories()
    {
        return $this->hasMany(SerialNumberHistory::class, 'serial_number_id');
    }
    
    /**
     * 变更单件状态并留痕（B2）
     * 状态挂在单件实物上：在库 → 正在用 → 返修中 → 待报废 → 已报废
     * @param string $to 目标状态
     * @param int $operatorId 操作人
     * @param string $reason 原因
     * @param string $referenceType 关联单据类型
     * @param int $referenceId 关联单据ID
     * @return bool
     * @throws \InvalidArgumentException 流转不允许
     */
    public function changeStatus(string $to, int $operatorId = 0, string $reason = '', string $referenceType = '', int $referenceId = 0): bool
    {
        $from = (string) $this->status;
        $allowed = self::statusTransitions()[$from] ?? [];
        
        if (!in_array($to, $allowed, true)) {
            throw new \InvalidArgumentException('不允许的状态流转：' . $from . ' → ' . $to);
        }
        
        $this->status = $to;
        $this->save();
        
        SerialNumberHistory::create([
            'serial_number_id' => $this->id,
            'event_type'       => $this->eventTypeOf($to),
            'status_before'    => $from,
            'status_after'     => $to,
            'reference_type'   => $referenceType,
            'reference_id'     => $referenceId,
            'operator_id'      => $operatorId,
            'notes'            => $reason,
            'created_at'       => date('Y-m-d H:i:s')
        ]);
        
        return true;
    }
    
    /**
     * 状态 -> 历史事件类型
     */
    private function eventTypeOf(string $status): string
    {
        $map = [
            self::STATUS_IN_USE    => 'install',
            self::STATUS_REPAIRING => 'repair',
            self::STATUS_TO_SCRAP  => 'repair',
            self::STATUS_SCRAPPED  => 'scrap',
            self::STATUS_IN_STOCK  => 'return'
        ];
        return $map[$status] ?? 'return';
    }
}
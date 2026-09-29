<?php

namespace app\model;

use think\Model;

/**
 * 入库单明细模型
 */
class InboundOrderItem extends Model
{
    // 表名
    protected $name = 'inbound_order_items';
    
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
        'inbound_order_id' => 'integer',
        'product_id' => 'integer',
        'location_id' => 'integer',
        // P8: DECIMAL(18,4) 按 string 处理，金额禁止 float 累加
        'quantity' => 'string',
        'received_quantity' => 'string',
        'unit_price' => 'string',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];
    
    // 只读字段
    protected $readonly = ['id', 'created_at'];
    
    // 字段映射
    protected $field = [
        'id',
        'inbound_order_id',
        'product_id',
        'location_id',
        'unit',              // P8: 单位快照（A6）
        'quantity',
        'received_quantity',
        'unit_price',
        'requires_serial',
        'batch_number',
        'expiry_date',
        'notes',
        'created_at',
        'updated_at'
    ];
    
    /**
     * 获取剩余数量
     */
    public function getRemainingQuantityAttr($value, $data)
    {
        return bcsub((string)($data['quantity'] ?? '0'), (string)($data['received_quantity'] ?? '0'), 4);
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
        
        $receivedQuantity = (string)($data['received_quantity'] ?? '0');
        return (float) bcmul(bcdiv($receivedQuantity, $quantity, 6), '100', 2);
    }
    
    /**
     * 获取总金额（A7：bcmul，禁止 float 累加）
     */
    public function getTotalAmountAttr($value, $data)
    {
        return bcmul((string)($data['quantity'] ?? '0'), (string)($data['unit_price'] ?? '0'), 4);
    }
    
    /**
     * 关联入库单
     */
    public function inboundOrder()
    {
        return $this->belongsTo(InboundOrder::class, 'inbound_order_id');
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
     * 搜索器：入库单ID
     */
    public function searchInboundOrderIdAttr($query, $value)
    {
        $query->where('inbound_order_id', $value);
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
     * 收货（P9：总账与明细账同事务分离登记）
     *
     * 计件类（普件）：按件写 SN 台账（in_stock + 仓库/库位归属），总账 +N/件；SN 全局唯一，重复入库直接报错
     * 散料类（长度/重量等）：写批次台账（initial=remaining=N），总账 +N
     * 库存总账（inventory）行锁更新，batch_number 统一空串口径（MySQL 唯一索引中 NULL 可重复）
     *
     * @param string|int|float $quantity 收货数量
     * @param int|null $locationId 库位ID
     * @param string|null $batchNumber 批次号/卷号（散料必填性由前端约束，留空则自动生成）
     * @param string|null $expiryDate 过期日期
     * @param array $serials SN 编码数组（计件类必填，个数必须等于数量；支持批量粘贴拆分后的数组）
     * @param int $operatorId 操作人
     * @return bool
     */
    public function receive($quantity, $locationId = null, $batchNumber = null, $expiryDate = null, array $serials = [], int $operatorId = 0)
    {
        $quantity = (string) $quantity;
        if (bccomp($quantity, '0', 4) <= 0) {
            throw new \InvalidArgumentException('收货数量必须大于0');
        }

        // A4：按物资计量方式校验数量精度（计件类必须正整数，长度/重量类允许 4 位小数）
        $isPiece = false;
        if ($this->product) {
            $this->product->assertQuantityValid($quantity);
            $isPiece = $this->product->requiresSerial();
        }

        if (bccomp(bcadd((string)$this->received_quantity, $quantity, 4), (string)$this->quantity, 4) > 0) {
            throw new \InvalidArgumentException('收货数量不能超过计划数量');
        }

        // P9：计件类必须按件登记 SN，个数与数量一致
        if ($isPiece) {
            $needCount = (int) bcmul($quantity, '1', 0);
            $serials = array_values(array_filter(array_map('trim', $serials)));
            if (count($serials) !== $needCount) {
                throw new \InvalidArgumentException(
                    '计件类物资必须按件录入序列号，本次收货 ' . $needCount . ' 件，实到 ' . count($serials) . ' 个 SN'
                );
            }
        }

        // P9：batch_number 统一口径（'' 而非 NULL），否则唯一键 (product,location,batch) 会拆行
        $batchNumber = trim((string) ($batchNumber ?? ''));

        $this->startTrans();
        try {
            // 更新收货数量（bcadd，禁止 float 累加）
            $this->received_quantity = bcadd((string)$this->received_quantity, $quantity, 4);

            // 更新库位（如果提供）
            if ($locationId) {
                $this->location_id = $locationId;
            }

            // 更新批次号（如果提供，统一写 '' 口径）
            if ($batchNumber !== '') {
                $this->batch_number = $batchNumber;
            }

            // 更新过期日期（如果提供）
            if ($expiryDate) {
                $this->expiry_date = $expiryDate;
            }

            $this->save();

            // 更新库存总账（并发安全：行锁，禁止先查后改）
            if ($this->location_id) {
                $inventory = Inventory::where([
                    'product_id'   => $this->product_id,
                    'location_id'  => $this->location_id,
                    'batch_number' => $this->batch_number ?: ''
                ])->lock(true)->find();

                if ($inventory) {
                    $inventory->quantity = bcadd((string)$inventory->quantity, $quantity, 4);
                    $inventory->available_quantity = bcsub((string)$inventory->quantity, (string)$inventory->reserved_quantity, 4);
                    $inventory->save();
                } else {
                    $inventory = Inventory::create([
                        'product_id' => $this->product_id,
                        'location_id' => $this->location_id,
                        'quantity' => $quantity,
                        'reserved_quantity' => 0,
                        'available_quantity' => $quantity,
                        'batch_number' => $this->batch_number ?: '',
                        'expiry_date' => $this->expiry_date
                    ]);
                }

                // P9：明细账分流登记 —— 计件写 SN 台账，散料写批次台账
                $warehouseId = (int) ($this->inboundOrder->warehouse_id ?? 0);
                if ($isPiece) {
                    foreach ($serials as $snCode) {
                        $snCode = trim((string) $snCode);
                        if ($snCode === '') {
                            continue;
                        }
                        // SN 全局唯一：已存在（含历史已出库）即拒绝，防止重复入库
                        $exists = SerialNumber::where('serial_number', $snCode)->lock(true)->find();
                        if ($exists) {
                            throw new \app\common\BizException(
                                'DUPLICATE_CODE',
                                '序列号重复入库：' . $snCode . '（已存在于 SN 台账）'
                            );
                        }
                        SerialNumber::create([
                            'serial_number' => $snCode,
                            'product_id'    => $this->product_id,
                            'warehouse_id'  => $warehouseId,
                            'location_id'   => $this->location_id,
                            'stock_id'      => $inventory->id,
                            'inbound_id'    => $this->inbound_order_id,
                            'status'        => SerialNumber::STATUS_IN_STOCK,
                            'location'      => '',
                            'notes'         => '入库收货自动登记'
                        ]);
                    }
                } else {
                    // 散料批次台账：入库 initial=remaining=N；未指定卷号时自动生成（时间戳保证不撞唯一键）
                    $batchNo = $batchNumber !== '' ? $batchNumber : ('AUTO-' . date('YmdHis') . '-' . $this->id);
                    InventoryBatch::create([
                        'product_id'        => $this->product_id,
                        'warehouse_id'      => $warehouseId,
                        'location_id'       => $this->location_id,
                        'batch_no'          => $batchNo,
                        'initial_quantity'  => $quantity,
                        'remaining_quantity'=> $quantity,
                        'unit'              => $this->unit ?: ($this->product->unit ?? ''),
                        'status'            => InventoryBatch::STATUS_ACTIVE,
                        'inbound_item_id'   => $this->id,
                        'inbound_order_id'  => $this->inbound_order_id,
                        'inbound_at'        => date('Y-m-d H:i:s')
                    ]);
                    // 散料批次号回写明细，出库时可指定/反查
                    if ($batchNumber === '') {
                        $this->batch_number = $batchNo;
                        $this->save();
                    }
                }

                // 记录库存变动
                InventoryTransaction::createTransaction([
                    'product_id' => $this->product_id,
                    'location_id' => $this->location_id,
                    'type' => InventoryTransaction::TYPE_IN,
                    'quantity' => $quantity,
                    'balance_quantity' => $inventory->quantity,
                    'operator_id' => $operatorId ?: ($this->inboundOrder->operator_id ?? 0),
                    'reason' => '入库收货',
                    'reference_type' => InventoryTransaction::REFERENCE_INBOUND,
                    'reference_id' => $this->inbound_order_id
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
     * 检查是否已完成收货
     */
    public function isCompleted()
    {
        return $this->received_quantity >= $this->quantity;
    }
    
    /**
     * 检查是否部分收货
     */
    public function isPartiallyReceived()
    {
        return $this->received_quantity > 0 && $this->received_quantity < $this->quantity;
    }
    
    /**
     * 获取收货状态
     */
    public function getReceiveStatus()
    {
        if ($this->received_quantity == 0) {
            return 'pending';
        } elseif ($this->received_quantity < $this->quantity) {
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
        return bcsub((string)($this->quantity ?? '0'), (string)($this->received_quantity ?? '0'), 4);
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

        return (float) bcmul(bcdiv((string)($this->received_quantity ?? '0'), $quantity, 6), '100', 2);
    }

    /**
     * 获取收货状态中文名
     */
    public function getReceiveStatusText()
    {
        $status = $this->getReceiveStatus();
        $statusTexts = [
            'pending' => '待收货',
            'partial' => '部分收货',
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
        $info['receive_status'] = $this->getReceiveStatus();
        $info['receive_status_text'] = $this->getReceiveStatusText();
        
        return $info;
    }
}
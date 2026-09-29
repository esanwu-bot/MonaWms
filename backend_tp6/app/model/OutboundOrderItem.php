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
        'picked_batches',    // P9: 批次扣减轨迹 JSON [{batch_id,batch_no,location_id,quantity}]
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
     * 拣货/出库（D3+P9：总账与明细账同事务同步扣减）
     *
     * 计件类（普件）：扫 SN 校验"本仓+在库"后状态流转（in_stock→in_use），总账 -1/件
     * 散料类：按指定批次或 FIFO 锁批次行扣余量（扣到 0 置 exhausted），总账 -N；扣减轨迹落 picked_batches
     * 预留联动：startPicking 预留了整单数量，本次拣多少就释放多少 reserved
     *
     * @param string|float|int $quantity 数量（按计量方式可带 4 位小数）
     * @param int|null $locationId 库位
     * @param string|null $batchNumber 批次（散料类可指定卷号，留空走 FIFO）
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
        $needSerial = $this->product ? $this->product->requiresSerial() : false;
        if ($this->product) {
            $this->product->assertQuantityValid($quantity);
        }

        if (bccomp(bcadd((string)$this->picked_quantity, $quantity, 4), (string)$this->quantity, 4) > 0) {
            throw new \InvalidArgumentException('拣货数量不能超过计划数量');
        }

        // E1：计件类必须按件录 SN，长度/重量类跳过
        if ($needSerial) {
            $needCount = (int) bcmul($quantity, '1', 0);
            if (count($serials) !== $needCount) {
                throw new \InvalidArgumentException(
                    '计件类物资必须按件录入序列号，本次需 ' . $needCount . ' 个 SN，实到 ' . count($serials) . ' 个'
                );
            }
        }

        // P9：batch_number 统一口径
        $batchNumber = trim((string) ($batchNumber ?? ''));

        // P9：计件类必须在计划库位拣货——预留落在计划库位行上，跨库位拣货会导致
        // 预留行与扣减行对不上（预留泄漏 + 取消回滚错行）。SN 实际库位须与计划库位一致。
        if ($needSerial && $locationId && $this->location_id && (int) $locationId !== (int) $this->location_id) {
            throw new \app\common\BizException(
                'SERIAL_NOT_AVAILABLE',
                '拣货库位与计划库位不一致（计划库位#' . $this->location_id . '），请按计划库位拣货或调整出库单'
            );
        }

        $this->startTrans();
        try {
            // 更新拣货数量
            $this->picked_quantity = bcadd((string)$this->picked_quantity, $quantity, 4);

            if ($locationId) {
                $this->location_id = $locationId;
            }
            // 计件类批次口径锁定为计划批次（预留/扣减同一行）；散料允许指定批次
            if ($batchNumber !== '' && !$needSerial) {
                $this->batch_number = $batchNumber;
            }

            $warehouseId = (int) ($this->outboundOrder->warehouse_id ?? 0);
            $pickedBatches = [];

            if ($needSerial) {
                // ===== 计件（普件）：总账行锁扣减 + SN 状态流转 =====
                if ($this->location_id) {
                    $this->decreaseInventory($this->location_id, $this->batch_number ?: '', $quantity, $operatorId);
                }

                // D3+P9：SN 单件状态联动（在库 → 正在用），校验"本仓 + 在库"
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
                    // P9：归属校验（存量 SN 无 warehouse_id 时跳过兼容）
                    if ($sn->warehouse_id && (int)$sn->warehouse_id !== $warehouseId) {
                        throw new \app\common\BizException('SERIAL_NOT_AVAILABLE', '序列号不在本仓，无法出库：' . $snCode);
                    }
                    if ($sn->location_id && $this->location_id && (int)$sn->location_id !== (int)$this->location_id) {
                        throw new \app\common\BizException('SERIAL_NOT_AVAILABLE', '序列号不在本库位，无法出库：' . $snCode);
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
            } else {
                // ===== 散料：批次台账余量扣减（指定批次或 FIFO，可跨批次），总账按批次实际库位同步扣 =====
                $batches = InventoryBatch::where('product_id', $this->product_id)
                    ->where('warehouse_id', $warehouseId)
                    ->where('status', InventoryBatch::STATUS_ACTIVE)
                    ->where('remaining_quantity', '>', 0);
                if ($batchNumber !== '') {
                    $batches->where('batch_no', $batchNumber);
                }
                // FIFO：按入库时间升序；一条 SELECT FOR UPDATE 按序锁多行，并发顺序一致
                $batches = $batches->order('inbound_at', 'asc')->lock(true)->select();

                $remaining = $quantity;
                foreach ($batches as $batch) {
                    if (bccomp($remaining, '0', 4) <= 0) {
                        break;
                    }
                    $take = bccomp((string)$batch->remaining_quantity, $remaining, 4) >= 0
                        ? $remaining
                        : (string)$batch->remaining_quantity;

                    // 扣批次余量；扣到 0 置"已用完"
                    $batch->remaining_quantity = bcsub((string)$batch->remaining_quantity, $take, 4);
                    if (bccomp((string)$batch->remaining_quantity, '0', 4) <= 0) {
                        $batch->status = InventoryBatch::STATUS_EXHAUSTED;
                    }
                    $batch->save();

                    // 总账按批次实际库位扣减（散料未预留：按行可用量校验、不动 reserved）
                    $this->decreaseInventory((int)$batch->location_id, (string)$batch->batch_no, $take, $operatorId, false);

                    $pickedBatches[] = [
                        'batch_id'   => (int)$batch->id,
                        'batch_no'   => (string)$batch->batch_no,
                        'location_id'=> (int)$batch->location_id,
                        'quantity'   => $take
                    ];
                    $remaining = bcsub($remaining, $take, 4);
                }

                if (bccomp($remaining, '0', 4) > 0) {
                    $available = bcsub($quantity, $remaining, 4);
                    throw new \app\common\BizException('STOCK_INSUFFICIENT', '批次余量不足（FIFO）', [[
                        'product_id'   => $this->product_id,
                        'product_name' => $this->product->name ?? '',
                        'unit'         => $this->unit ?: ($this->product->unit ?? ''),
                        'required'     => $quantity,
                        'available'    => $available,
                        'shortage'     => $remaining
                    ]]);
                }

                // 轨迹落库（取消回滚按此精确回退批次余量）；批次号回写首个实际批次
                if ($pickedBatches) {
                    $this->batch_number = $pickedBatches[0]['batch_no'];
                }
            }

            // P9：扣减轨迹（计件为空数组保持干净）
            $this->picked_batches = $pickedBatches ? json_encode($pickedBatches, JSON_UNESCAPED_UNICODE) : null;
            $this->save();

            $this->commit();
            return true;
        } catch (\Exception $e) {
            $this->rollback();
            throw $e;
        }
    }

    /**
     * P9：总账扣减（行锁）+ 预留联动释放 + 流水
     *
     * @param bool $consumeReserved true=计件：本单在 startPicking 已预留，本次拣货消耗自身预留，
     *                              可用性看物理库存是否覆盖（不能再用 quantity-reserved 校验，否则自锁）；
     *                              false=散料：本单未预留（FIFO 扣减行不定），按行可用量校验，不动 reserved
     */
    private function decreaseInventory(int $locationId, string $batchNumber, string $quantity, int $operatorId, bool $consumeReserved = true): void
    {
        $inventory = Inventory::where([
            'product_id'   => $this->product_id,
            'location_id'  => $locationId,
            'batch_number' => $batchNumber !== '' ? $batchNumber : ''
        ])->lock(true)->find();

        if (!$inventory) {
            throw new \app\common\BizException('STOCK_INSUFFICIENT', '库存不存在', [[
                'product_id' => $this->product_id,
                'required'   => $quantity,
                'available'  => '0'
            ]]);
        }

        // 可用性校验：计件看物理库存（消耗自身预留）；散料看行可用量（quantity - reserved）
        $available = $consumeReserved
            ? (string) $inventory->quantity
            : bcsub((string)$inventory->quantity, (string)$inventory->reserved_quantity, 4);
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
        if ($consumeReserved) {
            // P9：消耗本单预留（拣货即消耗预留）；reserved 为 UNSIGNED，残留脏数据 clamp 到 0
            if (bccomp((string)$inventory->reserved_quantity, $quantity, 4) >= 0) {
                $inventory->reserved_quantity = bcsub((string)$inventory->reserved_quantity, $quantity, 4);
            } else {
                $inventory->reserved_quantity = '0';
            }
        }
        $inventory->available_quantity = bcsub((string)$inventory->quantity, (string)$inventory->reserved_quantity, 4);
        $inventory->save();

        // 记录库存变动
        InventoryTransaction::createTransaction([
            'product_id' => $this->product_id,
            'location_id' => $locationId,
            'type' => InventoryTransaction::TYPE_OUT,
            'quantity' => $quantity,
            'balance_quantity' => $inventory->quantity,
            'operator_id' => $operatorId ?: ($this->outboundOrder->operator_id ?? 0),
            'reason' => '出库拣货',
            'reference_type' => InventoryTransaction::REFERENCE_OUTBOUND,
            'reference_id' => $this->outbound_order_id
        ]);
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
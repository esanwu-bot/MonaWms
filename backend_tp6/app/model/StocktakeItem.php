<?php

namespace app\model;

use think\Model;

/**
 * 盘点快照明细模型
 *
 * 普件：每 SN 一行（snapshot_qty=1，扫 SN 打勾）；另有"无SN在账"余数行（按数量录盘）
 * 散料：每批次一行（snapshot_qty=批次余量，录实盘数量）；另有"无批次在账"余数行
 * 盘盈新发现（陌生 SN）：is_surplus=1，snapshot_qty=0
 */
class StocktakeItem extends Model
{
    protected $name = 'stocktake_items';
    protected $pk = 'id';

    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';

    protected $type = [
        'id' => 'integer',
        'stocktake_order_id' => 'integer',
        'product_id' => 'integer',
        'location_id' => 'integer',
        'warehouse_id' => 'integer',
        'is_piece' => 'integer',
        // DECIMAL(18,4) 一律 string
        'snapshot_qty' => 'string',
        'counted_qty' => 'string',
        'diff_qty' => 'string',
    ];

    protected $readonly = ['id', 'stocktake_order_id', 'created_at'];

    protected $field = [
        'id',
        'stocktake_order_id',
        'product_id',
        'location_id',
        'warehouse_id',
        'is_piece',
        'serial_number',
        'batch_no',
        'snapshot_qty',
        'counted_qty',
        'diff_qty',
        'reason',
        'status',
        'is_surplus',
        'counted_by',
        'counted_at',
        'created_at',
        'updated_at',
    ];

    const STATUS_PENDING = 'pending';   // 未盘
    const STATUS_COUNTED = 'counted';   // 已盘

    public function getStatusTextAttr($value, $data)
    {
        return ($data['status'] ?? '') === self::STATUS_COUNTED ? '已盘' : '未盘';
    }

    /** 差异类型：盘盈/盘亏/无差异（展示用） */
    public function getDiffTypeAttr($value, $data)
    {
        $diff = (string)($data['diff_qty'] ?? '0');
        if (bccomp($diff, '0', 4) > 0) {
            return 'surplus';
        }
        if (bccomp($diff, '0', 4) < 0) {
            return 'deficit';
        }
        return 'even';
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function location()
    {
        return $this->belongsTo(Location::class, 'location_id');
    }

    public function stocktakeOrder()
    {
        return $this->belongsTo(StocktakeOrder::class, 'stocktake_order_id');
    }

    // ---------- 搜索器 ----------
    public function searchStocktakeOrderIdAttr($query, $value)
    {
        $query->where('stocktake_order_id', $value);
    }

    public function searchStatusAttr($query, $value)
    {
        if ($value !== '' && $value !== null) {
            $query->where('status', $value);
        }
    }

    public function searchIsPieceAttr($query, $value)
    {
        if ($value !== '' && $value !== null) {
            $query->where('is_piece', (int)$value);
        }
    }

    public function searchSerialNumberAttr($query, $value)
    {
        $query->where('serial_number', 'like', '%' . $value . '%');
    }

    public function searchBatchNoAttr($query, $value)
    {
        $query->where('batch_no', 'like', '%' . $value . '%');
    }

    /** 只看差异行（diff != 0） */
    public function searchDiffOnlyAttr($query, $value)
    {
        if ($value) {
            $query->where('diff_qty', '<>', '0');
        }
    }
}

<?php

namespace app\model;

use think\Model;
use think\model\concern\SoftDelete;

/**
 * 库存盘点单模型
 *
 * 状态机：draft草稿 → counting盘点中 → pending_review待审核 → completed已完成
 * 任意未完成状态可 cancelled；counting/pending_review 期间冻结该仓库出入库
 */
class StocktakeOrder extends Model
{
    use SoftDelete;

    protected $name = 'stocktake_orders';
    protected $pk = 'id';

    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';
    protected $deleteTime = 'deleted_at';

    protected $type = [
        'id' => 'integer',
        'warehouse_id' => 'integer',
        'keeper_id' => 'integer',
        'reviewer_id' => 'integer',
        // DECIMAL(18,4) 一律 string，bcmath 运算
        'total_snapshot_qty' => 'string',
        'total_counted_qty' => 'string',
        'total_diff_qty' => 'string',
        'item_total' => 'integer',
        'item_counted' => 'integer',
        'item_diff' => 'integer',
    ];

    protected $readonly = ['id', 'order_number', 'created_at'];

    protected $field = [
        'id',
        'order_number',
        'warehouse_id',
        'type',
        'scope_type',
        'scope_value',
        'status',
        'keeper_id',
        'snapshot_at',
        'submitted_at',
        'reviewer_id',
        'reviewed_at',
        'review_notes',
        'adjustment_number',
        'total_snapshot_qty',
        'total_counted_qty',
        'total_diff_qty',
        'item_total',
        'item_counted',
        'item_diff',
        'notes',
        'created_by',
        'updated_by',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    // ---------- 状态常量 ----------
    const STATUS_DRAFT = 'draft';
    const STATUS_COUNTING = 'counting';
    const STATUS_PENDING_REVIEW = 'pending_review';
    const STATUS_COMPLETED = 'completed';
    const STATUS_CANCELLED = 'cancelled';

    /** 冻结出入库的状态集合（盘点进行中） */
    const FREEZING_STATUSES = [self::STATUS_COUNTING, self::STATUS_PENDING_REVIEW];

    // 盘点类型：full全盘 / partial抽盘 / dynamic动碰盘点
    const TYPE_FULL = 'full';
    const TYPE_PARTIAL = 'partial';
    const TYPE_DYNAMIC = 'dynamic';

    // 盘点范围：all全仓 / category按分类 / location按库区库位
    const SCOPE_ALL = 'all';
    const SCOPE_CATEGORY = 'category';
    const SCOPE_LOCATION = 'location';

    public static function statusTexts(): array
    {
        return [
            self::STATUS_DRAFT => '草稿',
            self::STATUS_COUNTING => '盘点中',
            self::STATUS_PENDING_REVIEW => '待审核',
            self::STATUS_COMPLETED => '已完成',
            self::STATUS_CANCELLED => '已取消',
        ];
    }

    /**
     * 生成盘点单号：PD + Ymd + 4位序号
     *
     * 取当日最大单号序号 +1（含软删行）；不能用 count()+1（归档回退撞唯一键），
     * 也不能用 max()（think-orm 强转数字陷阱），参考 InboundOrder::generateOrderNumber
     */
    public static function generateOrderNumber(): string
    {
        $prefix = 'PD';
        $date = date('Ymd');
        $max = self::withTrashed()
            ->where('order_number', 'like', $prefix . $date . '%')
            ->order('order_number', 'desc')
            ->value('order_number');
        $sequence = str_pad((string)((int)substr((string)$max, -4) + 1), 4, '0', STR_PAD_LEFT);

        return $prefix . $date . $sequence;
    }

    /**
     * 生成盘点调整单号：PD-ADJ-Ymd-<盘点单ID>（每张盘点单一张调整单，天然唯一）
     */
    public function generateAdjustmentNumber(): string
    {
        return 'PD-ADJ-' . date('Ymd') . '-' . $this->id;
    }

    public function getStatusTextAttr($value, $data)
    {
        return self::statusTexts()[$data['status'] ?? ''] ?? $data['status'] ?? '';
    }

    // ---------- 关联 ----------
    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    public function keeper()
    {
        return $this->belongsTo(User::class, 'keeper_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    public function items()
    {
        return $this->hasMany(StocktakeItem::class, 'stocktake_order_id');
    }

    // ---------- 搜索器 ----------
    public function searchOrderNumberAttr($query, $value)
    {
        $query->where('order_number', 'like', '%' . $value . '%');
    }

    public function searchWarehouseIdAttr($query, $value)
    {
        $query->where('warehouse_id', $value);
    }

    public function searchStatusAttr($query, $value)
    {
        if ($value !== '' && $value !== null) {
            $query->where('status', $value);
        }
    }

    public function searchTypeAttr($query, $value)
    {
        if ($value !== '' && $value !== null) {
            $query->where('type', $value);
        }
    }
}

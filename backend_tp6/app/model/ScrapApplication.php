<?php

namespace app\model;

use think\Model;
use think\model\concern\SoftDelete;

/**
 * 报废申请模型
 */
class ScrapApplication extends Model
{
    use SoftDelete;

    protected $table = 'scrap_applications';
    protected $pk = 'id';
    protected $deleteTime = 'deleted_at';
    protected $defaultSoftDelete = null;

    // 自动时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';

    // 字段类型转换
    protected $type = [
        'id' => 'integer',
        'device_id' => 'integer',
        'estimated_loss' => 'float',
        'actual_loss' => 'float',
        'images' => 'json',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
        'approved_at' => 'datetime',
        'processed_at' => 'datetime',
    ];

    // 状态常量
    const STATUS_PENDING = 'pending';      // 待审核
    const STATUS_APPROVED = 'approved';    // 已审核
    const STATUS_REJECTED = 'rejected';    // 已拒绝
    const STATUS_COMPLETED = 'completed';  // 已处理

    // 报废原因常量
    const REASON_DAMAGE = 'damage';        // 设备损坏
    const REASON_OBSOLETE = 'obsolete';    // 技术淘汰
    const REASON_EXPIRED = 'expired';      // 超期使用
    const REASON_OTHER = 'other';          // 其他原因

    /**
     * 关联设备信息
     */
    public function device()
    {
        return $this->belongsTo(Product::class, 'device_id', 'id');
    }

    /**
     * 关联申请人
     */
    public function applicant()
    {
        return $this->belongsTo(User::class, 'applicant_id', 'id');
    }

    /**
     * 关联审核人
     */
    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by', 'id');
    }

    /**
     * 关联处理人
     */
    public function processor()
    {
        return $this->belongsTo(User::class, 'processed_by', 'id');
    }

    /**
     * 获取状态文本
     */
    public function getStatusTextAttr($value, $data)
    {
        $statusMap = [
            self::STATUS_PENDING => '待审核',
            self::STATUS_APPROVED => '已审核',
            self::STATUS_REJECTED => '已拒绝',
            self::STATUS_COMPLETED => '已处理',
        ];
        return $statusMap[$data['status']] ?? $data['status'];
    }

    /**
     * 获取报废原因文本
     */
    public function getReasonTextAttr($value, $data)
    {
        $reasonMap = [
            self::REASON_DAMAGE => '设备损坏',
            self::REASON_OBSOLETE => '技术淘汰',
            self::REASON_EXPIRED => '超期使用',
            self::REASON_OTHER => '其他原因',
        ];
        return $reasonMap[$data['reason_type']] ?? $data['reason_type'];
    }

    /**
     * 生成报废申请编号
     */
    public static function generateScrapNumber()
    {
        $prefix = 'SCR';
        $date = date('Ymd');
        
        // 查询当天最大编号
        $lastRecord = self::where('scrap_number', 'like', $prefix . $date . '%')
            ->order('scrap_number', 'desc')
            ->find();
        
        if ($lastRecord) {
            $lastNumber = intval(substr($lastRecord->scrap_number, -3));
            $newNumber = str_pad($lastNumber + 1, 3, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '001';
        }
        
        return $prefix . $date . $newNumber;
    }

    /**
     * 搜索器 - 按设备名称搜索
     */
    public function searchDeviceNameAttr($query, $value)
    {
        if ($value) {
            $query->hasWhere('device', function($q) use ($value) {
                $q->where('name', 'like', '%' . $value . '%');
            });
        }
    }

    /**
     * 搜索器 - 按序列号搜索
     */
    public function searchSerialNumberAttr($query, $value)
    {
        if ($value) {
            $query->hasWhere('device', function($q) use ($value) {
                $q->where('serial_number', 'like', '%' . $value . '%');
            });
        }
    }

    /**
     * 搜索器 - 按状态搜索
     */
    public function searchStatusAttr($query, $value)
    {
        if ($value) {
            $query->where('status', $value);
        }
    }

    /**
     * 搜索器 - 按报废原因搜索
     */
    public function searchReasonTypeAttr($query, $value)
    {
        if ($value) {
            $query->where('reason_type', $value);
        }
    }

    /**
     * 搜索器 - 按申请人搜索
     */
    public function searchApplicantAttr($query, $value)
    {
        if ($value) {
            $query->hasWhere('applicant', function($q) use ($value) {
                $q->where('full_name', 'like', '%' . $value . '%')
                  ->whereOr('username', 'like', '%' . $value . '%');
            });
        }
    }

    /**
     * 搜索器 - 按时间范围搜索
     */
    public function searchDateRangeAttr($query, $value)
    {
        if ($value && is_array($value) && count($value) == 2) {
            $query->whereBetweenTime('created_at', $value[0], $value[1]);
        }
    }
}
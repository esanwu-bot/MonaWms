<?php

namespace app\model;

use think\Model;
use think\model\concern\SoftDelete;

class Device extends Model
{
    use SoftDelete;
    
    protected $table = 'devices';
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
        'warranty_period' => 'integer',
        'purchase_date' => 'date',
        'warranty_end_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime'
    ];
    
    // 允许批量赋值的字段
    protected $field = [
        'id', 'device_code', 'device_name', 'device_type', 'model', 'brand',
        'serial_number', 'status', 'location', 'purchase_date', 'warranty_period',
        'warranty_end_date', 'notes', 'created_at', 'updated_at', 'deleted_at'
    ];
    
    // 状态常量
    const STATUS_ACTIVE = 'active';
    const STATUS_MAINTENANCE = 'maintenance';
    const STATUS_INACTIVE = 'inactive';
    const STATUS_SCRAPPED = 'scrapped';
    
    // 获取状态文本
    public function getStatusTextAttr($value, $data)
    {
        $statusMap = [
            self::STATUS_ACTIVE => '正常运行',
            self::STATUS_MAINTENANCE => '维护中',
            self::STATUS_INACTIVE => '停用',
            self::STATUS_SCRAPPED => '已报废'
        ];
        
        return $statusMap[$data['status']] ?? '未知状态';
    }
    
    // 验证设备编号唯一性
    public static function validateDeviceCode($deviceCode, $excludeId = null)
    {
        $query = self::where('device_code', $deviceCode);
        if ($excludeId) {
            $query->where('id', '<>', $excludeId);
        }
        return $query->count() === 0;
    }
    
    // 验证序列号唯一性
    public static function validateSerialNumber($serialNumber, $excludeId = null)
    {
        $query = self::where('serial_number', $serialNumber);
        if ($excludeId) {
            $query->where('id', '<>', $excludeId);
        }
        return $query->count() === 0;
    }
    
    // 批量导入验证
    public static function validateBatchData($data)
    {
        $errors = [];
        $deviceCodes = [];
        $serialNumbers = [];
        
        foreach ($data as $index => $row) {
            $rowIndex = $index + 1;
            
            // 必填字段验证
            if (empty($row['device_code'])) {
                $errors[] = "第{$rowIndex}行：设备编号不能为空";
            } elseif (in_array($row['device_code'], $deviceCodes)) {
                $errors[] = "第{$rowIndex}行：设备编号重复";
            } elseif (!self::validateDeviceCode($row['device_code'])) {
                $errors[] = "第{$rowIndex}行：设备编号已存在";
            } else {
                $deviceCodes[] = $row['device_code'];
            }
            
            if (empty($row['device_name'])) {
                $errors[] = "第{$rowIndex}行：设备名称不能为空";
            }
            
            if (empty($row['device_type'])) {
                $errors[] = "第{$rowIndex}行：设备类型不能为空";
            }
            
            if (empty($row['serial_number'])) {
                $errors[] = "第{$rowIndex}行：序列号不能为空";
            } elseif (in_array($row['serial_number'], $serialNumbers)) {
                $errors[] = "第{$rowIndex}行：序列号重复";
            } elseif (!self::validateSerialNumber($row['serial_number'])) {
                $errors[] = "第{$rowIndex}行：序列号已存在";
            } else {
                $serialNumbers[] = $row['serial_number'];
            }
            
            // 状态验证
            if (!empty($row['status']) && !in_array($row['status'], [self::STATUS_ACTIVE, self::STATUS_MAINTENANCE, self::STATUS_INACTIVE, self::STATUS_SCRAPPED])) {
                $errors[] = "第{$rowIndex}行：设备状态无效";
            }
            
            // 保修期验证
            if (!empty($row['warranty_period']) && (!is_numeric($row['warranty_period']) || $row['warranty_period'] < 0)) {
                $errors[] = "第{$rowIndex}行：保修期必须为非负数字";
            }
        }
        
        return $errors;
    }
}
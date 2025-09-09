<?php

namespace app\validate;

use think\Validate;

/**
 * 库存管理验证器
 */
class InventoryValidate extends Validate
{
    /**
     * 验证规则
     * @var array
     */
    protected $rule = [
        'product_id' => 'require|integer|gt:0',
        'location_id' => 'require|integer|gt:0',
        'warehouse_id' => 'require|integer|gt:0',
        'quantity' => 'require|integer|gt:0',
        'reserved_quantity' => 'integer|egt:0',
        'available_quantity' => 'integer|egt:0',
        'type' => 'require|in:increase,decrease',
        'reason' => 'require|max:100',
        'remark' => 'max:500',
        'batch_number' => 'max:50|alphaNum',
        'serial_number' => 'max:50|alphaNum',
        'expiry_date' => 'date',
        'production_date' => 'date',
        'cost_price' => 'float|egt:0',
        'reference_type' => 'in:inbound_order,outbound_order,transfer,adjustment,return',
        'reference_id' => 'integer|gt:0',
    ];
    
    /**
     * 验证消息
     * @var array
     */
    protected $message = [
        'product_id.require' => '产品不能为空',
        'product_id.integer' => '产品ID必须是整数',
        'product_id.gt' => '产品ID必须大于0',
        'location_id.require' => '库位不能为空',
        'location_id.integer' => '库位ID必须是整数',
        'location_id.gt' => '库位ID必须大于0',
        'warehouse_id.require' => '仓库不能为空',
        'warehouse_id.integer' => '仓库ID必须是整数',
        'warehouse_id.gt' => '仓库ID必须大于0',
        'quantity.require' => '数量不能为空',
        'quantity.integer' => '数量必须是整数',
        'quantity.gt' => '数量必须大于0',
        'reserved_quantity.integer' => '预留数量必须是整数',
        'reserved_quantity.egt' => '预留数量不能小于0',
        'available_quantity.integer' => '可用数量必须是整数',
        'available_quantity.egt' => '可用数量不能小于0',
        'type.require' => '操作类型不能为空',
        'type.in' => '操作类型无效',
        'reason.require' => '操作原因不能为空',
        'reason.max' => '操作原因长度不能超过100个字符',
        'remark.max' => '备注长度不能超过500个字符',
        'batch_number.max' => '批次号长度不能超过50个字符',
        'batch_number.alphaNum' => '批次号只能包含字母和数字',
        'serial_number.max' => '序列号长度不能超过50个字符',
        'serial_number.alphaNum' => '序列号只能包含字母和数字',
        'expiry_date.date' => '过期日期格式不正确',
        'production_date.date' => '生产日期格式不正确',
        'cost_price.float' => '成本价必须是数字',
        'cost_price.egt' => '成本价不能小于0',
        'reference_type.in' => '关联类型无效',
        'reference_id.integer' => '关联ID必须是整数',
        'reference_id.gt' => '关联ID必须大于0',
    ];
    
    /**
     * 验证场景
     * @var array
     */
    protected $scene = [
        'adjust' => ['product_id', 'location_id', 'type', 'quantity', 'reason', 'remark', 'batch_number', 'expiry_date', 'cost_price'],
        'reserve' => ['product_id', 'location_id', 'quantity', 'reference_type', 'reference_id'],
        'release' => ['product_id', 'location_id', 'quantity', 'reference_type', 'reference_id'],
        'move' => ['product_id', 'location_id', 'quantity', 'remark'],
        'create' => ['product_id', 'location_id', 'warehouse_id', 'quantity', 'batch_number', 'serial_number', 'expiry_date', 'production_date', 'cost_price'],
    ];
    
    /**
     * 库存调整验证
     * @param array $data
     * @return bool|string
     */
    public function sceneAdjust($data)
    {
        return $this->only(['product_id', 'location_id', 'type', 'quantity', 'reason', 'remark', 'batch_number', 'expiry_date', 'cost_price'])
                    ->append('product_id', 'checkProductExists')
                    ->append('location_id', 'checkLocationExists')
                    ->append('quantity', 'checkAdjustQuantity')
                    ->append('expiry_date', 'checkExpiryDate')
                    ->check($data);
    }
    
    /**
     * 库存预留验证
     * @param array $data
     * @return bool|string
     */
    public function sceneReserve($data)
    {
        return $this->only(['product_id', 'location_id', 'quantity', 'reference_type', 'reference_id'])
                    ->append('product_id', 'checkProductExists')
                    ->append('location_id', 'checkLocationExists')
                    ->append('quantity', 'checkAvailableStock')
                    ->append('reference_id', 'checkReferenceExists')
                    ->check($data);
    }
    
    /**
     * 库存释放验证
     * @param array $data
     * @return bool|string
     */
    public function sceneRelease($data)
    {
        return $this->only(['product_id', 'location_id', 'quantity', 'reference_type', 'reference_id'])
                    ->append('product_id', 'checkProductExists')
                    ->append('location_id', 'checkLocationExists')
                    ->append('quantity', 'checkReservedStock')
                    ->append('reference_id', 'checkReferenceExists')
                    ->check($data);
    }
    
    /**
     * 库存移动验证
     * @param array $data
     * @return bool|string
     */
    public function sceneMove($data)
    {
        return $this->only(['product_id', 'location_id', 'quantity', 'remark'])
                    ->append('product_id', 'checkProductExists')
                    ->append('location_id', 'checkLocationExists')
                    ->append('quantity', 'checkAvailableStock')
                    ->check($data);
    }
    
    /**
     * 创建库存验证
     * @param array $data
     * @return bool|string
     */
    public function sceneCreate($data)
    {
        return $this->only(['product_id', 'location_id', 'warehouse_id', 'quantity', 'batch_number', 'serial_number', 'expiry_date', 'production_date', 'cost_price'])
                    ->append('product_id', 'checkProductExists')
                    ->append('location_id', 'checkLocationExists')
                    ->append('warehouse_id', 'checkWarehouseExists')
                    ->append('batch_number', 'checkBatchUnique')
                    ->append('serial_number', 'checkSerialUnique')
                    ->append('expiry_date', 'checkExpiryDate')
                    ->append('production_date', 'checkProductionDate')
                    ->check($data);
    }
    
    /**
     * 自定义验证规则：检查产品是否存在
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkProductExists($value, $rule, $data)
    {
        $product = \app\model\Product::where('id', $value)
                                    ->where('status', 1)
                                    ->find();
        
        if (!$product) {
            return '产品不存在或已禁用';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查库位是否存在
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkLocationExists($value, $rule, $data)
    {
        $location = \app\model\Location::where('id', $value)
                                      ->where('status', 1)
                                      ->find();
        
        if (!$location) {
            return '库位不存在或已禁用';
        }
        
        // 检查库位是否属于指定仓库
        if (isset($data['warehouse_id']) && $location->warehouse_id != $data['warehouse_id']) {
            return '库位不属于指定仓库';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查仓库是否存在
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkWarehouseExists($value, $rule, $data)
    {
        $warehouse = \app\model\Warehouse::where('id', $value)
                                        ->where('status', 1)
                                        ->find();
        
        if (!$warehouse) {
            return '仓库不存在或已禁用';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查调整数量
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkAdjustQuantity($value, $rule, $data)
    {
        if ($data['type'] === 'decrease') {
            // 减少库存时，检查当前可用库存是否足够
            $inventory = \app\model\Inventory::where('product_id', $data['product_id'])
                                            ->where('location_id', $data['location_id'])
                                            ->find();
            
            if (!$inventory) {
                return '该库位没有此产品的库存';
            }
            
            $availableQuantity = $inventory->quantity - $inventory->reserved_quantity;
            if ($value > $availableQuantity) {
                return '减少数量不能超过可用库存(' . $availableQuantity . ')';
            }
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查可用库存
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkAvailableStock($value, $rule, $data)
    {
        $inventory = \app\model\Inventory::where('product_id', $data['product_id'])
                                        ->where('location_id', $data['location_id'])
                                        ->find();
        
        if (!$inventory) {
            return '该库位没有此产品的库存';
        }
        
        $availableQuantity = $inventory->quantity - $inventory->reserved_quantity;
        if ($value > $availableQuantity) {
            return '数量不能超过可用库存(' . $availableQuantity . ')';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查预留库存
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkReservedStock($value, $rule, $data)
    {
        $inventory = \app\model\Inventory::where('product_id', $data['product_id'])
                                        ->where('location_id', $data['location_id'])
                                        ->find();
        
        if (!$inventory) {
            return '该库位没有此产品的库存';
        }
        
        if ($value > $inventory->reserved_quantity) {
            return '释放数量不能超过预留库存(' . $inventory->reserved_quantity . ')';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查关联记录是否存在
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkReferenceExists($value, $rule, $data)
    {
        if (!isset($data['reference_type'])) {
            return true;
        }
        
        switch ($data['reference_type']) {
            case 'inbound_order':
                $exists = \app\model\InboundOrder::where('id', $value)->count() > 0;
                break;
            case 'outbound_order':
                $exists = \app\model\OutboundOrder::where('id', $value)->count() > 0;
                break;
            default:
                return true;
        }
        
        if (!$exists) {
            return '关联记录不存在';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查批次号唯一性
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkBatchUnique($value, $rule, $data)
    {
        if (empty($value)) {
            return true;
        }
        
        $exists = \app\model\Inventory::where('product_id', $data['product_id'])
                                     ->where('batch_number', $value)
                                     ->count() > 0;
        
        if ($exists) {
            return '该产品的批次号已存在';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查序列号唯一性
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkSerialUnique($value, $rule, $data)
    {
        if (empty($value)) {
            return true;
        }
        
        $exists = \app\model\Inventory::where('serial_number', $value)->count() > 0;
        
        if ($exists) {
            return '序列号已存在';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查过期日期
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkExpiryDate($value, $rule, $data)
    {
        if (empty($value)) {
            return true;
        }
        
        $expiryDate = strtotime($value);
        $today = strtotime(date('Y-m-d'));
        
        if ($expiryDate <= $today) {
            return '过期日期不能早于或等于今天';
        }
        
        // 如果有生产日期，检查过期日期是否晚于生产日期
        if (isset($data['production_date']) && !empty($data['production_date'])) {
            $productionDate = strtotime($data['production_date']);
            if ($expiryDate <= $productionDate) {
                return '过期日期必须晚于生产日期';
            }
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查生产日期
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkProductionDate($value, $rule, $data)
    {
        if (empty($value)) {
            return true;
        }
        
        $productionDate = strtotime($value);
        $today = strtotime(date('Y-m-d'));
        
        if ($productionDate > $today) {
            return '生产日期不能晚于今天';
        }
        
        return true;
    }
}
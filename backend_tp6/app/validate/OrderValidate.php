<?php

namespace app\validate;

use think\Validate;

/**
 * 订单验证器（入库单和出库单）
 */
class OrderValidate extends Validate
{
    /**
     * 验证规则
     * @var array
     */
    protected $rule = [
        'warehouse_id' => 'require|integer|gt:0',
        'supplier_id' => 'integer|gt:0',
        'customer_id' => 'integer|gt:0',
        'order_number' => 'max:50|alphaNum',
        'type' => 'require|in:purchase,return,transfer,adjustment,sale',
        'priority' => 'in:low,normal,high,urgent',
        'status' => 'in:pending,receiving,completed,cancelled,picking,packed,shipped,delivered',
        'expected_date' => 'date',
        'actual_date' => 'date',
        'remark' => 'max:500',
        'tracking_number' => 'max:100',
        'carrier' => 'max:50',
        'total_amount' => 'float|egt:0',
        'items' => 'require|array',
        'items.*.product_id' => 'require|integer|gt:0',
        'items.*.location_id' => 'require|integer|gt:0',
        'items.*.expected_quantity' => 'require|integer|gt:0',
        'items.*.received_quantity' => 'integer|egt:0',
        'items.*.required_quantity' => 'require|integer|gt:0',
        'items.*.picked_quantity' => 'integer|egt:0',
        'items.*.cost_price' => 'float|egt:0',
        'items.*.sale_price' => 'float|egt:0',
        'items.*.batch_number' => 'max:50|alphaNum',
        'items.*.expiry_date' => 'date',
        'items.*.remark' => 'max:200',
        'item_id' => 'require|integer|gt:0',
        'quantity' => 'require|integer|gt:0',
    ];
    
    /**
     * 验证消息
     * @var array
     */
    protected $message = [
        'warehouse_id.require' => '仓库不能为空',
        'warehouse_id.integer' => '仓库ID必须是整数',
        'warehouse_id.gt' => '仓库ID必须大于0',
        'supplier_id.integer' => '供应商ID必须是整数',
        'supplier_id.gt' => '供应商ID必须大于0',
        'customer_id.integer' => '客户ID必须是整数',
        'customer_id.gt' => '客户ID必须大于0',
        'order_number.max' => '订单号长度不能超过50个字符',
        'order_number.alphaNum' => '订单号只能包含字母和数字',
        'type.require' => '订单类型不能为空',
        'type.in' => '订单类型无效',
        'priority.in' => '优先级无效',
        'status.in' => '状态无效',
        'expected_date.date' => '预期日期格式不正确',
        'actual_date.date' => '实际日期格式不正确',
        'remark.max' => '备注长度不能超过500个字符',
        'tracking_number.max' => '快递单号长度不能超过100个字符',
        'carrier.max' => '承运商长度不能超过50个字符',
        'total_amount.float' => '总金额必须是数字',
        'total_amount.egt' => '总金额不能小于0',
        'items.require' => '订单明细不能为空',
        'items.array' => '订单明细必须是数组',
        'items.*.product_id.require' => '产品不能为空',
        'items.*.product_id.integer' => '产品ID必须是整数',
        'items.*.product_id.gt' => '产品ID必须大于0',
        'items.*.location_id.require' => '库位不能为空',
        'items.*.location_id.integer' => '库位ID必须是整数',
        'items.*.location_id.gt' => '库位ID必须大于0',
        'items.*.expected_quantity.require' => '预期数量不能为空',
        'items.*.expected_quantity.integer' => '预期数量必须是整数',
        'items.*.expected_quantity.gt' => '预期数量必须大于0',
        'items.*.received_quantity.integer' => '实收数量必须是整数',
        'items.*.received_quantity.egt' => '实收数量不能小于0',
        'items.*.required_quantity.require' => '需求数量不能为空',
        'items.*.required_quantity.integer' => '需求数量必须是整数',
        'items.*.required_quantity.gt' => '需求数量必须大于0',
        'items.*.picked_quantity.integer' => '拣货数量必须是整数',
        'items.*.picked_quantity.egt' => '拣货数量不能小于0',
        'items.*.cost_price.float' => '成本价必须是数字',
        'items.*.cost_price.egt' => '成本价不能小于0',
        'items.*.sale_price.float' => '销售价必须是数字',
        'items.*.sale_price.egt' => '销售价不能小于0',
        'items.*.batch_number.max' => '批次号长度不能超过50个字符',
        'items.*.batch_number.alphaNum' => '批次号只能包含字母和数字',
        'items.*.expiry_date.date' => '过期日期格式不正确',
        'items.*.remark.max' => '明细备注长度不能超过200个字符',
        'item_id.require' => '明细项目不能为空',
        'item_id.integer' => '明细项目ID必须是整数',
        'item_id.gt' => '明细项目ID必须大于0',
        'quantity.require' => '数量不能为空',
        'quantity.integer' => '数量必须是整数',
        'quantity.gt' => '数量必须大于0',
    ];
    
    /**
     * 验证场景
     * @var array
     */
    protected $scene = [
        'inbound_create' => ['warehouse_id', 'supplier_id', 'type', 'expected_date', 'remark', 'items'],
        'inbound_update' => ['warehouse_id', 'supplier_id', 'type', 'expected_date', 'remark', 'items'],
        'inbound_receive' => ['item_id', 'quantity', 'batch_number', 'expiry_date', 'remark'],
        'outbound_create' => ['warehouse_id', 'customer_id', 'type', 'priority', 'expected_date', 'remark', 'items'],
        'outbound_update' => ['warehouse_id', 'customer_id', 'type', 'priority', 'expected_date', 'remark', 'items'],
        'outbound_pick' => ['item_id', 'quantity', 'batch_number', 'remark'],
        'outbound_ship' => ['tracking_number', 'carrier', 'remark'],
        'status_update' => ['status'],
    ];
    
    /**
     * 入库单创建验证
     * @param array $data
     * @return bool|string
     */
    public function sceneInboundCreate($data)
    {
        return $this->only(['warehouse_id', 'supplier_id', 'type', 'expected_date', 'remark', 'items'])
                    ->append('warehouse_id', 'checkWarehouseExists')
                    ->append('supplier_id', 'checkSupplierExists')
                    ->append('type', 'checkInboundType')
                    ->append('items', 'checkInboundItems')
                    ->check($data);
    }
    
    /**
     * 入库单更新验证
     * @param array $data
     * @return bool|string
     */
    public function sceneInboundUpdate($data)
    {
        return $this->only(['warehouse_id', 'supplier_id', 'type', 'expected_date', 'remark', 'items'])
                    ->append('warehouse_id', 'checkWarehouseExists')
                    ->append('supplier_id', 'checkSupplierExists')
                    ->append('type', 'checkInboundType')
                    ->append('items', 'checkInboundItems')
                    ->check($data);
    }
    
    /**
     * 入库收货验证
     * @param array $data
     * @return bool|string
     */
    public function sceneInboundReceive($data)
    {
        return $this->only(['item_id', 'quantity', 'batch_number', 'expiry_date', 'remark'])
                    ->append('item_id', 'checkInboundItemExists')
                    ->append('quantity', 'checkReceiveQuantity')
                    ->append('expiry_date', 'checkExpiryDate')
                    ->check($data);
    }
    
    /**
     * 出库单创建验证
     * @param array $data
     * @return bool|string
     */
    public function sceneOutboundCreate($data)
    {
        return $this->only(['warehouse_id', 'customer_id', 'type', 'priority', 'expected_date', 'remark', 'items'])
                    ->append('warehouse_id', 'checkWarehouseExists')
                    ->append('customer_id', 'checkCustomerExists')
                    ->append('type', 'checkOutboundType')
                    ->append('items', 'checkOutboundItems')
                    ->check($data);
    }
    
    /**
     * 出库单更新验证
     * @param array $data
     * @return bool|string
     */
    public function sceneOutboundUpdate($data)
    {
        return $this->only(['warehouse_id', 'customer_id', 'type', 'priority', 'expected_date', 'remark', 'items'])
                    ->append('warehouse_id', 'checkWarehouseExists')
                    ->append('customer_id', 'checkCustomerExists')
                    ->append('type', 'checkOutboundType')
                    ->append('items', 'checkOutboundItems')
                    ->check($data);
    }
    
    /**
     * 出库拣货验证
     * @param array $data
     * @return bool|string
     */
    public function sceneOutboundPick($data)
    {
        return $this->only(['item_id', 'quantity', 'batch_number', 'remark'])
                    ->append('item_id', 'checkOutboundItemExists')
                    ->append('quantity', 'checkPickQuantity')
                    ->check($data);
    }
    
    /**
     * 出库发货验证
     * @param array $data
     * @return bool|string
     */
    public function sceneOutboundShip($data)
    {
        return $this->only(['tracking_number', 'carrier', 'remark'])->check($data);
    }
    
    /**
     * 状态更新验证
     * @param array $data
     * @return bool|string
     */
    public function sceneStatusUpdate($data)
    {
        return $this->only(['status'])->check($data);
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
     * 自定义验证规则：检查供应商是否存在
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkSupplierExists($value, $rule, $data)
    {
        if (empty($value)) {
            return true; // 供应商可以为空
        }
        
        $supplier = \app\model\Supplier::where('id', $value)
                                      ->where('status', 1)
                                      ->find();
        
        if (!$supplier) {
            return '供应商不存在或已禁用';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查客户是否存在
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkCustomerExists($value, $rule, $data)
    {
        if (empty($value)) {
            return true; // 客户可以为空
        }
        
        $customer = \app\model\Customer::where('id', $value)
                                      ->where('status', 1)
                                      ->find();
        
        if (!$customer) {
            return '客户不存在或已禁用';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查入库单类型
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkInboundType($value, $rule, $data)
    {
        $allowedTypes = ['purchase', 'return', 'transfer', 'adjustment'];
        
        if (!in_array($value, $allowedTypes)) {
            return '入库单类型无效';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查出库单类型
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkOutboundType($value, $rule, $data)
    {
        $allowedTypes = ['sale', 'transfer', 'adjustment'];
        
        if (!in_array($value, $allowedTypes)) {
            return '出库单类型无效';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查入库单明细
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkInboundItems($value, $rule, $data)
    {
        if (empty($value) || !is_array($value)) {
            return '入库单明细不能为空';
        }
        
        foreach ($value as $index => $item) {
            // 检查产品是否存在
            if (!isset($item['product_id'])) {
                return "第" . ($index + 1) . "项产品不能为空";
            }
            
            $product = \app\model\Product::where('id', $item['product_id'])
                                        ->where('status', 1)
                                        ->find();
            if (!$product) {
                return "第" . ($index + 1) . "项产品不存在或已禁用";
            }
            
            // 检查库位是否存在
            if (!isset($item['location_id'])) {
                return "第" . ($index + 1) . "项库位不能为空";
            }
            
            $location = \app\model\Location::where('id', $item['location_id'])
                                          ->where('status', 1)
                                          ->find();
            if (!$location) {
                return "第" . ($index + 1) . "项库位不存在或已禁用";
            }
            
            // 检查库位是否属于指定仓库
            if ($location->warehouse_id != $data['warehouse_id']) {
                return "第" . ($index + 1) . "项库位不属于指定仓库";
            }
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查出库单明细
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkOutboundItems($value, $rule, $data)
    {
        if (empty($value) || !is_array($value)) {
            return '出库单明细不能为空';
        }
        
        foreach ($value as $index => $item) {
            // 检查产品是否存在
            if (!isset($item['product_id'])) {
                return "第" . ($index + 1) . "项产品不能为空";
            }
            
            $product = \app\model\Product::where('id', $item['product_id'])
                                        ->where('status', 1)
                                        ->find();
            if (!$product) {
                return "第" . ($index + 1) . "项产品不存在或已禁用";
            }
            
            // 检查库位是否存在
            if (!isset($item['location_id'])) {
                return "第" . ($index + 1) . "项库位不能为空";
            }
            
            $location = \app\model\Location::where('id', $item['location_id'])
                                          ->where('status', 1)
                                          ->find();
            if (!$location) {
                return "第" . ($index + 1) . "项库位不存在或已禁用";
            }
            
            // 检查库位是否属于指定仓库
            if ($location->warehouse_id != $data['warehouse_id']) {
                return "第" . ($index + 1) . "项库位不属于指定仓库";
            }
            
            // 检查库存是否足够
            if (isset($item['required_quantity'])) {
                $inventory = \app\model\Inventory::where('product_id', $item['product_id'])
                                                ->where('location_id', $item['location_id'])
                                                ->find();
                
                if (!$inventory) {
                    return "第" . ($index + 1) . "项产品在该库位没有库存";
                }
                
                $availableQuantity = $inventory->quantity - $inventory->reserved_quantity;
                if ($item['required_quantity'] > $availableQuantity) {
                    return "第" . ($index + 1) . "项产品库存不足，可用库存：" . $availableQuantity;
                }
            }
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查入库单明细项目是否存在
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkInboundItemExists($value, $rule, $data)
    {
        $item = \app\model\InboundOrderItem::where('id', $value)->find();
        
        if (!$item) {
            return '入库单明细项目不存在';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查出库单明细项目是否存在
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkOutboundItemExists($value, $rule, $data)
    {
        $item = \app\model\OutboundOrderItem::where('id', $value)->find();
        
        if (!$item) {
            return '出库单明细项目不存在';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查收货数量
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkReceiveQuantity($value, $rule, $data)
    {
        $item = \app\model\InboundOrderItem::where('id', $data['item_id'])->find();
        
        if (!$item) {
            return '入库单明细项目不存在';
        }
        
        $remainingQuantity = $item->expected_quantity - $item->received_quantity;
        if ($value > $remainingQuantity) {
            return '收货数量不能超过剩余数量(' . $remainingQuantity . ')';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查拣货数量
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkPickQuantity($value, $rule, $data)
    {
        $item = \app\model\OutboundOrderItem::where('id', $data['item_id'])->find();
        
        if (!$item) {
            return '出库单明细项目不存在';
        }
        
        $remainingQuantity = $item->required_quantity - $item->picked_quantity;
        if ($value > $remainingQuantity) {
            return '拣货数量不能超过剩余数量(' . $remainingQuantity . ')';
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
        
        return true;
    }
}
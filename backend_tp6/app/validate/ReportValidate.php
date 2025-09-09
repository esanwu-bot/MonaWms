<?php

namespace app\validate;

use think\Validate;

/**
 * 报表验证器
 */
class ReportValidate extends Validate
{
    /**
     * 验证规则
     * @var array
     */
    protected $rule = [
        'start_date' => 'date',
        'end_date' => 'date',
        'warehouse_id' => 'integer|gt:0',
        'product_id' => 'integer|gt:0',
        'category_id' => 'integer|gt:0',
        'supplier_id' => 'integer|gt:0',
        'customer_id' => 'integer|gt:0',
        'location_id' => 'integer|gt:0',
        'operator_id' => 'integer|gt:0',
        'type' => 'in:inventory,inbound,outbound,transaction,product,warehouse,location,supplier,customer,operator',
        'period' => 'in:today,yesterday,week,month,quarter,year,custom',
        'format' => 'in:json,excel,pdf,csv',
        'group_by' => 'in:date,week,month,quarter,year,warehouse,product,category,supplier,customer,location,operator',
        'order_by' => 'in:date,quantity,amount,count',
        'order_direction' => 'in:asc,desc',
        'page' => 'integer|gt:0',
        'limit' => 'integer|between:1,1000',
        'include_zero' => 'boolean',
        'include_inactive' => 'boolean',
        'min_quantity' => 'integer|egt:0',
        'max_quantity' => 'integer|egt:0',
        'min_amount' => 'float|egt:0',
        'max_amount' => 'float|egt:0',
        'status' => 'in:pending,processing,completed,cancelled',
        'priority' => 'in:low,normal,high,urgent',
        'transaction_type' => 'in:in,out,adjust,move,reserve,release',
        'order_type' => 'in:purchase,sale,transfer,adjustment,return',
        'alert_type' => 'in:low_stock,expiry,overstock,zero_stock',
        'days_to_expiry' => 'integer|between:1,365',
        'stock_threshold' => 'integer|egt:0',
    ];
    
    /**
     * 验证消息
     * @var array
     */
    protected $message = [
        'start_date.date' => '开始日期格式不正确',
        'end_date.date' => '结束日期格式不正确',
        'warehouse_id.integer' => '仓库ID必须是整数',
        'warehouse_id.gt' => '仓库ID必须大于0',
        'product_id.integer' => '产品ID必须是整数',
        'product_id.gt' => '产品ID必须大于0',
        'category_id.integer' => '分类ID必须是整数',
        'category_id.gt' => '分类ID必须大于0',
        'supplier_id.integer' => '供应商ID必须是整数',
        'supplier_id.gt' => '供应商ID必须大于0',
        'customer_id.integer' => '客户ID必须是整数',
        'customer_id.gt' => '客户ID必须大于0',
        'location_id.integer' => '库位ID必须是整数',
        'location_id.gt' => '库位ID必须大于0',
        'operator_id.integer' => '操作员ID必须是整数',
        'operator_id.gt' => '操作员ID必须大于0',
        'type.in' => '报表类型无效',
        'period.in' => '时间周期无效',
        'format.in' => '导出格式无效',
        'group_by.in' => '分组方式无效',
        'order_by.in' => '排序字段无效',
        'order_direction.in' => '排序方向无效',
        'page.integer' => '页码必须是整数',
        'page.gt' => '页码必须大于0',
        'limit.integer' => '每页数量必须是整数',
        'limit.between' => '每页数量必须在1-1000之间',
        'include_zero.boolean' => '是否包含零库存必须是布尔值',
        'include_inactive.boolean' => '是否包含非活跃项必须是布尔值',
        'min_quantity.integer' => '最小数量必须是整数',
        'min_quantity.egt' => '最小数量不能小于0',
        'max_quantity.integer' => '最大数量必须是整数',
        'max_quantity.egt' => '最大数量不能小于0',
        'min_amount.float' => '最小金额必须是数字',
        'min_amount.egt' => '最小金额不能小于0',
        'max_amount.float' => '最大金额必须是数字',
        'max_amount.egt' => '最大金额不能小于0',
        'status.in' => '状态无效',
        'priority.in' => '优先级无效',
        'transaction_type.in' => '事务类型无效',
        'order_type.in' => '订单类型无效',
        'alert_type.in' => '预警类型无效',
        'days_to_expiry.integer' => '过期天数必须是整数',
        'days_to_expiry.between' => '过期天数必须在1-365之间',
        'stock_threshold.integer' => '库存阈值必须是整数',
        'stock_threshold.egt' => '库存阈值不能小于0',
    ];
    
    /**
     * 验证场景
     * @var array
     */
    protected $scene = [
        'inventory' => ['warehouse_id', 'product_id', 'category_id', 'location_id', 'include_zero', 'include_inactive', 'min_quantity', 'max_quantity'],
        'inbound' => ['start_date', 'end_date', 'warehouse_id', 'supplier_id', 'product_id', 'status', 'order_type', 'period'],
        'outbound' => ['start_date', 'end_date', 'warehouse_id', 'customer_id', 'product_id', 'status', 'order_type', 'period'],
        'transaction' => ['start_date', 'end_date', 'warehouse_id', 'product_id', 'location_id', 'operator_id', 'transaction_type', 'period'],
        'product' => ['category_id', 'supplier_id', 'include_inactive', 'min_quantity', 'max_quantity'],
        'warehouse' => ['include_inactive'],
        'location' => ['warehouse_id', 'include_inactive'],
        'supplier' => ['include_inactive'],
        'customer' => ['include_inactive'],
        'operator' => ['include_inactive'],
        'alert' => ['warehouse_id', 'product_id', 'alert_type', 'days_to_expiry', 'stock_threshold'],
        'export' => ['format', 'start_date', 'end_date'],
        'summary' => ['period', 'group_by', 'order_by', 'order_direction'],
        'trend' => ['start_date', 'end_date', 'warehouse_id', 'product_id', 'group_by'],
        'comparison' => ['start_date', 'end_date', 'warehouse_id', 'product_id', 'period'],
    ];
    
    /**
     * 库存报表验证
     * @param array $data
     * @return bool|string
     */
    public function sceneInventory($data)
    {
        return $this->only(['warehouse_id', 'product_id', 'category_id', 'location_id', 'include_zero', 'include_inactive', 'min_quantity', 'max_quantity'])
                    ->append('warehouse_id', 'checkWarehouseExists')
                    ->append('product_id', 'checkProductExists')
                    ->append('category_id', 'checkCategoryExists')
                    ->append('location_id', 'checkLocationExists')
                    ->append('min_quantity', 'checkQuantityRange')
                    ->check($data);
    }
    
    /**
     * 入库报表验证
     * @param array $data
     * @return bool|string
     */
    public function sceneInbound($data)
    {
        return $this->only(['start_date', 'end_date', 'warehouse_id', 'supplier_id', 'product_id', 'status', 'order_type', 'period'])
                    ->append('start_date', 'checkDateRange')
                    ->append('warehouse_id', 'checkWarehouseExists')
                    ->append('supplier_id', 'checkSupplierExists')
                    ->append('product_id', 'checkProductExists')
                    ->append('order_type', 'checkInboundOrderType')
                    ->check($data);
    }
    
    /**
     * 出库报表验证
     * @param array $data
     * @return bool|string
     */
    public function sceneOutbound($data)
    {
        return $this->only(['start_date', 'end_date', 'warehouse_id', 'customer_id', 'product_id', 'status', 'order_type', 'period'])
                    ->append('start_date', 'checkDateRange')
                    ->append('warehouse_id', 'checkWarehouseExists')
                    ->append('customer_id', 'checkCustomerExists')
                    ->append('product_id', 'checkProductExists')
                    ->append('order_type', 'checkOutboundOrderType')
                    ->check($data);
    }
    
    /**
     * 事务报表验证
     * @param array $data
     * @return bool|string
     */
    public function sceneTransaction($data)
    {
        return $this->only(['start_date', 'end_date', 'warehouse_id', 'product_id', 'location_id', 'operator_id', 'transaction_type', 'period'])
                    ->append('start_date', 'checkDateRange')
                    ->append('warehouse_id', 'checkWarehouseExists')
                    ->append('product_id', 'checkProductExists')
                    ->append('location_id', 'checkLocationExists')
                    ->append('operator_id', 'checkOperatorExists')
                    ->check($data);
    }
    
    /**
     * 产品报表验证
     * @param array $data
     * @return bool|string
     */
    public function sceneProduct($data)
    {
        return $this->only(['category_id', 'supplier_id', 'include_inactive', 'min_quantity', 'max_quantity'])
                    ->append('category_id', 'checkCategoryExists')
                    ->append('supplier_id', 'checkSupplierExists')
                    ->append('min_quantity', 'checkQuantityRange')
                    ->check($data);
    }
    
    /**
     * 预警报表验证
     * @param array $data
     * @return bool|string
     */
    public function sceneAlert($data)
    {
        return $this->only(['warehouse_id', 'product_id', 'alert_type', 'days_to_expiry', 'stock_threshold'])
                    ->append('warehouse_id', 'checkWarehouseExists')
                    ->append('product_id', 'checkProductExists')
                    ->append('alert_type', 'checkAlertTypeParams')
                    ->check($data);
    }
    
    /**
     * 导出验证
     * @param array $data
     * @return bool|string
     */
    public function sceneExport($data)
    {
        return $this->only(['format', 'start_date', 'end_date'])
                    ->append('start_date', 'checkDateRange')
                    ->check($data);
    }
    
    /**
     * 汇总报表验证
     * @param array $data
     * @return bool|string
     */
    public function sceneSummary($data)
    {
        return $this->only(['period', 'group_by', 'order_by', 'order_direction'])
                    ->append('period', 'checkPeriodParams')
                    ->check($data);
    }
    
    /**
     * 趋势报表验证
     * @param array $data
     * @return bool|string
     */
    public function sceneTrend($data)
    {
        return $this->only(['start_date', 'end_date', 'warehouse_id', 'product_id', 'group_by'])
                    ->append('start_date', 'checkDateRange')
                    ->append('warehouse_id', 'checkWarehouseExists')
                    ->append('product_id', 'checkProductExists')
                    ->check($data);
    }
    
    /**
     * 对比报表验证
     * @param array $data
     * @return bool|string
     */
    public function sceneComparison($data)
    {
        return $this->only(['start_date', 'end_date', 'warehouse_id', 'product_id', 'period'])
                    ->append('start_date', 'checkDateRange')
                    ->append('warehouse_id', 'checkWarehouseExists')
                    ->append('product_id', 'checkProductExists')
                    ->check($data);
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
        if (empty($value)) {
            return true;
        }
        
        $warehouse = \app\model\Warehouse::where('id', $value)->find();
        
        if (!$warehouse) {
            return '仓库不存在';
        }
        
        return true;
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
        if (empty($value)) {
            return true;
        }
        
        $product = \app\model\Product::where('id', $value)->find();
        
        if (!$product) {
            return '产品不存在';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查分类是否存在
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkCategoryExists($value, $rule, $data)
    {
        if (empty($value)) {
            return true;
        }
        
        $category = \app\model\Category::where('id', $value)->find();
        
        if (!$category) {
            return '分类不存在';
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
        if (empty($value)) {
            return true;
        }
        
        $location = \app\model\Location::where('id', $value)->find();
        
        if (!$location) {
            return '库位不存在';
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
            return true;
        }
        
        $supplier = \app\model\Supplier::where('id', $value)->find();
        
        if (!$supplier) {
            return '供应商不存在';
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
            return true;
        }
        
        $customer = \app\model\Customer::where('id', $value)->find();
        
        if (!$customer) {
            return '客户不存在';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查操作员是否存在
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkOperatorExists($value, $rule, $data)
    {
        if (empty($value)) {
            return true;
        }
        
        $operator = \app\model\User::where('id', $value)->find();
        
        if (!$operator) {
            return '操作员不存在';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查日期范围
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkDateRange($value, $rule, $data)
    {
        if (empty($value) || empty($data['end_date'])) {
            return true;
        }
        
        $startDate = strtotime($value);
        $endDate = strtotime($data['end_date']);
        
        if ($startDate > $endDate) {
            return '开始日期不能大于结束日期';
        }
        
        // 限制查询范围不超过1年
        $daysDiff = ($endDate - $startDate) / (24 * 60 * 60);
        if ($daysDiff > 365) {
            return '查询时间范围不能超过1年';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查数量范围
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkQuantityRange($value, $rule, $data)
    {
        if (empty($value) || empty($data['max_quantity'])) {
            return true;
        }
        
        if ($value > $data['max_quantity']) {
            return '最小数量不能大于最大数量';
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
    protected function checkInboundOrderType($value, $rule, $data)
    {
        if (empty($value)) {
            return true;
        }
        
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
    protected function checkOutboundOrderType($value, $rule, $data)
    {
        if (empty($value)) {
            return true;
        }
        
        $allowedTypes = ['sale', 'transfer', 'adjustment'];
        
        if (!in_array($value, $allowedTypes)) {
            return '出库单类型无效';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查预警类型参数
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkAlertTypeParams($value, $rule, $data)
    {
        if (empty($value)) {
            return true;
        }
        
        switch ($value) {
            case 'expiry':
                if (empty($data['days_to_expiry'])) {
                    return '过期预警需要指定过期天数';
                }
                break;
            case 'low_stock':
            case 'overstock':
                if (empty($data['stock_threshold'])) {
                    return '库存预警需要指定库存阈值';
                }
                break;
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查周期参数
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkPeriodParams($value, $rule, $data)
    {
        if ($value === 'custom') {
            if (empty($data['start_date']) || empty($data['end_date'])) {
                return '自定义周期需要指定开始和结束日期';
            }
        }
        
        return true;
    }
}
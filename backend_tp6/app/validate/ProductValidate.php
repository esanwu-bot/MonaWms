<?php

namespace app\validate;

use think\Validate;

/**
 * 产品管理验证器
 */
class ProductValidate extends Validate
{
    /**
     * 验证规则
     * @var array
     */
    protected $rule = [
        'name' => 'require|max:100',
        'sku' => 'require|max:50|alphaNum',
        'barcode' => 'max:50|alphaNum',
        'category_id' => 'require|integer|gt:0',
        'unit' => 'require|max:20',
        'weight' => 'float|egt:0',
        'volume' => 'float|egt:0',
        'length' => 'float|egt:0',
        'width' => 'float|egt:0',
        'height' => 'float|egt:0',
        'cost_price' => 'float|egt:0',
        'sale_price' => 'float|egt:0',
        'min_stock' => 'integer|egt:0',
        'max_stock' => 'integer|egt:0',
        'shelf_life' => 'integer|egt:0',
        'description' => 'max:500',
        'status' => 'in:0,1',
        'is_batch_managed' => 'in:0,1',
        'is_serial_managed' => 'in:0,1',
        'brand' => 'max:50',
        'model' => 'max:50',
        'color' => 'max:30',
        'size' => 'max:30',
        'material' => 'max:50',
    ];
    
    /**
     * 验证消息
     * @var array
     */
    protected $message = [
        'name.require' => '产品名称不能为空',
        'name.max' => '产品名称长度不能超过100个字符',
        'sku.require' => 'SKU不能为空',
        'sku.max' => 'SKU长度不能超过50个字符',
        'sku.alphaNum' => 'SKU只能包含字母和数字',
        'barcode.max' => '条码长度不能超过50个字符',
        'barcode.alphaNum' => '条码只能包含字母和数字',
        'category_id.require' => '产品分类不能为空',
        'category_id.integer' => '产品分类必须是整数',
        'category_id.gt' => '产品分类ID必须大于0',
        'unit.require' => '计量单位不能为空',
        'unit.max' => '计量单位长度不能超过20个字符',
        'weight.float' => '重量必须是数字',
        'weight.egt' => '重量不能小于0',
        'volume.float' => '体积必须是数字',
        'volume.egt' => '体积不能小于0',
        'length.float' => '长度必须是数字',
        'length.egt' => '长度不能小于0',
        'width.float' => '宽度必须是数字',
        'width.egt' => '宽度不能小于0',
        'height.float' => '高度必须是数字',
        'height.egt' => '高度不能小于0',
        'cost_price.float' => '成本价必须是数字',
        'cost_price.egt' => '成本价不能小于0',
        'sale_price.float' => '销售价必须是数字',
        'sale_price.egt' => '销售价不能小于0',
        'min_stock.integer' => '最小库存必须是整数',
        'min_stock.egt' => '最小库存不能小于0',
        'max_stock.integer' => '最大库存必须是整数',
        'max_stock.egt' => '最大库存不能小于0',
        'shelf_life.integer' => '保质期必须是整数',
        'shelf_life.egt' => '保质期不能小于0',
        'description.max' => '描述长度不能超过500个字符',
        'status.in' => '状态值无效',
        'is_batch_managed.in' => '批次管理标识无效',
        'is_serial_managed.in' => '序列号管理标识无效',
        'brand.max' => '品牌长度不能超过50个字符',
        'model.max' => '型号长度不能超过50个字符',
        'color.max' => '颜色长度不能超过30个字符',
        'size.max' => '尺寸长度不能超过30个字符',
        'material.max' => '材质长度不能超过50个字符',
    ];
    
    /**
     * 验证场景
     * @var array
     */
    protected $scene = [
        'create' => ['name', 'sku', 'barcode', 'category_id', 'unit', 'weight', 'volume', 'length', 'width', 'height', 'cost_price', 'sale_price', 'min_stock', 'max_stock', 'shelf_life', 'description', 'is_batch_managed', 'is_serial_managed', 'brand', 'model', 'color', 'size', 'material'],
        'update' => ['name', 'category_id', 'unit', 'weight', 'volume', 'length', 'width', 'height', 'cost_price', 'sale_price', 'min_stock', 'max_stock', 'shelf_life', 'description', 'is_batch_managed', 'is_serial_managed', 'brand', 'model', 'color', 'size', 'material'],
        'status' => ['status'],
        'import' => ['name', 'sku', 'category_id', 'unit'],
    ];
    
    /**
     * 创建验证
     * @param array $data
     * @return bool|string
     */
    public function sceneCreate($data)
    {
        return $this->only(['name', 'sku', 'barcode', 'category_id', 'unit', 'weight', 'volume', 'length', 'width', 'height', 'cost_price', 'sale_price', 'min_stock', 'max_stock', 'shelf_life', 'description', 'is_batch_managed', 'is_serial_managed', 'brand', 'model', 'color', 'size', 'material'])
                    ->append('sku', 'unique:product')
                    ->append('barcode', 'unique:product')
                    ->append('category_id', 'checkCategoryExists')
                    ->append('min_stock', 'checkStockRange')
                    ->append('sale_price', 'checkPriceRange')
                    ->check($data);
    }
    
    /**
     * 更新验证
     * @param array $data
     * @param int $id
     * @return bool|string
     */
    public function sceneUpdate($data, $id = 0)
    {
        $rule = $this->only(['name', 'category_id', 'unit', 'weight', 'volume', 'length', 'width', 'height', 'cost_price', 'sale_price', 'min_stock', 'max_stock', 'shelf_life', 'description', 'is_batch_managed', 'is_serial_managed', 'brand', 'model', 'color', 'size', 'material'])
                     ->append('category_id', 'checkCategoryExists')
                     ->append('min_stock', 'checkStockRange')
                     ->append('sale_price', 'checkPriceRange');
        
        // 如果修改了SKU，需要检查唯一性
        if (isset($data['sku'])) {
            $rule->append('sku', 'unique:product,sku,' . $id);
        }
        
        // 如果修改了条码，需要检查唯一性
        if (isset($data['barcode']) && !empty($data['barcode'])) {
            $rule->append('barcode', 'unique:product,barcode,' . $id);
        }
        
        return $rule->check($data);
    }
    
    /**
     * 状态验证
     * @param array $data
     * @return bool|string
     */
    public function sceneStatus($data)
    {
        return $this->only(['status'])->check($data);
    }
    
    /**
     * 导入验证
     * @param array $data
     * @return bool|string
     */
    public function sceneImport($data)
    {
        return $this->only(['name', 'sku', 'category_id', 'unit'])
                    ->append('category_id', 'checkCategoryExists')
                    ->check($data);
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
        $category = \app\model\ProductCategory::where('id', $value)
                                             ->where('status', 1)
                                             ->find();
        
        if (!$category) {
            return '产品分类不存在或已禁用';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查库存范围
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkStockRange($value, $rule, $data)
    {
        if (isset($data['max_stock']) && $data['max_stock'] > 0) {
            if ($value >= $data['max_stock']) {
                return '最小库存不能大于等于最大库存';
            }
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查价格范围
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkPriceRange($value, $rule, $data)
    {
        if (isset($data['cost_price']) && $data['cost_price'] > 0) {
            if ($value < $data['cost_price']) {
                return '销售价不能低于成本价';
            }
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查产品是否可以删除
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkCanDelete($value, $rule, $data)
    {
        // 检查是否有库存记录
        $inventoryCount = \app\model\Inventory::where('product_id', $value)->count();
        if ($inventoryCount > 0) {
            return '该产品存在库存记录，无法删除';
        }
        
        // 检查是否有交易记录
        $transactionCount = \app\model\InventoryTransaction::where('product_id', $value)->count();
        if ($transactionCount > 0) {
            return '该产品存在交易记录，无法删除';
        }
        
        // 检查是否有订单明细
        $inboundItemCount = \app\model\InboundOrderItem::where('product_id', $value)->count();
        if ($inboundItemCount > 0) {
            return '该产品存在入库单记录，无法删除';
        }
        
        $outboundItemCount = \app\model\OutboundOrderItem::where('product_id', $value)->count();
        if ($outboundItemCount > 0) {
            return '该产品存在出库单记录，无法删除';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查SKU格式
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkSkuFormat($value, $rule, $data)
    {
        // SKU格式：字母开头，后跟字母数字组合，长度6-20位
        if (!preg_match('/^[A-Z][A-Z0-9]{5,19}$/', $value)) {
            return 'SKU格式不正确，应以字母开头，包含字母数字，长度6-20位';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查条码格式
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkBarcodeFormat($value, $rule, $data)
    {
        if (empty($value)) {
            return true; // 条码可以为空
        }
        
        // 支持EAN-13、EAN-8、UPC-A等格式
        if (!preg_match('/^\d{8}$|^\d{12,13}$/', $value)) {
            return '条码格式不正确，支持8位、12位或13位数字';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查体积计算
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkVolumeCalculation($value, $rule, $data)
    {
        // 如果提供了长宽高，检查体积是否匹配
        if (isset($data['length']) && isset($data['width']) && isset($data['height']) && 
            $data['length'] > 0 && $data['width'] > 0 && $data['height'] > 0) {
            
            $calculatedVolume = $data['length'] * $data['width'] * $data['height'];
            $tolerance = 0.01; // 允许1%的误差
            
            if (abs($value - $calculatedVolume) > $calculatedVolume * $tolerance) {
                return '体积与长宽高计算结果不匹配';
            }
        }
        
        return true;
    }
}
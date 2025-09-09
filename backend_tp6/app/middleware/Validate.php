<?php

namespace app\middleware;

use think\Request;
use think\Response;
use think\exception\ValidateException;
use app\common\library\Response as ApiResponse;

/**
 * 数据验证中间件
 */
class Validate
{
    /**
     * 验证规则映射
     * @var array
     */
    private $rules = [
        // 认证相关
        'auth/login' => [
            'username' => 'require|max:50',
            'password' => 'require|min:6|max:20'
        ],
        'auth/register' => [
            'username' => 'require|max:50|unique:user',
            'password' => 'require|min:6|max:20',
            'email' => 'require|email|unique:user',
            'real_name' => 'require|max:50',
            'phone' => 'mobile|unique:user'
        ],
        'auth/change_password' => [
            'old_password' => 'require',
            'new_password' => 'require|min:6|max:20|different:old_password'
        ],
        
        // 仓库管理
        'warehouse/create' => [
            'name' => 'require|max:100',
            'code' => 'require|max:50|unique:warehouse',
            'address' => 'max:200',
            'contact_person' => 'max:50',
            'contact_phone' => 'mobile',
            'description' => 'max:500'
        ],
        'warehouse/update' => [
            'name' => 'require|max:100',
            'address' => 'max:200',
            'contact_person' => 'max:50',
            'contact_phone' => 'mobile',
            'description' => 'max:500'
        ],
        
        // 产品管理
        'product/create' => [
            'name' => 'require|max:100',
            'sku' => 'require|max:50|unique:product',
            'barcode' => 'max:50|unique:product',
            'category_id' => 'require|integer|gt:0',
            'unit' => 'require|max:20',
            'weight' => 'float|egt:0',
            'volume' => 'float|egt:0',
            'cost_price' => 'float|egt:0',
            'sale_price' => 'float|egt:0',
            'min_stock' => 'integer|egt:0',
            'max_stock' => 'integer|egt:0',
            'description' => 'max:500'
        ],
        'product/update' => [
            'name' => 'require|max:100',
            'category_id' => 'require|integer|gt:0',
            'unit' => 'require|max:20',
            'weight' => 'float|egt:0',
            'volume' => 'float|egt:0',
            'cost_price' => 'float|egt:0',
            'sale_price' => 'float|egt:0',
            'min_stock' => 'integer|egt:0',
            'max_stock' => 'integer|egt:0',
            'description' => 'max:500'
        ],
        
        // 库存调整
        'inventory/adjust' => [
            'product_id' => 'require|integer|gt:0',
            'location_id' => 'require|integer|gt:0',
            'type' => 'require|in:increase,decrease',
            'quantity' => 'require|integer|gt:0',
            'reason' => 'require|max:100',
            'remark' => 'max:500'
        ],
        'inventory/reserve' => [
            'product_id' => 'require|integer|gt:0',
            'location_id' => 'require|integer|gt:0',
            'quantity' => 'require|integer|gt:0',
            'reference_type' => 'require|in:outbound_order,transfer',
            'reference_id' => 'require|integer|gt:0'
        ],
        'inventory/release' => [
            'product_id' => 'require|integer|gt:0',
            'location_id' => 'require|integer|gt:0',
            'quantity' => 'require|integer|gt:0',
            'reference_type' => 'require|in:outbound_order,transfer',
            'reference_id' => 'require|integer|gt:0'
        ],
        
        // 入库单
        'inbound/create' => [
            'warehouse_id' => 'require|integer|gt:0',
            'supplier_id' => 'integer|gt:0',
            'type' => 'require|in:purchase,return,transfer,adjustment',
            'expected_date' => 'date',
            'remark' => 'max:500',
            'items' => 'require|array',
            'items.*.product_id' => 'require|integer|gt:0',
            'items.*.location_id' => 'require|integer|gt:0',
            'items.*.expected_quantity' => 'require|integer|gt:0',
            'items.*.cost_price' => 'float|egt:0'
        ],
        'inbound/receive' => [
            'item_id' => 'require|integer|gt:0',
            'received_quantity' => 'require|integer|gt:0',
            'batch_number' => 'max:50',
            'expiry_date' => 'date',
            'remark' => 'max:500'
        ],
        
        // 出库单
        'outbound/create' => [
            'warehouse_id' => 'require|integer|gt:0',
            'customer_id' => 'integer|gt:0',
            'type' => 'require|in:sale,transfer,adjustment',
            'priority' => 'in:low,normal,high,urgent',
            'expected_date' => 'date',
            'remark' => 'max:500',
            'items' => 'require|array',
            'items.*.product_id' => 'require|integer|gt:0',
            'items.*.location_id' => 'require|integer|gt:0',
            'items.*.required_quantity' => 'require|integer|gt:0',
            'items.*.sale_price' => 'float|egt:0'
        ],
        'outbound/pick' => [
            'item_id' => 'require|integer|gt:0',
            'picked_quantity' => 'require|integer|gt:0',
            'batch_number' => 'max:50',
            'remark' => 'max:500'
        ],
        'outbound/ship' => [
            'tracking_number' => 'max:100',
            'carrier' => 'max:50',
            'remark' => 'max:500'
        ]
    ];
    
    /**
     * 验证消息
     * @var array
     */
    private $messages = [
        'require' => ':attribute不能为空',
        'max' => ':attribute长度不能超过:max个字符',
        'min' => ':attribute长度不能少于:min个字符',
        'email' => ':attribute格式不正确',
        'mobile' => ':attribute格式不正确',
        'unique' => ':attribute已存在',
        'integer' => ':attribute必须是整数',
        'float' => ':attribute必须是数字',
        'gt' => ':attribute必须大于:gt',
        'egt' => ':attribute必须大于等于:egt',
        'in' => ':attribute值不在允许范围内',
        'date' => ':attribute日期格式不正确',
        'different' => ':attribute不能与:different相同',
        'array' => ':attribute必须是数组'
    ];
    
    /**
     * 字段名称映射
     * @var array
     */
    private $attributes = [
        'username' => '用户名',
        'password' => '密码',
        'old_password' => '原密码',
        'new_password' => '新密码',
        'email' => '邮箱',
        'real_name' => '真实姓名',
        'phone' => '手机号',
        'name' => '名称',
        'code' => '编码',
        'address' => '地址',
        'contact_person' => '联系人',
        'contact_phone' => '联系电话',
        'description' => '描述',
        'sku' => 'SKU',
        'barcode' => '条码',
        'category_id' => '分类',
        'unit' => '单位',
        'weight' => '重量',
        'volume' => '体积',
        'cost_price' => '成本价',
        'sale_price' => '销售价',
        'min_stock' => '最小库存',
        'max_stock' => '最大库存',
        'product_id' => '产品',
        'location_id' => '库位',
        'warehouse_id' => '仓库',
        'supplier_id' => '供应商',
        'customer_id' => '客户',
        'type' => '类型',
        'priority' => '优先级',
        'quantity' => '数量',
        'expected_quantity' => '预期数量',
        'received_quantity' => '实收数量',
        'required_quantity' => '需求数量',
        'picked_quantity' => '拣货数量',
        'reason' => '原因',
        'remark' => '备注',
        'expected_date' => '预期日期',
        'expiry_date' => '过期日期',
        'batch_number' => '批次号',
        'tracking_number' => '快递单号',
        'carrier' => '承运商',
        'reference_type' => '关联类型',
        'reference_id' => '关联ID',
        'items' => '明细项目'
    ];
    
    /**
     * 处理请求
     *
     * @param Request $request
     * @param \Closure $next
     * @return Response
     */
    public function handle($request, \Closure $next)
    {
        try {
            // 获取路由信息
            $route = $request->rule()->getRule();
            $method = strtolower($request->method());
            
            // 构建验证规则键名
            $ruleKey = $this->buildRuleKey($route, $method);
            
            // 检查是否需要验证
            if (isset($this->rules[$ruleKey])) {
                $this->validateRequest($request, $this->rules[$ruleKey]);
            }
            
            return $next($request);
            
        } catch (ValidateException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (\Exception $e) {
            return ApiResponse::error('验证失败: ' . $e->getMessage(), 422);
        }
    }
    
    /**
     * 构建验证规则键名
     *
     * @param string $route
     * @param string $method
     * @return string
     */
    private function buildRuleKey(string $route, string $method): string
    {
        // 移除路由前缀
        $route = ltrim($route, '/');
        
        // 处理带参数的路由
        $route = preg_replace('/\/<[^>]+>/', '', $route);
        
        // 根据HTTP方法映射到操作
        $actionMap = [
            'post' => 'create',
            'put' => 'update',
            'patch' => 'update',
            'delete' => 'delete'
        ];
        
        // 如果是特定操作路由，直接返回
        if (strpos($route, '/') !== false) {
            return $route;
        }
        
        // 构建标准CRUD路由
        if (isset($actionMap[$method])) {
            return $route . '/' . $actionMap[$method];
        }
        
        return $route;
    }
    
    /**
     * 验证请求数据
     *
     * @param Request $request
     * @param array $rules
     * @throws ValidateException
     */
    private function validateRequest(Request $request, array $rules): void
    {
        $data = $request->param();
        
        // 创建验证器
        $validate = \think\facade\Validate::make($rules, $this->messages, $this->attributes);
        
        // 执行验证
        if (!$validate->check($data)) {
            throw new ValidateException($validate->getError());
        }
        
        // 验证嵌套数组（如订单明细）
        $this->validateNestedArrays($data, $rules);
    }
    
    /**
     * 验证嵌套数组
     *
     * @param array $data
     * @param array $rules
     * @throws ValidateException
     */
    private function validateNestedArrays(array $data, array $rules): void
    {
        foreach ($rules as $field => $rule) {
            // 检查是否为数组字段验证规则
            if (strpos($field, '.*.') !== false) {
                $parts = explode('.*.', $field);
                $arrayField = $parts[0];
                $itemField = $parts[1];
                
                if (isset($data[$arrayField]) && is_array($data[$arrayField])) {
                    foreach ($data[$arrayField] as $index => $item) {
                        if (!isset($item[$itemField])) {
                            continue;
                        }
                        
                        $itemRules = [$itemField => $rule];
                        $validate = \think\facade\Validate::make($itemRules, $this->messages, $this->attributes);
                        
                        if (!$validate->check($item)) {
                            $error = str_replace($itemField, "第" . ($index + 1) . "项" . $this->attributes[$itemField] ?? $itemField, $validate->getError());
                            throw new ValidateException($error);
                        }
                    }
                }
            }
        }
    }
    
    /**
     * 添加验证规则
     *
     * @param string $route
     * @param array $rules
     * @return $this
     */
    public function addRule(string $route, array $rules): self
    {
        $this->rules[$route] = $rules;
        return $this;
    }
    
    /**
     * 添加验证消息
     *
     * @param array $messages
     * @return $this
     */
    public function addMessages(array $messages): self
    {
        $this->messages = array_merge($this->messages, $messages);
        return $this;
    }
    
    /**
     * 添加字段属性
     *
     * @param array $attributes
     * @return $this
     */
    public function addAttributes(array $attributes): self
    {
        $this->attributes = array_merge($this->attributes, $attributes);
        return $this;
    }
}
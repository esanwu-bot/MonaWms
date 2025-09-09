<?php

namespace app\validate;

use think\Validate;

/**
 * 仓库管理验证器
 */
class WarehouseValidate extends Validate
{
    /**
     * 验证规则
     * @var array
     */
    protected $rule = [
        'name' => 'require|max:100|chsAlphaNum',
        'code' => 'require|max:50|alphaNum',
        'address' => 'max:200',
        'contact_person' => 'max:50|chs',
        'contact_phone' => 'mobile',
        'contact_email' => 'email|max:100',
        'description' => 'max:500',
        'status' => 'in:0,1',
        'area' => 'float|egt:0',
        'capacity' => 'float|egt:0',
        'type' => 'in:normal,cold,dangerous,bonded',
    ];
    
    /**
     * 验证消息
     * @var array
     */
    protected $message = [
        'name.require' => '仓库名称不能为空',
        'name.max' => '仓库名称长度不能超过100个字符',
        'name.chsAlphaNum' => '仓库名称只能包含中文、字母和数字',
        'code.require' => '仓库编码不能为空',
        'code.max' => '仓库编码长度不能超过50个字符',
        'code.alphaNum' => '仓库编码只能包含字母和数字',
        'address.max' => '仓库地址长度不能超过200个字符',
        'contact_person.max' => '联系人姓名长度不能超过50个字符',
        'contact_person.chs' => '联系人姓名只能包含中文字符',
        'contact_phone.mobile' => '联系电话格式不正确',
        'contact_email.email' => '联系邮箱格式不正确',
        'contact_email.max' => '联系邮箱长度不能超过100个字符',
        'description.max' => '描述长度不能超过500个字符',
        'status.in' => '状态值无效',
        'area.float' => '仓库面积必须是数字',
        'area.egt' => '仓库面积不能小于0',
        'capacity.float' => '仓库容量必须是数字',
        'capacity.egt' => '仓库容量不能小于0',
        'type.in' => '仓库类型无效',
    ];
    
    /**
     * 验证场景
     * @var array
     */
    protected $scene = [
        'create' => ['name', 'code', 'address', 'contact_person', 'contact_phone', 'contact_email', 'description', 'area', 'capacity', 'type'],
        'update' => ['name', 'address', 'contact_person', 'contact_phone', 'contact_email', 'description', 'area', 'capacity', 'type'],
        'status' => ['status'],
    ];
    
    /**
     * 创建验证
     * @param array $data
     * @return bool|string
     */
    public function sceneCreate($data)
    {
        return $this->only(['name', 'code', 'address', 'contact_person', 'contact_phone', 'contact_email', 'description', 'area', 'capacity', 'type'])
                    ->append('code', 'unique:warehouse')
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
        $rule = $this->only(['name', 'address', 'contact_person', 'contact_phone', 'contact_email', 'description', 'area', 'capacity', 'type']);
        
        // 如果修改了编码，需要检查唯一性
        if (isset($data['code'])) {
            $rule->append('code', 'unique:warehouse,code,' . $id);
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
     * 自定义验证规则：检查仓库是否可以删除
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkCanDelete($value, $rule, $data)
    {
        // 检查是否有关联的库存
        $inventoryCount = \app\model\Inventory::where('warehouse_id', $value)->count();
        if ($inventoryCount > 0) {
            return '该仓库存在库存记录，无法删除';
        }
        
        // 检查是否有未完成的订单
        $inboundCount = \app\model\InboundOrder::where('warehouse_id', $value)
                                              ->where('status', 'not in', ['completed', 'cancelled'])
                                              ->count();
        if ($inboundCount > 0) {
            return '该仓库存在未完成的入库单，无法删除';
        }
        
        $outboundCount = \app\model\OutboundOrder::where('warehouse_id', $value)
                                                ->where('status', 'not in', ['completed', 'cancelled'])
                                                ->count();
        if ($outboundCount > 0) {
            return '该仓库存在未完成的出库单，无法删除';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查仓库是否可以禁用
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkCanDisable($value, $rule, $data)
    {
        // 检查是否有未完成的订单
        $inboundCount = \app\model\InboundOrder::where('warehouse_id', $value)
                                              ->where('status', 'not in', ['completed', 'cancelled'])
                                              ->count();
        if ($inboundCount > 0) {
            return '该仓库存在未完成的入库单，无法禁用';
        }
        
        $outboundCount = \app\model\OutboundOrder::where('warehouse_id', $value)
                                                ->where('status', 'not in', ['completed', 'cancelled'])
                                                ->count();
        if ($outboundCount > 0) {
            return '该仓库存在未完成的出库单，无法禁用';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查仓库编码格式
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkCodeFormat($value, $rule, $data)
    {
        // 仓库编码格式：WH + 4位数字，如 WH0001
        if (!preg_match('/^WH\d{4}$/', $value)) {
            return '仓库编码格式不正确，应为WH+4位数字，如WH0001';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查联系信息完整性
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkContactInfo($value, $rule, $data)
    {
        // 如果提供了联系人，必须提供联系电话或邮箱
        if (!empty($data['contact_person'])) {
            if (empty($data['contact_phone']) && empty($data['contact_email'])) {
                return '提供联系人时，必须提供联系电话或邮箱';
            }
        }
        
        return true;
    }
}
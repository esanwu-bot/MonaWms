<?php

namespace app\model;

use think\Model;
use think\model\concern\SoftDelete;

/**
 * 用户模型
 */
class User extends Model
{
    // 表名
    protected $name = 'users';
    
    // 主键
    protected $pk = 'id';
    
    // 自动时间戳
    protected $autoWriteTimestamp = true;
    
    // 时间字段
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';
    
    // 字段类型转换
    protected $type = [
        'id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];
    
    // 隐藏字段
    protected $hidden = ['password_hash'];
    
    // 只读字段
    protected $readonly = ['id', 'created_at'];
    
    // 字段映射
    protected $field = [
        'id',
        'username',
        'real_name',
        'email',
        'phone',
        'password_hash',
        'role',
        'status',
        'last_login_at',
        'last_login_time',
        'created_at',
        'updated_at'
    ];
    
    /**
     * 角色枚举
     */
    const ROLE_ADMIN = 'admin';
    const ROLE_MANAGER = 'manager';
    const ROLE_OPERATOR = 'operator';
    const ROLE_VIEWER = 'viewer';
    
    /**
     * 状态枚举
     */
    const STATUS_ACTIVE = 'active';
    const STATUS_INACTIVE = 'inactive';
    
    /**
     * 密码修改器
     */
    public function setPasswordHashAttr($value)
    {
        return password_hash($value, PASSWORD_DEFAULT);
    }
    
    /**
     * 验证密码
     */
    public function verifyPassword($password)
    {
        return password_verify($password, $this->password_hash);
    }
    
    /**
     * 密码哈希
     */
    public function hashPassword($password)
    {
        return password_hash($password, PASSWORD_DEFAULT);
    }
    
    /**
     * 获取用户角色中文名
     */
    public function getRoleTextAttr($value, $data)
    {
        $roles = [
            self::ROLE_ADMIN => '管理员',
            self::ROLE_MANAGER => '经理',
            self::ROLE_OPERATOR => '操作员',
            self::ROLE_VIEWER => '查看者'
        ];
        
        return $roles[$data['role']] ?? '未知';
    }
    
    /**
     * 获取用户角色中文名
     */
    public function getRoleText()
    {
        $roles = [
            self::ROLE_ADMIN => '管理员',
            self::ROLE_MANAGER => '经理',
            self::ROLE_OPERATOR => '操作员',
            self::ROLE_VIEWER => '查看员'
        ];

        return $roles[$this->role] ?? '未知';
    }

    /**
     * 获取用户状态中文名
     */
    public function getStatusTextAttr($value, $data)
    {
        $statuses = [
            self::STATUS_ACTIVE => '激活',
            self::STATUS_INACTIVE => '禁用'
        ];
        
        return $statuses[$data['status']] ?? '未知';
    }
    
    /**
     * 关联管理的仓库
     */
    public function managedWarehouses()
    {
        return $this->hasMany(Warehouse::class, 'manager_id');
    }
    
    /**
     * 关联入库单
     */
    public function inboundOrders()
    {
        return $this->hasMany(InboundOrder::class, 'operator_id');
    }
    
    /**
     * 关联出库单
     */
    public function outboundOrders()
    {
        return $this->hasMany(OutboundOrder::class, 'operator_id');
    }
    
    /**
     * 关联库存变动记录
     */
    public function inventoryTransactions()
    {
        return $this->hasMany(InventoryTransaction::class, 'operator_id');
    }
    
    /**
     * 搜索器：用户名
     */
    public function searchUsernameAttr($query, $value)
    {
        $query->where('username', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：邮箱
     */
    public function searchEmailAttr($query, $value)
    {
        $query->where('email', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：角色
     */
    public function searchRoleAttr($query, $value)
    {
        $query->where('role', $value);
    }
    
    /**
     * 搜索器：状态
     */
    public function searchStatusAttr($query, $value)
    {
        $query->where('status', $value);
    }
    
    /**
     * 根据用户名或邮箱查找用户
     */
    public static function findByUsernameOrEmail($usernameOrEmail)
    {
        return self::where('username', $usernameOrEmail)
            ->whereOr('email', $usernameOrEmail)
            ->find();
    }
    
    /**
     * 检查用户是否有权限
     */
    public function hasPermission($permission)
    {
        $permissions = [
            self::ROLE_ADMIN => ['*'],
            self::ROLE_MANAGER => [
                'warehouse.*',
                'product.*',
                'inventory.*',
                'inbound.*',
                'outbound.*',
                'report.*'
            ],
            self::ROLE_OPERATOR => [
                'warehouse.index',
                'warehouse.read',
                'product.index',
                'product.read',
                'inventory.index',
                'inventory.read',
                'inbound.*',
                'outbound.*'
            ],
            self::ROLE_VIEWER => [
                'warehouse.index',
                'warehouse.read',
                'product.index',
                'product.read',
                'inventory.index',
                'inventory.read',
                'report.index',
                'report.read'
            ]
        ];
        
        $rolePermissions = $permissions[$this->role] ?? [];
        
        // 检查是否有通配符权限
        if (in_array('*', $rolePermissions)) {
            return true;
        }
        
        // 检查精确匹配
        if (in_array($permission, $rolePermissions)) {
            return true;
        }
        
        // 检查通配符匹配
        foreach ($rolePermissions as $rolePermission) {
            if (str_ends_with($rolePermission, '.*')) {
                $prefix = substr($rolePermission, 0, -2);
                if (str_starts_with($permission, $prefix . '.')) {
                    return true;
                }
            }
        }
        
        return false;
    }
}
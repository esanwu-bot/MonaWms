<?php

namespace app\model;

use think\Model;

/**
 * 商品分类模型
 */
class Category extends Model
{
    // 表名
    protected $name = 'categories';
    
    // 主键
    protected $pk = 'id';
    
    // 自动时间戳
    protected $autoWriteTimestamp = 'datetime';
    
    // 时间字段
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';
    
    // 字段类型转换
    protected $type = [
        'id' => 'integer',
        'parent_id' => 'integer',
        'sort_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];
    
    // 只读字段
    protected $readonly = ['id', 'created_at'];
    
    // 字段映射
    protected $field = [
        'id',
        'name',
        'code',
        'parent_id',
        'description',
        'status',
        'sort_order',
        'created_at',
        'updated_at'
    ];
    
    /**
     * 状态枚举
     */
    const STATUS_ACTIVE = 'active';
    const STATUS_INACTIVE = 'inactive';
    
    /**
     * 获取状态中文名
     */
    public function getStatusTextAttr($value, $data)
    {
        $statuses = [
            self::STATUS_ACTIVE => '启用',
            self::STATUS_INACTIVE => '禁用'
        ];
        
        return $statuses[$data['status']] ?? '未知';
    }
    
    /**
     * 关联父分类
     */
    public function parent()
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }
    
    /**
     * 关联子分类
     */
    public function children()
    {
        return $this->hasMany(Category::class, 'parent_id');
    }
    
    /**
     * 关联商品
     */
    public function products()
    {
        return $this->hasMany(Product::class, 'category_id');
    }
    
    /**
     * 搜索器：分类名称
     */
    public function searchNameAttr($query, $value)
    {
        $query->where('name', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：分类编码
     */
    public function searchCodeAttr($query, $value)
    {
        $query->where('code', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：父分类ID
     */
    public function searchParentIdAttr($query, $value)
    {
        if ($value === 0 || $value === '0') {
            $query->whereNull('parent_id')->whereOr('parent_id', 0);
        } else {
            $query->where('parent_id', $value);
        }
    }
    
    /**
     * 搜索器：状态
     */
    public function searchStatusAttr($query, $value)
    {
        $query->where('status', $value);
    }
    
    /**
     * 获取分类树
     */
    public static function getTree($parentId = 0)
    {
        $categories = self::where('parent_id', $parentId)
            ->order('id', 'asc')
            ->select();
        
        $tree = [];
        foreach ($categories as $category) {
            $item = $category->toArray();
            $item['children'] = self::getTree($category->id);
            $tree[] = $item;
        }
        
        return $tree;
    }
    
    /**
     * 获取所有子分类ID（包括自己）
     */
    public function getAllChildrenIds()
    {
        $ids = [$this->id];
        
        $children = $this->children()->select();
        foreach ($children as $child) {
            $ids = array_merge($ids, $child->getAllChildrenIds());
        }
        
        return $ids;
    }
    
    /**
     * 获取分类路径
     */
    public function getPath()
    {
        $path = [$this->name];
        
        $parent = $this->parent;
        while ($parent) {
            array_unshift($path, $parent->name);
            $parent = $parent->parent;
        }
        
        return implode(' > ', $path);
    }
    
    /**
     * 检查是否为叶子节点
     */
    public function isLeaf()
    {
        return $this->children()->count() === 0;
    }
    
    /**
     * 检查是否可以删除
     */
    public function canDelete()
    {
        // 有子分类或有商品时不能删除
        return $this->children()->count() === 0 && $this->products()->count() === 0;
    }
    
    /**
     * 获取分类统计信息
     */
    public function getStatistics()
    {
        $statistics = [
            'children_count' => $this->children()->count(),
            'products_count' => 0,
            'total_inventory' => 0
        ];
        
        // 获取所有子分类ID
        $categoryIds = $this->getAllChildrenIds();
        
        // 统计商品数量
        $statistics['products_count'] = Product::whereIn('category_id', $categoryIds)->count();
        
        // 统计库存数量
        $productIds = Product::whereIn('category_id', $categoryIds)->column('id');
        if (!empty($productIds)) {
            $statistics['total_inventory'] = Inventory::whereIn('product_id', $productIds)->sum('quantity');
        }
        
        return $statistics;
    }
}
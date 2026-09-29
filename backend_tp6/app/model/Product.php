<?php

namespace app\model;

use think\Model;

/**
 * 商品模型
 */
class Product extends Model
{
    // 表名
    protected $name = 'products';
    
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
        'category_id' => 'integer',
        // P8: 金额与数量一律字符串 + bcmath
        'price' => 'string',
        'cost_price' => 'string',
        'weight' => 'float',
        'length' => 'float',
        'width' => 'float',
        'height' => 'float',
        'min_stock' => 'integer',
        'max_stock' => 'integer',
        'warranty_months' => 'integer',
        'project_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];
    
    // 只读字段
    protected $readonly = ['id', 'created_at'];
    
    // 字段映射
    protected $field = [
        'id',
        'sku',
        'name',
        'description',
        'device_type',       // 设备类型(如：基站、路由器、光模块)
        'model_number',      // 具体型号(如：HUAWEI MA5683T)
        'brand',             // 品牌
        'production_date',   // 生产日期
        'warranty_months',   // 保修期（月）
        'frequency_protocol', // 频段/协议(如：5G 700MHz, WiFi 6)
        'firmware_version',  // 固件版本
        'category_id',
        'barcode',           // 序列号（原条码）
        'barcode_image',     // 条码图片 URL
        'price',
        'cost_price',
        'unit',
        'measure_type',      // P8: 计量方式 count/length/weight/area/volume
        'requires_serial',   // P8: 是否需序列号（由 measure_type 推导）
        'weight',
        'length',
        'width',
        'height',
        'min_stock',
        'max_stock',
        'status',
        'project_id',        // 所属项目ID
        'created_at',
        'updated_at'
    ];
    
    /**
     * 状态枚举
     */
    const STATUS_ACTIVE = 'active';
    const STATUS_INACTIVE = 'inactive';
    const STATUS_DISCONTINUED = 'discontinued';
    
    /**
     * P8 计量方式枚举（A1）
     */
    const MEASURE_COUNT  = 'count';   // 计件：件/个/台/套
    const MEASURE_LENGTH = 'length';  // 长度：米
    const MEASURE_WEIGHT = 'weight';  // 重量：吨/kg
    const MEASURE_AREA   = 'area';    // 面积：平方米
    const MEASURE_VOLUME = 'volume';  // 体积
    
    /**
     * 获取计量方式中文名
     */
    public function getMeasureTypeTextAttr($value, $data)
    {
        $texts = [
            self::MEASURE_COUNT  => '计件',
            self::MEASURE_LENGTH => '长度',
            self::MEASURE_WEIGHT => '重量',
            self::MEASURE_AREA   => '面积',
            self::MEASURE_VOLUME => '体积'
        ];
        return $texts[$data['measure_type'] ?? self::MEASURE_COUNT] ?? '计件';
    }
    
    /**
     * 是否需要序列号（E1：由计量方式推导，计件类需要 SN，长度/重量类按数量走）
     * @return bool
     */
    public function requiresSerial(): bool
    {
        return ($this->measure_type ?: self::MEASURE_COUNT) === self::MEASURE_COUNT;
    }
    
    /**
     * 数量小数位：计件类 0（只允许正整数），其余 4 位
     * @return int
     */
    public function quantityScale(): int
    {
        return $this->requiresSerial() ? 0 : 4;
    }
    
    /**
     * 校验数量是否符合计量方式（A4：后端必须校验，不能只放开前端）
     * @param string $quantity
     * @throws \InvalidArgumentException
     */
    public function assertQuantityValid(string $quantity): void
    {
        if (!is_numeric($quantity) || bccomp($quantity, '0', 4) <= 0) {
            throw new \InvalidArgumentException('数量必须大于 0');
        }
        if ($this->quantityScale() === 0) {
            // 计件类：必须为正整数
            if (bccomp($quantity, bcadd($quantity, '0', 0), 4) !== 0) {
                throw new \InvalidArgumentException('计件类物资数量必须为正整数，当前单位：' . ($this->unit ?: '件'));
            }
        } else {
            // 长度/重量类：最多 4 位小数
            $scaled = bcmul($quantity, '1', 4);
            if (bccomp($quantity, $scaled, 4) !== 0) {
                throw new \InvalidArgumentException('数量最多保留 4 位小数');
            }
        }
    }
    
    /**
     * 获取状态中文名
     */
    public function getStatusTextAttr($value, $data)
    {
        $statuses = [
            self::STATUS_ACTIVE => '启用',
            self::STATUS_INACTIVE => '禁用',
            self::STATUS_DISCONTINUED => '停产'
        ];
        
        return $statuses[$data['status']] ?? '未知';
    }
    
    /**
     * 获取体积
     */
    public function getVolumeAttr($value, $data)
    {
        return ($data['length'] ?? 0) * ($data['width'] ?? 0) * ($data['height'] ?? 0);
    }
    
    /**
     * 关联分类
     */
    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }
    
    /**
     * 关联项目
     */
    public function project()
    {
        return $this->belongsTo(Project::class, 'project_id');
    }
    
    /**
     * 关联序列号
     */
    public function serialNumbers()
    {
        return $this->hasMany(SerialNumber::class, 'product_id');
    }
    
    /**
     * 关联BOM主表（作为主产品）
     */
    public function bomMasters()
    {
        return $this->hasMany(BomMaster::class, 'product_id');
    }
    
    /**
     * 关联BOM明细（作为组件）
     */
    public function bomItems()
    {
        return $this->hasMany(BomItem::class, 'component_product_id');
    }
    
    /**
     * 关联库存
     */
    public function inventory()
    {
        return $this->hasMany(Inventory::class, 'product_id');
    }
    
    /**
     * 关联库存变动记录
     */
    public function inventoryTransactions()
    {
        return $this->hasMany(InventoryTransaction::class, 'product_id');
    }
    
    /**
     * 关联入库单明细
     */
    public function inboundOrderItems()
    {
        return $this->hasMany(InboundOrderItem::class, 'product_id');
    }
    
    /**
     * 关联出库单明细
     */
    public function outboundOrderItems()
    {
        return $this->hasMany(OutboundOrderItem::class, 'product_id');
    }
    
    /**
     * 搜索器：SKU
     */
    public function searchSkuAttr($query, $value)
    {
        $query->where('sku', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：商品名称
     */
    public function searchNameAttr($query, $value)
    {
        $query->where('name', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：条码
     */
    public function searchBarcodeAttr($query, $value)
    {
        $query->where('barcode', 'like', '%' . $value . '%');
    }
    
    /**
     * 搜索器：分类ID
     */
    public function searchCategoryIdAttr($query, $value)
    {
        // 支持按一级分类筛选：包含其下二级分类（产品精确挂在二级上）
        $ids = [(int) $value];
        $childIds = Category::where('parent_id', (int) $value)->column('id');
        if ($childIds) {
            $ids = array_merge($ids, array_map('intval', $childIds));
        }
        $query->whereIn('category_id', $ids);
    }
    
    /**
     * 搜索器：状态
     */
    public function searchStatusAttr($query, $value)
    {
        $query->where('status', $value);
    }

    /**
     * 搜索器：综合搜索（前端搜索框，名称/SKU/条码任一模糊命中）
     */
    public function searchSearchAttr($query, $value)
    {
        $query->where(function ($q) use ($value) {
            $q->where('name', 'like', '%' . $value . '%')
              ->whereOr('sku', 'like', '%' . $value . '%')
              ->whereOr('barcode', 'like', '%' . $value . '%');
        });
    }
    
    /**
     * 根据SKU查找商品
     */
    public static function findBySku($sku)
    {
        return self::where('sku', $sku)->find();
    }
    
    /**
     * 根据条码查找商品
     */
    public static function findByBarcode($barcode)
    {
        return self::where('barcode', $barcode)->find();
    }
    
    /**
     * 获取总库存数量
     */
    public function getTotalStock()
    {
        return $this->inventory()->sum('quantity');
    }
    
    /**
     * 获取可用库存数量
     */
    public function getAvailableStock()
    {
        // 这里可以扩展为减去预留库存等
        return $this->getTotalStock();
    }
    
    /**
     * 检查是否库存不足
     */
    public function isLowStock()
    {
        $totalStock = $this->getTotalStock();
        return $totalStock <= $this->min_stock;
    }
    
    /**
     * 检查是否库存过多
     */
    public function isOverStock()
    {
        $totalStock = $this->getTotalStock();
        return $this->max_stock > 0 && $totalStock >= $this->max_stock;
    }
    
    /**
     * 获取库存状态
     */
    public function getStockStatus()
    {
        $totalStock = $this->getTotalStock();
        
        if ($totalStock == 0) {
            return 'out_of_stock';
        } elseif ($this->isLowStock()) {
            return 'low_stock';
        } elseif ($this->isOverStock()) {
            return 'over_stock';
        } else {
            return 'normal';
        }
    }
    
    /**
     * 获取库存状态中文名
     */
    public function getStockStatusText()
    {
        $status = $this->getStockStatus();
        $statusTexts = [
            'out_of_stock' => '缺货',
            'low_stock' => '库存不足',
            'over_stock' => '库存过多',
            'normal' => '正常'
        ];
        
        return $statusTexts[$status] ?? '未知';
    }
    
    /**
     * 获取商品详细信息
     */
    public function getDetailInfo()
    {
        $info = $this->toArray();
        $info['category_name'] = $this->category->name ?? '';
        $info['total_stock'] = $this->getTotalStock();
        $info['available_stock'] = $this->getAvailableStock();
        $info['stock_status'] = $this->getStockStatus();
        $info['stock_status_text'] = $this->getStockStatusText();
        $info['volume'] = $this->volume;
        
        return $info;
    }
}
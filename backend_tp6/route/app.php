<?php
// +----------------------------------------------------------------------
// | ThinkPHP [ WE CAN DO IT JUST THINK ]
// +----------------------------------------------------------------------
// | Copyright (c) 2006~2018 http://thinkphp.cn All rights reserved.
// +----------------------------------------------------------------------
// | Licensed ( http://www.apache.org/licenses/LICENSE-2.0 )
// +----------------------------------------------------------------------
// | Author: liu21st <liu21st@gmail.com>
// +----------------------------------------------------------------------
use think\facade\Route;

// API路由组
Route::group('api', function () {
    
    // 认证相关路由（无需认证）
    Route::group('auth', function () {
        Route::post('login', 'AuthController/login');           // 用户登录
        Route::post('register', 'AuthController/register');     // 用户注册
        Route::post('refresh', 'AuthController/refresh');       // 刷新token
    });
    
    // 需要认证的路由组
    Route::group('', function () {
        
        // 认证相关（需要认证）
        Route::group('auth', function () {
            Route::get('profile', 'AuthController/profile');        // 获取用户信息
            Route::put('profile', 'AuthController/updateProfile'); // 更新用户信息
            Route::post('logout', 'AuthController/logout');         // 用户登出
        });
        
        // 数据字典管理
        Route::group('dictionary', function () {
            // 字典类型
            Route::get('types', 'DictionaryController/getTypes');           // 获取所有字典类型
            Route::post('types', 'DictionaryController/createType');        // 创建字典类型
            Route::put('types/:id', 'DictionaryController/updateType');     // 更新字典类型
            Route::delete('types/:id', 'DictionaryController/deleteType');  // 删除字典类型
            
            // 字典项
            Route::get('items/:typeId', 'DictionaryController/getItems');           // 获取指定类型的字典项
            Route::get('items/type/:typeCode', 'DictionaryController/getItemsByTypeCode'); // 根据类型编码获取字典项
            Route::post('items', 'DictionaryController/createItem');                // 创建字典项
            Route::put('items/:id', 'DictionaryController/updateItem');             // 更新字典项
            Route::delete('items/:id', 'DictionaryController/deleteItem');          // 删除字典项
        });
        
        // 仓库管理
        Route::group('warehouses', function () {
            Route::get('', 'WarehouseController/index');            // 仓库列表
            Route::post('', 'WarehouseController/save');            // 创建仓库
            Route::get('options', 'WarehouseController/options');   // 仓库选项
            Route::get('statistics', 'WarehouseController/statistics'); // 仓库统计
            Route::get(':id', 'WarehouseController/read');          // 仓库详情
            Route::put(':id', 'WarehouseController/update');        // 更新仓库
            Route::delete(':id', 'WarehouseController/delete');     // 删除仓库
        });
        
        // 产品管理
        Route::group('products', function () {
            Route::get('', 'ProductController/index');              // 产品列表
            Route::post('', 'ProductController/save');              // 创建产品
            Route::get('options', 'ProductController/options');     // 产品选项
            Route::get('sku/:sku', 'ProductController/findBySku');  // 根据SKU查找
            Route::get('barcode/:barcode', 'ProductController/findByBarcode'); // 根据条码查找
            Route::get(':id', 'ProductController/read');            // 产品详情
            Route::put(':id', 'ProductController/update');          // 更新产品
            Route::delete(':id', 'ProductController/delete');       // 删除产品
            Route::get(':id/stock', 'ProductController/stock');     // 产品库存
        });
        
        // 库存管理
        Route::group('inventory', function () {
            Route::get('', 'InventoryController/index');            // 库存列表
            Route::get('statistics', 'InventoryController/statistics'); // 库存统计
            Route::get('expiring', 'InventoryController/expiring'); // 即将过期库存
            Route::get(':id', 'InventoryController/read');          // 库存详情
            Route::post('adjust', 'InventoryController/adjust');    // 库存调整
            Route::post('reserve', 'InventoryController/reserve');  // 预留库存
            Route::post('release', 'InventoryController/release');  // 释放预留
        });
        
        // 入库订单管理
        Route::group('inbound-orders', function () {
            Route::get('', 'InboundOrderController/index');         // 入库订单列表
            Route::post('', 'InboundOrderController/save');         // 创建入库订单
            Route::get('statistics', 'InboundOrderController/statistics'); // 入库统计
            Route::get(':id', 'InboundOrderController/read');       // 入库订单详情
            Route::put(':id', 'InboundOrderController/update');     // 更新入库订单
            Route::delete(':id', 'InboundOrderController/delete');  // 删除入库订单
            Route::post(':id/start-receiving', 'InboundOrderController/startReceiving'); // 开始收货
            Route::post(':id/receive', 'InboundOrderController/receive'); // 收货
            Route::post(':id/complete', 'InboundOrderController/complete'); // 完成入库
            Route::post(':id/cancel', 'InboundOrderController/cancel'); // 取消入库
        });
        
        // 出库订单管理
        Route::group('outbound-orders', function () {
            Route::get('', 'OutboundOrderController/index');        // 出库订单列表
            Route::post('', 'OutboundOrderController/save');        // 创建出库订单
            Route::get('statistics', 'OutboundOrderController/statistics'); // 出库统计
            Route::get(':id', 'OutboundOrderController/read');      // 出库订单详情
            Route::put(':id', 'OutboundOrderController/update');    // 更新出库订单
            Route::delete(':id', 'OutboundOrderController/delete'); // 删除出库订单
            Route::post(':id/start-picking', 'OutboundOrderController/startPicking'); // 开始拣货
            Route::post(':id/pick', 'OutboundOrderController/pick'); // 拣货
            Route::post(':id/pack', 'OutboundOrderController/pack'); // 打包
            Route::post(':id/ship', 'OutboundOrderController/ship'); // 发货
            Route::post(':id/deliver', 'OutboundOrderController/deliver'); // 确认送达
            Route::post(':id/cancel', 'OutboundOrderController/cancel'); // 取消出库
        });
        
        // 库存事务记录
        Route::group('inventory-transactions', function () {
            Route::get('', 'InventoryTransactionController/index'); // 事务列表
            Route::get('statistics', 'InventoryTransactionController/statistics'); // 事务统计
            Route::get('trend', 'InventoryTransactionController/trend'); // 变动趋势
            Route::get('recent', 'InventoryTransactionController/recent'); // 最近事务
            Route::get(':id', 'InventoryTransactionController/read'); // 事务详情
            Route::get('product/:product_id/history', 'InventoryTransactionController/productHistory'); // 产品历史
            Route::get('location/:location_id/history', 'InventoryTransactionController/locationHistory'); // 库位历史
            Route::get('operator/:operator_id/history', 'InventoryTransactionController/operatorHistory'); // 操作员历史
            Route::get('product/:product_id/flow', 'InventoryTransactionController/productFlow'); // 产品流水
        });
        
        // 供应商管理
        Route::group('suppliers', function () {
            Route::get('', 'SupplierController/index');             // 供应商列表
            Route::post('', 'SupplierController/save');             // 创建供应商
            Route::get('options', 'SupplierController/options');    // 供应商选项
            Route::get(':id', 'SupplierController/read');           // 供应商详情
            Route::put(':id', 'SupplierController/update');         // 更新供应商
            Route::delete(':id', 'SupplierController/delete');      // 删除供应商
        });
        
        // 客户管理
        Route::group('customers', function () {
            Route::get('', 'CustomerController/index');             // 客户列表
            Route::post('', 'CustomerController/save');             // 创建客户
            Route::get('options', 'CustomerController/options');    // 客户选项
            Route::get(':id', 'CustomerController/read');           // 客户详情
            Route::put(':id', 'CustomerController/update');         // 更新客户
            Route::delete(':id', 'CustomerController/delete');      // 删除客户
        });
        
        // BOM管理
        Route::group('bom', function () {
            Route::get('', 'BOMController/index');                 // BOM列表
            Route::post('', 'BOMController/save');                 // 创建BOM
            Route::get(':id', 'BOMController/read');               // BOM详情
            Route::put(':id', 'BOMController/update');             // 更新BOM
            Route::delete(':id', 'BOMController/delete');          // 删除BOM
            Route::post(':id/copy', 'BOMController/copy');         // 复制BOM
            Route::post(':id/explode', 'BOMController/explode');   // 展开BOM
        });
        
        // 产品分类管理
        Route::group('categories', function () {
            Route::get('', 'CategoryController/index');             // 分类列表
            Route::post('', 'CategoryController/save');             // 创建分类
            Route::get('tree', 'CategoryController/tree');          // 分类树
            Route::get('options', 'CategoryController/options');    // 分类选项
            Route::get(':id', 'CategoryController/read');           // 分类详情
            Route::put(':id', 'CategoryController/update');         // 更新分类
            Route::delete(':id', 'CategoryController/delete');      // 删除分类
        });
        
        // 库位管理
        Route::group('locations', function () {
            Route::get('', 'LocationController/index');             // 库位列表
            Route::post('', 'LocationController/save');             // 创建库位
            Route::get('options', 'LocationController/options');    // 库位选项
            Route::get(':id', 'LocationController/read');           // 库位详情
            Route::put(':id', 'LocationController/update');         // 更新库位
            Route::delete(':id', 'LocationController/delete');      // 删除库位
        });
        
        // 用户管理
        Route::group('users', function () {
            Route::get('', 'UserController/index');                 // 用户列表
            Route::post('', 'UserController/save');                 // 创建用户
            Route::get('options', 'UserController/options');        // 用户选项
            Route::get(':id', 'UserController/read');               // 用户详情
            Route::put(':id', 'UserController/update');             // 更新用户
            Route::delete(':id', 'UserController/delete');          // 删除用户
            Route::put(':id/status', 'UserController/changeStatus'); // 修改状态
            Route::put(':id/password', 'UserController/changePassword'); // 修改密码
        });
        
        // 报表管理
        Route::group('reports', function () {
            Route::get('dashboard', 'ReportsController/dashboard');  // 仪表盘数据
            Route::get('inventory', 'ReportsController/inventory');  // 库存报表
            Route::get('orders', 'ReportsController/orders');        // 订单报表
        });
        
        // 无线备件管理
        Route::group('wireless-spare-parts', function () {
            Route::get('', 'WirelessSparePartController/index');        // 无线备件列表
            Route::post('', 'WirelessSparePartController/save');        // 创建无线备件
            Route::get(':id', 'WirelessSparePartController/read');      // 无线备件详情
            Route::put(':id', 'WirelessSparePartController/update');    // 更新无线备件
            Route::delete(':id', 'WirelessSparePartController/delete'); // 删除无线备件
            Route::post('batch-delete', 'WirelessSparePartController/batchDelete'); // 批量删除
            Route::get('stats', 'WirelessSparePartController/stats');   // 统计数据
        });
        
        // 序列号管理
        Route::group('serial-numbers', function () {
            Route::get('', 'SerialNumberController/index');             // 序列号列表
            Route::post('', 'SerialNumberController/save');             // 创建序列号
            Route::get(':id', 'SerialNumberController/read');           // 序列号详情
            Route::put(':id', 'SerialNumberController/update');         // 更新序列号
            Route::delete(':id', 'SerialNumberController/delete');      // 删除序列号
            Route::get('query-by-barcode', 'SerialNumberController/queryByBarcode'); // 通过条码查询
            Route::post('bulk-import', 'SerialNumberController/bulkImport'); // 批量导入
            Route::post('register-device', 'SerialNumberController/registerDevice'); // 设备登记
            Route::post('upload-barcode', 'SerialNumberController/uploadBarcode'); // 上传条码图片
            Route::post('recognize-barcode', 'SerialNumberController/recognizeBarcode'); // 识别条码图片
        });
        
        // 条码识别管理
        Route::group('barcode', function () {
            Route::post('recognize', 'BarcodeController/recognize');     // 条码图片识别
            Route::get('supported-types', 'BarcodeController/getSupportedTypes'); // 获取支持的条码类型
        });
        
    })->middleware(['auth']); // 需要认证的路由组
    
})->middleware(['cors']); // API路由组，添加CORS中间件

// 默认路由（保留原有的测试路由）
Route::get('think', function () {
    return 'hello,ThinkPHP6!';
});

Route::get('hello/:name', 'index/hello');
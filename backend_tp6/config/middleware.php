<?php
// 中间件配置
return [
    // 别名或分组
    'alias'    => [
        // 认证中间件
        'auth' => app\middleware\Auth::class,
        // 权限中间件
        'permission' => app\middleware\Permission::class,
        // CORS跨域中间件
        'cors' => app\middleware\Cors::class,
        // API日志中间件
        'apilog' => app\middleware\ApiLog::class,
        // 数据验证中间件
        'validate' => app\middleware\Validate::class,
    ],
    // 优先级设置，此数组中的中间件会按照数组中的顺序优先执行
    'priority' => [
        // CORS中间件优先级最高，处理跨域请求
        app\middleware\Cors::class,
        // API日志中间件，记录请求信息
        app\middleware\ApiLog::class,
        // 数据验证中间件
        app\middleware\Validate::class,
        // 认证中间件
        app\middleware\Auth::class,
        // 权限中间件
        app\middleware\Permission::class,
    ],
];

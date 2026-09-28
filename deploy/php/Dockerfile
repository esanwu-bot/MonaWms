# ================================================================
# MonaWMS · ThinkPHP 6 运行镜像（仅装扩展，不含代码）
# 代码通过 docker-compose volume 挂载，改代码无需重新 build 本镜像
#
# ★ 基础镜像复用同 ECS 上 mechanical_teaching 已构建的 mt-php-fpm:8.1
#   （已含 pdo_mysql / gd / bcmath / opcache / 时区 / 上传配置），
#   本文件只增量补 zip 扩展（phpspreadsheet xlsx 读写需要）。
#   2C2G 小机源码编译 gd 约 30+ 分钟，增量只编 zip 约 2-3 分钟。
#   注意：仅适用于与 mechanical_teaching 同机的部署；
#         新机器请先构建 mt-php-fpm:8.1 或改回 FROM php:8.1-fpm-alpine。
# ================================================================
FROM mt-php-fpm:8.1

# zip 扩展：phpspreadsheet Xlsx 导入导出（编译后移除 -dev 头文件减小体积）
RUN apk add --no-cache libzip-dev \
    && docker-php-ext-install -j$(nproc) zip \
    && apk del libzip-dev

# 覆盖内存限制：zz- 前缀按字母序后加载，覆盖基础镜像的 256M；
# WMS 万行级 xlsx 导出时 phpspreadsheet 峰值内存较高
RUN echo "memory_limit=512M" > /usr/local/etc/php/conf.d/zz-memory.ini

WORKDIR /var/www/html

EXPOSE 9000

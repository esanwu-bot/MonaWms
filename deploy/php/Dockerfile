# ================================================================
# MonaWMS · ThinkPHP 6 运行镜像（仅装扩展，不含代码）
# 代码通过 docker-compose volume 挂载，改代码无需重新 build 本镜像
# 仅当需要新增 PHP 扩展时才执行：docker compose build php
# ================================================================
FROM php:8.1-fpm-alpine

# 依赖库 + 时区
RUN apk add --no-cache tzdata libpng-dev libjpeg-turbo-dev freetype-dev libzip-dev \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone

# TP6 + phpspreadsheet 所需扩展：
#   pdo_mysql 数据库 / gd 图片处理 / bcmath DECIMAL(18,4) 精确运算（AGENTS.md 铁律）
#   zip+libzip xlsx 导入导出（phpoffice/phpspreadsheet）/ opcache 生产加速
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) pdo_mysql gd bcmath zip opcache

# opcache：挂载代码场景下保持时间戳校验，git pull 后秒级生效
RUN { \
      echo "opcache.enable=1"; \
      echo "opcache.memory_consumption=128"; \
      echo "opcache.max_accelerated_files=10000"; \
      echo "opcache.validate_timestamps=1"; \
      echo "opcache.revalidate_freq=0"; \
    } > /usr/local/etc/php/conf.d/opcache-tuning.ini

# 上传限制（xlsx 批量导入 / 报废图片附件）
RUN { \
      echo "upload_max_filesize=50M"; \
      echo "post_max_size=50M"; \
      echo "memory_limit=256M"; \
    } > /usr/local/etc/php/conf.d/uploads.ini

WORKDIR /var/www/html

EXPOSE 9000

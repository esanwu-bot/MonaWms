#!/bin/bash
# ================================================================
# MonaWMS_TX · ECS 一键初始化脚本（幂等，可重复执行）
# 覆盖《阿里云ECS部署方案.md》第 6/7/8 节：
#   前端构建 → 启动容器 → 生成 services.php → 目录权限 → 验证
# 用法：cd /opt/MonaWMS_TX && bash deploy/setup_ecs.sh
# 前置：第 4 节（.env 密码）与第 5 节（composer install）已完成
# ================================================================
set -e
cd "$(dirname "$0")/.."

echo "===== [1/5] 构建前端 dist（首次约 3-5 分钟）====="
docker run --rm -v "$PWD/frontend":/app -w /app node:20-alpine sh -c \
  "npm config set registry https://registry.npmmirror.com && npm install --no-audit --no-fund && npm run build"
ls frontend/dist/index.html

echo ""
echo "===== [2/5] 启动容器（首次会 build php 镜像，等待 mysql 健康检查）====="
docker compose up -d --build

echo ""
echo "===== [3/5] 生成 services.php（PHP 8.1 容器内，TP6 服务清单）====="
docker compose exec php php think service:discover
ls -l backend_tp6/vendor/services.php

echo ""
echo "===== [4/5] 修正 runtime / 上传目录权限 ====="
docker compose exec php sh -c \
  "mkdir -p /var/www/html/public/uploads && chown -R www-data:www-data /var/www/html/runtime /var/www/html/public/uploads"

echo ""
echo "===== [5/5] 验证 ====="
sleep 3
echo "--- 前端页面（应有 <!DOCTYPE html> 输出）---"
curl -s http://127.0.0.1:9110/ | head -3
echo ""
echo "--- 登录接口（应返回 JSON，含 token）---"
curl -s -X POST http://127.0.0.1:9110/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"password"}'
echo ""
echo "--- 容器状态 ---"
docker compose ps

echo ""
echo "完成。浏览器访问: http://<公网IP>:9110/ （admin / password）"

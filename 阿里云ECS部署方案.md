# 阿里云 ECS 部署方案（Docker 版）

> 适用项目：MonaWMS_TX 仓储管理系统（backend_tp6 + frontend + uniapp_frontend）
> 部署方式：**Docker Compose**；**backend_tp6 / frontend 源码 volume 挂载容器，git pull 即时生效，不重新 build 镜像**
> 对外端口限定 **9110-9120**；服务器端配置文件修改一律 `sed -i`，源码一律 `git` 拉取/更新

---

## 0. 容器架构与端口规划

```
                 ┌─────────────────────────── 阿里云 ECS ──────────────────────────┐
 浏览器 ──9110─► │ nginx ── frontend/dist(静态) ── /api/ ─proxy──┐                   │
 浏览器 ──9111─► │ nginx ── uniapp H5 dist(静态, 预留)            │                   │
                 │                                                ▼                   │
                 │              内部 server :9080 ──fastcgi──► php-fpm:9000         │
                 │                                    │            │                │
                 │                                    │            ├─► mysql:3306   │
                 │                                    │            │   (容器,数据卷) │
                 │                                    │            └─► Redis(预留,   │
                 │                                    │                后端暂未启用)  │
                 └──────────────────────────────────────────────────────────────────┘
```

| 端口 | 用途 | 是否对外 |
| --- | --- | --- |
| **9110** | WMS 前端（React 管理端，`/api/` 反代到 ThinkPHP） | ✅ 安全组开放 |
| **9111** | uniapp H5 预留（发行产物上传后生效） | ✅ 按需开放 |
| 9112-9120 | 预留扩展（后续服务按需占用） | — |
| 3306 | MySQL，仅 bind 127.0.0.1 | ❌ |
| 9000 / 9080 | php-fpm / nginx 内部 API，仅容器网络 | ❌ |

三个容器：

| 容器 | 镜像 | 说明 |
| --- | --- | --- |
| monawms_mysql | mysql:5.7 | 数据卷持久化；**首次启动**自动导入 `sql/monawms_full_0928.sql`（完整库快照：建库 + 全部表结构 + 演示数据） |
| monawms_php | monawms-php-fpm:8.1（自建，仅装扩展） | **挂载 `./backend_tp6` → `/var/www/html`**，改代码即时生效 |
| monawms_nginx | nginx:1.27-alpine | **挂载 `./frontend/dist`** 与 `./backend_tp6`；对外 9110/9111 |

---

## 1. 安全组配置（阿里云控制台）

控制台 → ECS → 安全组 → 入方向添加：

| 端口 | 授权对象 | 用途 |
| --- | --- | --- |
| 22 | 你的办公 IP/32（建议） | SSH |
| 9110 | 0.0.0.0/0 | WMS 前端 + API |
| 9111 | 0.0.0.0/0 | uniapp H5（不用可不开） |

**不要开放** 3306、9000、9080。

---

## 2. SSH 登录与基础环境

```bash
ssh root@<你的ECS公网IP>
```

### 2.1 加 swap（2G 内存机型必做，否则前端 build 会 OOM）

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile swap swap defaults 0 0' >> /etc/fstab
free -h
```

### 2.2 安装 Docker CE + Compose 插件（阿里云镜像源）

```bash
yum install -y yum-utils
yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
# Alibaba Cloud Linux 3 的 $releasever=3，docker-ce 源无此目录，sed 改成 8
sed -i 's|$releasever|8|g' /etc/yum.repos.d/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable --now docker
docker version && docker compose version
```

### 2.3 配置 Docker 镜像加速器

```bash
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.aliyuncs.com",
    "https://registry.docker-cn.com"
  ]
}
EOF
systemctl restart docker
```

### 2.4 安装 git

```bash
yum install -y git
```

---

## 3. 用 git 拉取源码到 ECS

> 推荐 SSH 免密方式（与 mechanical_teaching 项目同一套 Codeup 组织）。

### 方式 A：SSH（推荐，永久免密）

```bash
# 1. ECS 上生成密钥对（非交互式，整段粘贴不踩坑）
mkdir -p ~/.ssh && chmod 700 ~/.ssh
ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519 -C "ecs-monawms"
cat ~/.ssh/id_ed25519.pub
```

2. 把输出的**整行**粘贴到 **Codeup 控制台 → 个人设置 → SSH 公钥 → 新增**。

```bash
# 3. 配置别名并拉取
cat > ~/.ssh/config <<'EOF'
Host codeup.aliyun.com
    User git
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config

cd /opt
git clone git@codeup.aliyun.com:5f0af04d5fd102f22f6b747c/MonaWMS_TX.git
cd /opt/MonaWMS_TX
ls    # 应看到 backend_tp6/ frontend/ uniapp_frontend/ deploy/ sql/ docker-compose.yml
```

### 方式 B：HTTPS + 个人访问令牌（PAT）

Codeup → 个人设置 → 访问令牌 → 新建（权限只勾 **仓库 → 读**），然后：

```bash
cd /opt
git clone https://codeup.aliyun.com/5f0af04d5fd102f22f6b747c/MonaWMS_TX.git
# Username 随便填，Password 粘 PAT（不是阿里云账号密码）
git config --global credential.helper store   # 首次输入后永久保存
```

---

## 4. 修改生产配置（先于首次启动，避免密码错位）

> **坑位提醒（来自 mechanical_teaching 项目的真实教训）**：
> `deploy/php/env.production`、`deploy/nginx/default.conf` 都是 **git 跟踪文件**，
> 服务器上 `sed -i` 改完后，下次 `git pull` 会把改动还原成仓库默认值；
> 而 MySQL **只在数据卷首次初始化时**设置 root 密码。两边一旦错位，应用查库
> 全部 `ERROR 1045 Access denied`。
> 因此：**密码写 `.env`**（根目录 `.gitignore` 已忽略，compose 自动加载），
> **被 sed 的跟踪文件用 `git update-index --skip-worktree` 保护**。

```bash
cd /opt/MonaWMS_TX

# ① compose 侧：生成随机 MySQL root 密码，写入 .env
MYSQL_PWD=$(openssl rand -hex 12)
printf 'MYSQL_ROOT_PASSWORD=%s\n' "${MYSQL_PWD}" > .env
echo "${MYSQL_PWD}" > /root/.monawms_mysql_pwd        # 备份/排障命令都从这里读
chmod 600 /root/.monawms_mysql_pwd

# ② PHP 侧：同步密码到被挂载为容器内 .env 的 env.production，并让 git 不再覆盖
sed -i "s/^PASSWORD = .*/PASSWORD = ${MYSQL_PWD}/" deploy/php/env.production
git update-index --skip-worktree deploy/php/env.production
grep -n '^PASSWORD' deploy/php/env.production          # 确认已替换

# ③ JWT 密钥：换成随机串
JWT_SEC=$(openssl rand -hex 32)
sed -i "s|^KEY = .*|KEY = ${JWT_SEC}|" deploy/php/env.production
grep -n '^KEY' deploy/php/env.production

# ④ 确认调试已关闭（仓库默认已是 false）
grep -n 'APP_DEBUG\|DEBUG' deploy/php/env.production
```

---

## 5. 安装后端依赖（vendor 不入 git，用 composer 容器装）

> `backend_tp6/.gitignore` 忽略了 `/vendor`，git clone 后没有 vendor，
> 必须先安装，否则 php-fpm 起来也跑不了框架。

```bash
cd /opt/MonaWMS_TX

docker run --rm -v "$PWD/backend_tp6":/app -w /app -e COMPOSER_ALLOW_SUPERUSER=1 \
  composer:2 sh -c \
  "composer config repos.packagist composer https://mirrors.aliyun.com/composer/ \
   && composer install --no-dev --optimize-autoloader --ignore-platform-reqs --no-scripts"
```

> - `--ignore-platform-reqs`：composer:2 容器内没有 gd/zip 扩展，
>   但运行时容器 monawms-php-fpm:8.1 已装齐，此处仅跳过安装期检查。
> - **`--no-scripts`（必加）**：composer:2 镜像现为 PHP 8.4，TP6.1 安装后钩子
>   `@php think service:discover` 在 8.4 下大量 Deprecated 且退出码 255，导致
>   整条 install 命令报错——**但此时 23 个包其实已全部装完**，只是钩子失败。
>   加 `--no-scripts` 跳过钩子；`services.php` 改在 PHP 8.1 运行容器里生成（第 7.1 节）。
> - `app/model/BomItem.php does not comply with psr-4` 的 warning 是文件名与类名
>   大小写不一致的提示，不影响运行，可忽略。

---

## 6. 构建前端 dist（node 容器一次性构建，不常驻）

> **一键执行**：第 6/7/8 节可合并为一条命令 `bash deploy/setup_ecs.sh`
> （幂等可重复跑；多行命令直接粘贴终端会因换行丢失被当注释忽略，优先用脚本）。
> 下面分节说明各步骤内容。

> 生产 API 地址来自 `frontend/.env.production`（`VITE_API_BASE_URL=/api`，
> 同源相对路径，走 nginx 9110 反代，无跨域），已随仓库提交，无需修改。
> 本地开发的 `frontend/.env`（127.0.0.1:8000）互不影响。

```bash
cd /opt/MonaWMS_TX

# 首次拉 node 镜像（官方源超时就走阿里云镜像）
docker pull node:20-alpine || {
  docker pull registry.cn-hangzhou.aliyuncs.com/library/node:20-alpine
  docker tag registry.cn-hangzhou.aliyuncs.com/library/node:20-alpine node:20-alpine
}

docker run --rm -v "$PWD/frontend":/app -w /app node:20-alpine sh -c \
  "npm config set registry https://registry.npmmirror.com && npm install --no-audit --no-fund && npm run build"

ls frontend/dist    # 确认有 index.html
```

---

## 7. 启动容器

```bash
cd /opt/MonaWMS_TX
docker compose up -d --build        # 首次会 build php 镜像（仅这一次）
docker compose ps
docker compose logs -f mysql        # 观察库快照导入，出现 "ready for connections" 后 Ctrl+C
```

### 7.1 生成 services.php（TP6 服务清单，必须执行）

> 第 5 节 `--no-scripts` 跳过了 `think service:discover`，它产出的
> `vendor/services.php` 缺失时框架无法启动。在 **PHP 8.1 运行容器**里补跑
> （8.1 下无 PHP 8.4 的 Deprecated 问题）：

```bash
docker compose exec php php think service:discover
ls -l backend_tp6/vendor/services.php    # 确认已生成
```

### 7.2 修正 runtime / 上传目录权限

```bash
docker compose exec php sh -c \
  "mkdir -p /var/www/html/public/uploads && chown -R www-data:www-data /var/www/html/runtime /var/www/html/public/uploads"
```

---

## 8. 验证

```bash
# 前端页面
curl -s http://127.0.0.1:9110/ | head -3

# 后端 API（登录，种子账号 admin / password）
curl -s -X POST http://127.0.0.1:9110/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"password"}'

# 数据库
docker compose exec mysql mysql -uroot -p"$(cat /root/.monawms_mysql_pwd)" \
  -e "USE monawms; SHOW TABLES;" | head -20
```

浏览器访问：

| 端 | 地址 | 账号 |
| --- | --- | --- |
| WMS 管理端 | `http://<公网IP>:9110/` | admin / password |
| uniapp H5 | `http://<公网IP>:9111/`（发行产物上传后） | — |

> 上线后请立即在「会员管理」修改 admin 密码。

---

## 9. 日常更新与运维（核心：源码挂载，不 build 镜像）

### 9.1 更新 PHP 后端

```bash
cd /opt/MonaWMS_TX && git pull
# 代码挂载 + opcache 时间戳校验，改完即生效；个别情况不生效再：
docker compose restart php
```

> 注意：`git pull` 后若提示 `deploy/php/env.production` 有本地改动被跳过，
> 属 skip-worktree 保护生效，是预期行为。

### 9.2 更新前端

```bash
cd /opt/MonaWMS_TX && git pull
# 重新 build（命令同第 6 节），完成后浏览器强刷即可，nginx 无需重启
```

### 9.3 什么时候才需要重新 build 镜像

**只有**修改了 `deploy/php/Dockerfile`（新增 PHP 扩展）时：

```bash
docker compose build php && docker compose up -d php
```

### 9.4 日志与重启

```bash
docker compose ps
docker compose logs -f php      # TP6 运行日志（runtime/log 由容器内 www-data 写）
docker compose logs -f nginx
docker compose logs -f mysql
docker compose restart nginx    # 单服务重启
```

### 9.5 数据库备份（每日 3 点 cron）

```bash
mkdir -p /opt/backup
cat > /opt/backup/backup_monawms.sh <<'EOF'
#!/bin/bash
cd /opt/MonaWMS_TX
docker compose exec -T mysql mysqldump -uroot -p"$(cat /root/.monawms_mysql_pwd)" \
  --single-transaction monawms | gzip > /opt/backup/monawms_$(date +%F).sql.gz
find /opt/backup -name 'monawms_*.sql.gz' -mtime +14 -delete
EOF
chmod +x /opt/backup/backup_monawms.sh
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/backup/backup_monawms.sh") | crontab -
```

### 9.6 uniapp H5 端（可选）

uniapp 由 HBuilderX 本地发行，不在 ECS 上构建：

1. 本地 HBuilderX → 发行 → 网站-H5，输出目录 `unpackage/dist/build/h5`
   （API 地址在 uniapp 请求封装里指向 `http://<公网IP>:9110/api`）
2. 上传到 ECS：`scp -r unpackage/dist/build/h5 root@<IP>:/opt/MonaWMS_TX/uniapp_frontend/unpackage/dist/build/`
3. 刷新 `http://<公网IP>:9111/` 即生效（挂载目录，无需重启）

---

## 10. 常见问题

| 现象 | 排查 |
| --- | --- |
| composer install 报 `service:discover ... error code 255` + 大量 Deprecated | **包已装完，无需重装**。composer:2 镜像是 PHP 8.4，TP6.1 钩子不兼容。按第 5 节加 `--no-scripts` 重跑（幂等、秒级），再按第 7.1 节在 php 容器内生成 services.php |
| 页面 502 | `docker compose ps` 看 php 是否 Up；`docker compose logs php`；多半是 vendor 没装（第 5 节）或 services.php 缺失（第 7.1 节） |
| 页面 403/空白 | dist 未构建：重跑第 6 节；`ls frontend/dist` |
| 接口 404 | 确认请求路径为 `/api/*`；`docker compose logs nginx`；检查 nginx 与 php 的 backend_tp6 挂载点是否同为 `/var/www/html` |
| MySQL 表为空 | init 脚本只在**数据卷首次创建**时执行；确认无需保留数据后 `docker compose down -v` 再 `up -d`（**会清库，慎用**） |
| `ERROR 1045 Access denied` | 配置里的 DB 密码与数据卷里 root 实际密码不一致（卷只在首次初始化时设密码）。真实密码在 `/root/.monawms_mysql_pwd`，应与 `deploy/php/env.production` 的 `PASSWORD` 一致。注意 `mysqladmin ping` 密码错也返回 0，`docker compose ps` 显示 healthy **不能**说明密码是对的 |
| xlsx 导入/导出报错 | php 镜像缺扩展？确认用本仓库 `deploy/php/Dockerfile`（含 gd/zip/bcmath）构建 |
| runtime 写入报错 | 重跑 7.1 权限命令 |
| 前端 build 被 kill | swap 未生效：`free -h`；node 容器构建已隔离宿主机，仍 OOM 则加大 swap |
| git pull 提示 `Authentication failed` | HTTPS：密码处必须填 **PAT**；SSH：`ssh -Tv git@codeup.aliyun.com` 排查公钥 |
| 改完 env.production 不生效 | `docker compose restart php` |
| 时间差 8 小时 | compose 已设 `TZ=Asia/Shanghai`；仍异常则 `docker compose down && up -d` |

---

## 附：一键命令速查

```bash
ssh root@<ECS公网IP>
cd /opt/MonaWMS_TX
git pull                                              # 拉最新代码
docker run --rm -v "$PWD/frontend":/app -w /app node:20-alpine sh -c \
  "npm config set registry https://registry.npmmirror.com && npm install --no-audit --no-fund && npm run build"   # 前端更新
docker compose restart php                            # PHP 偶发不生效时
docker compose ps && docker compose logs -f nginx
docker compose exec mysql mysql -uroot -p"$(cat /root/.monawms_mysql_pwd)" monawms
```

const DEPLOYS = [
  {
    num: "方式 01",
    title: "Docker Compose 一键部署",
    desc: "面向生产环境：MySQL 容器首次启动自动导入建库快照与演示数据，无需手动初始化。",
    code: `git clone <仓库> MonaWMS_TX
echo "MYSQL_ROOT_PASSWORD=..." > .env
docker compose up -d
# 访问 http://<IP>:9110/`,
  },
  {
    num: "方式 02",
    title: "阿里云 ECS 生产部署",
    desc: "源码 volume 挂载，git pull 即时生效无需重建镜像；安全组只开放 9110 / 9111，数据库端口不暴露。",
    code: `cd frontend && npm ci && npm run build
# nginx 反代前端 + API
# 改代码 / git pull 即生效`,
  },
  {
    num: "方式 03",
    title: "本地开发一键启动",
    desc: "Windows 双击 start_all.bat：自动拉起 MySQL → 后端 8000 → 前端 Vite，开箱即改。",
    code: `start_all.bat
# 或手动：
composer install
php think run --port 8000
npm run dev`,
  },
];

export default function Deploy() {
  return (
    <section className="deploy" id="deploy">
      <div className="wrap">
        <div className="sec-head">
          <span className="kicker">Deploy</span>
          <h2>三种方式，最快十分钟上线</h2>
          <p>从一台云服务器到 Windows 笔记本，都能跑起来。</p>
        </div>
        <div className="dep-grid">
          {DEPLOYS.map((d) => (
            <div className="dep-card" key={d.title}>
              <div className="num">{d.num}</div>
              <h3>{d.title}</h3>
              <p>{d.desc}</p>
              <code>{d.code}</code>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

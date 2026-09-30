import { Server, Monitor, Database } from "lucide-react";

const STACKS = [
  {
    icon: Server,
    title: "后端",
    tags: [
      { name: "ThinkPHP 6.1", hl: false },
      { name: "think-orm 2.x", hl: false },
      { name: "firebase/php-jwt", hl: false },
      { name: "PhpSpreadsheet", hl: false },
      { name: "PHP ≥ 7.2.5", hl: true },
    ],
    rules: (
      <>
        <b>严格分层：</b>Controller 只收参数返响应，Service 承载业务规则与事务，Model
        只做数据访问。
        <br />
        <b>统一响应：</b>
        <code>{"{ code, message, data, trace_id }"}</code>，业务错误走业务码。
      </>
    ),
  },
  {
    icon: Monitor,
    title: "前端",
    tags: [
      { name: "React 18", hl: false },
      { name: "TypeScript", hl: false },
      { name: "Vite 4", hl: false },
      { name: "Ant Design 5", hl: false },
      { name: "Zustand", hl: false },
      { name: "react-query 5", hl: false },
      { name: "recharts", hl: false },
      { name: "zod", hl: false },
    ],
    rules: (
      <>
        <b>移动端：</b>uni-app（H5 发行产物）。
        <br />
        <b>看板：</b>库存金额、出入库趋势、告警概览实时图表。
      </>
    ),
  },
  {
    icon: Database,
    title: "数据与部署",
    tags: [
      { name: "MySQL 5.7", hl: false },
      { name: "InnoDB", hl: false },
      { name: "utf8mb4", hl: false },
      { name: "Docker Compose", hl: false },
      { name: "nginx + php-fpm", hl: false },
    ],
    rules: (
      <>
        <b>数值精度：</b>DECIMAL(18,4) + bcmath 运算，禁止 float 累加。
        <br />
        <b>迁移纪律：</b>18 份幂等迁移 + 14 份种子数据，脚本可重复执行。
      </>
    ),
  },
];

export default function Stack() {
  return (
    <section className="stack" id="stack">
      <div className="wrap">
        <div className="sec-head">
          <span className="kicker">Tech Stack</span>
          <h2>工程级技术底座，轻量但不将就</h2>
          <p>严格分层的架构与数据铁律，让「小而美」的系统同样经得起审计与并发。</p>
        </div>
        <div className="stack-grid">
          {STACKS.map((s) => {
            const Icon = s.icon;
            return (
              <div className="st-card" key={s.title}>
                <h3>
                  <Icon size={18} strokeWidth={1.8} />
                  {s.title}
                </h3>
                <div className="st-tags">
                  {s.tags.map((t) => (
                    <span key={t.name} className={t.hl ? "hl" : ""}>
                      {t.name}
                    </span>
                  ))}
                </div>
                <div className="st-rules">{s.rules}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

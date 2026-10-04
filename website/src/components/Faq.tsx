"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "为什么「库存不可直接修改」？",
    a: (
      <>
        库存必须由流水驱动：任何变动都写入 <code>inventory_transactions</code>
        ，并在同一事务内更新库存快照（带行锁），禁止先查后改。这样库存永远等于流水汇总，账实分离在机制上不可能发生，也天然支持审计追溯。
      </>
    ),
  },
  {
    q: "部署后所有接口返回 401，怎么排查？",
    a: (
      <>
        access token 有效期 2 小时，前端会自动用 refresh token 续签，过期则强制登出。按顺序排查：后端{" "}
        <code>.env</code> 的 JWT.KEY 是否被改动 → 数据库是否重新导入（密钥变化会使旧 token
        失效）→ 浏览器清缓存后重新登录。
      </>
    ),
  },
  {
    q: "导入 SQL 后登录失败？",
    a: (
      <>
        完整快照里的用户密码均为 <code>password</code>
        （bcrypt 加密）。若仍失败，确认 <code>users.status = &apos;active&apos;</code> 且{" "}
        <code>deleted_at IS NULL</code>，再检查是否覆盖了已存在的同名库。
      </>
    ),
  },
  {
    q: "它和重型 ERP / WMS 有什么区别？",
    a: (
      <>
        MonaWMS 面向通信代维与中小仓库场景轻量设计：Docker 一键部署、双角色权限即可运转，没有重型系统的实施成本；同时保留工程级数据纪律（流水驱动、行锁事务、全量审计、幂等迁移），小团队也能获得「大厂级」的账实可信度。
      </>
    ),
  },
  {
    q: "授权是怎么生效的？",
    a: (
      <>
        有效权限 = 全局角色（admin / operator）∩ 仓库授权（user_warehouse_grant）。未授权仓库一律不可见、不可操作（403 WAREHOUSE_NOT_GRANTED）；仓库级
        manager 权限只能在本仓库内等同管理员，不能放大系统级权限。
      </>
    ),
  },
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="faq" id="faq">
      <div className="wrap">
        <div className="sec-head">
          <span className="kicker">FAQ</span>
          <h2>常见问题</h2>
          <p>围绕部署、登录与数据安全的高频疑问。</p>
        </div>
        <div className="faq-list">
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div className={`faq-item${isOpen ? " open" : ""}`} key={item.q}>
                <button
                  className="faq-q"
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                >
                  {item.q}
                  <span className="pm">+</span>
                </button>
                <div
                  className="faq-a"
                  style={isOpen ? { maxHeight: 400 } : undefined}
                >
                  <p>{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

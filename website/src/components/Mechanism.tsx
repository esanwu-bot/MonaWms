import { ArrowRight } from "lucide-react";

const STEPS = [
  {
    title: "入库 / 出库 / 调整 / 盘点",
    note: "业务单据",
    hot: false,
  },
  {
    title: "inventory_transactions",
    note: "一笔笔流水",
    hot: false,
  },
  {
    title: "inventory",
    note: "物化快照（同事务更新）",
    hot: false,
  },
  {
    title: "账实一致",
    note: "可对账 · 可追溯 · 可审计",
    hot: true,
  },
];

export default function Mechanism() {
  return (
    <section className="mech" id="mech">
      <div className="wrap">
        <div className="sec-head">
          <span className="kicker">How It Works</span>
          <h2>库存为什么永远算得清</h2>
          <p>
            MonaWMS 的核心机制：库存不是被「手动改」出来的，而是从每一笔业务流水「算」出来的。
          </p>
        </div>
        <div className="flow">
          {STEPS.map((step, i) => (
            <div className="fstep" key={step.title}>
              <div className={`box${step.hot ? " hot" : ""}`}>
                {step.title}
                <small>{step.note}</small>
              </div>
              {i < STEPS.length - 1 && (
                <div className="arr" aria-hidden="true">
                  <ArrowRight size={20} />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="eq">
          <span>库存金额 = Σ（流水数量 × 固化单价）</span>
          <span className="op">=</span>
          <span className="res">永远可复算</span>
        </div>
        <p className="eq-note">
          所有库存变动必须走 <b>Db::transaction + 行锁</b>
          ，禁止直接 UPDATE 库存表；同一事务内流水与快照同步落库，掉电、并发都不会产生「账实分离」。
        </p>
      </div>
    </section>
  );
}

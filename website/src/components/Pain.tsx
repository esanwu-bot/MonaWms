import { X, Check } from "lucide-react";

const BAD = [
  {
    title: "手工台账，月底对不上",
    desc: "Excel 记进出、记混型号，月底盘库存全凭感觉，账实两张皮。",
  },
  {
    title: "出入库与库存脱节",
    desc: "单据记了、库存没扣，或直接改库存数字，越改越乱、无从查证。",
  },
  {
    title: "盘点靠人海战术",
    desc: "年底大盘点大海捞针，差异说不清来龙去脉，只能拍脑袋调账。",
  },
  {
    title: "责任无从追溯",
    desc: "谁在什么时候改了什么库存，查无实据，出问题互相推诿。",
  },
];

const GOOD = [
  {
    title: "库存 = 流水汇总",
    desc: "库存由流水驱动、在同一事务内更新，永远等于所有出入库流水之和，账实恒一致。",
  },
  {
    title: "全链路业务闭环",
    desc: "主数据 → 入库 → 出库 → 盘点 → 对账 → 报表 → 审计一站到底，不再需要多个系统拼凑。",
  },
  {
    title: "盘点自动化",
    desc: "盲盘录入 → 双签 → 差异审核 → 自动生成盘盈 / 盘亏调整单，差异有据可依。",
  },
  {
    title: "全量操作审计",
    desc: "每一次写操作留痕（操作人 / 动作 / 对象 / 前后差异 / IP），日志只读不可删，责任到人。",
  },
];

export default function Pain() {
  return (
    <section className="pain" id="pain">
      <div className="wrap">
        <div className="sec-head">
          <span className="kicker">Why MonaWMS</span>
          <h2>小仓库，也有大账要算清</h2>
          <p>
            通信代维物资种类多、分布散、周转快，Excel 台账和重型的 ERP
            都靠不住。MonaWMS 用工程级的数据纪律，解决小仓库最常见的四个问题。
          </p>
        </div>
        <div className="pain-grid">
          <div className="pain-col bad">
            <h3>
              <span className="no">01</span>没有 MonaWMS 之前
            </h3>
            {BAD.map((item) => (
              <div className="pitem" key={item.title}>
                <div className="ic">
                  <X size={17} color="#FF7A1A" strokeWidth={2} />
                </div>
                <div>
                  <b>{item.title}</b>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="pain-col good">
            <h3>
              <span className="no">02</span>有了 MonaWMS 之后
            </h3>
            {GOOD.map((item) => (
              <div className="pitem" key={item.title}>
                <div className="ic">
                  <Check size={17} color="#0E8FB8" strokeWidth={2.4} />
                </div>
                <div>
                  <b>{item.title}</b>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

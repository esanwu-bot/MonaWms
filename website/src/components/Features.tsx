import {
  Radar,
  Fingerprint,
  ClipboardCheck,
  ShieldCheck,
  BarChart3,
  FileSpreadsheet,
} from "lucide-react";

const FEATURES = [
  {
    icon: Radar,
    title: "库存永不失真",
    desc: "库存由 inventory_transactions 流水驱动，inventory 只是流水汇总的物化快照，二者在同一事务内更新。任何库存变动必须走流水 + 行锁，禁止「先查后改」。",
    tag: "# 数据纪律",
  },
  {
    icon: Fingerprint,
    title: "一物一码 SN 追溯",
    desc: "序列号全生命周期台账：在用 / 返修中 / 待报废 / 已报废，状态流转写入历史，出库 SN 联动扣减，每台设备去向清晰可查。",
    tag: "# 全程可溯",
  },
  {
    icon: ClipboardCheck,
    title: "盘点对账闭环",
    desc: "盘点单 → 盲盘录入 → 双签确认 → 差异审核 → 自动生成盘盈 / 盘亏调整单；对账中心三规则核验（流水 vs 库存、SN 台账、批次台账），差异批量绑定。",
    tag: "# 差异自动处理",
  },
  {
    icon: ShieldCheck,
    title: "录审分离 + 二维授权",
    desc: "录入员只录单到 confirmed、不能过账；有效权限 = 全局角色 ∩ 仓库授权，未授权仓库不可见不可操作（403），仓库级经理也无法放大系统级权限。",
    tag: "# 权限模型",
  },
  {
    icon: BarChart3,
    title: "全量操作审计",
    desc: "所有写操作落 operation_log：操作人 / 动作 / 目标 / before-after JSON diff / IP，日志只读不可删，任何人也无法抹改，审计取证一步到位。",
    tag: "# 责任到人",
  },
  {
    icon: FileSpreadsheet,
    title: "报表开箱即用",
    desc: "xlsx（PhpSpreadsheet）+ CSV 流式导出，上万行数据走队列分批写出；金额一律按数量 × 流水固化单价计算，统计口径永远一致。",
    tag: "# 口径统一",
  },
];

export default function Features() {
  return (
    <section className="features" id="features">
      <div className="wrap">
        <div className="sec-head">
          <span className="kicker">Core Capabilities</span>
          <h2>六项核心能力，撑起仓库的确定性</h2>
          <p>
            每一处设计都以「数据可信、责任可追、随时可查」为底线，不靠人盯，靠机制。
          </p>
        </div>
        <div className="feat-grid">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div className="feat" key={f.title}>
                <div className="fic">
                  <Icon size={22} strokeWidth={1.8} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <span className="tag">{f.tag}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

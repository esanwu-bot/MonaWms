import { Rows3, Layers, Activity, MonitorSmartphone } from "lucide-react";

const MODULES = [
  {
    icon: Rows3,
    title: "库存与单据",
    items: [
      { name: "入库管理", note: "采购 / 调拨 / 归还 / 盘盈" },
      { name: "出库管理", note: "领用 / 领用人 / SN 联动" },
      { name: "库存查询", note: "仓库 / SKU / 批次 / 库位" },
      { name: "库存流水", note: "全量可追溯" },
      { name: "盘点", note: "盲盘 → 双签 → 差异审核" },
      { name: "对账中心", note: "三规则核验 + CSV 导出" },
      { name: "报废申请", note: "流程联动待报废状态" },
    ],
  },
  {
    icon: Layers,
    title: "主数据与库内结构",
    items: [
      { name: "物资主数据", note: "SKU / 型号 / 计量方式" },
      { name: "分类管理", note: "一 / 二级树形" },
      { name: "供应商 · 客户", note: "往来单位台账" },
      { name: "BOM 管理", note: "头明细 / 复制 / 展开" },
      { name: "数据字典", note: "12 类后台可维护" },
      { name: "四级库位", note: "仓库 / 库区 / 货架 / 库位" },
    ],
  },
  {
    icon: Activity,
    title: "追溯与合规",
    items: [
      { name: "序列号 SN", note: "一物一码 · 状态流转" },
      { name: "操作日志", note: "写操作审计 · 只读" },
      { name: "授权矩阵", note: "账号 × 仓库二维授权" },
      { name: "用户管理", note: "角色分配 admin / operator" },
      { name: "项目台账", note: "项目物资预留" },
      { name: "无线备件", note: "无线侧专项台账" },
    ],
  },
  {
    icon: MonitorSmartphone,
    title: "看板与移动端",
    items: [
      { name: "Dashboard 看板", note: "库存金额 / 出入库趋势" },
      { name: "告警概览", note: "低库存 / 待办提醒" },
      { name: "报表导出", note: "xlsx + CSV 流式" },
      { name: "移动端", note: "uni-app H5 随时录单" },
      { name: "个人中心", note: "JWT 续签 / 资料" },
      { name: "设备管理", note: "台账收敛至 SN 体系" },
    ],
  },
];

export default function Modules() {
  return (
    <section className="modules" id="modules">
      <div className="wrap">
        <div className="sec-head">
          <span className="kicker">Modules</span>
          <h2>20+ 功能模块，覆盖仓库全业务</h2>
          <p>
            从物资主数据到审计日志，每一环都可独立使用，也天然串成一条完整的业务链。
          </p>
        </div>
        <div className="mod-grid">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <div className="mod-card" key={mod.title}>
                <h3>
                  <span className="mic">
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  {mod.title}
                </h3>
                <ul>
                  {mod.items.map((item) => (
                    <li key={item.name}>
                      <b>{item.name}</b>
                      <span>{item.note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="mod-foot">
          全部模块支持软删除归档与 Excel 批量导入，历史单据可翻查、可红冲。
        </p>
      </div>
    </section>
  );
}

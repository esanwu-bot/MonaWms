import { ArrowRight } from "lucide-react";

const BARS = [38, 30, 52, 44, 64, 58, 72, 50, 60, 66, 82, 74, 76, 88];

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-grid" aria-hidden="true"></div>
      <div className="hero-sweep" aria-hidden="true"></div>
      <div className="wrap hero-inner">
        <div>
          <span className="kicker">MIT 开源 · 轻量 WMS · 通信代维场景</span>
          <h1>
            库存永远等于
            <br />
            <span className="hl">流水汇总</span>
          </h1>
          <p className="hero-sub">
            MonaWMS 是面向<b>通信代维与中小仓库</b>
            场景的轻量仓储管理系统：物资主数据 → 入库 → 出库 → 库存 → 盘点对账
            → 报表导出 → 操作日志审计，<b>全链路闭环</b>
            。让每一件通信物资账实一致、全程可溯。
          </p>
          <div className="hero-cta">
            <a
              className="btn btn-primary"
              href="http://8.152.97.191:9110/login"
              target="_blank"
              rel="noopener noreferrer"
            >
              立即体验演示
              <ArrowRight size={15} />
            </a>
            <a
              className="btn btn-ghost"
              href="https://github.com/esanwu-bot/MonaWms"
              target="_blank"
              rel="noopener noreferrer"
            >
              查看 GitHub 源码
            </a>
          </div>
          <div className="hero-stats">
            <div className="hstat">
              <div className="num">
                25<em>+</em>
              </div>
              <div className="lab">后端接口控制器</div>
            </div>
            <div className="hstat">
              <div className="num">32</div>
              <div className="lab">张数据表 · 全链路建模</div>
            </div>
            <div className="hstat">
              <div className="num">18</div>
              <div className="lab">份幂等数据库迁移</div>
            </div>
            <div className="hstat">
              <div className="num">
                2<em>角色</em>
              </div>
              <div className="lab">录审分离 · 二维授权</div>
            </div>
          </div>
        </div>

        {/* 产品界面示意（HTML/CSS 构建） */}
        <div className="mock" aria-hidden="true">
          <div className="mock-float">
            <span className="dot"></span>库存实时同步
          </div>
          <div className="mock-bar">
            <i></i>
            <i></i>
            <i></i>
            <span>monawms / dashboard</span>
          </div>
          <div className="mock-body">
            <div className="mock-side">
              <div>Dashboard</div>
              <div className="on">库存查询</div>
              <div>入库单</div>
              <div>出库单</div>
              <div>盘点</div>
              <div>对账中心</div>
              <div>操作日志</div>
            </div>
            <div className="mock-main">
              <div className="mock-toolbar">
                <div className="mock-title">
                  库存概览 <span className="mock-tag">实时</span>
                </div>
              </div>
              <div className="mock-cards">
                <div className="mcard">
                  <div className="v">
                    1,284<small>SKU</small>
                  </div>
                  <div className="k">在库物资</div>
                </div>
                <div className="mcard hot">
                  <div className="v">
                    ¥ 862.4<small>万</small>
                  </div>
                  <div className="k">库存金额</div>
                </div>
                <div className="mcard">
                  <div className="v">+126</div>
                  <div className="k">今日入库</div>
                </div>
              </div>
              <div className="mock-chart">
                <div className="mc-head">
                  <b>近 7 日出入库趋势</b>
                  <span>入库 · 出库</span>
                </div>
                <div className="bars">
                  {BARS.map((h, i) => (
                    <i
                      key={i}
                      className={i % 2 === 1 ? "a" : ""}
                      style={{ height: `${h}%` }}
                    ></i>
                  ))}
                </div>
              </div>
              <table className="mock-table">
                <thead>
                  <tr>
                    <th>物资</th>
                    <th>仓库</th>
                    <th>库存</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>光缆 GYTA-24</td>
                    <td className="c">A-01</td>
                    <td>2,360 米</td>
                    <td>
                      <span className="pill g">充足</span>
                    </td>
                  </tr>
                  <tr>
                    <td>熔接机 光纤</td>
                    <td className="c">B-03</td>
                    <td>46 台</td>
                    <td>
                      <span className="pill b">正常</span>
                    </td>
                  </tr>
                  <tr>
                    <td>分光器 1:8</td>
                    <td className="c">A-02</td>
                    <td>12 只</td>
                    <td>
                      <span className="pill o">待补货</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="hero-badge">
            <span>流水驱动 · 账实一致</span>
            <small>inventory = Σ transactions</small>
          </div>
        </div>
      </div>
    </section>
  );
}

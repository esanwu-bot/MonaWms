import BrandLogo from "./BrandLogo";

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <div className="foot-brand">
              <BrandLogo />
              Mona<b>WMS</b>
            </div>
            <p className="foot-desc">
              通信代维物资仓储管理系统。库存永远等于流水汇总，全链路闭环，账实一致，全程可溯。
            </p>
          </div>
          <div className="foot-col">
            <h4>项目</h4>
            <a
              href="https://github.com/esanwu-bot/MonaWms"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub 源码
            </a>
            <a
              href="http://8.152.97.191:9110/login"
              target="_blank"
              rel="noopener noreferrer"
            >
              在线演示
            </a>
            <a
              href="https://github.com/esanwu-bot/MonaWms/blob/main/README.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              README 文档
            </a>
            <div>MIT License</div>
          </div>
          <div className="foot-col">
            <h4>联系我们</h4>
            <div>手机 / 微信：186 8836 1467</div>
            <a href="mailto:352576216@qq.com">352576216@qq.com</a>
            <a href="mailto:esan.wu@gmail.com">esan.wu@gmail.com</a>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 MonaWMS · 面向通信代维场景的开源 WMS</span>
          <span className="mit">
            Released under <b style={{ color: "#fff" }}>MIT License</b> · 库存 =
            流水汇总
          </span>
        </div>
      </div>
    </footer>
  );
}

import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Pain from "@/components/Pain";
import Features from "@/components/Features";
import Mechanism from "@/components/Mechanism";
import Modules from "@/components/Modules";
import Stack from "@/components/Stack";
import Deploy from "@/components/Deploy";
import Demo from "@/components/Demo";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";

// 线上规范地址（与 layout.tsx 保持一致；发布到自定义域名后同步更新）
const SITE_URL = "https://caymak2ynl.doubaoapps.com/app/app_17f4zh9hyme";

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "MonaWMS",
  alternateName: "通信代维物资仓储管理系统",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: `${SITE_URL}/`,
  description:
    "MonaWMS 是面向通信代维与中小仓库场景的轻量仓储管理系统（WMS）：物资主数据、入库、出库、库存、盘点对账、报表导出、操作日志审计全链路闭环，库存由 inventory_transactions 流水驱动、永远等于流水汇总。",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "CNY",
    description: "MIT 开源，免费使用",
  },
  sameAs: ["https://github.com/esanwu-bot/MonaWms"],
  featureList: [
    "库存永远等于流水汇总（流水驱动 + 行锁事务）",
    "双角色录审分离（admin / operator）",
    "账号 × 仓库二维授权",
    "全量操作日志只读审计",
    "18 份幂等数据库迁移",
    "DECIMAL(18,4) + bcmath 精确计算",
    "Docker Compose 一键部署",
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <Nav />
      <main>
        <Hero />
        <Pain />
        <Features />
        <Mechanism />
        <Modules />
        <Stack />
        <Deploy />
        <Demo />
        <Faq />
      </main>
      <Footer />
    </>
  );
}

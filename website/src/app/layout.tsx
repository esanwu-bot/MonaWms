import type { Metadata } from "next";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "./globals.css";

// 线上规范地址（发布到自定义域名后需同步更新此常量）
const SITE_URL = "https://caymak2ynl.doubaoapps.com/app/app_17f4zh9hyme";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "MonaWMS — 通信代维物资仓储管理系统",
  description:
    "MonaWMS 是面向通信代维与中小仓库场景的轻量 WMS：物资主数据 → 入库 → 出库 → 库存 → 盘点对账 → 报表导出 → 操作日志审计，全链路闭环，库存永远等于流水汇总。MIT 开源，Docker 一键部署。",
  keywords: [
    "WMS",
    "仓储管理系统",
    "通信代维",
    "通信物资管理",
    "库存管理软件",
    "物资管理系统",
    "出入库管理",
    "盘点对账",
    "开源 WMS",
    "轻量仓储系统",
  ],
  alternates: {
    canonical: `${SITE_URL}/`,
  },
  openGraph: {
    title: "MonaWMS — 通信代维物资仓储管理系统",
    description:
      "面向通信代维与中小仓库场景的轻量仓储管理系统：全链路闭环，库存永远等于流水汇总。MIT 开源，Docker 一键部署。",
    type: "website",
    locale: "zh_CN",
    siteName: "MonaWMS",
    url: `${SITE_URL}/`,
    images: [{ url: `${SITE_URL}/icon.svg`, alt: "MonaWMS" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MonaWMS — 通信代维物资仓储管理系统",
    description:
      "面向通信代维与中小仓库场景的轻量仓储管理系统：库存永远等于流水汇总。",
    images: [`${SITE_URL}/icon.svg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "MonaWMS",
  alternateName: "通信代维物资仓储管理系统",
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/icon.svg`,
  description:
    "MonaWMS 是面向通信代维与中小仓库场景的轻量仓储管理系统（WMS），MIT 开源：物资主数据、入库、出库、库存、盘点对账、报表导出、操作日志审计全链路闭环。",
  sameAs: ["https://github.com/esanwu-bot/MonaWms"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}

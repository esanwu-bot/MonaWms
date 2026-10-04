import type { Metadata } from "next";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "MonaWMS — 通信代维物资仓储管理系统",
  description:
    "MonaWMS 是面向通信代维与中小仓库场景的轻量 WMS：物资主数据 → 入库 → 出库 → 库存 → 盘点对账 → 报表导出 → 操作日志审计，全链路闭环，库存永远等于流水汇总。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

import type { MetadataRoute } from "next";

// 静态导出要求显式声明
export const dynamic = "force-static";

// 线上规范地址（与 layout.tsx 保持一致；发布到自定义域名后同步更新）
const SITE_URL = "https://caymak2ynl.doubaoapps.com/app/app_17f4zh9hyme";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}

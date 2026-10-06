import type { MetadataRoute } from "next";

// 静态导出要求显式声明
export const dynamic = "force-static";

// 线上规范地址（与 layout.tsx 保持一致；Cloudflare Pages）
const SITE_URL = "https://monawms.pages.dev";

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

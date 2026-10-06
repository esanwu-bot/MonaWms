import type { MetadataRoute } from "next";

// 静态导出要求显式声明
export const dynamic = "force-static";

// 线上规范地址（与 layout.tsx 保持一致；Cloudflare Pages）
const SITE_URL = "https://monawms.pages.dev";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // 常规爬虫
      { userAgent: "*", allow: "/" },
      // 生成式引擎 / AI 搜索爬虫，明确放行
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "CCBot", allow: "/" },
      { userAgent: "Applebot-Extended", allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

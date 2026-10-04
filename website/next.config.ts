import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 妙搭平台静态托管：静态导出 + 构建期注入的应用根路径
  output: "export",
  basePath: process.env.MIAODA_CLIENT_BASE_PATH || undefined,
};

export default nextConfig;

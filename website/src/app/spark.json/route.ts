import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// 发布自描述端点：dev server 在 /spark.json 上伺服项目根的 spark.json 实时内容
export const dynamic = "force-static";

export async function GET() {
  const file = path.join(process.cwd(), "spark.json");
  const content = fs.readFileSync(file, "utf-8");
  return new NextResponse(content, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

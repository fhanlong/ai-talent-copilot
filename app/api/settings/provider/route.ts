import { NextResponse } from "next/server";
import { z } from "zod";
import { getLLMProvider, getProviderConfig } from "@/lib/ai/provider";

const testSchema = z.object({ status: z.literal("ok"), message: z.string() });

export async function GET() {
  return NextResponse.json(getProviderConfig());
}

export async function POST() {
  try {
    const provider = getLLMProvider();
    const result = await provider.generateObject([
      { role: "system", content: "你是连接测试助手，只输出JSON。" },
      { role: "user", content: "返回 {\"status\":\"ok\",\"message\":\"模型连接正常\"}" },
    ], testSchema, { status: "ok", message: "Mock Provider运行正常" });
    return NextResponse.json({ ok: true, result, provider: provider.name, model: provider.model });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "连接失败" }, { status: 502 });
  }
}

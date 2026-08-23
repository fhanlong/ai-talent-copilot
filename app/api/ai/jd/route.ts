import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeJD } from "@/lib/ai/service";

const input = z.object({ text: z.string().min(30, "JD内容至少需要30个字符").max(16000) });

export async function POST(request: Request) {
  try {
    const { text } = input.parse(await request.json());
    return NextResponse.json(await analyzeJD(text));
  } catch (error) {
    const message = error instanceof Error ? error.message : "分析失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

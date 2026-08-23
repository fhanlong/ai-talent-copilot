import { NextResponse } from "next/server";
import { analyzeMatch } from "@/lib/ai/service";
import { candidateSchema, jdAnalysisSchema } from "@/lib/ai/schemas";
import { z } from "zod";

const input = z.object({ jd: jdAnalysisSchema, candidate: candidateSchema });

export async function POST(request: Request) {
  try {
    const { jd, candidate } = input.parse(await request.json());
    return NextResponse.json(await analyzeMatch(jd, candidate));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "匹配分析失败" }, { status: 400 });
  }
}

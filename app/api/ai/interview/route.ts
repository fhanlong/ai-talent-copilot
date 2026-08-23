import { NextResponse } from "next/server";
import { z } from "zod";
import { candidateSchema, matchSchema } from "@/lib/ai/schemas";
import { generateInterview } from "@/lib/ai/service";

const input = z.object({ jobTitle: z.string(), candidate: candidateSchema, match: matchSchema });

export async function POST(request: Request) {
  try {
    const data = input.parse(await request.json());
    return NextResponse.json(await generateInterview(data.jobTitle, data.candidate, data.match));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "面试问题生成失败" }, { status: 400 });
  }
}

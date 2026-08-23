import { NextResponse } from "next/server";
import { z } from "zod";
import { mergeExistingCandidates } from "@/lib/candidate-identity";

const input = z.object({
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const data = input.parse(await request.json());
    const candidate = await mergeExistingCandidates(data.sourceId, data.targetId);
    return NextResponse.json({ candidateId: candidate.id, merged: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "候选人合并失败" }, { status: 400 });
  }
}

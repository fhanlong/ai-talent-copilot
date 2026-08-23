import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeFunnel } from "@/lib/ai/service";
import { validateFunnel } from "@/lib/funnel-analysis";

const funnelSchema = z.object({
  received: z.number().int().min(0),
  screened: z.number().int().min(0),
  interviewed: z.number().int().min(0),
  offersMade: z.number().int().min(0),
  offersAccepted: z.number().int().min(0),
  onboarded: z.number().int().min(0),
});

export async function POST(request: Request) {
  try {
    const funnel = funnelSchema.parse(await request.json());
    const validationError = validateFunnel(funnel);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    return NextResponse.json(await analyzeFunnel(funnel));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "漏斗诊断失败" }, { status: 400 });
  }
}

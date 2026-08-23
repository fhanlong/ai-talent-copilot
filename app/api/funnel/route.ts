import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { funnelAnalysisSchema } from "@/lib/ai/schemas";
import { buildFunnelAnalysis, getFunnelRates, validateFunnel } from "@/lib/funnel-analysis";
import { buildActualFunnel } from "@/lib/recruiting";

const funnelSchema = z.object({ jobId:z.string().min(1),received:z.number().int().min(0),screened:z.number().int().min(0),interviewed:z.number().int().min(0),offersMade:z.number().int().min(0),offersAccepted:z.number().int().min(0),onboarded:z.number().int().min(0),analysis:funnelAnalysisSchema.optional() });

export async function GET(request: Request) {
  const jobId = new URL(request.url).searchParams.get("jobId");
  const [jobs, applications] = await Promise.all([
    db.job.findMany({ where: { status: "ACTIVE" }, select: { id: true, title: true, status: true }, orderBy: { updatedAt: "desc" } }),
    db.application.findMany({ where: jobId ? { jobId } : { job: { status: "ACTIVE" } }, select: { stage: true } }),
  ]);
  const funnel = buildActualFunnel(applications);
  return NextResponse.json({ jobs, selectedJobId: jobId, funnel, rates: getFunnelRates(funnel), analysis: funnel.received ? buildFunnelAnalysis(funnel) : null });
}

export async function POST(request:Request){
  try{
    const {analysis,jobId,...data}=funnelSchema.parse(await request.json());
    const validationError=validateFunnel(data);
    if(validationError)return NextResponse.json({error:validationError},{status:400});
    const job=await db.job.findUnique({where:{id:jobId}});
    if(!job)return NextResponse.json({error:"职位不存在"},{status:404});
    const rates=getFunnelRates(data);
    const savedAnalysis=analysis??buildFunnelAnalysis(data);
    const snapshot=await db.funnelSnapshot.create({data:{jobId,...data,rates:JSON.stringify(rates),aiInsights:JSON.stringify(savedAnalysis)}});
    return NextResponse.json({snapshot,rates,analysis:savedAnalysis},{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"保存失败"},{status:400});}
}

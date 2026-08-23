import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { jdAnalysisSchema } from "@/lib/ai/schemas";
import { pipelineProgress, stageIndex, stageLabel } from "@/lib/recruiting";

const input = z.object({ description: z.string().min(30), analysis: jdAnalysisSchema });

export async function GET() {
  const jobs = await db.job.findMany({ include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 }, applications: { select: { stage: true } } }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ jobs: jobs.map((job) => {
    const furthest = job.applications.reduce((current, item) => stageIndex(item.stage) > stageIndex(current) ? item.stage : current, "RECEIVED");
    return { ...job, candidateCount: job.applications.length, currentStage: job.applications.length ? stageLabel(furthest) : "等待候选人", progress: pipelineProgress(job.applications), applications: undefined };
  }) });
}

export async function POST(request: Request) {
  try {
    const { description, analysis } = input.parse(await request.json());
    const job = await db.job.create({ data: {
      title: analysis.jobTitle, description,
      analyses: { create: {
        jobType: analysis.jobType, competencies: JSON.stringify(analysis.competencies),
        mustHaveKeywords: JSON.stringify(analysis.mustHave), preferredKeywords: JSON.stringify(analysis.preferred),
        interviewFocus: JSON.stringify(analysis.interviewFocus), ambiguities: JSON.stringify(analysis.ambiguities),
      } },
    }, include: { analyses: true } });
    await db.auditLog.create({ data: { action: "CREATE_JOB_ANALYSIS", entityType: "Job", entityId: job.id } });
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 400 });
  }
}

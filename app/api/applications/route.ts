import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { APPLICATION_STAGE_VALUES } from "@/lib/recruiting";

const input = z.object({ candidateId: z.string().min(1), jobId: z.string().min(1), stage: z.enum(APPLICATION_STAGE_VALUES).default("RECEIVED") });

export async function POST(request: Request) {
  try {
    const data = input.parse(await request.json());
    const [candidate, job] = await Promise.all([db.candidate.findUnique({ where: { id: data.candidateId }, select: { id: true } }), db.job.findUnique({ where: { id: data.jobId }, select: { id: true } })]);
    if (!candidate || !job) return NextResponse.json({ error: "候选人或职位不存在" }, { status: 404 });
    const application = await db.application.create({ data });
    await db.candidate.update({ where: { id: data.candidateId }, data: { jobId: data.jobId } });
    await db.auditLog.create({ data: { action: "ADD_CANDIDATE_TO_POSITION", entityType: "Application", entityId: application.id, metadata: JSON.stringify(data) } });
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "该候选人已在此职位的招聘流程中" }, { status: 409 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "加入招聘流程失败" }, { status: 400 });
  }
}

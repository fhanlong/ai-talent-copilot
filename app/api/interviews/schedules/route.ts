import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { stageIndex } from "@/lib/recruiting";

const input = z.object({
  candidateId: z.string().min(1),
  jobId: z.string().optional().nullable(),
  applicationId: z.string().optional().nullable(),
  title: z.string().trim().min(1).max(160),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  timezone: z.string().default("Asia/Shanghai"),
  location: z.string().trim().max(300).optional(),
  meetingUrl: z.string().trim().max(500).optional(),
  interviewer: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const include = {
  candidate: { select: { id: true, displayName: true } },
  job: { select: { id: true, title: true } },
} as const;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const candidateId = url.searchParams.get("candidateId") || undefined;
  const upcoming = url.searchParams.get("upcoming") === "true";
  const schedules = await db.interviewSchedule.findMany({
    where: {
      candidateId,
      status: { not: "CANCELLED" },
      startsAt: upcoming ? { gte: new Date() } : undefined,
    },
    include,
    orderBy: { startsAt: upcoming ? "asc" : "desc" },
    take: 100,
  });
  return NextResponse.json({ schedules });
}

export async function POST(request: Request) {
  try {
    const data = input.parse(await request.json());
    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);
    if (endsAt <= startsAt) return NextResponse.json({ error: "结束时间必须晚于开始时间" }, { status: 400 });

    const [candidate, application, job] = await Promise.all([
      db.candidate.findUnique({ where: { id: data.candidateId }, select: { id: true, displayName: true } }),
      data.applicationId ? db.application.findUnique({ where: { id: data.applicationId } }) : null,
      data.jobId ? db.job.findUnique({ where: { id: data.jobId }, select: { id: true } }) : null,
    ]);
    if (!candidate) return NextResponse.json({ error: "候选人不存在" }, { status: 404 });
    if (data.applicationId && (!application || application.candidateId !== data.candidateId)) return NextResponse.json({ error: "招聘流程与候选人不匹配" }, { status: 400 });
    if (data.jobId && !job) return NextResponse.json({ error: "招聘职位不存在" }, { status: 404 });
    const jobId = application?.jobId || data.jobId || null;

    const schedule = await db.$transaction(async (tx) => {
      const created = await tx.interviewSchedule.create({ data: {
        candidateId: data.candidateId,
        jobId,
        applicationId: application?.id || null,
        title: data.title,
        startsAt,
        endsAt,
        timezone: data.timezone,
        location: data.location || null,
        meetingUrl: data.meetingUrl || null,
        interviewer: data.interviewer || null,
        notes: data.notes || null,
      }, include });
      if (application && stageIndex(application.stage) < stageIndex("INTERVIEW")) {
        await tx.application.update({ where: { id: application.id }, data: { stage: "INTERVIEW" } });
      }
      await tx.auditLog.create({ data: {
        action: "SCHEDULE_INTERVIEW",
        entityType: "InterviewSchedule",
        entityId: created.id,
        metadata: JSON.stringify({ candidateId: data.candidateId, jobId, startsAt: data.startsAt }),
      } });
      return created;
    });
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "面试排期保存失败" }, { status: 400 });
  }
}

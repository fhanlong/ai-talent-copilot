import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildInterviewMail } from "@/lib/interview-scheduling";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const schedule = await db.interviewSchedule.findUnique({
    where: { id },
    include: { candidate: { select: { displayName: true, email: true } }, job: { select: { title: true } } },
  });
  if (!schedule) return NextResponse.json({ error: "面试排期不存在" }, { status: 404 });
  if (!schedule.candidate.email) return NextResponse.json({ error: "候选人未填写邮箱，无法生成邮件邀请" }, { status: 400 });
  const draft = buildInterviewMail(schedule);
  await db.auditLog.create({ data: { action: "PREPARE_INTERVIEW_EMAIL", entityType: "InterviewSchedule", entityId: id } });
  return NextResponse.json({
    email: schedule.candidate.email,
    subject: draft.subject,
    body: draft.body,
    mailto: `mailto:${schedule.candidate.email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`,
  });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildInterviewIcs } from "@/lib/interview-scheduling";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const schedule = await db.interviewSchedule.findUnique({
    where: { id },
    include: { candidate: { select: { displayName: true, email: true } }, job: { select: { title: true } } },
  });
  if (!schedule) return NextResponse.json({ error: "面试排期不存在" }, { status: 404 });
  await db.auditLog.create({ data: { action: "DOWNLOAD_INTERVIEW_CALENDAR", entityType: "InterviewSchedule", entityId: id } });
  return new NextResponse(buildInterviewIcs(schedule), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="interview-${id}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}

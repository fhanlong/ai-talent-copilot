import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { findCandidateDuplicates, maskEmail, maskPhone } from "@/lib/candidate-identity";

const patchSchema = z.object({ hrDecision: z.enum(["PENDING", "INTERVIEW", "HOLD", "RECOMMEND", "REJECT"]).optional(), hrNotes: z.string().max(2000).optional() });
const parse = (value: string) => { try { return JSON.parse(value); } catch { return []; } };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const candidate = await db.candidate.findUnique({
    where: { id },
    select: {
      id: true, displayName: true, currentRole: true, yearsOfExperience: true, education: true, skills: true, workExperiences: true,
      source: true, email: true, phone: true, resumeFileName: true, updatedAt: true,
      applications: { include: { job: { select: { id: true, title: true, status: true } } }, orderBy: { updatedAt: "desc" } },
      matches: { include: { job: { select: { title: true } } }, orderBy: { createdAt: "desc" } }, interviews: { orderBy: { createdAt: "desc" } },
      interviewSchedules: { include: { job: { select: { id: true, title: true } } }, orderBy: { startsAt: "desc" } },
    },
  });
  if (!candidate) return NextResponse.json({ error: "候选人不存在" }, { status: 404 });
  const duplicates = await findCandidateDuplicates(db, { email: candidate.email, phone: candidate.phone }, candidate.id);
  return NextResponse.json({ candidate: {
    ...candidate,
    email: undefined, phone: undefined, maskedEmail: maskEmail(candidate.email), maskedPhone: maskPhone(candidate.phone),
    hasEmail: Boolean(candidate.email), hasPhone: Boolean(candidate.phone), hasResume: Boolean(candidate.resumeFileName),
    education: parse(candidate.education), skills: parse(candidate.skills), workExperiences: parse(candidate.workExperiences),
    matches: candidate.matches.map((match) => ({ ...match, strengths: parse(match.strengths), risks: parse(match.risks), evidence: parse(match.evidence), interviewSuggestions: parse(match.interviewSuggestions), missingInformation: parse(match.missingInformation) })),
  }, duplicates });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; const data = patchSchema.parse(await request.json());
    const latest = await db.matchAnalysis.findFirst({ where: { candidateId: id }, orderBy: { createdAt: "desc" } });
    if (!latest) return NextResponse.json({ error: "尚无匹配记录" }, { status: 404 });
    const match = await db.matchAnalysis.update({ where: { id: latest.id }, data });
    await db.auditLog.create({ data: { action: "HR_REVIEW_CANDIDATE", entityType: "Candidate", entityId: id, metadata: JSON.stringify(data) } });
    return NextResponse.json({ match });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "更新失败" }, { status: 400 }); }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { candidateSchema, jdAnalysisSchema, matchSchema } from "@/lib/ai/schemas";
import { APPLICATION_STAGE_VALUES } from "@/lib/recruiting";
import { extractContactInfo, extractResumeFile } from "@/lib/resume-file";
import { findCandidateDuplicates, normalizeEmail, normalizePhone } from "@/lib/candidate-identity";

export const runtime = "nodejs";

const analysisInput = z.object({
  jobTitle: z.string().min(1),
  jdText: z.string().optional(),
  jdAnalysis: jdAnalysisSchema,
  candidate: candidateSchema,
  match: matchSchema,
  anonymized: z.boolean().optional().default(false),
});

const manualInput = z.object({
  displayName: z.string().trim().min(1, "请填写候选人姓名").max(80),
  email: z.string().trim().email("邮箱格式不正确").or(z.literal("")).optional(),
  phone: z.string().trim().max(30).optional(),
  currentRole: z.string().trim().max(100).optional(),
  yearsOfExperience: z.coerce.number().min(0).max(80).optional(),
  education: z.string().trim().max(200).optional(),
  skills: z.string().max(1000).optional(),
  source: z.string().trim().max(100).optional(),
  jobId: z.string().trim().optional(),
  stage: z.enum(APPLICATION_STAGE_VALUES).default("RECEIVED"),
});

const parse = (value: string) => { try { return JSON.parse(value); } catch { return []; } };

async function resumeFields(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || !file.size) return { email: null, phone: null, resumeFileName: null, resumeMimeType: null, resumeData: null };
  const extracted = await extractResumeFile(file);
  const contact = extractContactInfo(extracted.text);
  return { ...contact, resumeFileName: file.name, resumeMimeType: extracted.mimeType, resumeData: extracted.buffer };
}

export async function GET(request: Request) {
  const positionId = new URL(request.url).searchParams.get("positionId");
  const [candidates, positions] = await Promise.all([
    db.candidate.findMany({
      where: positionId ? { applications: { some: { jobId: positionId } } } : undefined,
      select: {
        id: true, displayName: true, currentRole: true, yearsOfExperience: true, education: true, skills: true,
        source: true, updatedAt: true, resumeFileName: true,
        applications: { include: { job: { select: { id: true, title: true, status: true } } }, orderBy: { updatedAt: "desc" } },
        matches: { select: { overallScore: true, hrDecision: true, strengths: true, risks: true, jobId: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.job.findMany({ select: { id: true, title: true, status: true }, orderBy: { updatedAt: "desc" } }),
  ]);
  return NextResponse.json({
    positions,
    candidates: candidates.map((candidate) => ({
      ...candidate,
      education: parse(candidate.education),
      skills: parse(candidate.skills),
      latestMatch: candidate.matches[0] ? { ...candidate.matches[0], strengths: parse(candidate.matches[0].strengths), risks: parse(candidate.matches[0].risks) } : null,
      matches: undefined,
      hasResume: Boolean(candidate.resumeFileName),
    })),
  });
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) return NextResponse.json({ error: "请通过候选人表单提交" }, { status: 415 });
    const form = await request.formData();
    const file = form.get("file");
    const storedResume = await resumeFields(file);
    const payload = form.get("payload");
    const mergeCandidateId = typeof form.get("mergeCandidateId") === "string" ? String(form.get("mergeCandidateId")) : "";

    if (typeof payload === "string") {
      const data = analysisInput.parse(JSON.parse(payload));
      let job = await db.job.findFirst({ where: { title: data.jobTitle }, include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { updatedAt: "desc" } });
      if (!job) {
        job = await db.job.create({ data: { title: data.jobTitle, description: data.jdText || "由匹配报告创建", analyses: { create: {
          jobType: data.jdAnalysis.jobType, competencies: JSON.stringify(data.jdAnalysis.competencies), mustHaveKeywords: JSON.stringify(data.jdAnalysis.mustHave), preferredKeywords: JSON.stringify(data.jdAnalysis.preferred), interviewFocus: JSON.stringify(data.jdAnalysis.interviewFocus), ambiguities: JSON.stringify(data.jdAnalysis.ambiguities), isConfirmed: true,
        } } }, include: { analyses: { take: 1 } } });
      }
      let analysis = job.analyses[0];
      if (!analysis) analysis = await db.jobAnalysis.create({ data: { jobId: job.id, jobType: data.jdAnalysis.jobType, competencies: JSON.stringify(data.jdAnalysis.competencies), mustHaveKeywords: JSON.stringify(data.jdAnalysis.mustHave), preferredKeywords: JSON.stringify(data.jdAnalysis.preferred), interviewFocus: JSON.stringify(data.jdAnalysis.interviewFocus), ambiguities: JSON.stringify(data.jdAnalysis.ambiguities), isConfirmed: true } });

      const duplicates = await findCandidateDuplicates(db, storedResume);
      if (duplicates.length && !mergeCandidateId) {
        return NextResponse.json({ code: "DUPLICATE_CANDIDATE", error: "检测到手机号或邮箱相同的候选人，请合并到已有档案。", duplicates }, { status: 409 });
      }
      const mergeTarget = mergeCandidateId ? duplicates.find((candidate) => candidate.id === mergeCandidateId) : null;
      if (mergeCandidateId && !mergeTarget) return NextResponse.json({ error: "所选档案与本次简历的手机号或邮箱不一致，无法合并。" }, { status: 400 });

      const saved = await db.$transaction(async (tx) => {
        const candidate = mergeTarget
          ? await tx.candidate.update({ where: { id: mergeTarget.id }, data: {
              email: normalizeEmail(storedResume.email) || undefined,
              phone: normalizePhone(storedResume.phone) || undefined,
              currentRole: data.candidate.currentRole || undefined,
              yearsOfExperience: data.candidate.yearsOfExperience || undefined,
              education: JSON.stringify([data.candidate.education]),
              skills: JSON.stringify(data.candidate.skills),
              workExperiences: JSON.stringify(data.candidate.highlights),
              resumeFileName: storedResume.resumeFileName || undefined,
              resumeMimeType: storedResume.resumeMimeType || undefined,
              resumeData: storedResume.resumeData || undefined,
              sourceFileType: data.anonymized ? "structured-anonymized" : "structured-identified",
              source: "AI简历匹配",
              jobId: job.id,
            } })
          : await tx.candidate.create({ data: {
              jobId: job.id, displayName: data.candidate.displayName, email: normalizeEmail(storedResume.email), phone: normalizePhone(storedResume.phone),
              currentRole: data.candidate.currentRole, yearsOfExperience: data.candidate.yearsOfExperience,
              education: JSON.stringify([data.candidate.education]), skills: JSON.stringify(data.candidate.skills), workExperiences: JSON.stringify(data.candidate.highlights),
              resumeText: null, resumeFileName: storedResume.resumeFileName, resumeMimeType: storedResume.resumeMimeType, resumeData: storedResume.resumeData,
              sourceFileType: data.anonymized ? "structured-anonymized" : "structured-identified", source: "AI简历匹配",
            } });
        await tx.application.upsert({
          where: { jobId_candidateId: { jobId: job.id, candidateId: candidate.id } },
          update: { source: "AI简历匹配" },
          create: { jobId: job.id, candidateId: candidate.id, stage: "RECEIVED", source: "AI简历匹配" },
        });
        const match = await tx.matchAnalysis.create({ data: {
          jobId: job.id, candidateId: candidate.id, jobAnalysisId: analysis.id, overallScore: data.match.overallScore,
          competencyScore: data.match.competencyScore, experienceScore: data.match.experienceScore, industryScore: data.match.industryScore,
          mustHaveChecks: JSON.stringify({ score: data.match.mustHaveScore }), strengths: JSON.stringify(data.match.strengths), risks: JSON.stringify(data.match.risks),
          missingInformation: JSON.stringify(data.match.missingInformation), evidence: JSON.stringify(data.match.evidence), interviewSuggestions: JSON.stringify(data.match.interviewSuggestions), confidence: "HIGH",
        } });
        await tx.auditLog.create({ data: { action: mergeTarget ? "MERGE_MATCH_INTO_CANDIDATE" : "SAVE_CANDIDATE_MATCH", entityType: "Candidate", entityId: candidate.id, metadata: JSON.stringify({ jobId: job.id, score: data.match.overallScore, anonymized: data.anonymized, resumeStored: Boolean(storedResume.resumeData) }) } });
        return { candidateId: candidate.id, matchId: match.id, merged: Boolean(mergeTarget) };
      });
      return NextResponse.json(saved, { status: 201 });
    }

    const fields = manualInput.parse(Object.fromEntries(form.entries()));
    const email = normalizeEmail(fields.email || storedResume.email);
    const phone = normalizePhone(fields.phone || storedResume.phone);
    const duplicates = await findCandidateDuplicates(db, { email, phone });
    if (duplicates.length && !mergeCandidateId) {
      return NextResponse.json({ code: "DUPLICATE_CANDIDATE", error: "检测到手机号或邮箱相同的候选人，请合并到已有档案。", duplicates }, { status: 409 });
    }
    const mergeTarget = mergeCandidateId ? duplicates.find((candidate) => candidate.id === mergeCandidateId) : null;
    if (mergeCandidateId && !mergeTarget) return NextResponse.json({ error: "所选档案与新候选人的手机号或邮箱不一致，无法合并。" }, { status: 400 });
    const skills = (fields.skills ?? "").split(/[，,、\n]/).map((item) => item.trim()).filter(Boolean);
    const saved = await db.$transaction(async (tx) => {
      const candidate = mergeTarget
        ? await tx.candidate.update({ where: { id: mergeTarget.id }, data: {
            email: email || undefined,
            phone: phone || undefined,
            currentRole: fields.currentRole || undefined,
            yearsOfExperience: fields.yearsOfExperience ?? undefined,
            education: fields.education ? JSON.stringify([fields.education]) : undefined,
            skills: skills.length ? JSON.stringify(skills) : undefined,
            resumeFileName: storedResume.resumeFileName || undefined,
            resumeMimeType: storedResume.resumeMimeType || undefined,
            resumeData: storedResume.resumeData || undefined,
            sourceFileType: storedResume.resumeData ? "original-upload" : undefined,
            source: fields.source || undefined,
            jobId: fields.jobId || undefined,
          } })
        : await tx.candidate.create({ data: {
            jobId: fields.jobId || null, displayName: fields.displayName, email, phone,
            currentRole: fields.currentRole || null, yearsOfExperience: fields.yearsOfExperience ?? null,
            education: JSON.stringify(fields.education ? [fields.education] : []), skills: JSON.stringify(skills), workExperiences: "[]",
            resumeText: null, resumeFileName: storedResume.resumeFileName, resumeMimeType: storedResume.resumeMimeType, resumeData: storedResume.resumeData,
            sourceFileType: storedResume.resumeData ? "original-upload" : "manual", source: fields.source || null,
          } });
      if (fields.jobId) await tx.application.upsert({ where: { jobId_candidateId: { jobId: fields.jobId, candidateId: candidate.id } }, update: {}, create: { candidateId: candidate.id, jobId: fields.jobId, stage: fields.stage, source: fields.source || null } });
      await tx.auditLog.create({ data: { action: mergeTarget ? "MERGE_CANDIDATE_INPUT" : "CREATE_CANDIDATE", entityType: "Candidate", entityId: candidate.id, metadata: JSON.stringify({ jobId: fields.jobId || null, stage: fields.jobId ? fields.stage : null, resumeStored: Boolean(storedResume.resumeData) }) } });
      return candidate;
    });
    return NextResponse.json({ candidateId: saved.id, merged: Boolean(mergeTarget) }, { status: mergeTarget ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "候选人保存失败" }, { status: 400 });
  }
}

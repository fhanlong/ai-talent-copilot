import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { stageIndex } from "@/lib/recruiting";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type DuplicateCandidate = {
  id: string;
  displayName: string;
  currentRole: string | null;
  maskedEmail: string | null;
  maskedPhone: string | null;
  matchingFields: Array<"email" | "phone">;
  applications: Array<{ id: string; stage: string; job: { id: string; title: string } }>;
};

export function normalizeEmail(value?: string | null) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized || null;
}

export function normalizePhone(value?: string | null) {
  let digits = value?.replace(/\D/g, "") ?? "";
  if (digits.startsWith("0086") && digits.length === 15) digits = digits.slice(4);
  if (digits.startsWith("86") && digits.length === 13) digits = digits.slice(2);
  return digits || null;
}

export function maskEmail(value?: string | null) {
  const normalized = normalizeEmail(value);
  return normalized ? normalized.replace(/^(.{1,2}).*(@.*)$/, "$1***$2") : null;
}

export function maskPhone(value?: string | null) {
  const normalized = normalizePhone(value);
  if (!normalized) return null;
  if (normalized.length < 7) return `${normalized.slice(0, 2)}***`;
  return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`;
}

export async function findCandidateDuplicates(
  client: DbClient,
  contact: { email?: string | null; phone?: string | null },
  excludeId?: string,
): Promise<DuplicateCandidate[]> {
  const email = normalizeEmail(contact.email);
  const phone = normalizePhone(contact.phone);
  if (!email && !phone) return [];

  const candidates = await client.candidate.findMany({
    where: excludeId ? { id: { not: excludeId } } : undefined,
    select: {
      id: true,
      displayName: true,
      currentRole: true,
      email: true,
      phone: true,
      applications: {
        select: { id: true, stage: true, job: { select: { id: true, title: true } } },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  return candidates.flatMap((candidate) => {
    const matchingFields: Array<"email" | "phone"> = [];
    if (email && normalizeEmail(candidate.email) === email) matchingFields.push("email");
    if (phone && normalizePhone(candidate.phone) === phone) matchingFields.push("phone");
    return matchingFields.length ? [{
      id: candidate.id,
      displayName: candidate.displayName,
      currentRole: candidate.currentRole,
      maskedEmail: maskEmail(candidate.email),
      maskedPhone: maskPhone(candidate.phone),
      matchingFields,
      applications: candidate.applications,
    }] : [];
  });
}

function parseArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeJsonArrays(primary: string, secondary: string) {
  const values = [...parseArray(primary), ...parseArray(secondary)];
  const unique = new Map<string, unknown>();
  for (const value of values) {
    const normalized = typeof value === "string" ? value.trim() : value;
    if (normalized === "") continue;
    unique.set(JSON.stringify(normalized), normalized);
  }
  return JSON.stringify(Array.from(unique.values()));
}

export async function mergeExistingCandidates(sourceId: string, targetId: string) {
  if (sourceId === targetId) throw new Error("不能合并同一份候选人档案");

  return db.$transaction(async (tx) => {
    const [source, target] = await Promise.all([
      tx.candidate.findUnique({ where: { id: sourceId }, include: { applications: true } }),
      tx.candidate.findUnique({ where: { id: targetId }, include: { applications: true } }),
    ]);
    if (!source || !target) throw new Error("待合并的候选人档案不存在");

    const sourceEmail = normalizeEmail(source.email);
    const targetEmail = normalizeEmail(target.email);
    const sourcePhone = normalizePhone(source.phone);
    const targetPhone = normalizePhone(target.phone);
    if ((!sourceEmail || sourceEmail !== targetEmail) && (!sourcePhone || sourcePhone !== targetPhone)) {
      throw new Error("两份档案的手机号或邮箱均不一致，不能自动合并");
    }

    const targetApplications = new Map(target.applications.map((application) => [application.jobId, application]));
    for (const sourceApplication of source.applications) {
      const existing = targetApplications.get(sourceApplication.jobId);
      if (existing) {
        const stage = stageIndex(sourceApplication.stage) > stageIndex(existing.stage) ? sourceApplication.stage : existing.stage;
        await tx.interviewSchedule.updateMany({
          where: { applicationId: sourceApplication.id },
          data: { applicationId: existing.id, candidateId: target.id },
        });
        await tx.application.update({ where: { id: existing.id }, data: {
          stage,
          source: existing.source || sourceApplication.source,
          notes: existing.notes || sourceApplication.notes,
        } });
        await tx.application.delete({ where: { id: sourceApplication.id } });
      } else {
        await tx.application.update({ where: { id: sourceApplication.id }, data: { candidateId: target.id } });
      }
    }

    await Promise.all([
      tx.matchAnalysis.updateMany({ where: { candidateId: source.id }, data: { candidateId: target.id } }),
      tx.interviewGuide.updateMany({ where: { candidateId: source.id }, data: { candidateId: target.id } }),
      tx.interviewSchedule.updateMany({ where: { candidateId: source.id }, data: { candidateId: target.id } }),
    ]);

    const merged = await tx.candidate.update({
      where: { id: target.id },
      data: {
        displayName: target.displayName || source.displayName,
        email: target.email || source.email,
        phone: target.phone || source.phone,
        currentRole: target.currentRole || source.currentRole,
        yearsOfExperience: target.yearsOfExperience ?? source.yearsOfExperience,
        education: mergeJsonArrays(target.education, source.education),
        skills: mergeJsonArrays(target.skills, source.skills),
        workExperiences: mergeJsonArrays(target.workExperiences, source.workExperiences),
        resumeText: target.resumeText || source.resumeText,
        resumeFileName: target.resumeFileName || source.resumeFileName,
        resumeMimeType: target.resumeMimeType || source.resumeMimeType,
        resumeData: target.resumeData || source.resumeData,
        sourceFileType: target.sourceFileType || source.sourceFileType,
        source: target.source || source.source,
        jobId: target.jobId || source.jobId,
      },
    });
    await tx.candidate.delete({ where: { id: source.id } });
    await tx.auditLog.create({ data: {
      action: "MERGE_CANDIDATE",
      entityType: "Candidate",
      entityId: target.id,
      metadata: JSON.stringify({ sourceCandidateId: source.id, targetCandidateId: target.id }),
    } });
    return merged;
  });
}

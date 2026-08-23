import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safeDownloadName } from "@/lib/resume-file";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const candidate = await db.candidate.findUnique({ where: { id }, select: { resumeData: true, resumeFileName: true, resumeMimeType: true } });
  if (!candidate) return NextResponse.json({ error: "候选人不存在" }, { status: 404 });
  if (!candidate.resumeData || !candidate.resumeFileName) return NextResponse.json({ error: "该候选人没有保存原始简历" }, { status: 404 });
  await db.auditLog.create({ data: { action: "DOWNLOAD_CANDIDATE_RESUME", entityType: "Candidate", entityId: id } });
  const fileName = safeDownloadName(candidate.resumeFileName);
  return new NextResponse(new Uint8Array(candidate.resumeData), { headers: {
    "Content-Type": candidate.resumeMimeType || "application/octet-stream",
    "Content-Disposition": `attachment; filename="resume"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    "Cache-Control": "private, no-store",
  } });
}
